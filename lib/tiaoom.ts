import { EventEmitter } from "events";
import { TiaoomEvents } from "./events/tiaoom_events";
import { RoomManager } from "./manager/room_manager";
import { SocketManager } from "./manager/socket_manager";
import { PlayerManager } from "./manager/player_manager";
import { Message } from "./models/message";

export class Tiaoom extends EventEmitter {
  port: number = 27015;
  playerManager: PlayerManager = PlayerManager.getInstance();
  roomManager: RoomManager = RoomManager.getInstance();
  private socketManager?: SocketManager;
  //初始化服务
  init(port: number) {
    this.port = port;
    this.socketManager = new SocketManager();
    this.socketManager.on("init", () => {
      this.emit("init");
    });
    this.socketManager.on("close", () => {
      this.emit("close");
    });
    this.socketManager.on("message", (message: Message) => {
      console.log("Tiaoom:receive message from client:");
      console.log(message);
      console.log("type:", message.type);
      var data = message.data;
      switch (message.type) {
        case "createRoom":
          var size = data.size ? data.size : 10;
          var roomId = this.roomManager.createRoom(size);
          this.emit("roomCreated", roomId, size);
          break;
        case "onPlayerReady":
          this.emit("playerReady", data.roomId, data.playerId);
          break;
        case "message":
          this.emit("message", data);
          break;
        case "error":
          console.log(message);
          this.emit("error", message);
          break;
        default:
          this.emit("error", message);
          break;
      }
    });
    this.socketManager.init(port);
  }
  //关闭服务
  close() {
    this.socketManager?.desroty();
    this.emit("close");
  }
  //创建房间
  createRoom(size: number) {
    var roomId = this.roomManager.createRoom(size);
    console.log(`Tiaoom: create room id:${roomId},size:${size}`);
    // call callback
    this.emit("roomCreated", roomId, size);
  }
  //销毁房间
  destoryRoom(roomId: string) {
    this.roomManager.destoryRoom(roomId);
    this.emit("roomDestoryed", roomId);
  }
  //用户加入房间
  joinRoom(roomId: string, userId: string) {
    var player = this.playerManager.getPlayer(userId);
    if (player) {
      this.emit("userJoin", roomId, userId);
      this.roomManager.joinRoom(player, roomId);
    }
  }
  //用户退出房间
  quitRoom(roomId: string, playerId: string) {
    var room = this.roomManager.getRoom(roomId);
    if (room?.isPlayerInRoomById(playerId)) {
      this.roomManager.quitRoomById(playerId, roomId);
      console.log(`Tiaoom: onPlayerQuit, playerId:${roomId},roomId:${roomId}`);
      this.emit("playerQuit", roomId, playerId);
    }
  }
  //获取房间信息
  getRoom(roomId: string) {
    return this.roomManager.getRoom(roomId);
  }
  //获取房间列表
  getRoomList() {
    return this.roomManager.getRoomList();
  }
  //用户准备
  playerReady(roomId: string, userId: string) {
    var room = this.roomManager.getRoom(roomId);
    if (room) {
      if (room.isPlayerIdInRoom(userId)) {
        this.roomManager.playerReady(roomId, userId);
        this.emit("playerReady", roomId, userId);
      }
    }
  }
  //用户取消准备
  playerNotReady(roomId: string, userId: string) {
    var room = this.roomManager.getRoom(roomId);
    if (room) {
      if (room.isPlayerIdInRoom(userId)) {
        this.roomManager.playerUnReady(roomId, userId);
        this.emit("playerNotReady", roomId, userId);
      }
    }
  }
  //获取用户列表
  //userList: 空则发给所有人
  sendMessage(data: any, playerList: Array<string>) {}

  on<K extends keyof TiaoomEvents>(event: K, listener: TiaoomEvents[K]): this {
    return super.on(event, listener);
  }

  private static instance: Tiaoom;
  public static getInstance() {
    if (!Tiaoom.instance) {
      Tiaoom.instance = new Tiaoom();
    }

    return Tiaoom.instance;
  }
}
