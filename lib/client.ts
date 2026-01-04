import { IRoomOptions, PlayerRole, RoomStatus, PlayerStatus, RecvMessageTypes as MessageTypes } from "@lib/index";
export { RoomStatus, PlayerStatus, PlayerRole, MessageTypes };
export type { IRoomOptions };

export type TiaoomEvents = {
  /**
   * 连接准备就绪事件
   */
  "sys.ready": () => void;
  /**
   * 连接错误事件
   * @param error 错误信息
   */
  "sys.error": (error: any) => void;
  /**
   * 连接关闭事件
   */
  "sys.close": () => void;
  /**
   * 全局错误事件
   * @param error 错误信息
   */
  "global.error": (error: Error) => void;
  /**
   * 全局命令事件
   * @param data 命令内容
   */
  "global.command": (data: any & { sender: Player }) => void;
  /**
   * 全局消息事件
   * @param message 消息内容
   */
  "global.message": (message: string, sender?: Player) => void;
  /**
   * 玩家列表更新事件
   * @param players 玩家列表
   */
  "player.list": (players: Player[]) => void;
  /**
   * 玩家登录事件
   * @param player 玩家信息
   */
  "player.login": (player: Player) => void;
  /**
   * 玩家登出事件
   * @param player 玩家信息
   */
  "player.logout": (player: Player) => void;
  /**
   * 玩家状态更新事件
   * @param player 玩家信息
   * @param status 状态
   * @param roomId 房间ID（可选）
   */
  "player.status": (status: PlayerStatus) => void;
  /**
   * 玩家命令事件
   * @param command 命令内容
   */
  "player.command": (command: any & { sender: Player }) => void;
  /**
   * 玩家消息事件
   * @param message 消息内容
   */
  "player.message": (message: { content: string, sender?: Player }) => void;
  /**
   * 玩家错误事件
   */
  "player.error": (error: Error) => void;
  /**
   * 房间列表更新事件
   * @param rooms 房间列表
   */
  "room.list": (rooms: Room[]) => void;
  /**
   * 房间创建事件
   * @param room 房间信息
   */
  "room.create": (room: Room) => void;
  /**
   * 房间更新事件
   * @param room 房间信息
   */
  "room.update": (room: Room) => void;
  /**
   * 房间关闭事件
   * @param room 房间信息
   */
  "room.close": (room: Room) => void;
  /**
   * 玩家加入房间事件
   * @param room 房间信息
   * @param player 玩家信息
   */
  "room.join": (player: RoomPlayer & { roomId: string }) => void;
  /**
   * 玩家离开房间事件
   * @param room 房间信息
   * @param player 玩家信息
   */
  "room.leave": (player: RoomPlayer & { roomId: string }) => void;
  /**
   * 房间开始游戏事件
   * @param room 房间信息
   */
  "room.start": (room: Room) => void;
  /**
   * 房间结束游戏事件
   * @param room 房间信息
   */
  "room.end": (room: Room) => void;
  /**
   * 房间玩家全部准备事件
   * @param room 房间信息
   */
  "room.all-ready": (room: Room) => void;
  /**
   * 房间命令事件
   * @param command 命令内容
   */
  "room.command": (command: any & { sender: Player }) => void;
  /**
   * 房间消息事件
   * @param message 消息内容
   */
  "room.message": (message: { content: string; sender?: RoomPlayer }) => void;
  /**
   * 房间玩家准备事件
   * @param player 玩家信息
   * @param roomId 房间ID（可选）
   */
  "room.player-ready": (player: RoomPlayer) => void;
  /**
   * 房间玩家取消准备事件
   * @param player 玩家信息
   * @param roomId 房间ID（可选）
   */
  "room.player-unready": (player: RoomPlayer) => void;
  /**
   * 玩家列表更新事件(内部)
   * @param players 玩家列表
   */
  "onPlayerList": (players: Player[]) => void;
  /**
   * 房间列表更新事件(内部)
   * @param rooms 房间列表
   */
  "onRoomList": (rooms: Room[]) => void;
  /**
   * 房间开始游戏事件(内部)
   * @param room 房间信息
   */
  "onRoomStart": (room: Room) => void;
  /**
   * 房间结束游戏事件(内部)
   * @param room 房间信息
   */
  "onRoomEnd": (room: Room) => void;
  /**
   * 房间玩家全部准备事件(内部)
   * @param room 房间信息
   */
  "onRoomAllReady": (room: Room) => void;
};

