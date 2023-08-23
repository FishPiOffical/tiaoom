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
  constructor() {
    super();
    server = new WebSocketServer({ port: 27015 });
    console.log("Socket listen on port:", 27015);
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
        } catch (err) {
          this.emit("error", err);
        }
      });
    });
  }

  desroty() {
    server.close();
  }

  send(message: string) {
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
