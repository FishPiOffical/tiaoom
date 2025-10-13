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
}