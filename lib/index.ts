import { EventEmitter } from "events";
import { TiaoomEvents } from "./events";
import { Message } from "./models/message";
import { IRoom, IRoomPlayer, Room, RoomOptions, IRoomPlayerOptions } from "./models/room";
import { IPlayer, Player, PlayerOptions, PlayerStatus } from "./models/player";

export interface TiaoomOptions {
  socket: Message;
}

export class Tiaoom extends EventEmitter {
  rooms: Room[] = []; // room list
  players: Player[] = []; // player list
  messageInstance?: Message;

  constructor({ socket }: TiaoomOptions) {
    super();
    this.messageInstance = socket;
  }

  on<K extends keyof TiaoomEvents>(event: K, listener: TiaoomEvents[K]): this {
    super.on(event, listener);
    return this
  }

  emit<K extends keyof TiaoomEvents>(event: K, ...args: Parameters<TiaoomEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  run() {
    this.messageInstance?.on("message", (message: any, cb?: (err: Error | null, data?: any) => any) => {
      try {
        switch (message.type) {
          case "room.list":
            return cb?.(null, this.rooms);
          case "player.list":
            return cb?.(null, this.players);
          case "room.create":
            return this.createRoom(message.sender, message.data);
          case "player.join":
            return this.joinPlayer(message.sender, message.data);
          case "player.leave":
            return this.leavePlayer(message.sender, message.data);
          case "room.get":
            return cb?.(null, this.searchRoom(message.data));
          case "room.start":
            return this.startRoom(message.sender, message.data);
          case "room.close":
            return this.closeRoom(message.sender, message.data);
          case "player.login":
            return this.loginPlayer(message.data);
          case "player.logout":
            return this.removePlayer(message.data);
          case "player.ready":
            return this.readyPlayer(message.sender, message.data);
          case "player.unready":
            return this.unReadyPlayer(message.sender, message.data);
          case "player.command":
            return this.searchPlayer(message.data)?.emit("command", message.data);
          case "room.command":
            return this.searchRoom(message.data)?.emit("command", message.data);
          case "room.message":
            return this.searchRoom(message.data)?.emit("message", message.data);
        }
      } catch (error) {
        cb?.(error as Error);
      }
    });

    this.on('player', (player, online) => {
      this.messageInstance?.send({ type: online ? 'player.login' : 'player.logout', data: player });
    });

    this.on('players', (players) => {
      this.messageInstance?.send({ type: 'player.list', data: players });
    });

    this.on('room', (room) => {
      this.messageInstance?.send({ type: 'room.create', data: room });
    });

    this.on('rooms', (rooms) => {
      this.messageInstance?.send({ type: 'room.list', data: rooms });
    });

    return this;
  }

  searchPlayer(player: string): Player | undefined;
  searchPlayer(player: PlayerOptions | IRoomPlayerOptions): Player | undefined;

  searchPlayer(player: PlayerOptions | IRoomPlayerOptions | string) {
    const playerId = typeof player === "string" ? player : player.id;
    return this.players.find((target) => target.id === playerId);
  }

  searchRoom(room: string): Room | undefined;
  searchRoom(room: RoomOptions): Room | undefined;

  searchRoom(room: RoomOptions | string) {
    const roomId = typeof room === "string" ? room : room.id;
    return this.rooms.find((target) => target.id === roomId);
  }

  createRoom(sender: IPlayer, options: RoomOptions) {
    const roomInstance = this.searchRoom(options);
    if (roomInstance) {
      throw new Error('room already exists.');
    }

    const room = new Room(options, sender.id);
    room.setSender((type, message) => {
      this.messageInstance?.send({ type: `room.${type}`, data: message, sender: room });
    });
    this.rooms.push(room);
    this.joinPlayer(sender, { roomId: room.id, ...sender }, true);
    this.emit("room", room);
    return room;
  }

  startRoom(sender: IPlayer, room: IRoom) {
    const roomInstance = this.searchRoom(room);
    if (!roomInstance) {
      throw new Error('room not found.');
    }

    this.messageInstance?.send({ type: `room.start`, data: room });
    return roomInstance.start();
  }

  closeRoom(sender: IPlayer, room: IRoom) {
    const roomIndex = this.rooms.findIndex((r) => r.id === room.id);
    const roomInstance = this.rooms[roomIndex];
    if (!roomInstance) {
      throw new Error('room not found.');
    }

    room = this.rooms.splice(roomIndex, 1)[0];

    this.messageInstance?.send({ type: `room.close`, data: room });
    this.emit("rooms", this.rooms);
    this.messageInstance?.send({ type: `room.list`, data: this.rooms });
    roomInstance.emit('close');
    return room;
  }

  loginPlayer (player: PlayerOptions, cb?: (data: { player: Player }) => void): Player {
    let playerInstance = this.searchPlayer(player);
    if (!playerInstance) {
      playerInstance = new Player(player);
      playerInstance.setSender((type, message) => {
        this.messageInstance?.send({ type: `player.${type}`, data: message, sender: playerInstance });
      });
      this.players.push(playerInstance);
      this.emit("player", playerInstance, true);
    }
    
    playerInstance.emit("status", PlayerStatus.online);
    cb?.({ player: playerInstance });
    return playerInstance;
  }

  joinPlayer(sender: IPlayer, player: IRoomPlayerOptions, isCreator: boolean = false) {
    let playerInstance = this.searchPlayer(sender);
    if (!playerInstance) {
      playerInstance = this.loginPlayer(sender);
    }

    if (!player.roomId) {
      throw new Error('missing room id.');
    }

    const room = this.rooms.find((room) => room.id === player.roomId);
    if (!room) {
      throw new Error('room not found.');
    }

    const roomPlayer = room.addPlayer(playerInstance, isCreator);
    if (!roomPlayer) {
      throw new Error('room is full.');
    }

    return roomPlayer;
  }

  leavePlayer(sender: IPlayer, player: IRoomPlayerOptions) {
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

    return room.kickPlayer(playerInstance);
  }

  readyPlayer(sender: IPlayer, player: IRoomPlayer) {
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

    playerInstance.emit("status", PlayerStatus.ready);

    room.emit("player-ready", roomPlayer);

    return this;
  }
    
  unReadyPlayer(sender: IPlayer, player: IRoomPlayer) {
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
    playerInstance.emit("status", PlayerStatus.unready);
    room.emit("player-unready", roomPlayer);

    return this;
  }

  removePlayer(sender: IPlayer) {
    const playerIndex = this.players.findIndex((p) => p.id === sender.id);
    const player = this.players[playerIndex];
    if (playerIndex > -1) {
      this.players.splice(playerIndex, 1)[0];
      this.emit("player", player, false);
      if (this.rooms.some(r => r.searchPlayer(player))) {
        setTimeout(() => {
          this.rooms.filter(r => r.searchPlayer(player)).forEach(r => {
            this.leavePlayer(sender, { ...sender, roomId: r.id });
          });
        }, 5 * 60 * 1000); // 5 minutes later
      }
    }
    return player;
  }
}

export * from "./models/message";
export * from "./models/room";
export * from "./models/player";
export * from "./events";