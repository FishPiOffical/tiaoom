import room_manager from "@/room_manager/room_manager";

export async function main() {
  console.info(`Hello World!`);
  room_manager.init();
}

main();