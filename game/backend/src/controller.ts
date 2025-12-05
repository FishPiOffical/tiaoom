import http from "http";
import { IPlayer, Player, PlayerStatus, } from "tiaoom";
import { Room, Tiaoom } from "tiaoom";
import { SocketManager } from "./socket";
import Games, { IGameInfo } from "./games";

export class Controller extends Tiaoom {
  constructor(server: http.Server) {
    super({ socket: new SocketManager(server) });
  }

  get games() {
    return Object.keys(Games).reduce((obj, key) => {
      obj[key] = { ...Games[key] };
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
