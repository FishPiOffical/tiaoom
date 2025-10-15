import { BaseEvents } from "./base";
import { Room } from "@lib/models/room";
import { Player } from "@lib/models/player";

/**
 * Tiaoom 广播事件
 */
export interface TiaoomEvents extends BaseEvents {
  room: (room: Room) => void;
  rooms: (rooms: Room[]) => void;
  'room-player': (room: Room) => void;
  player: (player: Player, online: boolean) => void;
  players: (players: Player[]) => void;
}

export * from './message';
export * from './room';
export * from './player';