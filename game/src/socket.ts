import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "events";
import { Room, Player, Message, MessagePackage, MessageEvents, PlayerStatus } from "@lib/index";

let wsServer: WebSocketServer;
export class SocketManager extends EventEmitter implements Message {
  sockets: Array<{ socket: WebSocket; player: Player }> = [];
  // listen on events
  on<K extends keyof MessageEvents>(event: K, listener: MessageEvents[K]): this {
    return super.on(event, listener);
  }
  emit<K extends keyof MessageEvents>(event: K, ...args: Parameters<MessageEvents[K]>): boolean {
    return super.emit(event, ...args);
  }
  // init socket manager
  constructor(server: http.Server) {
    super();
    wsServer = new WebSocketServer({ server });
    wsServer.on("connection", (socket) => {
      this.emit("ready");
      // receive a message from the client
      socket.on("message", (data: any) => {
        try {
          const packet = JSON.parse(data);
          let message: MessagePackage = packet;
          if (message) {
            if (message.type == 'player.login') {
              this.sockets.push({ socket, player: message.data });
            } else {
              const player = this.sockets.find(s => s.socket == socket)?.player;
              message.sender = player;
            }
            this.emit("message", message, (err: Error | null, data?: any) => {
              if (err) return socket.send(JSON.stringify({ type: 'error', data: err.message, stack: err.stack }));
              else socket.send(JSON.stringify({ type: message.type, data }));
            });
          }
        } catch (err) {
          this.emit("error", err as Error);
        }
      });

      socket.on("close", () => {
        const index = this.sockets.findIndex((target) => target.socket == socket);
        const player = this.sockets[index]?.player;
        if (index > -1) {
          this.sockets.splice(index, 1);
        }
        if (!this.sockets.some(s => s.player.id === player?.id)) 
          this.emit("message", { type: 'player.logout', data: player });
        this.emit("close");
      });
    });
  }

  close() {
    wsServer.close();
  }

  send(message: MessagePackage) {
    // send a message to the client
    console.log('send', message.type, message.sender)
    if (message.type.startsWith('player.') && message.sender) {
      const player = message.sender as Player;
      this.sockets.find(s => s.player.id === player.id)?.socket.send(JSON.stringify({ type: message.type, data: message.data, sender: message.sender }));
    }
    else if (message.type.startsWith('room.') && message.sender) {
      const room = message.sender as Room;
      room.players.forEach(p => {
        const socket = this.sockets.find(s => s.player.id === p.id)?.socket;
        if (socket && socket.readyState === WebSocket.OPEN) {
          // send to each player in the room
          socket.send(JSON.stringify({ type: message.type, data: message.data, sender: p }));
        }
      });
    }
    else wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: message.type, data: message.data }));
      }
    });
  }
}