export class Player {
  id: string;
  name: string;
  attributes: Record<string, any>;
  status: PlayerStatus;
  isAdmin: boolean;
  constructor(player: Partial<Player>) {
    this.id = player.id || Date.now().toString();
    this.name = player.name || '玩家' + this.id;
    this.attributes = player.attributes || {};
    this.status = player.status || PlayerStatus.online;
    this.isAdmin = player.isAdmin || false;
  }
}

export class RoomPlayer extends Player {
  role: PlayerRole;
  isReady: boolean;
  isCreator: boolean;
  roomId: string;
  constructor(player: RoomPlayer) {
    super(player);
    this.role = player.role;
    this.isReady = player.isReady;
    this.isCreator = player.isCreator;
    this.roomId = player.roomId;
  }
}

export class Room {
  id: string;
  name: string;
  players: RoomPlayer[];
  size: number;
  minSize: number;
  requireAllReadyToStart: boolean;
  status: RoomStatus;
  attrs: Record<string, any>;
  constructor(room: Room) {
    this.id = room.id;
    this.name = room.name;
    this.players = room.players.map(player => new RoomPlayer(player));
    this.size = room.size;
    this.minSize = room.minSize;
    this.requireAllReadyToStart = room.requireAllReadyToStart ?? true;
    this.status = room.status;
    this.attrs = room.attrs;
  }
}

/**
 * Tiaoom 客户端
 * @description 用于连接 Tiaoom 服务器并进行游戏交互，如创建房间、加入房间、发送命令等。
 * 需继承后实现具体的连接和消息发送逻辑。
 */
export class Tiaoom {
  listeners: Record<string, Function[]>;
  rooms: Room[];
  players: Player[];
  currentPlayer: Player | null;
  constructor() {
    this.listeners = {};
    this.rooms = [];
    this.players = [];
    this.currentPlayer = null;
  }

