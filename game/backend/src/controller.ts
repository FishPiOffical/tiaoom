import crypto from "crypto";
import http from "http";
import { IPlayer, IRoomOptions, IRoomPlayerOptions, Player, PlayerStatus, } from "tiaoom";
import { Room, Tiaoom } from "tiaoom";
import { SocketManager } from "./socket";
import Games, { IGameInfo } from "./games";

export class Controller extends Tiaoom {
  messages: { data: string, sender: Player, createdAt: number }[] = [];

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
    }).on("command", (command: any & { sender: Player }) => {
      if (command.type === 'say') {
        this.messages.unshift({ data: command.data, sender: command.sender, createdAt: Date.now() });
        this.messages = this.messages.slice(0, 500); // keep last 500 messages
        this.emit('message', command.data, command.sender);
      }
    }).on("error", (error: any) => {
      console.log("error:", error);
    });
  }

  createRoom(sender: IPlayer, options: IRoomOptions) {
    if (options.attrs?.passwd) {
      options.attrs.passwd = crypto.createHash('md5').update(options.attrs.passwd).digest('hex');
    }
    return super.createRoom(sender, options);
  }

  joinPlayer(sender: IPlayer, player: IRoomPlayerOptions & { params?: { passwd: string } }, isCreator: boolean = false) {
    if (player.params?.passwd) {
      const room = this.rooms.find(r => r.id === player.roomId);
      if (room) {
        const passwdHash = crypto.createHash('md5').update(player.params.passwd).digest('hex');
        if (room.attrs?.passwd !== passwdHash) {
          throw new Error("密码错误，无法加入房间。");
        }
      }
    }
    return super.joinPlayer(sender, player, isCreator);
  }
}
