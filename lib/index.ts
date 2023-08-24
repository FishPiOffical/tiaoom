import { EventEmitter } from "events";
import { TiaoomEvents } from "./events";
import { Message } from "./models/message";
import { IRoom, IRoomPlayer, Room, RoomOptions, RoomPlayer, RoomPlayerOptions } from "./models/room";
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
    return super.on(event, listener);
  }

  emit<K extends keyof TiaoomEvents>(event: K, ...args: Parameters<TiaoomEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  run() {
    this.messageInstance?.on("message", (message: any, cb?: (err: Error | null, ...params:any) => any) => {
      try {
        switch (message.type) {
          case "room.create":
            return this.createRoom(message.data, (...params:any) => cb?.(null, ...params));
          case "player.join":
            return this.joinPlayer(message.data, (...params:any) => cb?.(null, ...params));
          case "player.leave":
            return this.leavePlayer(message.data), cb?.(null);
          case "room.start":
            return this.startRoom(message.data), cb?.(null);
          case "room.close":
            return this.closeRoom(message.data), cb?.(null);
          case "player.ready":
            return this.readyPlayer(message.data), cb?.(null);
          case "player.unready":
            return this.unreadyPlayer(message.data), cb?.(null);
          case "player.command":
            return this.searchPlayer(message.data)?.emit("command", message.data), cb?.(null);
          case "room.command":
            return this.searchRoom(message.data)?.emit("command", message.data), cb?.(null);
          case "room.message":
            return this.searchRoom(message.data)?.emit("message", message.data), cb?.(null);
        }        
      } catch (error) {
        cb?.(error as Error);
      }
    });

    return this;
  }

  searchPlayer(player: string): Player | undefined;
  searchPlayer(player: PlayerOptions | RoomPlayerOptions): Player | undefined;

  searchPlayer(player: PlayerOptions | RoomPlayerOptions | string) {
    const playerId = typeof player === "string" ? player : player.id;
    return this.players.find((target) => target.id === playerId);
  }

  searchRoom(room: string): Room | undefined;
  searchRoom(room: RoomOptions): Room | undefined;

  searchRoom(room: RoomOptions | string) {
    const roomId = typeof room === "string" ? room : room.id;
    return this.rooms.find((target) => target.id === roomId);
  }

  private createRoom(options: RoomOptions, cb?: (room: Room) => void) {
    const room = new Room(options);
    room.setSender((type, message) => {
      this.messageInstance?.send({ type: `room.${type}`, data: message, sender: room });
    });
    this.rooms.push(room);
    cb?.(room);
    return this.emit("room", room);
  }

  private startRoom(room: IRoom) {
    const roomInstance = this.rooms.find((r) => r.id === room.id);
    if (!roomInstance) {
      throw new Error('room not found.');
    }

    return roomInstance.start();
  }

  private closeRoom(room: IRoom) {
    const roomIndex = this.rooms.findIndex((r) => r.id === room.id);
    const roomInstance = this.rooms[roomIndex];
    if (!roomInstance) {
      throw new Error('room not found.');
    }

    this.rooms.splice(roomIndex, 1);
    return roomInstance.emit('close');    
  }

  private joinPlayer(player: RoomPlayerOptions, cb?: (data: { room: Room, player: RoomPlayer }) => void) {
    let playerInstance = this.searchPlayer(player);
    if (!playerInstance) {
      playerInstance = new Player(player);
      playerInstance.setSender((type, message) => {
        this.messageInstance?.send({ type: `player.${type}`, data: message, sender: playerInstance });
      });
      this.players.push(playerInstance);
      this.emit("player", playerInstance);
      playerInstance.emit("status", PlayerStatus.online);
    }

    if (!player.roomId) {
      throw new Error('missing room id.');
    }

    const room = this.rooms.find((room) => room.id === player.roomId);
    if (!room) {
      throw new Error('room not found.');
    }

    const roomPlayer = room.addPlayer(playerInstance);
    if (!roomPlayer) {
      throw new Error('room is full.');
    }

    cb?.({ room, player: roomPlayer });
    return room.emit("join", roomPlayer);
  }

  private leavePlayer(player: IRoomPlayer) {
    const playerInstance = this.searchPlayer(player);
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

    return room.emit("leave", room.kickPlayer(playerInstance));
  }

  private readyPlayer(player: IRoomPlayer) {
    const playerInstance = this.searchPlayer(player);
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

    return room.emit("player-ready", roomPlayer);
  }
    
  private unreadyPlayer(player: IRoomPlayer) {
    const playerInstance = this.searchPlayer(player);
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

    return room.emit("player-unready", roomPlayer);
  }
}

export * from "./models/message";
export * from "./models/room";
export * from "./models/player";
export * from "./events";