class SpyGame extends Tiaoom {
  constructor(address) {
    super();
    this.address = address;
  }

  connect() {
    this.socket = new WebSocket(this.address);
    this.socket.onopen = () => {
      console.log("Socket connect:", this.address);
      this.emit('sys.ready');
    };
    this.socket.onmessage = ({ data: msg }) => {
      const message = JSON.parse(msg);
      const { type, data, sender } = message;
      console.log(type, data, sender);
      this.emit(type, data, sender);
    };
    this.socket.onerror = (err) => {
      console.log("Socket error:", err);
      this.emit('sys.error', err);
    };
    this.socket.onclose = () => {
      console.log("Socket close");
      this.emit('sys.close');
    };
  }

  close() {
    this.socket.close();
  }

  send({ type, data }) {
    this.socket.send(JSON.stringify({ type, data }));
    return this;
  }

  say(message, roomId) {
    this.command(roomId, { type: 'say', data: message });
  }

  talked(roomId) {
    this.command(roomId, { type: 'talked' });
  }

  voted(roomId, playerId) {
    this.command(roomId, { type: 'voted', data: { id: playerId } });
  }

  init(roomId, player) {
    this.send({ type: "room.player-command", data: { id: roomId, type: 'status', data: player } });
    return this;
  }

  onCommand(cb, on=true) {
    this.onPlayerCommand(cb, on);
    this.onRoomCommand(cb, on);
    return this;
  }

  onMessage(cb, on=true) {
    this.onPlayerMessage(cb, on);
    this.onRoomMessage(cb, on);
    return this;
  }
}