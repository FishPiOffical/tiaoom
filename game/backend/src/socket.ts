import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "events";
import { Room, Player, IMessage, IMessagePackages, IMessageEmitterEvents, IMessageData, MessageTypes } from "tiaoom";
import { LogRepo } from "./entities";
import { log } from "./utils";

let wsServer: WebSocketServer;
export class SocketManager extends EventEmitter<IMessageEmitterEvents> implements IMessage {
  sockets: Array<{ socket: WebSocket; player: Player }> = [];
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
          let message: IMessageData = packet;
          if (message) {
            if (message.type == 'player.login') {
              this.sockets.push({ socket, player: message.data });
            } else {
              const player = this.sockets.find(s => s.socket == socket)?.player;
              if (player) message.sender = player;
            }
            this.emit("message", message, (err: Error | null, data?: any) => {
              if (err) {
                if (!message.sender) socket.send(JSON.stringify({
                  type: MessageTypes.PlayerError,
                  data: { name: err.name, message: err.message }
                }));
                log(MessageTypes.PlayerError, message.data, { name: err.name, message: err.message, stack: err.stack }, message.sender?.id);
                return console.error(err);
              }
              else socket.send(JSON.stringify({ type: message.type, data }));
            });
          }
        } catch (err) {
          this.emit("error", err as Error);
          log(MessageTypes.PlayerError, data, { name: (err as Error).name, message: (err as Error).message, stack: (err as Error).stack }, undefined);
        }
      });

      socket.on("close", () => {
        const index = this.sockets.findIndex((target) => target.socket == socket);
        const player = this.sockets[index]?.player;
        if (index > -1) {
          this.sockets.splice(index, 1);
        }
        if (player && !this.sockets.some(s => s.player.id === player?.id))
          this.emit("message", { type: MessageTypes.PlayerOffline, data: player, sender: player });
        this.emit("close");
      });
    });
  }

  close() {
    wsServer.close();
  }

  send(message: IMessagePackages) {
    // send a message to the client
    this.sockets
      .forEach(({ socket, player }) => {
        if (socket.readyState !== WebSocket.OPEN) return;
        if (!message.senderIds.includes(player.id)) return;
        socket.send(JSON.stringify({
          type: message.type,
          data: message.data,
          sender: player
        }));
      });
  }
}
