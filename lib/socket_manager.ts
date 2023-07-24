import { Server } from "socket.io";
import { WebSocketServer } from "ws";

const server = new WebSocketServer({ port: 27020 });
export default {
  init() {
    console.log('init socket manager');
    server.on("connection", (socket) => {
      // send a message to the client
      socket.send(JSON.stringify({
        type: "hello from server",
        content: [1, "2"]
      }));

      // receive a message from the client
      socket.on("message", (data: any) => {
        console.log('receive from client:');
        console.log(data);
        const packet = JSON.parse(data);
        console.log(packet);
        // switch (packet.type) {
        //   case "hello from client":
        //     // ...
        //     break;
        // }
      });
    });
  }
}