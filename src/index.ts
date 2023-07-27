import { Tiaoom } from "@lib/tiaoom";

export async function main() {
  // create a tiaoom
  var tiaoom = new Tiaoom();
  // listen onRoomCreated
  tiaoom.on("roomCreated", (id: string, size: number) => {
    console.log(`Tiaoom:onRoomCreated,id:${id},size:${size}`);
  });

  // init tiaoom
  tiaoom.init(27015);
  // create a room,size:10
  tiaoom.createRoom(10);
}

main();
