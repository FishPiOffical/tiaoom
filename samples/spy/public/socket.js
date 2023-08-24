class Socket {
  constructor(address) {
    this.listeners = {};
    this.address = address;
  }

  connect() {
    this.socket = new WebSocket(this.address);
    this.socket.onopen = () => {
      console.log("Socket connect:", address);
    };
    this.socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      const { type, data, sender } = message;
      const listeners = this.listeners[type] || [];
      listeners.forEach(listener => listener(data, sender));
    };
    this.socket.onerror = (err) => {
      console.log("Socket error:", err);
    };
    this.socket.onclose = () => {
      console.log("Socket close");
    };
  }

  close() {
    this.socket.close();
  }

  send({ type, data }) {
    this.socket.send(JSON.stringify({ type, data }));
  }

  on(event, listener) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(listener);
  }

  off(event, listener) {
    const listeners = this.listeners[event] || [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }
}