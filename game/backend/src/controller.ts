import crypto from "crypto";
import http from "http";
import { IPlayer, IRoomOptions, IRoomPlayer, IRoomPlayerOptions, Player, PlayerRole, PlayerStatus, RoomPlayer, } from "tiaoom";
import { Room, Tiaoom } from "tiaoom";
import { SocketManager } from "./socket";
import Games, { GameRoom, IGame, IGameInfo } from "./games";
import { Model } from "./model";
import { UserRepo } from "./entities";
import FishPi from "fishpi";

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
      obj[key] = { ...Games[key] } as IGameInfo;
      return obj;
    }, {} as Record<string, IGameInfo>);
  }

  

  run() {
    return super.run().on("room", async (room: Room) => {
      const gameType = room.attrs?.type;
      Model.createRoom(room);
      if (gameType && Games[gameType]) {
        const defaultExport = Games[gameType].default;
        if (defaultExport.prototype instanceof GameRoom) {
          const GameClass = defaultExport as new (room: Room) => GameRoom;
          const gameRoomInstance = new GameClass(room);
          const data = await Model.getGameData(room.id);
          Object.assign(gameRoomInstance, data || {});
          gameRoomInstance.init();
        } else {
          (defaultExport as IGame['default'])(room, {
            save: (data: Record<string, any>) => {
              return Model.saveGameData(room.id, data);
            },
            restore: () => {
              return Model.getGameData(room.id);
            }
          });
        }
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
            p.status = PlayerStatus.unready;
            p.emit('status', PlayerStatus.unready);
          });
          this.emit('room-player', room);
        }).on('close', async () => {
          await Model.closeRoom(room.id)
        }).on('player-command', (message: any) => {
          const sender = this.players.find((p) => p.id == message.sender?.id);
          // 管理员指令
          if (sender && sender?.isAdmin) {
            switch (message.type) {
              case 'broadcast':
                const roomPlayer = new RoomPlayer(sender, PlayerRole.admin);
                room.emit('message', { content: `${message.data}`, sender: roomPlayer });
                break;
            }
          }
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
        this.closeRoom(null, room);
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

  async createRoom(sender: IPlayer, options: IRoomOptions) {
    if (options.attrs?.passwd) {
      options.attrs.passwd = crypto.createHash('md5').update(options.attrs.passwd).digest('hex');
    }
    if (options.attrs?.point && !isNaN(options.attrs.point)) {
      const username = sender.attributes?.username;
      if (!username) throw new Error("用户信息不完整，无法创建房间。");
      // 检查用户积分是否足够
      await new FishPi().userPoints(username).then(points => {
        if (points < options.attrs!.point!) {
          throw new Error("积分不足，无法创建房间。");
        }
      }).catch(err => {
        throw err;
      });
    }
    return super.createRoom(sender, options);
  }

  async joinPlayer(sender: IPlayer, player: IRoomPlayerOptions & { params?: { passwd: string } }, isCreator: boolean = false) {
    const room = this.rooms.find(r => r.id === player.roomId);
    if (room) {
      if (player.params?.passwd) {
      const passwdHash = crypto.createHash('md5').update(player.params.passwd).digest('hex');
        if (room.attrs?.passwd !== passwdHash) {
          throw new Error("密码错误，无法加入房间。");
        }
      }
      if (room.attrs?.point && !isNaN(room.attrs.point) && room.attrs.point > 0) {
        const username = sender.attributes?.username;
        if (!username) throw new Error("用户信息不完整，无法加入房间。");
        // 检查用户积分是否足够
        await new FishPi().userPoints(username).then(points => {
          if (points < room.attrs!.point!) {
            throw new Error("积分不足，无法加入房间。");
          }
          return super.joinPlayer(sender, player, isCreator);
        }).catch(err => {
          throw err;
        });
      }
    }
    
    return super.joinPlayer(sender, player, isCreator);
  }

  isAdmin(player: IPlayer): Promise<boolean> {
    return UserRepo.findOneBy({ id: player.id }).then(user => {
      return user?.isAdmin || false;
    });
  }
}
