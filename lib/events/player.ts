import { BaseEvents } from "./base";
import { Player, Room, PlayerStatus, MessagePackage } from "..";

export interface PlayerEvents extends BaseEvents {
  /**
   * 加入房间
   **/ 
  join: (room: Room, player: Player) => void;
  /**
   * 离开房间
   **/ 
  leave: (room: Room, player: Player) => void;
  /**
   * 玩家状态变化
   **/ 
  status: (status: PlayerStatus) => void;
  /**
   * 玩家命令
   */
  command: (message: MessagePackage) => void;
  /**
   * 玩家私信
   **/ 
  message: (data: string, sender?: Player) => void;
}