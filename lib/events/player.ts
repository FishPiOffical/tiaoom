import { BaseEvents } from "./base";
import { Player, Room, PlayerStatus, MessagePackage } from "..";

/**
 * 玩家事件定义
 */
export interface PlayerEvents extends BaseEvents {
  /**
   * 加入房间
   * @param {Room} room 房间信息
   * @param {Player} player 玩家信息
   **/ 
  join: (room: Room, player: Player) => void;
  /**
   * 离开房间
   * @param {Room} room 房间信息
   * @param {Player} player 玩家信息
   **/ 
  leave: (room: Room, player: Player) => void;
  /**
   * 玩家状态变化
   * @param {PlayerStatus} status 玩家状态
   **/ 
  status: (status: PlayerStatus) => void;
  /**
   * 玩家命令
   * @param {MessagePackage} message 命令内容
   */
  command: (message: MessagePackage) => void;
  /**
   * 玩家私信
   * @param {string} data 消息内容
   * @param {Player} [sender] 发送者信息（可选）
   **/ 
  message: (data: string, sender?: Player) => void;
}