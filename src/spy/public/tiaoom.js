class Player {
  constructor(player) {
    this.id = player.id;
    this.name = player.name;
    this.attributes = player.attributes;
  }
}

class RoomPlayer extends Player {
  constructor(player) {
    super(player);
    this.role = player.role;
    this.isReady = player.isReady;
  }
}

class Room {
  constructor(room) {
    this.id = room.id;
    this.name = room.name;
    this.players = room.players.map(player => new RoomPlayer(player));
    this.size = room.size;
    this.minSize = room.minSize;
  }
}

class Tiaoom {
  constructor() {
    this.listeners = {};
    this.rooms = [];
    this.players = [];
  }

  run() {
    this.connect();
    this.on("room.list", (rooms) => {
      this.rooms = rooms.map(room => new Room(room));
    });
    this.on("player.list", (players) => {
      this.players = players.map(player => new Player(player)); 
    });
    this.onReady(() => {
      this.send({ type: "room.list" });
      this.send({ type: "player.list" });
    });

    this.on("player.list", (players) => this.emit('onPlayerList', players.map(player => new Player(player))));
    this.on("player.login", (player) => {
      this.players.push(new Player(player));
      this.emit('onPlayerList', this.players);
    });
    this.on("player.logout", (player) => {
      this.players = this.players.filter(p => p.id !== player.id);
      this.emit('onPlayerList', this.players);
    });


    this.on("room.list", (rooms) => this.emit('onRoomList', (rooms.map(room => new Room(room)))));
    this.on("room.create", (room) => {
      this.rooms.push(new Room(room));
      this.emit('onRoomList', this.rooms);
    });
    this.on("room.close", (room) => {
      this.rooms = this.rooms.filter(r => r.id !== room.id);
      this.emit('onRoomList', this.rooms);
    });
    this.on("room.update", (room) => {
      const updatedRoom = this.rooms.find(r => r.id === room.id);
      if (updatedRoom) {
        Object.assign(updatedRoom, room);
        this.emit('onRoomList', this.rooms);
      }
    });

    return this;
  }

  connect() {
    throw new Error('Must be implement connect method');
  }

  send({ type, data }) {
    throw new Error('Must be implement send method');
  }

  login(player) {
    this.send({ type: "player.login", data: player });
    return this;
  }

  createRoom({ name, size, minSize }) {
    return new Promise((resolve) => {
      this.send({ type: "room.create", data: { name, size, minSize } });
      this.on("room.create", (room) => {
        resolve();
      });
    });
  }

  joinRoom(roomId) {
    this.send({ type: "player.join", data: { roomId } });
    return this;
  }

  leaveRoom(roomId) {
    this.send({ type: "player.leave", data: { roomId } });
    return this;
  }

  startGame(roomId) {
    this.send({ type: "room.start", data: { roomId } });
    return this;
  }

  ready(roomId, isReady=true) {
    this.send({ type: isReady ? "player.ready" : "player.unready", data: { roomId } });
    return this;
  }

  onReady(cb) {
    return this.on("sys.ready", cb);
  }

  onPlayerList(cb) {
    this.on("onPlayerList", cb);
    return this;
  }

  onRoomList(cb, on=true) {
    if (on) this.on("onRoomList", cb);
    else this.off("onRoomList", cb);
    return this;
  }

  onPlayerJoin(cb, on=true) {
    if (on) this.on("room.join", cb);
    else this.off("room.join", cb);
    return this;
  }

  onPlayerLeave(cb, on=true) {
    if (on) this.on("room.leave", cb);
    else this.off("room.leave", cb);
    return this;
  }

  onPlayerReady(cb, on=true) {
    if (on) this.on("player.ready", cb);
    else this.off("player.ready", cb);
    return this;
  }

  onPlayerUnready(cb, on=true) {
    if (on) this.on("player.unready", cb);
    else this.off("player.unready", cb);
    return this;
  }

  onRoomStart(cb, on=true) {
    if (!this.listeners["room.start"]) {
      this.on("room.start", (room) => this.emit("onRoomStart", new Room(room)));
    }
    if (on) this.on("onRoomStart", cb);
    else this.off("onRoomStart", cb);
    return this;
  }

  onRoomEnd(cb, on=true) {
    if (!this.listeners["room.end"]) {
      this.on("room.end", (room) => this.emit("onRoomEnd", new Room(room)));
    }
    if (on) this.on("onRoomEnd", cb);
    else this.off("onRoomEnd", cb);
    return this;
  }

  onRoomAllReady(cb, on=true) {
    if (!this.listeners["room.all-ready"]) {
      this.on("room.all-ready", (room) => this.emit("onRoomAllReady", new Room(room)));
    }
    if (on) this.on("onRoomAllReady", cb);
    else this.off("onRoomAllReady", cb);
    return this;
  }

  on(event, listener) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(listener);
    return this;
  }

  off(event, listener) {
    const listeners = this.listeners[event] || [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    return this;
  }

  emit(event, ...args) {
    const listeners = this.listeners[event] || [];
    listeners.forEach(listener => listener(...args));
    return this;
  }
}