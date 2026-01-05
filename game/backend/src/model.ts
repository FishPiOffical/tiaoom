import { Room as GameRoom } from "tiaoom";
import { PersistenceFactory } from "./persistence";
import { isConfigured } from "./utils/config";

export class Model {
  static async createRoom(room: GameRoom) {
    if (!isConfigured()) return;
    return PersistenceFactory.getPersistence().createRoom(room);
  }

  static getRooms() {
    if (!isConfigured()) return Promise.resolve([]);
    return PersistenceFactory.getPersistence().getRooms();
  }

  static async updatePlayerList(roomId: string, players: any[]) {
    if (!isConfigured()) return;
    return PersistenceFactory.getPersistence().updatePlayerList(roomId, players);
  }

  static async saveGameData(roomId: string, gameData: any) {
    if (!isConfigured()) return;
    return PersistenceFactory.getPersistence().saveGameData(roomId, gameData);
  }

  static async getGameData(roomId: string) {
    if (!isConfigured()) return;
    return PersistenceFactory.getPersistence().getGameData(roomId);
  }

  static async closeRoom(roomId: string) {
    if (!isConfigured()) return;
    return PersistenceFactory.getPersistence().closeRoom(roomId);
  }
}