import { BaseEvents } from "./base";
import { Player, Room, PlayerStatus, IMessagePackage } from "..";

/**
 * 玩家事件定义
 */
export interface PlayerEvents extends BaseEvents {
  /**
   * 玩家状态变化
   * @param {PlayerStatus} status 玩家状态
   **/ 
  status: (status: PlayerStatus) => void;
  /**
   * 玩家命令
   * @param {IMessagePackage} message 命令内容
   */
  command: (message: any) => void;
  /**
   * 玩家私信
   * @param {string} data 消息内容
   * @param {Player} [sender] 发送者信息（可选）
   **/ 
  message: (data: string, sender?: Player) => void;
}