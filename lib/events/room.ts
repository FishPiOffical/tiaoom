import { Room } from "@lib/models/room";
import { BaseEvents } from "./base";
import { Player } from "@lib/models/player";

export interface RoomEvents extends BaseEvents {
  /**
   * 加入房间
   **/ 
  join: (player: Player) => void;
  /**
   * 离开房间
   **/ 
  leave: (player: Player) => void;
  /**
   * 房间状态变化
   **/ 
  status: (status: string) => void;
  /**
   * 房间聊天
   **/ 
  message: (data: string) => void;
  /**
   * 房间命令
   */
  command: (message: { type: string, data: any }) => void;
}