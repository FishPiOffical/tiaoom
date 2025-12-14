import { Room as GameRoom } from "tiaoom";
import { Room, RoomRepo } from "./entities";

export class Model {
  static async createRoom(room: GameRoom) {
    if (await RoomRepo.findOneBy({ id: room.id })) return room;
    const newRoom = new Room(room);
    return RoomRepo.save(RoomRepo.create(newRoom));
  }

  static getRooms() {
    return RoomRepo.find();
  }

  static async updatePlayerList(roomId: string, players: any[]) {
    const room = await RoomRepo.findOneBy({ id: roomId });
    if (room) {
      room.players = players;
      await RoomRepo.update({ id: roomId }, room);
    }
  }

  static async saveGameData(roomId: string, gameData: any) {
    const room = await RoomRepo.findOneBy({ id: roomId });
    if (room) {
      room.gameData = gameData;
      await RoomRepo.update({ id: roomId }, room);
    }
  }

  static async getGameData(roomId: string) {
    const room = await RoomRepo.findOneBy({ id: roomId });
    return room ? room.gameData : null;
  }

  static async closeRoom(roomId: string) {
    await RoomRepo.delete({ id: roomId });
  }
}