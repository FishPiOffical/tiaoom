import { EventEmitter } from "events";
import { TiaoomEvents } from "./events/tiaoom_events";
import { RoomManager } from "./room_manager";
import { SocketManager } from "./socket_manager";

export class Tiaoom extends EventEmitter {
  port: number = 27015;
  //初始化服务
  init(port: number) {
    this.port = port;
    var socketManager = new SocketManager();
    socketManager.on("init", () => {
      this.emit("init");
    });
    socketManager.on("message", (data: any) => {
      switch (data.type) {
        case "createRoom":
          this.emit("roomCreated", data.id);
          break;
      }
    });
    socketManager.init(port);

    // RoomManager.init();
  }
  //关闭服务
  close() {}
  //创建房间
  createRoom(size: number) {
    // create a server...
    // now we got a server id:1
    let id = "1";

    console.log(`Tiaoom: create room id:${id},size:${size}`);
    // call callback
    this.emit("roomCreated", id, size);
  }
  //销毁房间
  destoryRoom(roomId: string) {}
  //用户加入房间
  joinRoom(roomId: string, userId: string) {}
  //用户退出房间
  exitRoom(roomId: string, userId: string) {}
  //获取房间信息
  getRoomInfo(roomId: string) {}
  //获取房间列表
  getRoomList() {}
  //获取用户列表
  playerReady(roomId: string, userId: string) {}
  //获取用户列表
  playerNotReady(roomId: string, userId: string) {}
  //获取用户列表
  //userList: 空则发给所有人
  sendMessage(data: any, userList: Array<string>) {}

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
