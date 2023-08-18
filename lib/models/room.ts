import { PlayerManager } from "@lib/manager/player";
import { Player } from "./player";
import EventEmitter from "events";
import { RoomEvents } from "@lib/events/room";

export interface RoomOptions {
  /**
   * 房间号
   */
  id: string, 
  /**
   * 房间容量
   */
  size: number, 
  /**
   * 最小容量
   */
  minSize?: number
}

export class Room extends EventEmitter {
  on<K extends keyof RoomEvents>(event: K, listener: RoomEvents[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof RoomEvents>(event: K, ...args: Parameters<RoomEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  id: string; // room id
  size: number = 10; // room size
  minSize: number = 2; // room min size
  playerList: Array<Player> = []; // player list
  get isReady(): boolean {
    return this.playerList.length >= this.minSize
      && this.playerList.findIndex((target) => target.isReady === false) != -1; // is all player ready
  }
  // is room full
  isFull: boolean = this.playerList.length == this.size;

  constructor({
    id, size, minSize = 2
  }: {
    id: string, size: number, minSize?: number
  }) {
    super();
    this.id = id;
    this.size = size;
    this.minSize = minSize;
  }

  kickPlayer(playerId: string): void;
  kickPlayer(player: Player): void;

  kickPlayer(player: Player | string) {
    const playerId = typeof player === "string" ? player : player.id;
    const index = this.playerList.findIndex((p) => p.id == playerId);
    if (index > -1) {
      this.playerList.splice(index, 1);
    }
  }

  addPlayer(player: Player) {
    if (this.isFull) return;
    if (!this.isPlayerInRoom(player)) {
      this.playerList.push(player);
    }
  }

  playerReadyById(playerId: string) {
    var player = this.playerManager.getPlayer(playerId);
    if (player) {
      this.playerReady(player);
    }
  }

  playerReady(player: Player) {
    if (this.isPlayerInRoom(player)) {
      player.isReady = true;
    }
  }

  playerUnReadyById(playerId: string) {
    var player = this.playerManager.getPlayer(playerId);
    if (player) {
      this.playerUnReady(player);
    }
  }

  playerUnReady(player: Player) {
    if (this.isPlayerInRoom(player)) {
      player.isReady = false;
    }
  }

  isPlayerIdInRoom(playerId: string) {
    var player = this.playerManager.getPlayer(playerId);
    if (player) {
      return this.isPlayerInRoom(player);
    }
  }

  isPlayerInRoomById(playerId: string) {
    var player = this.playerManager.getPlayer(playerId);
    if (player) {
      return this.isPlayerInRoom(player);
    }
  }

  isPlayerInRoom(player: Player) {
    return this.playerList.find((p) => p.id == player.id);
  }
}