  /**
   * 启动游戏
   * @returns this
   */
  run() {
    this.connect();
    this.onReady(() => {
      this.send({ type: MessageTypes.RoomList });
      this.send({ type: MessageTypes.PlayerList });
    });

    this.on("player.list", (players) => {
      this.players = players.map(player => new Player(player));
      this.emit('onPlayerList', [...this.players]);
    });
    this.on("player.login", (player) => {
      this.players = this.players.filter(p => p.id !== player.id);
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
      if (!this.rooms.some(r => r.id === room.id)) {
        this.rooms.push(new Room(room));
        this.emit('onRoomList', this.rooms);
      }
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
   * @param message 消息内容
   */
  send(_: { type: MessageTypes, data?: any }) {
    throw new Error('Must be implement send method');
  }

  /**
   * 登录
   * @param {Player} player 玩家信息
   * @returns this
   */
  login(player: Player) {
    this.currentPlayer = new Player(player);
    this.send({ type: MessageTypes.PlayerLogin, data: player });
    return this;
  }

  /**
   * 创建房间
   * @param {string} name 房间名称
   * @param {number} size 房间人数上限
   * @param {number} minSize 房间人数下限
   * @param {object} attrs 房间属性
   * @returns {Promise<void>} 创建完成的 Promise
   */
  createRoom({ name, size, minSize, attrs }: Omit<IRoomOptions, 'id'>) {
    return new Promise<void>((resolve) => {
      this.send({ type: MessageTypes.RoomCreate, data: { name, size, minSize, attrs } });
      this.on("room.create", (room) => {
        resolve();
      });
    });
  }

  /**
   * 加入房间
   * @param {string} roomId 房间ID
   * @param {object} params 加入参数
   * @returns this
   */
  joinRoom(roomId: string, params?: any) {
    this.send({ type: MessageTypes.PlayerJoin, data: { roomId, params } });
    return this;
  }

  /**
   * 离开房间
   * @param {string} roomId 房间ID
   * @param {object} params 离开参数
   * @returns this
   */
  leaveRoom(roomId: string, params?: any) {
    this.send({ type: MessageTypes.PlayerLeave, data: { roomId, params } });
    return this;
  }

  /**
   * 离开座位
   * @param {string} roomId 房间ID
   * @param {object} params 离开参数
   * @returns this
   */
  leaveSeat(roomId: string, params?: any) {
    this.send({ type: MessageTypes.PlayerStandUp, data: { roomId, params } });
    return this;
  }

  /**
   * 踢出玩家
   * @param {string} roomId 房间ID
   * @param {string} playerId 玩家ID
   * @param {object} params 额外参数
   * @returns this
   */
  kickPlayer(roomId: string, playerId: string, params?: any) {
    this.send({ type: MessageTypes.RoomKick, data: { roomId, playerId, params } });
    return this;
  }

  /**
   * 转让房主
   * @param {string} roomId 房间ID
   * @param {string} playerId 目标玩家ID
   * @param {object} params 额外参数
   * @returns this
   */
  transferRoom(roomId: string, playerId: string, params?: any) {
    this.send({ type: MessageTypes.RoomTransfer, data: { roomId, playerId, params } });
    return this;
  }

  /**
   * 关闭房间
   * @param {string} roomId 房间ID
   * @param {object} params 额外参数
   * @returns this
   */
  closeRoom(roomId: string, params?: any) {
    this.send({ type: MessageTypes.RoomClose, data: { id: roomId, params } });
    return this;
  }

  /**
   * 开始游戏
   * @param {string} id 房间ID
   * @param {object} params 额外参数
   * @returns this
   */
  startGame(id: string, params?: any) {
    this.send({ type: MessageTypes.RoomStart, data: { id, params } });
    return this;
  }

  /**
   * 准备/取消准备
   * @param {string} roomId 房间ID
   * @param {boolean} isReady 是否准备
   * @param {object} params 额外参数
   * @returns this
   */
  ready(roomId: string, isReady=true, params?: any) {
    this.send({ type: isReady ? MessageTypes.PlayerReady : MessageTypes.PlayerUnready, data: { roomId, params } });
    return this;
  }

  /**
   * 发送全局/房间指令
   * @param {string} roomId 房间ID
   * @param {any} command 指令内容
   * @returns this
   */
  command(command: any): this;
  command(roomId: string, command: any): this;
  command(roomId: string | any, command?: any) {
    if (typeof roomId != 'string') {
      command = roomId;
      this.send({ type: MessageTypes.GlobalCommand, data: command });
    } else {
      this.send({ type: MessageTypes.RoomPlayerCommand, data: { id: roomId, ...command } });
    }
    return this;
  }

  /**
   * 连接准备监听
   * @param {function} cb 监听函数
   * @returns this
   */
  onReady(cb: () => void) {
    return this.on("sys.ready", cb);
  }

  /**
   * 全局错误监听
   * @param {function} cb 监听函数
   * @returns this
   */
  onError(cb: (error: Error) => void) {
    this.on("global.error", cb);
    return this;
  }

  /**
   * 全局消息监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns this
   */
  onMessage(cb: (message: string, sender?: Player) => void, on=true) {
    if (on) this.on("global.message", cb);
    else this.off("global.message", cb);
    return this;
  }

  /**
   * 玩家列表变更监听
   * @param {function} cb 监听函数
   * @returns this
   */
  onPlayerList(cb: (players: Player[]) => void) {
    this.on("onPlayerList", cb);
    return this;
  }

  /**
   * 房间列表变更监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns this
   */
  onRoomList(cb: (rooms: Room[]) => void, on=true) {
    if (on) this.on("onRoomList", cb);
    else this.off("onRoomList", cb);
    return this;
  }

  /**
   * 玩家加入监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns this
   */
  onPlayerJoin(cb: (player: RoomPlayer) => void, on=true) {
    if (on) this.on("room.join", cb);
    else this.off("room.join", cb);
    return this;
  }

  /**
   * 玩家离开监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns this
   */
  onPlayerLeave(cb: (player: RoomPlayer) => void, on=true) {
    if (on) this.on("room.leave", cb);
    else this.off("room.leave", cb);
    return this;
  }

  /**
   * 玩家准备监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns this
   */
  onPlayerReady(cb: (player: RoomPlayer) => void, on=true) {
    if (on) this.on("room.player-ready", cb);
    else this.off("room.player-ready", cb);
    return this;
  }

  /**
   * 玩家取消准备监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns this
   */
  onPlayerUnready(cb: (player: RoomPlayer) => void, on=true) {
    if (on) this.on("room.player-unready", cb);
    else this.off("room.player-unready", cb);
    return this;
  }

  /**
   * 玩家状态更新监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns this
   */
  onPlayerStatus(cb: (status: PlayerStatus) => void, on=true) {
    if (on) this.on("player.status", cb);
    else this.off("player.status", cb);
    return this;
  }

  /**
   * 房间创建监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns this
   */
  onRoomCreate(cb: (room: Room) => void, on=true) {
    if (on) this.on("room.create", cb);
    else this.off("room.create", cb);
    return this;
  }

  /**
   * 房间开始游戏监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns this
   */
  onRoomStart(cb: (room: Room) => void, on=true) {
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
   * @returns this
   */
  onRoomEnd(cb: (room: Room) => void, on=true) {
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
   * @returns this
   */
  onRoomAllReady(cb: (room: Room) => void, on=true) {
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
   * @returns this
   */
  onRoomMessage(cb: (message: { content: string, sender?: RoomPlayer }) => void, on=true) {
    if (on) this.on("room.message", cb);
    else this.off("room.message", cb);
    return this;
  }

  /**
   * 玩家消息监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns this
   */
  onPlayerMessage(cb: (message: { content: string, sender?: Player }) => void, on=true) {
    if (on) this.on("player.message", cb);
    else this.off("player.message", cb);
    return this;
  }

  /**
   * 房间指令监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns this
   */
  onRoomCommand(cb: (command: any & { sender?: Player }) => void, on=true) {
    if (on) this.on("room.command", cb);
    else this.off("room.command", cb);
    return this;
  }

  /**
   * 玩家指令监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns this
   */
  onPlayerCommand(cb: (command: any & { sender?: Player }) => void, on=true) {
    if (on) this.on("player.command", cb);
    else this.off("player.command", cb);
    return this;
  }

  /**
   * 事件监听
   * @param {string} event 事件名称
   * @param {TiaoomEvents[K]} listener 监听函数
   * @returns this
   */
  on<K extends keyof TiaoomEvents>(event: K, listener: TiaoomEvents[K]): this {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(listener);
    return this;
  }

  /**
   * 事件取消监听
   * @param {string} event 事件名称
   * @param {TiaoomEvents[K]} listener 监听函数
   * @returns this
   */
  off<K extends keyof TiaoomEvents>(event: K, listener: TiaoomEvents[K]): this {
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
   * @param  {Parameters<TiaoomEvents[K]>} args 参数
   * @returns this
   */
  emit<K extends keyof TiaoomEvents>(event: K, ...args: Parameters<TiaoomEvents[K]>): this {
    const listeners = this.listeners[event] || [];
    listeners.forEach(listener => listener(...args));
    return this;
  }
}
