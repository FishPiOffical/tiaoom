import { Room as GameRoom } from "tiaoom";
import { PersistenceFactory } from "./persistence";

export class Model {
  static async createRoom(room: GameRoom) {
    return PersistenceFactory.getPersistence().createRoom(room);
  }

  static getRooms() {
    return PersistenceFactory.getPersistence().getRooms();
  }

  static async updatePlayerList(roomId: string, players: any[]) {
    return PersistenceFactory.getPersistence().updatePlayerList(roomId, players);
  }

  static async saveGameData(roomId: string, gameData: any) {
    return PersistenceFactory.getPersistence().saveGameData(roomId, gameData);
  }

  static async getGameData(roomId: string) {
    return PersistenceFactory.getPersistence().getGameData(roomId);
  }

  static async closeRoom(roomId: string) {
    return PersistenceFactory.getPersistence().closeRoom(roomId);
  }
}