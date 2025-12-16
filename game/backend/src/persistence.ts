import { Room as GameRoom, RoomPlayer } from "tiaoom";
import { Room, RoomRepo, MongoRoomRepo, redisClient, RoomSQL, RoomMongo } from "./entities";
import utils from "@/utils";

export interface IRoomPersistence {
  createRoom(room: GameRoom): Promise<any>;
  getRooms(): Promise<Room[]>;
  updatePlayerList(roomId: string, players: RoomPlayer[]): Promise<void>;
  saveGameData(roomId: string, gameData: any): Promise<void>;
  getGameData(roomId: string): Promise<any>;
  closeRoom(roomId: string): Promise<void>;
}

class MySQLPersistence implements IRoomPersistence {
  async createRoom(room: GameRoom) {
    const existing = await RoomRepo.findOneBy({ roomId: room.id });
    if (existing) return existing;
    const newRoom = new RoomSQL(room);
    return RoomRepo.save(RoomRepo.create(newRoom));
  }

  async getRooms() {
    return RoomRepo.find();
  }

  async updatePlayerList(roomId: string, players: RoomPlayer[]) {
    const room = await RoomRepo.findOneBy({ roomId: roomId });
    if (room) {
      room.players = players;
      await RoomRepo.save(room);
    }
  }

  async saveGameData(roomId: string, gameData: any) {
    const room = await RoomRepo.findOneBy({ roomId: roomId });
    if (room) {
      room.gameData = gameData;
      await RoomRepo.save(room);
    }
  }

  async getGameData(roomId: string) {
    const room = await RoomRepo.findOneBy({ roomId: roomId });
    return room ? room.gameData : null;
  }

  async closeRoom(roomId: string) {
    await RoomRepo.delete({ roomId: roomId });
  }
}

class MemoryPersistence implements IRoomPersistence {
  private rooms: Map<string, Room> = new Map();

  async createRoom(room: GameRoom) {
    if (this.rooms.has(room.id)) return this.rooms.get(room.id)!;
    const newRoom = new Room(room);
    if (!newRoom.createdAt) newRoom.createdAt = Date.now();
    if (!newRoom.updatedAt) newRoom.updatedAt = Date.now();
    this.rooms.set(room.id, newRoom);
    return newRoom;
  }

  async getRooms() {
    return Array.from(this.rooms.values());
  }

  async updatePlayerList(roomId: string, players: RoomPlayer[]) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.players = players;
      room.updatedAt = Date.now();
    }
  }

  async saveGameData(roomId: string, gameData: any) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.gameData = gameData;
      room.updatedAt = Date.now();
    }
  }

  async getGameData(roomId: string) {
    const room = this.rooms.get(roomId);
    return room ? room.gameData : null;
  }

  async closeRoom(roomId: string) {
    this.rooms.delete(roomId);
  }
}

class RedisPersistence implements IRoomPersistence {
  private prefix: string;

  constructor() {
    const { prefix } = utils.config.persistence || {};
    this.prefix = (prefix || 'tiaoom:').replace(/[_\/]/g, ':');
  }

  private get client() {
    return redisClient!;
  }

  private getKey(roomId: string) {
    return `${this.prefix}room:${roomId}`;
  }

  async createRoom(room: GameRoom) {
    const key = this.getKey(room.id);
    const exists = await this.client.exists(key);
    if (exists) {
        const data = await this.client.get(key);
        return JSON.parse(data!) as Room;
    }
    const newRoom = new Room(room);
    newRoom.createdAt = Date.now();
    newRoom.updatedAt = Date.now();
    await this.client.set(key, JSON.stringify(newRoom));
    return newRoom;
  }

  async getRooms() {
    const keys = await this.client.keys(`${this.prefix}room:*`);
    const rooms: Room[] = [];
    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) rooms.push(JSON.parse(data));
    }
    return rooms;
  }

  async updatePlayerList(roomId: string, players: RoomPlayer[]) {
    const key = this.getKey(roomId);
    const data = await this.client.get(key);
    if (data) {
      const room = JSON.parse(data);
      room.players = players;
      room.updatedAt = Date.now();
      await this.client.set(key, JSON.stringify(room));
    }
  }

  async saveGameData(roomId: string, gameData: any) {
    const key = this.getKey(roomId);
    const data = await this.client.get(key);
    if (data) {
      const room = JSON.parse(data);
      room.gameData = gameData;
      room.updatedAt = Date.now();
      await this.client.set(key, JSON.stringify(room));
    }
  }

  async getGameData(roomId: string) {
    const key = this.getKey(roomId);
    const data = await this.client.get(key);
    return data ? JSON.parse(data).gameData : null;
  }

  async closeRoom(roomId: string) {
    await this.client.del(this.getKey(roomId));
  }
}

class MongoPersistence implements IRoomPersistence {
  async createRoom(room: GameRoom) {
    const existing = await MongoRoomRepo.findOneBy({ roomId: room.id });
    if (existing) return existing;
    
    const newRoom = new RoomMongo(room);
    newRoom.createdAt = Date.now();
    newRoom.updatedAt = Date.now();
    return MongoRoomRepo.save(newRoom);
  }

  async getRooms() {
    return MongoRoomRepo.find();
  }

  async updatePlayerList(roomId: string, players: RoomPlayer[]) {
    // TypeORM MongoRepository updateOne uses MongoDB driver syntax
    await MongoRoomRepo.updateOne({ roomId: roomId }, { $set: { players, updatedAt: Date.now() } });
  }

  async saveGameData(roomId: string, gameData: any) {
    await MongoRoomRepo.updateOne({ roomId: roomId }, { $set: { gameData, updatedAt: Date.now() } });
  }

  async getGameData(roomId: string) {
    const room = await MongoRoomRepo.findOneBy({ roomId: roomId });
    return room ? room.gameData : null;
  }

  async closeRoom(roomId: string) {
    await MongoRoomRepo.deleteOne({ roomId: roomId });
  }
}

export class PersistenceFactory {
  private static instance: IRoomPersistence;

  static getPersistence(): IRoomPersistence {
    if (this.instance) return this.instance;

    const driver = utils.config.persistence?.driver || 'none';
    switch (driver) {
      case 'mysql':
        this.instance = new MySQLPersistence();
        break;
      case 'redis':
        this.instance = new RedisPersistence();
        break;
      case 'mongodb':
        this.instance = new MongoPersistence();
        break;
      case 'none':
      default:
        this.instance = new MemoryPersistence();
        break;
    }
    return this.instance;
  }
}
