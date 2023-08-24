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

  connect() {
    this.socket.connect();
    this.socket.on("room.create", (room) => {
      this.rooms.push(new Room(room));
    });
    this.socket.on("room.list", (rooms) => {
      this.rooms = rooms.map(room => new Room(room));
    });
    this.socket.on("play.list", (players) => {
      this.players = players.map(player => new Player(player)); 
    });
  }

  createRoom({ name, size, minSize }) {
    this.socket.send({ type: "createRoom", data: { name, size, minSize } });
  }

  onRoomCreate(cb) {
    this.socket.on("room.create", cb);
  }
}