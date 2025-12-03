import { IPlayer, Player, PlayerOptions, PlayerStatus } from "./player";
import EventEmitter from "events";
import { RoomEvents } from "@lib/events";

export interface IRoomOptions {
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
  minSize?: number,
  /**
   * 其他属性
   */
  attrs?: Record<string, any>,
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

export interface IRoom extends IRoomOptions {
  players: RoomPlayer[];
}

export interface IRoomPlayerOptions extends PlayerOptions {
  roomId?: string;
}
export interface IRoomPlayer extends IRoomPlayerOptions, IPlayer {
  isReady: boolean;
  role: PlayerRole;
  isCreator: boolean;
}

export class RoomPlayer extends Player implements IRoomPlayer {
  isReady: boolean = false;
  role: PlayerRole = PlayerRole.player;
  isCreator: boolean = false;
  roomId?: string;

  constructor(player: IPlayer | Player, role: PlayerRole = PlayerRole.player) {
    super(player);
    this.role = role;
    if (player instanceof Player && player.sender) super.setSender(player.sender);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      role: this.role,
      isReady: this.isReady,
      isCreator: this.isCreator,
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
  attrs?: Record<string, any>; // other attributes
  players: RoomPlayer[] = []; // player list

  get validPlayers() {
    return this.players.filter((player) => player.role === PlayerRole.player);
  }

  get watchers() {
    return this.players.filter((player) => player.role === PlayerRole.watcher);
  }

  private sender?: (type: string, ...message: any) => void;

  get isReady(): boolean {
    return this.players.length >= this.minSize
      && this.players.every((target) => target.isReady || target.role === PlayerRole.watcher); // is all player ready
  }

  get status(): RoomStatus {
    if (!this.isReady) return RoomStatus.waiting;
    if (this.players.findIndex((target) => target.status === PlayerStatus.playing) != -1) return RoomStatus.playing;
    return RoomStatus.ready;
  }

  get isPlaying(): boolean {
    return this.status === RoomStatus.playing;
  }

  // is room full
  get isFull(): boolean {
    return this.validPlayers.length == this.size;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      size: this.size || 10,
      minSize: this.minSize,
      status: this.status,
      players: this.players.map((player) => player.toJSON()),
      attrs: this.attrs,
    }
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  constructor({
    id = new Date().getTime().toString(), name = '', size = 10, minSize = 2, attrs
  }: IRoomOptions) {
    super();
    this.id = id;
    this.name = name;
    this.size = size;
    this.minSize = minSize;
    this.attrs = attrs;
    
    const events: Array<keyof RoomEvents> = ['message', 'command', 'start', 'end', 'close', 'error', 'all-ready', 'player-unready', 'player-ready', 'join', 'leave'];
    events.forEach((event) => {
      this.on(event, (...data: any) => {
        this.sender?.(event, ...data);
      });
    });
  }

  addPlayer(player: Player, isCreator: boolean = false) {
    if (this.players.some((p) => p.id == player.id)) return;
    let roomPlayer = this.searchPlayer(player);
    if (!roomPlayer) {
      roomPlayer = new RoomPlayer(player, this.isFull || this.isPlaying ? PlayerRole.watcher : PlayerRole.player);
      roomPlayer.isCreator = isCreator;
      roomPlayer.roomId = this.id;
      this.players.push(roomPlayer);
      this.emit("join", { roomId: this.id, ...roomPlayer });
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
      this.emit("leave",  { roomId: this.id, ...roomPlayer});
      this.players.splice(index, 1);
      if (roomPlayer.isCreator && this.players.length > 0) {
        this.players[0].isCreator = true;
        this.emit("update", this);
      }
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
    if (!this.isReady) {
      throw new Error('room is not ready.');
    }
    if (this.status === RoomStatus.playing) {
      throw new Error('room is already started.');
    }
    this.players.forEach((player) => {
      if (player.role != PlayerRole.player) return;
      player.emit('status', PlayerStatus.playing);
    });
    this.emit("update", this);
    return this.emit("start", this);
  }

  end() {
    this.players.forEach((player) => {
      if (player.role != PlayerRole.player) return;
      player.emit('status', PlayerStatus.unready);
    });
    this.emit("update", this);
    return this.emit("end", this);
  }

  setSender(sender: (type: string, ...message: any) => void) {
    this.sender = sender;
    return this;
  }
}
