import { EventEmitter } from "events";
import { TiaoomEvents } from "@lib/events";
import { IMessage, RecvMessageTypes, MessageTypes, IMessagePackage } from "@lib/models/message";
import { IRoom, IRoomPlayer, Room, IRoomOptions, IRoomPlayerOptions, RoomStatus, PlayerRole } from "@lib/models/room";
import { IPlayer, Player, IPlayerOptions, PlayerStatus } from "@lib/models/player";

export interface ITiaoomOptions {
  socket: IMessage;
}

export class Tiaoom extends EventEmitter {
  rooms: Room[] = []; // room list
  players: Player[] = []; // player list
  messageInstance?: IMessage;

  constructor({ socket }: ITiaoomOptions) {
    super();
    this.messageInstance = socket;
  }

  /**
   * 导出 JSON 数据
   * @returns 房间与玩家数据
   */
  toJSON() {
    return {
      rooms: this.rooms,
      players: this.players,
    };
  }

  /**
   * 从数据加载
   * @param data 房间与玩家数据
   * @returns this
   */
  loadFrom(data: { rooms?: Room[]; players?: Player[] }) {
    this.rooms = data.rooms?.map((r) => new Room(r, r.players)) ?? [];
    this.players = data.players?.map((p) => new Player(p, p.status)) ?? [];
    this.rooms.forEach((room) => {
      room.setSender((type, message, sender) => {
        this.send({ type: `room.${type}` as MessageTypes, data: message, sender: room });
      })
    })
    setTimeout(() => {
      this.rooms.forEach((room) => {
        room.players.forEach((player) => {
          if (!this.players.some((p) => p.id === player.id)) {
            this.offlinePlayer(player);
          }
        })
      })
    }, 60 * 1000);
    return this;
  }

  on<K extends keyof TiaoomEvents>(event: K, listener: TiaoomEvents[K]): this {
    super.on(event, listener);
    return this
  }

