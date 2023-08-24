import { RoomPlayer, RoomStatus } from "@lib/models/room";
import { BaseEvents } from "./base";
import { Player } from "@lib/models/player";
import { MessagePackage } from "..";

export interface RoomEvents extends BaseEvents {
  /**
   * 加入房间
   **/ 
  join: (player: RoomPlayer) => void;
  /**
   * 离开房间
   **/ 
  leave: (player: RoomPlayer) => void;
  /**
   * 房间状态变化
   **/ 
  status: (status: RoomStatus) => void;
  /**
   * 房间聊天
   **/ 
  message: (data: string) => void;
  /**
   * 房间命令
   */
  command: (message: MessagePackage) => void;
  /**
   * 玩家准备
   */
  'player-ready': (player: RoomPlayer) => void;
  /**
   * 全部玩家已准备
   */
  'all-ready': (players: RoomPlayer[]) => void;
  /**
   * 玩家取消准备
   */
  'player-unready': (player: RoomPlayer) => void;
  /**
   * 房间开始游戏
   */
  start: () => void;
  /**
   * 房间结束游戏
   */
  end: () => void;
}