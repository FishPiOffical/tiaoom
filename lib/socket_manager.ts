import { Server } from "socket.io";
import { WebSocketServer } from "ws";
import { EventEmitter } from "events";
import { SocketEvents } from "./events/socket_events";

var server: WebSocketServer;
export class SocketManager extends EventEmitter {
  // listen on events
  on<K extends keyof SocketEvents>(event: K, listener: SocketEvents[K]): this {
    return super.on(event, listener);
  }
  // init socket manager
  init(port: number) {
    server = new WebSocketServer({ port: port });
    console.log("Tiaoom:init socket manager");
    server.on("connection", (socket) => {
      this.emit("init");
      // // receive a message from the client
      socket.on("message", (data: any) => {
        const packet = JSON.parse(data);
        console.log("SocketManager:receive message from client:");
        console.log(packet);
        this.emit("message", packet);
      });
    });
  }
}
