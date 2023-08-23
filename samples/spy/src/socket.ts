import { Server } from "socket.io";
import { WebSocketServer } from "ws";
import { EventEmitter } from "events";
import { MessageEvents } from "@lib/events/message";
import { Message, MessagePackage } from "@lib/models/message";
import { Player } from "@lib/models/player";

var server: WebSocketServer;
export class SocketManager extends EventEmitter implements Message {
  // listen on events
  on<K extends keyof MessageEvents>(event: K, listener: MessageEvents[K]): this {
    return super.on(event, listener);
  }
  emit<K extends keyof MessageEvents>(event: K, ...args: Parameters<MessageEvents[K]>): boolean {
    return super.emit(event, ...args);
  }
  // init socket manager
  constructor() {
    super();
    server = new WebSocketServer({ port: 27015 });
    console.log("Socket listen on port:", 27015);
    server.on("connection", (socket) => {
      this.emit("ready");
      // receive a message from the client
      socket.on("message", (data: any) => {
        try {
          const packet = JSON.parse(data);
          var message: MessagePackage = packet;
          if (message) {
            this.emit("message", message);
          }
        } catch (err) {
          this.emit("error", err as Error);
        }
      });
    });
  }

  close() {
    server.close();
  }

  send(message: MessagePackage) {
    // send a message to the client
    console.log(server.clients)
    if (message.type.startsWith('player.')) {
      const playerId = (message.sender as Player).id;
      (message.sender as Player).attributes.client.send(JSON.stringify({ type: message.type, data: message.data }));
    }
    else server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
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
