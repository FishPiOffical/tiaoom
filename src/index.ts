import { Room } from "@lib/models/room";
import { Tiaoom } from "@lib/tiaoom";
import { Tester } from "./tester";

export async function main() {
  var roomList = new Array<string>();
  // create a tiaoom
  var tiaoom = new Tiaoom();

  tiaoom.on("init", () => {
    console.log("TiaoomDemo:onInit");
  });

  tiaoom.on("roomCreated", (id: string, size: number) => {
    console.log(`TiaoomDemo:onRoomCreated,id:${id},size:${size}`);
    console.log("roomList:", tiaoom.getRoomList());
  });

  tiaoom.on("playerReady", (roomId: string, playerId: string) => {
    console.log(
      `TiaoomDemo:onPlayerReady,roomId:${roomId},playerId:${playerId}`
    );
    console.log("roomList:", tiaoom.getRoomList());
  });

  tiaoom.on("playerQuit", (roomId: string, playerId: string) => {
    console.log(
      `TiaoomDemo:onPlayerQuit,roomId:${roomId},playerId:${playerId}`
    );
    console.log("roomList:", tiaoom.getRoomList());
  });

  tiaoom.on("message", (data: any) => {
    console.log(`TiaoomDemo:onMessage,data:`);
    console.log(data);
  });
  // init tiaoom
  tiaoom.init(27015);

  var tester = new Tester();
  tester.init();
}

main();
