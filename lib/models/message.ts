import EventEmitter from "events";
import { IPlayer, PlayerOptions } from "./player";
import { IRoom, IRoomPlayer, IRoomOptions } from "./room";
import { MessageEvents } from "@lib/events/message";

export enum MessageTypes {
  RoomList = "room.list",
  RoomCreate = "room.create",
  RoomReady = "room.ready",
  RoomStart = "room.start",
  RoomEnd = "room.end",
  RoomClose = "room.close",
  RoomAllReady = "room.allready",
  RoomCommand = "room.command",
  RoomMessage = "room.message",
  PlayerOffline = "player.offline",
  PlayerList = "player.list",
  PlayerLogin = "player.login",
  PlayerLogout = "player.logout",
  PlayerJoin = "player.join",
  PlayerLeave = "player.leave",
  PlayerReady = "player.ready",
  PlayerUnready = "player.unready",
  PlayerCommand = "player.command",
}

export interface MessagePackage {
  type: MessageTypes | string;
  data?: PlayerOptions | IRoomOptions | IPlayer | IRoom | IRoomPlayer | any;
  sender?: IPlayer | IRoom | IRoomPlayer;
}

export interface Message extends EventEmitter {
  on<K extends keyof MessageEvents>(event: K, listener: MessageEvents[K]): this;
  emit<K extends keyof MessageEvents>(event: K, ...args: Parameters<MessageEvents[K]>): boolean;
  close(): void;
  send(message: MessagePackage): void;
}
