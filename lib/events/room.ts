import { IRoom, IRoomPlayer, RoomStatus } from "@lib/models/room";
import { BaseEvents } from "./base";
import { MessagePackage } from "..";

export interface RoomEvents extends BaseEvents {
  /**
   * 加入房间
   **/ 
  join: (player: IRoomPlayer) => void;
  /**
   * 离开房间
   **/ 
  leave: (player: IRoomPlayer) => void;
  /**
   * 房间状态变化
   **/ 
  status: (status: RoomStatus) => void;
  /**
   * 房间聊天
   **/ 
  message: (data: string) => void;
  /**
   * 玩家发送的房间命令
   */
  'player-command': (message: MessagePackage) => void;
  /**
   * 房间命令
   */
  command: (message: MessagePackage) => void;
  /**
   * 房间更新
   */
  update: (room: IRoom) => void;
  /**
   * 玩家准备
   */
  'player-ready': (player: IRoomPlayer) => void;
  /**
   * 全部玩家已准备
   */
  'all-ready': (players: IRoomPlayer[]) => void;
  /**
   * 玩家取消准备
   */
  'player-unready': (player: IRoomPlayer) => void;
  /**
   * 房间开始游戏
   */
  start: (room: IRoom) => void;
  /**
   * 房间结束游戏
   */
  end: (room: IRoom) => void;
}