import crypto from "crypto";
import http from "http";
import { IPlayer, IRoomOptions, IRoomPlayer, IRoomPlayerOptions, Player, PlayerStatus, RoomPlayer, } from "tiaoom";
import { Room, Tiaoom } from "tiaoom";
import { SocketManager } from "./socket";
import Games, { IGameInfo } from "./games";
import { Model } from "./model";

export class Controller extends Tiaoom {
  messages: { data: string, sender: Player, createdAt: number }[] = [];
  missSenderPlayers: RoomPlayer[] = [];

  constructor(server: http.Server) {
    super({ socket: new SocketManager(server) });
    Model.getRooms().then(rooms => {
      const players = rooms.map(r => r.players).flat();
      this.loadFrom({ 
        rooms: rooms.map(roomData => {
          const room = new Room(roomData.toRoom());
          room.players = roomData.players.map(p => {
            const player = new RoomPlayer(p, p.role);
            return player;
          }); 
          this.missSenderPlayers.push(...room.players.filter(p => !this.missSenderPlayers.some(mp => mp.id === p.id)));
          return room;
        }),
        players: players.filter((p, index, self) => index === self.findIndex(tp => tp.id === p.id)).map(p => new Player(p, p.status)),
      });
      this.rooms.forEach(room => this.emit("room", room));
    });
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
      Model.createRoom(room);
      if (gameType && Games[gameType]) {
        Games[gameType].default(room, {
          save: (data: Record<string, any>) => {
            return Model.saveGameData(room.id, data);
          },
          restore: () => {
            return Model.getGameData(room.id);
          }
        });
      }
      else console.error("game not found:", room);
      function updatePlayerList() {
        Model.updatePlayerList(room.id, room.players);
      }
      room.on("join", updatePlayerList)
        .on("player-ready", updatePlayerList)
        .on("player-unready", updatePlayerList)
        .on('end', () => {
          room.players.forEach(p => {
            p.isReady = false;
            p.emit('status', PlayerStatus.unready);
          });
          this.emit('room-player', room);
        }).on('close', async () => {
          await Model.closeRoom(room.id)
        });
    }).on('player', (player: Player) => {
      const miss = this.missSenderPlayers.find(p => p.id === player.id);
      if (miss) {
        miss.setSender(player.sender!);
        this.missSenderPlayers = this.missSenderPlayers.filter(p => p.id !== player.id);
      }
      player.on('command', (message: any) => {
      });
    }).on('room-player', (room: Room) => {
      if (room.players.length == 0) {
        this.closeRoom({} as IPlayer, room);
      } else {
        Model.updatePlayerList(room.id, room.players);
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
