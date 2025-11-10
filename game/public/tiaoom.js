class Player {
  constructor(player) {
    this.id = player.id;
    this.name = player.name;
    this.attributes = player.attributes;
    this.status = player.status;
  }
}

class RoomPlayer extends Player {
  constructor(player) {
    super(player);
    this.role = player.role;
    this.isReady = player.isReady;
    this.isCreator = player.isCreator;
  }
}

class Room {
  constructor(room) {
    this.id = room.id;
    this.name = room.name;
    this.players = room.players.map(player => new RoomPlayer(player));
    this.size = room.size;
    this.minSize = room.minSize;
    this.status = room.status;
    this.attrs = room.attrs;
  }
}

class Tiaoom {
  constructor() {
    this.listeners = {};
    this.rooms = [];
    this.players = [];
    this.currentPlayer = null;
  }

  /**
   * 启动游戏
   */
  run() {
    this.connect();
    this.onReady(() => {
      this.send({ type: "room.list" });
      this.send({ type: "player.list" });
    });

    this.on("player.list", (players) => {
      this.players = players.map(player => new Player(player));
      this.emit('onPlayerList', [...this.players]);
    });
    this.on("player.login", (player) => {
      this.players.push(new Player(player));
      this.emit('onPlayerList', [...this.players]);
    });
    this.on("player.logout", (player) => {
      this.players = this.players.filter(p => p.id !== player.id);
      this.emit('onPlayerList', [...this.players]);
    });


    this.on("room.list", (rooms) => {
      this.rooms = rooms.map(room => new Room(room));
      this.emit('onRoomList', [...this.rooms]);
    });
    this.on("room.create", (room) => {
      this.rooms.push(new Room(room));
      this.emit('onRoomList', this.rooms);
    });
    this.on("room.update", (room) => {
      const existingRoom = this.rooms.find(r => r.id === room.id);
      if (!existingRoom) {
        this.rooms.push(new Room(room));
      } else {
        Object.assign(existingRoom, room);
      }
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

  /**
   * 连接服务器实现
   */
  connect() {
    throw new Error('Must be implement connect method');
  }

  /**
   * 发送消息实现
   */
  send({ type, data }) {
    throw new Error('Must be implement send method');
  }

  /**
   * 登录
   * @param {Player} player 玩家信息
   */
  login(player) {
    this.currentPlayer = new Player(player);
    this.send({ type: "player.login", data: player });
    return this;
  }

  /**
   * 创建房间
   * @param {string} name 房间名称
   * @param {number} size 房间人数上限
   * @param {number} minSize 房间人数下限
   * @param {object} attrs 房间属性
   */
  createRoom({ name, size, minSize, attrs }) {
    return new Promise((resolve) => {
      this.send({ type: "room.create", data: { name, size, minSize, attrs } });
      this.on("room.create", (room) => {
        resolve();
      });
    });
  }

  /**
   * 加入房间
   * @param {string} roomId 房间ID
   */
  joinRoom(roomId) {
    this.send({ type: "player.join", data: { roomId } });
    return this;
  }

  /**
   * 离开房间
   * @param {string} roomId 房间ID
   */
  leaveRoom(roomId) {
    this.send({ type: "player.leave", data: { roomId } });
    return this;
  }

  /**
   * 开始游戏
   * @param {string} id 房间ID
   */
  startGame(id) {
    this.send({ type: "room.start", data: { id } });
    return this;
  }

  /**
   * 准备/取消准备
   * @param {string} roomId 房间ID
   * @param {boolean} isReady 是否准备
   */
  ready(roomId, isReady=true) {
    this.send({ type: isReady ? "player.ready" : "player.unready", data: { roomId } });
    return this;
  }

  /**
   * 发送房间指令
   * @param {string} roomId 房间ID
   * @param {object} command 指令内容
   */
  command(roomId, command) {
    if (typeof roomId != 'string') {
      command = roomId;
      this.send({ type: "global.command", data: command });
    } else {
      this.send({ type: "room.player-command", data: { id: roomId, ...command } });
    }
    return this;
  }

  /**
   * 连接准备监听
   * @param {function} cb 监听函数
   */
  onReady(cb) {
    return this.on("sys.ready", cb);
  }

  /**
   * 玩家列表变更监听
   * @param {function} cb 监听函数
   */
  onPlayerList(cb) {
    this.on("onPlayerList", cb);
    return this;
  }

  /**
   * 房间列表变更监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onRoomList(cb, on=true) {
    if (on) this.on("onRoomList", cb);
    else this.off("onRoomList", cb);
    return this;
  }

  /**
   * 玩家加入监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onPlayerJoin(cb, on=true) {
    if (on) this.on("room.join", cb);
    else this.off("room.join", cb);
    return this;
  }

  /**
   * 玩家离开监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onPlayerLeave(cb, on=true) {
    if (on) this.on("room.leave", cb);
    else this.off("room.leave", cb);
    return this;
  }

  /**
   * 玩家准备监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onPlayerReady(cb, on=true) {
    if (on) this.on("room.player-ready", cb);
    else this.off("room.player-ready", cb);
    return this;
  }

  /**
   * 玩家取消准备监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onPlayerUnready(cb, on=true) {
    if (on) this.on("room.player-unready", cb);
    else this.off("room.player-unready", cb);
    return this;
  }

  /**
   * 玩家状态更新监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onPlayerStatus(cb, on=true) {
    if (on) this.on("player.status", cb);
    else this.off("player.status", cb);
    return this;
  }

  /**
   * 房间开始游戏监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onRoomStart(cb, on=true) {
    if (!this.listeners["room.start"]) {
      this.on("room.start", (room) => this.emit("onRoomStart", new Room(room)));
    }
    if (on) this.on("onRoomStart", cb);
    else this.off("onRoomStart", cb);
    return this;
  }

  /**
   * 房间结束游戏监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns
   */
  onRoomEnd(cb, on=true) {
    if (!this.listeners["room.end"]) {
      this.on("room.end", (room) => this.emit("onRoomEnd", new Room(room)));
    }
    if (on) this.on("onRoomEnd", cb);
    else this.off("onRoomEnd", cb);
    return this;
  }

  /**
   * 房间全部准备监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onRoomAllReady(cb, on=true) {
    if (!this.listeners["room.all-ready"]) {
      this.on("room.all-ready", (room) => this.emit("onRoomAllReady", new Room(room)));
    }
    if (on) this.on("onRoomAllReady", cb);
    else this.off("onRoomAllReady", cb);
    return this;
  }

  /**
   * 房间消息监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onRoomMessage(cb, on=true) {
    if (on) this.on("room.message", cb);
    else this.off("room.message", cb);
    return this;
  }

  /**
   * 玩家消息监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onPlayerMessage(cb, on=true) {
    if (on) this.on("player.message", cb);
    else this.off("player.message", cb);
    return this;
  }

  /**
   * 房间指令监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onRoomCommand(cb, on=true) {
    if (on) this.on("room.command", cb);
    else this.off("room.command", cb);
    return this;
  }

  /**
   * 玩家指令监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onPlayerCommand(cb, on=true) {
    if (on) this.on("player.command", cb);
    else this.off("player.command", cb);
    return this;
  }

  /**
   * 事件监听
   * @param {string} event 事件名称
   * @param {function} listener 监听函数
   * @returns 
   */
  on(event, listener) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(listener);
    return this;
  }

  /**
   * 事件取消监听
   * @param {string} event 事件名称
   * @param {function} listener 监听函数
   * @returns 
   */
  off(event, listener) {
    const listeners = this.listeners[event] || [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    return this;
  }

  /**
   * 事件触发
   * @param {string} event 事件名称
   * @param  {...any} args 参数
   * @returns 
   */
  emit(event, ...args) {
    const listeners = this.listeners[event] || [];
    listeners.forEach(listener => listener(...args));
    return this;
  }
}