import EventEmitter from "events";
import { IPlayer, IPlayerOptions } from "./player";
import { IRoom, IRoomPlayer, IRoomOptions } from "./room";
import { IMessageEmitterEvents, IMessageEvents } from "@lib/events/message";

/**
 * 消息包类型枚举
 * player： 'command', 'message', 'join', 'leave', 'status'
 */
export enum MessageTypes {
  /**
   * 连接准备就绪事件
   */
  SysReady = "sys.ready",
  /**
   * 连接关闭事件
   */
  SysClose = "sys.close",
  /**
   * 错误事件
   */
  SysError = "sys.error",
  /**
   * 全局错误
   */
  GlobalError = "global.error",
  /**
   * 全局命令
   */
  GlobalCommand = "global.command",
  /**
   * 房间列表
   */
  RoomList = "room.list",
  /**
   * 房间创建
   */
  RoomCreate = "room.create",
  /**
   * 房间更新
   */
  RoomUpdate = "room.update",
  /**
   * 房间准备
   */
  RoomReady = "room.ready",
  /**
   * 房间开始
   */
  RoomStart = "room.start",
  /**
   * 房间结束
   */
  RoomEnd = "room.end",
  /**
   * 房间关闭
   */
  RoomClose = "room.close",
  /**
   * 房间全部玩家已准备
   */
  RoomAllReady = "room.all-ready",
  /**
   * 房间命令
   */
  RoomCommand = "room.command",
  /**
   * 房间内玩家发送的指令
   */
  RoomPlayerCommand = "room.player-command",
  /**
   * 房间消息
   */
  RoomMessage = "room.message",
  /**
   * 玩家加入房间
   */
  RoomJoin = "room.join",
  /**
   * 玩家离开房间
   */
  RoomLeave = "room.leave",
  /**
   * 房间踢出玩家
   */
  RoomKick = "room.kick",
  /**
   * 房间转移
   */
  RoomTransfer = "room.transfer",
  /**
   * 房间玩家准备
   */
  RoomPlayerReady = "room.player-ready",
  /**
   * 房间玩家取消准备
   */
  RoomPlayerUnready = "room.player-unready",
  /**
   * 玩家列表
   */
  PlayerList = "player.list",
  /**
   * 玩家登录
   */
  PlayerLogin = "player.login",
  /**
   * 玩家登出
   */
  PlayerLogout = "player.logout",
  /**
   * *玩家消息
   */
  PlayerMessage = "player.message",
  /**
   * *玩家命令
   */
  PlayerCommand = "player.command",
  /**
   * 玩家准备
   */
  PlayerReady = "player.ready",
  /**
   * 玩家取消准备
   */
  PlayerUnready = "player.unready",
  /**
   * 全局消息
   */
  GlobalMessage = "global.message",
}

/**
 * 消息包接口
 */
export interface IMessagePackage {
  /**
   * 消息类型
   */
  type: MessageTypes;
  /**
   * 消息数据
   */
  data?: IPlayerOptions | IRoomOptions | IPlayer | IRoom | IRoomPlayer | any
  /**
   * 发送者信息
   */
  sender?: IPlayer | IRoomPlayer | IRoom;
}

/**
 * 消息数据接口，包含发送者信息
 */
export interface IMessageData extends IMessagePackage {
  sender: IPlayer | IRoomPlayer | IRoom;
}

/**
 * 消息通信接口
 */
export interface IMessage extends EventEmitter<IMessageEmitterEvents> {
  /**
   * 监听消息事件
   * @param event 事件名，具体见 MessageEvents
   * @param listener 监听器
   */
  on<K extends keyof IMessageEvents>(event: K, listener: IMessageEvents[K]): this;
  /**
   * 触发消息事件
   * @param event 事件名，具体见 MessageEvents
   * @param args 参数
   */
  emit<K extends keyof IMessageEvents>(event: K, ...args: Parameters<IMessageEvents[K]>): boolean;
  /**
   * 关闭连接
   */
  close(): void;
  /**
   * 发送消息包
   * @param message 消息包
   */
  send(message: IMessagePackage): void;
}
