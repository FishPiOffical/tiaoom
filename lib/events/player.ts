import { BaseEvents } from "./base";

export interface PlayEvents extends BaseEvents {
  /**
   * 加入房间
   **/ 
  join: (roomId: string, userId: string) => void;
  /**
   * 离开房间
   **/ 
  leave: (roomId: string) => void;
  /**
   * 玩家状态变化
   **/ 
  status: (status: string) => void;
}