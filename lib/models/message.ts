import EventEmitter from "events";
import { IPlayer, PlayerOptions } from "./player";
import { IRoom, IRoomPlayer, IRoomOptions } from "./room";
import { MessageEvents } from "@lib/events/message";

/**
 * 消息包类型枚举
 */
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

/**
 * 消息包接口
 */
export interface MessagePackage {
  /**
   * 消息类型
   */
  type: MessageTypes | string;
  /**
   * 消息数据
   */
  data?: PlayerOptions | IRoomOptions | IPlayer | IRoom | IRoomPlayer | any;
  /**
   * 消息发送者
   */
  sender?: IPlayer | IRoom | IRoomPlayer;
}

/**
 * 消息通信接口
 */
export interface Message extends EventEmitter {
  /**
   * 监听消息事件
   * @param event 事件名，具体见 MessageEvents
   * @param listener 监听器
   */
  on<K extends keyof MessageEvents>(event: K, listener: MessageEvents[K]): this;
  /**
   * 触发消息事件
   * @param event 事件名，具体见 MessageEvents
   * @param args 参数
   */
  emit<K extends keyof MessageEvents>(event: K, ...args: Parameters<MessageEvents[K]>): boolean;
  /**
   * 关闭连接
   */
  close(): void;
  /**
   * 发送消息包
   * @param message 消息包
   */
  send(message: MessagePackage): void;
}
