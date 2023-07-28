// import SocketManager from "@lib/socket_manager";

import { RoomEvents } from "@lib/events/room_events";
import { Player } from "@lib/models/player";
import { Room } from "@lib/models/room";
import { EventEmitter } from "stream";

var roomList: Array<Room> = [];
export class RoomManager extends EventEmitter {
  on<K extends keyof RoomEvents>(event: K, listener: RoomEvents[K]): this {
    return super.on(event, listener);
  }
  init() {
    roomList = [];
    this.emit("init");
    console.log("Tiaoom:init room manager");
  }

  clearUsers() {
    roomList = [];
  }

  getRoom(roomId: string) {
    return roomList.find((room) => room.id == roomId);
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
      room.kickPlayerById(playerId);
    }
  }

  quitRoom(player: Player, roomId: string) {
    var room = this.getRoom(roomId);
    if (room) {
      room.kickPlayer(player);
    }
  }

  getRoomList() {
    return roomList;
  }

  playerReady(roomId: string, userId: string) {
    var room = this.getRoom(roomId);
    if (room) {
      room.playerReadyById(userId);
    }
    this.emit("playerReady", roomId, userId);
  }

  playerUnReady(roomId: string, userId: string) {
    var room = this.getRoom(roomId);
    if (room) {
      room.playerUnReadyById(userId);
    }
    this.emit("playerUnReady", roomId, userId);
  }

  getRoomInfo(roomId: string) {
    var room = this.getRoom(roomId);
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
    let id = roomList.length.toString();
    roomList.push(new Room(id, size));
    this.emit("roomCreated", id, size);
    return id;
  }

  destoryRoom(roomId: string) {
    var index = roomList.findIndex((room) => room.id == roomId);
    if (index > -1) {
      roomList.splice(index, 1);
      this.emit("roomDestoryed", roomId);
    }
  }

  private static instance: RoomManager;
  public static getInstance() {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }
}
