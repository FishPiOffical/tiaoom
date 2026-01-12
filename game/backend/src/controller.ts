import crypto from "crypto";
import http from "http";
import { IPlayer, IPlayerOptions, IRoom, IRoomOptions, IRoomPlayer, IRoomPlayerOptions, MessageTypes, Player, PlayerRole, PlayerStatus, RoomPlayer, } from "tiaoom";
import { Room, Tiaoom } from "tiaoom";
import { SocketManager } from "./socket";
import Games, { GameRoom, IGame, IGameInfo } from "./games";
import { Model } from "./model";
import { UserRepo } from "./entities";
import FishPi from "fishpi";
import utils from "./utils";

export class Controller extends Tiaoom {
  messages: { data: string, sender: Player, createdAt: number }[] = [];
  missSenderPlayers: RoomPlayer[] = [];
  boardcastMessage: string = '';

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
      const gameInfo = { ...Games[key] } as IGameInfo;
      delete (gameInfo as any).default; // 移除 default 导出函数
      obj[key] = gameInfo;
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
      else this.send({ type: MessageTypes.GlobalError, data: `游戏类型 ${gameType} 不存在，无法开始游戏。`, sender: room });
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
        }).on('leave', () => {
          if (room.validPlayers.length == 0) {
            // 房间无玩家则等待10分钟后关闭房间
            setTimeout(() => {
              if (room.validPlayers.length == 0) {
                this.closeRoom(null, room);
              }
            }, 10 * 60 * 1000);
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
        this.messages.push({ data: command.data, sender: command.sender, createdAt: Date.now() });
        this.messages = this.messages.slice(0, 500); // keep last 500 messages
        this.emit('message', command.data, command.sender);
      } else if (command.type === 'boardcast') {
        if (!command.sender?.isAdmin) return;
        this.boardcastMessage = command.data;
        this.messageInstance?.send({ 
          type: MessageTypes.GlobalCommand, 
          data: command, 
          senderIds: this.players.map(p => p.id)
        });
      }
    }).on("error", (error: any) => {
      console.log("error:", error);
    });
  }

  async createRoom(sender: IPlayer, options: IRoomOptions) {
    if (options.attrs?.passwd) {
      options.attrs.passwd = crypto.createHash('md5').update(options.attrs.passwd).digest('hex');
    }
    if (options.attrs?.point && !isNaN(options.attrs.point) && utils.config?.secret.goldenKey) {
      const username = sender?.attributes?.username;
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

  async loginPlayer(player: IPlayerOptions, cb?: (data: { player: Player; }) => void): Promise<Player> {
    const playerInstance = await super.loginPlayer(player, cb);
    if (this.boardcastMessage) 
      this.messageInstance?.send({ 
        type: MessageTypes.GlobalCommand, 
        data: { type: 'boardcast', data: this.boardcastMessage },
        senderIds: [playerInstance.id]
      });
    return playerInstance;
  }

  async joinPlayer(sender: IPlayer, player: IRoomPlayerOptions & { params?: { passwd: string } }, isCreator: boolean = false) {
    const room = this.rooms.find(r => r.id === player.roomId);
    if (room) {
      if (room.attrs?.passwd) {
        const passwdHash = crypto.createHash('md5').update(player.params?.passwd || '').digest('hex');
        if (room.attrs?.passwd !== passwdHash) {
          throw new Error("密码错误，无法加入房间。");
        }
      }
    }

    return await super.joinPlayer(sender, player, isCreator);
  }

  async startRoom(sender: IPlayer, room: IRoom) {
    const roomInstance = this.searchRoom(room);
    if (roomInstance && roomInstance.attrs?.point && !isNaN(roomInstance.attrs?.point) && utils.config?.secret.goldenKey) {
      for (const player of roomInstance.validPlayers) {
        const username = player.attributes?.username;
        if (!username) throw new Error("用户信息不完整，无法开始游戏。");
        // 检查用户积分是否足够
        await new FishPi().userPoints(username).then(points => {
          if (points < roomInstance.attrs!.point) {
            throw new Error(`玩家 ${player.name} 积分不足，无法开始游戏。`);
          }
        }).catch(err => {
          throw err;
        });
      }
    }
    if (roomInstance) {
      const gameType = roomInstance?.attrs?.type;
      const defaultExport = Games[gameType].default;
      if (defaultExport.prototype instanceof GameRoom) {
        const GameClass = defaultExport as new (room: Room) => GameRoom;
        const gameRoomInstance = new GameClass(roomInstance);
        gameRoomInstance.onPreStart(sender, roomInstance);
      }
    }
    return super.startRoom(sender, room);
  }

  isAdmin(player: IPlayer): Promise<boolean> {
    if (process.env.NODE_ENV === 'development' && player.name === 'Admin' || !utils.config) {
      return Promise.resolve(true);
    }
    return UserRepo().findOneBy({ id: player.id }).then(user => {
      return user?.isAdmin || false;
    });
  }
}
