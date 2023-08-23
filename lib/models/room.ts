import { IPlayer, Player, PlayerOptions } from "./player";
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


export interface IRoom extends RoomOptions {
  players: IPlayer[];
}

export interface RoomPlayerOptions extends PlayerOptions {
  roomId?: string;
}

export class RoomPlayer extends Player {
  isReady: boolean = false;
  role: PlayerRole = PlayerRole.player;

  constructor(player: Player, role: PlayerRole = PlayerRole.player) {
    super(player);
    this.role = role;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      isReady: this.isReady,
      attributes: this.attributes,
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

  players: Array<RoomPlayer> = []; // player list

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

  addPlayer(player: Player) {
    if (this.isFull) return;
    let roomPlayer = this.searchPlayer(player);
    if (!player) {
      roomPlayer = new RoomPlayer(player);
      this.players.push(roomPlayer);
    }
    return roomPlayer;
  }

  kickPlayer(playerId: string): void;
  kickPlayer(player: Player): void;

  kickPlayer(player: Player | string) {
    const playerId = typeof player === "string" ? player : player.id;
    const index = this.players.findIndex((p) => p.id == playerId);
    if (index > -1) {
      this.players.splice(index, 1);
    }
  }

  searchPlayer(playerId: string): RoomPlayer | undefined;
  searchPlayer(playerId: Player): RoomPlayer | undefined;

  searchPlayer(player: string | Player) {
    const playerId = typeof player === "string" ? player : player.id;
    return this.players.find((player) => player.id == playerId);
  }
}