  emit<K extends keyof TiaoomEvents>(event: K, ...args: Parameters<TiaoomEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  /**
   * 判断玩家是否为管理员
   * @param player 玩家信息
   * @returns 是否为管理员
   */
  async isAdmin(_player: IPlayer) {
    return false;
  }

  /**
   * 判断玩家是否被封禁
   * @param _player 玩家信息
   * @returns 是否被封禁
   */
  async isBanned(_player: IPlayer) {
    return false;
  }

  run() {
    this.messageInstance?.on("message", async (message: any, cb?: (err: Error | null, data?: any) => any) => {
      message.sender = message.sender ? this.searchPlayer(message.sender) || message.sender : null;
      try {
        switch (message.type) {
          case RecvMessageTypes.RoomList:
            return cb?.(null, this.rooms);
          case RecvMessageTypes.PlayerList:
            return cb?.(null, this.players);
          case RecvMessageTypes.RoomCreate:
            return cb?.(null, await this.createRoom(message.sender, message.data));
          case RecvMessageTypes.PlayerJoin:
            return await this.joinPlayer(message.sender, message.data);
          case RecvMessageTypes.PlayerLeave:
            return await this.leavePlayer(message.sender, message.data);
          case RecvMessageTypes.PlayerStandUp:
            return await this.leaveSeat(message.sender, message.data);
          case RecvMessageTypes.RoomGet:
            return cb?.(null, this.searchRoom(message.data));
          case RecvMessageTypes.RoomStart:
            return await this.startRoom(message.sender, message.data);
          case RecvMessageTypes.RoomKick:
            return await this.kickPlayer(message.sender, message.data);
          case RecvMessageTypes.RoomTransfer:
            return await this.transferOwner(message.sender, message.data);
          case RecvMessageTypes.RoomClose:
            return await this.closeRoom(message.sender, message.data);
          case RecvMessageTypes.PlayerLogin:
            return await this.loginPlayer(message.data);
          case RecvMessageTypes.PlayerLogout:
            return await this.removePlayer(message.data);
          case MessageTypes.PlayerOffline:
            return await this.offlinePlayer(message.data);
          case RecvMessageTypes.PlayerReady:
            return await this.readyPlayer(message.sender, message.data);
          case RecvMessageTypes.PlayerUnready:
            return await this.unReadyPlayer(message.sender, message.data);
          case RecvMessageTypes.RoomPlayerCommand:
            return this.searchRoom(message.data)?.emit("player-command", { ...message.data , sender: message.sender });
          case RecvMessageTypes.GlobalCommand:
            return this.emit("command", { ...message.data , sender: message.sender });
          default:
            throw new Error('unknown message type.');
        }
      } catch (error) {
        cb?.(error as Error);
        if (message.sender) this.send({
          type: MessageTypes.PlayerError,
          data: {
            name: (error as Error).name, 
            message: (error as Error).message,
            stack: (error as Error).stack,
          },
          sender: message.sender,
        });
      }
    });

    this.on('player', (player, online) => {
      this.send({ type: online ? MessageTypes.PlayerLogin : MessageTypes.PlayerLogout, data: player });
    });

    this.on('players', (players) => {
      this.send({ type: MessageTypes.PlayerList, data: players });
    });

    this.on('room', (room) => {
      this.send({ type: MessageTypes.RoomCreate, data: room });
    });

    this.on('room-player', (room) => {
      this.send({ type: MessageTypes.RoomUpdate, data: room });
    });

    this.on('rooms', (rooms) => {
      this.send({ type: MessageTypes.RoomList, data: rooms });
    });

    this.on('message', (data, sender) => {
      this.send({ type: MessageTypes.GlobalMessage, data, sender });
    });

    return this;
  }

  searchPlayer(player: string): Player | undefined;
  searchPlayer(player: IPlayerOptions | IRoomPlayerOptions): Player | undefined;

  searchPlayer(player: IPlayerOptions | IRoomPlayerOptions | string) {
    const playerId = typeof player === "string" ? player : player?.id;
    return this.players.find((target) => target.id === playerId);
  }

  searchRoom(room: string): Room | undefined;
  searchRoom(room: Partial<IRoomOptions>): Room | undefined;

  searchRoom(room: Partial<IRoomOptions> | string) {
    const roomId = typeof room === "string" ? room : room?.id;
    return this.rooms.find((target) => target.id === roomId);
  }

  async createRoom(sender: IPlayer, options: IRoomOptions) {
    if (!sender) {
      throw new Error('missing player information.');
    }

    if (!options.name) {
      throw new Error('missing room id or name.');
    }
    const roomInstance = this.searchRoom(options);
    if (roomInstance) {
      throw new Error('room already exists.');
    }

    if (this.rooms.some(r => r.players.some(p => p.id === sender?.id))) {
      throw new Error('you are already in a room.');
    }

    const room = new Room(options);
    room.setSender((type, message, sender) => {
      this.send({ type: `room.${type}` as MessageTypes, data: message, sender: room });
    });
    
    this.rooms.push(room);
    this.emit("room", room);
    this.joinPlayer(sender, { roomId: room.id, ...sender }, true);
    return room;
  }

  async startRoom(sender: IPlayer, room: IRoom) {
    const roomInstance = this.searchRoom(room);
    if (!roomInstance) {
      throw new Error('room not found.');
    }
    roomInstance.start(sender);

    return this.emit("room-player", roomInstance);
  }

  async closeRoom(sender: IPlayer | null, room: IRoom) {
    const roomIndex = this.rooms.findIndex((r) => r.id === room.id);
    const roomInstance = this.rooms[roomIndex];
    if (!roomInstance) {
      throw new Error('room not found.');
    }

    if (sender?.id && !sender.isAdmin) {
      const senderInRoom = roomInstance.searchPlayer(sender);
      if (!senderInRoom || !senderInRoom.isCreator) {
        throw new Error('permission denied.');
      }
    }

    room = this.rooms.splice(roomIndex, 1)[0];

    this.emit("rooms", this.rooms);
    roomInstance.emit('close');
    return room;
  }

  async kickPlayer(sender: IPlayer, data: { roomId: string, playerId: string }) {
    const room = this.searchRoom(data.roomId);
    if (!room) {
      throw new Error('room not found.');
    }

    if (!sender.isAdmin) {
      const senderInRoom = room.searchPlayer(sender);
      if (!senderInRoom || !senderInRoom.isCreator) {
        throw new Error('permission denied.');
      }
    }

    const targetPlayer = room.players.find(p => p.id === data.playerId);
    if (!targetPlayer) {
      throw new Error('player not found in room.');
    }

    const roomPlayer = room.kickPlayer(targetPlayer);
    if (roomPlayer) this.emit("room-player", room);
    return roomPlayer;
  }

  async transferOwner(sender: IPlayer, data: { roomId: string, playerId: string }) {
    const room = this.searchRoom(data.roomId);
    if (!room) {
      throw new Error('room not found.');
    }

    const creator = room.players.find(p => p.isCreator);
    if (!sender.isAdmin) {
      const senderInRoom = room.searchPlayer(sender);
      if (!senderInRoom || !senderInRoom.isCreator) {
        throw new Error('permission denied.');
      }
    } else {

    }

    const targetPlayer = room.players.find(p => p.id === data.playerId);
    if (!targetPlayer) {
      throw new Error('player not found in room.');
    }

    if (targetPlayer.id === sender.id) {
      return;
    }

    if (creator) creator.isCreator = false;
    targetPlayer.isCreator = true;

    this.emit("room-player", room);
    return room;
  }

  async loginPlayer (player: IPlayerOptions, cb?: (data: { player: Player }) => void) {
    let playerInstance = this.searchPlayer(player);
    if (!playerInstance?.sender) {
      if (!playerInstance) {
        playerInstance = new Player(player);
        this.players.push(playerInstance);
      }
      playerInstance.isAdmin = await this.isAdmin(playerInstance);
      playerInstance.setSender((type, message) => {
        this.send({ type: `player.${type}` as MessageTypes, data: message, sender: playerInstance });
      });
      this.emit("player", playerInstance, true);

      const room = this.rooms.find(r => r.players.some(p => p.id === playerInstance!.id));
      if (room) {
        const playerIndex = room.players.findIndex(p => p.id === playerInstance!.id);
        if (playerIndex >= 0) {
          const status = room?.status == RoomStatus.playing ? PlayerStatus.playing : PlayerStatus.online;
          playerInstance.status = status;
          playerInstance.attributes = Object.assign({}, room.players[playerIndex].attributes, playerInstance.attributes);
          Object.assign(room.players[playerIndex], playerInstance);
          room.emit('update', room);
        }
      }
    }

    playerInstance.emit("status", playerInstance.status);

    cb?.({ player: playerInstance });
    return playerInstance;
  }

  async joinPlayer(sender: IPlayer, player: IRoomPlayerOptions, isCreator: boolean = false) {
    let playerInstance = this.searchPlayer(sender);
    if (!playerInstance) {
      playerInstance = await this.loginPlayer(sender);
    }

    if (!player.roomId) {
      throw new Error('missing room id.');
    }

    const room = this.rooms.find((room) => room.id === player.roomId);
    if (!room) {
      throw new Error('room not found.');
    }

    let role = PlayerRole.player;
    if (this.rooms.some(r => r.id != room.id && r.players.some(p => p.id === playerInstance!.id && p.role === PlayerRole.player))) {
      throw new Error('you are already playing in another room.');
    }

    if (!isCreator && !room.players.some(p => p.isCreator)) {
      isCreator = true;
    }

    const roomPlayer = room.addPlayer(playerInstance, isCreator, role);
    if (roomPlayer) {
      this.emit("room-player", room);
    }

    return roomPlayer;
  }

  async leavePlayer(sender: IPlayer, player: IRoomPlayerOptions) {
    if (!player.roomId) {
      throw new Error('missing room id.');
    }

    const room = this.rooms.find((room) => room.id === player.roomId);
    if (!room) {
      throw new Error('room not found.');
    }

    const playerInstance = room.searchPlayer(sender);
    if (!playerInstance) {
      throw new Error('player not in room.');
    }

    const roomPlayer = room.kickPlayer(playerInstance);

    if (roomPlayer) this.emit("room-player", room);

    return roomPlayer;
  }
  
  async leaveSeat(sender: IPlayer, player: IRoomPlayerOptions) {
    if (!player.roomId) {
      throw new Error('missing room id.');
    }

    const room = this.rooms.find((room) => room.id === player.roomId);
    if (!room) {
      throw new Error('room not found.');
    }

    const playerInstance = room.searchPlayer(sender);
    if (!playerInstance) {
      throw new Error('player not in room.');
    }

    const roomPlayer = room.leaveSeat(playerInstance);
    if (roomPlayer) this.emit("room-player", room);

    return roomPlayer;
  }

  async readyPlayer(sender: IPlayer, player: IRoomPlayer) {
    const playerInstance = this.searchPlayer(sender);
    if (!playerInstance) {
      throw new Error('player not found.');
    }

    if (!player.roomId) {
      throw new Error('missing room id.');
    }

    const room = this.rooms.find((room) => room.id === player.roomId);
    if (!room) {
      throw new Error('room not found.');
    }

    const roomPlayer = room.searchPlayer(playerInstance);
    
    if (!roomPlayer) {
      throw new Error('player not in room.');
    }

    roomPlayer.isReady = true;

    if (room.isReady) {
      room.emit("all-ready", room.players);
    }

    playerInstance.status = PlayerStatus.ready;

    room.emit("player-ready", { ...player, ...roomPlayer });
    room.emit('update', room);

    return this;
  }
    
  async unReadyPlayer(sender: IPlayer, player: IRoomPlayer) {
    const playerInstance = this.searchPlayer(sender);
    if (!playerInstance) {
      throw new Error('player not found.');
    }

    if (!player.roomId) {
      throw new Error('missing room id.');
    }

    const room = this.rooms.find((room) => room.id === player.roomId);
    if (!room) {
      throw new Error('room not found.');
    }

    const roomPlayer = room.searchPlayer(playerInstance);
    
    if (!roomPlayer) {
      throw new Error('player not in room.');
    }

    roomPlayer.isReady = false;
    playerInstance.status = PlayerStatus.unready;
    room.emit("player-unready", { ...player, ...roomPlayer });
    room.emit('update', room);

    return this;
  }

  async removePlayer(sender: IPlayer) {
    const playerIndex = this.players.findIndex((p) => p.id === sender?.id);
    const player = this.players[playerIndex];
    if (playerIndex > -1) {
      this.players.splice(playerIndex, 1)[0];
      this.emit("player", player, false);
    }
    return player;
  }

  async offlinePlayer(sender: IPlayer) {
    const room = this.rooms.find((room) => room.players.some(p => p.id === sender?.id));
    if (room) {
      setTimeout(() => {
        const playerInstance = room.players.find(p => p.id === sender.id && p.role === PlayerRole.player);
        if (this.players.some(p => p.id === sender.id) || !playerInstance) 
          return; // player is online
        playerInstance.status = PlayerStatus.offline;
        room.emit("player-offline", playerInstance);
        playerInstance.status = PlayerStatus.offline;
        room.emit('update', room);
      }, 60 * 1000); // 1 minute later
    }
    this.removePlayer(sender);
    return sender;
  }

  async send(message: IMessagePackage) {
    // send a message to the client
    if (message.type.startsWith('player.') && message.sender) {
      const player = message.sender as Player;
      // Send to all sockets of the player
      this.messageInstance?.send({ 
        type: message.type, 
        data: message.data, 
        senderIds: [player.id]
      });
    }
    else if (message.type.startsWith('room.') && message.sender) {
      const room = message.sender as Room;
      this.messageInstance?.send({ 
        type: message.type, 
        data: message.data, 
        senderIds: room.players.map(p => p.id)
      });
    } else {
      this.messageInstance?.send({ 
        type: message.type, 
        data: message.data, 
        senderIds: this.players.map(p => p.id)
      });
    }
  }
}

export * from "@lib/models/message";
export * from "@lib/models/room";
export * from "@lib/models/player";
export * from "@lib/events";