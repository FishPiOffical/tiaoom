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
    this.size = size;
    this.minSize = minSize;
  }
}

class Tiaoom {
  constructor({ socket }) {
    this.socket = socket;
    this.rooms = [];
    this.players = [];
  }

  connect({ id, name, attributes}) {
    return new Promise((resolve, reject) => {
      this.socket.on("error", (err) => {
        reject(err);
      });
      this.socket.connect();
      this.socket.on("room.create", (room) => {
        this.rooms.push(new Room(room));
      });
      this.socket.on("room.list", (rooms) => {
        this.rooms = rooms.map(room => new Room(room));
      });
      this.socket.on("player.list", (players) => {
        this.players = players.map(player => new Player(player)); 
      });
      this.socket.on("player.status", () => {
        resolve();
      });
      this.socket.on('open', () => {
        this.login({ id, name, attributes });
      });
    });
  }

  login(player) {
    this.socket.send({ type: "player.login", data: player });
  }

  createRoom({ name, size, minSize }) {
    return new Promise((resolve) => {
      this.socket.send({ type: "room.create", data: { name, size, minSize } });
      this.socket.on("room.create", (room) => {
        resolve();
      });
    });
  }

  onPlayerList(cb) {
    this.socket.on("player.list", cb);
  }

  onRoomList(cb) {
    this.socket.on("room.list", cb);
  }
}