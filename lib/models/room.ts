import { IPlayer, Player, PlayerOptions, PlayerStatus } from "./player";
import EventEmitter from "events";
import { RoomEvents } from "@lib/events";

export interface RoomOptions {
  /**
   * 房间号
   */
  id?: string, 
  /**
   * 房间名称
   */
  name?: string,
  /**
   * 房间容量
   */
  size?: number, 
  /**
   * 最小容量
   */
  minSize?: number
}

export enum PlayerRole {
  player = 'player',
  watcher = 'watcher',
}

export enum RoomStatus {
  waiting = 'waiting',
  ready = 'ready',
  playing = 'playing',
}

export interface IRoom extends RoomOptions {
  players: RoomPlayer[];
}

export interface RoomPlayerOptions extends PlayerOptions {
  roomId?: string;
}
export interface IRoomPlayer extends RoomPlayerOptions, IPlayer {
  id: string;
  isReady: boolean;
  role: PlayerRole;
}

export class RoomPlayer extends Player implements IRoomPlayer {
  isReady: boolean = false;
  role: PlayerRole = PlayerRole.player;

  constructor(player: IPlayer | Player, role: PlayerRole = PlayerRole.player) {
    super(player);
    this.role = role;
    if (player instanceof Player) this.sender = player.sender;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      role: this.role,
      isReady: this.isReady,
    };
  }
}

export class Room extends EventEmitter implements IRoom {
  on<K extends keyof RoomEvents>(event: K, listener: RoomEvents[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof RoomEvents>(event: K, ...args: Parameters<RoomEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  id: string; // room id
  size: number = 10; // room size
  name: string = ''; // room name
  minSize: number = 2; // room min size

  players: RoomPlayer[] = []; // player list

  private sender?: (type: string, ...message: any) => void;

  get isReady(): boolean {
    return this.players.length >= this.minSize
      && this.players.findIndex((target) => target.isReady === false) != -1; // is all player ready
  }

  // is room full
  get isFull(): boolean {
    return this.players.length == this.size;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      size: this.size || 10,
      minSize: this.minSize,
      players: this.players.map((player) => player.toJSON()),
    }
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  constructor({
    id = new Date().getTime().toString(), name = '', size = 10, minSize = 2
  }: RoomOptions) {
    super();
    this.id = id;
    this.name = name;
    this.size = size;
    this.minSize = minSize;
  }

  addPlayer(player: IPlayer | Player) {
    if (this.isFull) return;
    let roomPlayer = this.searchPlayer(player);
    if (!roomPlayer) {
      roomPlayer = new RoomPlayer(player);
      this.players.push(roomPlayer);
    }
    return roomPlayer;
  }

  kickPlayer(playerId: string): RoomPlayer;
  kickPlayer(player: IPlayer): RoomPlayer;

  kickPlayer(player: IPlayer | string) {
    const playerId = typeof player === "string" ? player : player.id;
    const index = this.players.findIndex((p) => p.id == playerId);
    const roomPlayer = this.players[index];
    if (index > -1) {
      this.players.splice(index, 1);
    }
    return roomPlayer;
  }

  searchPlayer(playerId: string): RoomPlayer | undefined;
  searchPlayer(playerId: IPlayer): RoomPlayer | undefined;

  searchPlayer(player: string | IPlayer) {
    const playerId = typeof player === "string" ? player : player.id;
    return this.players.find((player) => player.id == playerId);
  }

  start() {
    this.players.forEach((player) => {
      if (player.role != PlayerRole.player) return;
      player.emit('status', PlayerStatus.playing);
    });
    return this.emit("start");
  }

  end() {
    this.players.forEach((player) => {
      if (player.role != PlayerRole.player) return;
      player.emit('status', PlayerStatus.unready);
    });
    return this.emit("end");
  }

  setSender(sender: (type: string, ...message: any) => void) {
    const events: Array<keyof RoomEvents> = ['message', 'command', 'start', 'end', 'close', 'error', 'all-ready'];
    this.sender = sender;
    events.forEach((event) => {
      this.on(event, (...data: any) => {
        this.sender!(event, ...data);
      });
    });
    return this;
  }
}
