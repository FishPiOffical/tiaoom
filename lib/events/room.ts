import { Room } from "@lib/models/room";
import { BaseEvents } from "./base";

export interface RoomEvents extends BaseEvents {
  /**
   * 房间完成初始化
   **/ 
  ready: () => void;
  /**
   * 销毁房间
   **/ 
  destoryed: () => void;
  /**
   * 加入房间
   **/ 
  join: (userId: string) => void;
  /**
   * 离开房间
   **/ 
  leave: (userId: string) => void;
  /**
   * 房间状态变化
   **/ 
  status: (status: string) => void;
  /**
   * 加入房间
   **/ 
  data: (data: any) => void;
}