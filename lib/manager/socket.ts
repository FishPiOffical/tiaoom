import { Server } from "socket.io";
import { WebSocketServer } from "ws";
import { EventEmitter } from "events";
import { SocketEvents } from "../events/socket";
import { Message } from "@lib/models/message";

var server: WebSocketServer;
export class SocketManager extends EventEmitter {
  // listen on events
  on<K extends keyof SocketEvents>(event: K, listener: SocketEvents[K]): this {
    return super.on(event, listener);
  }
  // init socket manager
  init(port: number) {
    server = new WebSocketServer({ port: port });
    console.log("TiaoomSocketManager:listen on port:", port);
    server.on("connection", (socket) => {
      this.emit("init");
      // // receive a message from the client
      socket.on("message", (data: any) => {
        try {
          const packet = JSON.parse(data);
          var message: Message = Object.assign(Message, packet);
          if (message) {
            this.emit("message", message);
          }
        } catch (ex) {
          this.emit("message", { type: "error", message: ex });
        }
      });
    });
  }

  desroty() {
    server.close();
  }

  sendMessage(message: string) {
    // send a message to the client
    console.log(server.clients);
    server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private static instance: SocketManager;
  public static getInstance() {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }
}
