import { IRoom, IRoomPlayer, RoomStatus } from "@lib/models/room";
import { BaseEvents } from "./base";
import { IMessagePackage } from "..";

/**
 * 房间事件定义
 */
export interface RoomEvents extends BaseEvents {
  /**
   * 加入房间
   * @param {IRoomPlayer} player 玩家信息
   **/ 
  join: (player: IRoomPlayer) => void;
  /**
   * 离开房间
   * @param {IRoomPlayer} player 玩家信息
   **/ 
  leave: (player: IRoomPlayer) => void;
  /**
   * 房间状态变化
   * @param {RoomStatus} status 房间状态
   **/ 
  status: (status: RoomStatus) => void;
  /**
   * 房间聊天
   * @param {string} data 消息内容
   **/ 
  message: (data: { content: string; sender?: IRoomPlayer }) => void;
  /**
   * 玩家发送的房间命令
   * @param {any} message 命令内容
   */
  'player-command': (message: any) => void;
  /**
   * 房间命令
   * @param {IMessagePackage} message 命令内容
   */
  command: (message: any) => void;
  /**
   * 房间更新
   * @param {IRoom} room 房间信息
   */
  update: (room: IRoom) => void;
  /**
   * 玩家准备
   * @param {IRoomPlayer} player 玩家信息
   */
  'player-ready': (player: IRoomPlayer) => void;
  /**
   * 全部玩家已准备
   * @param {IRoomPlayer[]} players 玩家列表
   */
  'all-ready': (players: IRoomPlayer[]) => void;
  /**
   * 玩家取消准备
   * @param {IRoomPlayer} player 玩家信息
   */
  'player-unready': (player: IRoomPlayer) => void;
  /**
   * 房间开始游戏
   * @param {IRoom} room 房间信息
   */
  start: (room: IRoom) => void;
  /**
   * 房间结束游戏
   * @param {IRoom} room 房间信息
   */
  end: (room: IRoom) => void;
}