import http from "http";
import { IPlayer, Player, PlayerStatus, } from "@lib/models/player";
import { Room, Tiaoom } from "@lib/index";
import { SocketManager } from "./socket";
import Games, { IGameInfo } from "../games";

export class Controller extends Tiaoom {
  constructor(server: http.Server) {
    super({ socket: new SocketManager(server) });
  }

  get games() {
    return Object.keys(Games).reduce((obj, key) => {
      obj[key] = {
        name: Games[key].name,
        minSize: Games[key].minSize,
        maxSize: Games[key].maxSize,
        description: Games[key].description,
      };
      return obj;
    }, {} as Record<string, IGameInfo>);
  }

  run() {
    return super.run().on("room", (room: Room) => {
      const gameType = room.attrs?.type;
      if (gameType && Games[gameType])
        Games[gameType].default(room);
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
