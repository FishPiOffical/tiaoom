import EventEmitter from "events";
import { Player, PlayerOptions } from "./player";
import { Room, RoomOptions } from "./room";
import { MessageEvents } from "@lib/events/message";

export interface MessageOptions {
  port?: number;
  socket?: EventEmitter;
}

export enum MessageTypes {
  RoomCreate = "room.create",
  RoomReady = "room.ready",
  RoomStart = "room.start",
  RoomEnd = "room.end",
  RoomClose = "room.close",
  RoomAllReady = "room.allready",
  RoomCommand = "room.command",
  RoomMessage = "room.message",
  PlayerJoin = "player.join",
  PlayerLeave = "player.leave",
  PlayerReady = "player.ready",
  PlayerUnready = "player.unready",
  PlayerCommand = "player.command",
}

export interface MessagePackage {
  type: MessageTypes;
  data?: PlayerOptions | RoomOptions | any;
  sender?: Player | Room;
}


export interface Message extends EventEmitter {
  on<K extends keyof MessageEvents>(event: K, listener: MessageEvents[K]): this;
  emit<K extends keyof MessageEvents>(event: K, ...args: Parameters<MessageEvents[K]>): boolean;
  close(): void;
  send(message: MessagePackage): void;
}
