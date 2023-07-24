import socket_manager from "@lib/socket_manager";

export default {
  init() {
    console.log('init room manager');
    socket_manager.init();
  }
}