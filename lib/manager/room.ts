// import SocketManager from "@lib/socket_manager";

import { RoomEvents } from "@lib/events/room";
import { Player } from "@lib/models/player";
import { Room } from "@lib/models/room";


export class RoomManager {
  roomList: Array<Room> = [];

  constructor() {
    console.log("Tiaoom:init room manager");
  }

  clearUsers() {
    this.roomList.splice(0, this.roomList.length);
  }

  getRoom(roomId: string) {
    return this.roomList.find((room) => room.id == roomId);
  }

  joinRoom(player: Player, roomId: string) {
    var room = this.getRoom(roomId);
    if (room) {
      room.addPlayer(player);
    }
  }

  quitRoomById(playerId: string, roomId: string) {
    var room = this.getRoom(roomId);
    if (room) {
      room.kickPlayer(playerId);
    }
  }

  quitRoom(player: Player, roomId: string) {
    const room = this.getRoom(roomId);
    if (room) {
      room.kickPlayer(player);
    }
  }

  getRoomList() {
    return this.roomList;
  }

  getRoomInfo(roomId: string) {
    const room = this.getRoom(roomId);
    if (room) {
      return {
        id: room.id,
        size: room.size,
        playerList: room.playerList,
      };
    }
    return null;
  }

  createRoom(size: number) {
    let id = this.roomList.length.toString();
    const room = new Room(id, size);
    this.roomList.push(room);
    return room;
  }

  destoryRoom(roomId: string) {
    const index = this.roomList.findIndex((room) => room.id == roomId);
    if (index > -1) {
      const room = this.roomList[index];
      this.roomList.splice(index, 1);
      room.emit("destoryed");
    }
  }

  private static instance: RoomManager;
  public static getInstance<T>() {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }
}
