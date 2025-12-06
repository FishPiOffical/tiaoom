import { BaseEvents } from "./base";
import { Room } from "@lib/models/room";
import { Player } from "@lib/models/player";

/**
 * Tiaoom 广播事件
 */
export interface TiaoomEvents extends BaseEvents {
  /**
   * 房间创建事件
   * @param {Room} room 房间信息
   */
  room: (room: Room) => void;
  /**
   * 返回房间列表
   * @param {Room[]} rooms 房间列表
   */
  rooms: (rooms: Room[]) => void;
  /**
   * 房间玩家变更事件
   * @param {Room} room 房间信息
   */
  'room-player': (room: Room) => void;
  /**
   * 玩家变更事件
   * @param {Player} player 玩家信息
   * @param {boolean} online 是否在线
   */
  player: (player: Player, online: boolean) => void;
  /**
   * 返回玩家列表
   * @param {Player[]} players 玩家列表
   */
  players: (players: Player[]) => void;
  /**
   * 全局命令事件
   * @param {any & { sender: Player }} data 命令内容
   */
  command: (data: any & { sender: Player }) => void;
}

export * from './message';
export * from './room';
export * from './player';