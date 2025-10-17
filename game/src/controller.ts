import http from "http";
import { IPlayer, Player, PlayerStatus, } from "@lib/models/player";
import { Room, Tiaoom } from "@lib/index";
import { SocketManager } from "./socket";
import Games from "../games";

export class Controller extends Tiaoom {
  constructor(server: http.Server) {
    super({ socket: new SocketManager(server) });
  }

  run() {
    return super.run().on("room", (room: Room) => {
      const gameType = room.attrs?.type;
      console.dir(Games);
      if (gameType && Games[gameType])
        Games[gameType](room);
      else console.error("game not found:", room);
      room.on('end', () => {
        room.players.forEach(p => {
          p.isReady = false;
          p.emit('status', PlayerStatus.unready);
        });
        this.emit('room-player', room);
      });
    }).on('player', (player: Player) => {
      console.log("player:", player);
      player.on('command', (message: any) => {
        console.log("player command:", message);
      });
    }).on('room-player', (room: Room) => {
      console.log("room update:", room);
      if (room.players.length == 0) {
        console.log("room empty, close it.");
        this.closeRoom({} as IPlayer, room);
      }
    }).on("error", (error: any) => {
      console.log("error:", error);
    });
  }
}
