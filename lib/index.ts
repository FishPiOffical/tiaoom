import { EventEmitter } from "events";
import { TiaoomEvents } from "./events";
import { Message } from "./models/message";
import { Room, RoomOptions, RoomPlayer, RoomPlayerOptions } from "./models/room";
import { Player, PlayerOptions } from "./models/player";

export interface TiaoomOptions {
  socket: Message;

}
export class Tiaoom extends EventEmitter {
  rooms: Room[] = []; // room list
  players: Player[] = []; // player list
  messageInstance?: Message;

  constructor({ socket }: TiaoomOptions) {
    super();
    this.messageInstance = socket;
  }

  on<K extends keyof TiaoomEvents>(event: K, listener: TiaoomEvents[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof TiaoomEvents>(event: K, ...args: Parameters<TiaoomEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  run() {
    this.messageInstance?.on("message", (message: any, cb?: (...params:any) => any) => {
      switch (message.type) {
        case "room.create":
          return this.createRoom(message.data, cb);
        case "player.join":
          return this.joinPlayer(message.data, cb);
        case "player.leave":
          return this.leavePlayer(message.data);
        case "room.ready":
          break;
        case "room.start":
          break;
        case "room.end":
          break;
        case "room.close":
          break;
        case "player.ready":
          break;
        case "player.unready":
          break;
        case "player.command":
          break;
        case "room.allready":
          break;
        case "room.command":
          break;
        case "room.message":
          break;
      }
    });

    return this;
  }

  searchPlayer(player: string): Player | undefined;
  searchPlayer(player: PlayerOptions | RoomPlayerOptions): Player | undefined;

  searchPlayer(player: PlayerOptions | RoomPlayerOptions | string) {
    const playerId = typeof player === "string" ? player : player.id;
    return this.players.find((target) => target.id === playerId);
  }

  private createRoom(options: RoomOptions, cb?: (room: Room) => void) {
    const room = new Room(options);
    this.rooms.push(room);
    cb?.(room);
    return this.emit("room", room);
  }

  private joinPlayer(player: RoomPlayerOptions, cb?: (data: { room: Room, player: RoomPlayer }) => void) {
    let playerInstance = this.searchPlayer(player);
    if (!playerInstance) {
      playerInstance = new Player(player);
      this.players.push(playerInstance);
      this.emit("player", playerInstance);
    }

    if (!player.roomId) {
      throw new Error('missing room id.');
    }

    const room = this.rooms.find((room) => room.id === player.roomId);
    if (!room) {
      throw new Error('room not found.');
    }

    const roomPlayer = room.addPlayer(playerInstance);
    if (!roomPlayer) {
      throw new Error('room is full.');
    }

    cb?.({ room, player: roomPlayer });
    return room.emit("join", playerInstance);
  }

  private leavePlayer(player: RoomPlayerOptions) {
    const playerInstance = this.searchPlayer(player);
    if (!playerInstance) {
      throw new Error('player not found.');
    }

    if (!player.roomId) {
      throw new Error('missing room id.');
    }

    const room = this.rooms.find((room) => room.id === player.roomId);
    if (!room) {
      throw new Error('room not found.');
    }

    room.kickPlayer(playerInstance);
    return room.emit("leave", playerInstance);
  }
}

export * from "./models/message";
export * from "./models/room";
export * from "./models/player";
export * from "./events";