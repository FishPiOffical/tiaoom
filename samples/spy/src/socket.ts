import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "events";
import { Room, Player, Message, MessagePackage, MessageEvents, PlayerStatus } from "@lib/index";

let server: WebSocketServer;
export class SocketManager extends EventEmitter implements Message {
  // listen on events
  on<K extends keyof MessageEvents>(event: K, listener: MessageEvents[K]): this {
    return super.on(event, listener);
  }
  emit<K extends keyof MessageEvents>(event: K, ...args: Parameters<MessageEvents[K]>): boolean {
    return super.emit(event, ...args);
  }
  // init socket manager
  constructor(port: number) {
    super();
    server = new WebSocketServer({ port });
    const sockets: Array<{ socket: WebSocket; player: Player }> = [];
    console.log("Socket listen on port:", port);
    server.on("connection", (socket) => {
      this.emit("ready");
      // receive a message from the client
      socket.on("message", (data: any) => {
        try {
          const packet = JSON.parse(data);
          let message: MessagePackage = packet;
          if (message) {
            if (message.type == 'player.join') {
              message.data.attributes.client = socket;
            }
            this.emit("message", message, (err: Error | null, ...params: any) => {
              if (err) return socket.send(JSON.stringify({ type: 'error', data: params }));
              else socket.send(JSON.stringify({ type: message.type, data: params }));
              if (message.type == 'player.login') {
                sockets.push({ socket, player: message.data.player });
              }
            });
          }
        } catch (err) {
          this.emit("error", err as Error);
        }
      });

      socket.on("close", () => {
        const index = sockets.findIndex((target) => target.socket == socket);
        if (index > -1) {
          sockets[index].player.emit("status", PlayerStatus.offline);
          sockets.splice(index, 1);
        }
        this.emit("close");
      });
    });
  }

  close() {
    server.close();
  }

  send(message: MessagePackage) {
    // send a message to the client
    console.log(server.clients)
    if (message.type.startsWith('player.') && message.sender) {
      (message.sender as Player).attributes.client.send(JSON.stringify({ type: message.type, data: message.data }));
    }
    if (message.type.startsWith('room.') && message.sender) {
      (message.sender as Room).players.forEach(p => p.attributes.client.send(JSON.stringify({ type: message.type, data: message.data })));
    }
    else server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}
