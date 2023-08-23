import { BaseEvents } from "./base";
import { Room } from "@lib/models/room";
import { Player } from "@lib/models/player";

export interface TiaoomEvents extends BaseEvents {
  room: (room: Room) => void;
  player: (player: Player) => void;
}

export * from './message';
export * from './room';
export * from './player';