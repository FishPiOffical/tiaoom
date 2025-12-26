import { IPlayer, Player, IPlayerOptions, PlayerStatus } from "./player";
import EventEmitter from "events";
import { RoomEvents } from "@lib/events";

/**
 * 房间选项接口
 */
export interface IRoomOptions {
  /**
   * 房间号
   */
  id: string, 
  /**
   * 房间名称
   */
  name: string,
  /**
   * 房间容量
   */
  size: number, 
  /**
   * 最小容量
   */
  minSize: number,
  /**
   * 其他属性
   */
  attrs?: Record<string, any>,
}

/**
 * 房间玩家角色
 */
export enum PlayerRole {
  /**
   * 玩家
   */
  player = 'player',
  /**
   * 观众
   */
  watcher = 'watcher',
  /**
   * 管理员
   */
  admin = 'admin',
}

/**
 * 房间状态
 */
export enum RoomStatus {
  /**
   * 等待中
   */
  waiting = 'waiting',
  /**
   * 已准备
   */
  ready = 'ready',
  /**
   * 游戏中
   */
  playing = 'playing',
}

/**
 * 房间接口
 */
export interface IRoom extends IRoomOptions {
  /**
   * 房间玩家列表
   */
  players: RoomPlayer[];
}

/**
 * 房间玩家选项接口
 */
export interface IRoomPlayerOptions extends IPlayerOptions {
  /**
   * 房间Id
   */
  roomId?: string;
}

/**
 * 房间玩家接口
 */
export interface IRoomPlayer extends IRoomPlayerOptions, IPlayer {
  /**
   * 是否已准备
   */
  isReady: boolean;
  /**
   * 玩家角色
   */
  role: PlayerRole;
  /**
   * 是否为房主
   */
  isCreator: boolean;
  /**
   * 房间 Id
   */
  roomId: string;
}

/**
 * 房间玩家
 */
export class RoomPlayer extends Player implements IRoomPlayer {
  isReady: boolean = false;
  role: PlayerRole = PlayerRole.player;
  isCreator: boolean = false;
  roomId: string;

  constructor(player: Partial<IRoomPlayer>, role: PlayerRole = PlayerRole.player) {
    super(player);
    this.isReady = player.isReady || false;
    this.isCreator = player.isCreator || false;
    this.roomId = player.roomId || '';
    this.role = player.role || role;
    this.status = player.status || PlayerStatus.online;
    if (player instanceof Player && player.sender) super.setSender(player.sender);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      status: this.status,
      role: this.role,
      isReady: this.isReady,
      isCreator: this.isCreator,
    };
  }
}

/**
 * 房间
 */
export class Room extends EventEmitter implements IRoom {
  /**
   * 监听房间事件
   * @param event 事件名，具体见 RoomEvents
   * @param listener 监听器
   * @returns this
   */
  on<K extends keyof RoomEvents>(event: K, listener: RoomEvents[K]): this {
    return super.on(event, listener);
  }

  /**
   * 触发房间事件
   * @param event 事件名，具体见 RoomEvents
   * @param args 参数
   * @returns 是否有监听器被触发
   */
  emit<K extends keyof RoomEvents>(event: K, ...args: Parameters<RoomEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  id: string;
  size: number = 10;
  name: string = '';
  minSize: number = 2;
  attrs?: Record<string, any>;
  players: RoomPlayer[] = [];

  /**
   * 有效玩家列表(非观众)
   */
  get validPlayers() {
    return this.players.filter((player) => player.role === PlayerRole.player);
  }

  /**
   * 观众列表
   */
  get watchers() {
    return this.players.filter((player) => player.role === PlayerRole.watcher);
  }

  /**
   * 消息发送器
   */
  private sender?: (type: string, ...message: any) => void;

  /**
   * 房间玩家是否已准备好
   */
  get isReady(): boolean {
    return this.players.length >= this.minSize
      && this.players.every((target) => target.isReady || target.role === PlayerRole.watcher); // is all player ready
  }

  /**
   * 房间状态
   */
  get status(): RoomStatus {
    if (!this.isReady) return RoomStatus.waiting;
    if (this.players.findIndex((target) => target.status === PlayerStatus.playing) != -1) return RoomStatus.playing;
    return RoomStatus.ready;
  }

  /**
   * 房间是否在游戏中
   */
  get isPlaying(): boolean {
    return this.status === RoomStatus.playing;
  }

  /**
   * 房间是否已满
   */
  get isFull(): boolean {
    return this.validPlayers.length == this.size;
  }

  /**
   * 房主
   */
  get owner(): RoomPlayer | undefined {
    const creator = this.players.find((player) => player.isCreator);
    return creator;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      size: this.size || 10,
      minSize: this.minSize,
      status: this.status,
      players: this.players.map((player) => player.toJSON()),
      attrs: this.attrs,
    }
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  constructor(room: Partial<IRoomOptions> | Room, players: RoomPlayer[] = []) {
    super();
    if (room instanceof Room) {
      this.players = room.players;
      this.players.forEach((p) => {
        p.roomId = room.id;
      });
    }

    this.id = room.id || new Date().getTime().toString();
    this.name = room.name || '';
    this.size = room.size || 10;
    this.minSize = room.minSize || 2;
    this.attrs = room.attrs;
    this.players = players;
    
    const events: Array<keyof RoomEvents> = ['message', 'command', 'start', 'end', 'all-ready', 'player-unready', 'player-ready', 'join', 'leave'];
    events.forEach((event) => {
      this.on(event, (...data: any) => {
        this.sender?.(event, ...data);
      });
    });
  }

  /**
   * 设置房主
   * @param {Player} player 玩家
   * @returns this
   */
  setCreator(player: Player) {
    const roomPlayer = this.searchPlayer(player);
    if (roomPlayer) {
      this.players.forEach((p) => {
        p.isCreator = false;
      });
      roomPlayer.isCreator = true;
      this.emit("update", this);
    }
    return this;
  }

  /**
   * 添加玩家
   * @param {Player} player 玩家
   * @param {boolean} isCreator 是否房主
   * @returns 玩家实例 
   */
  addPlayer(player: Player, isCreator: boolean = false, role: PlayerRole = PlayerRole.player) {
    let roomPlayer = this.searchPlayer(player);
    if (roomPlayer) {
      if (role == PlayerRole.player && roomPlayer.role === PlayerRole.watcher && !this.isFull && !this.isPlaying) {
        roomPlayer.role = PlayerRole.player;
        roomPlayer.isCreator = isCreator;
        this.emit("update", this);
      }
      return roomPlayer;
    }

    if (isCreator) {
      this.players.forEach((p) => {
        p.isCreator = false;
      });
    }
    roomPlayer = new RoomPlayer(player, this.isFull || this.isPlaying ? PlayerRole.watcher : role);
    roomPlayer.isCreator = isCreator;
    roomPlayer.roomId = this.id;
    this.players.push(roomPlayer);
    this.emit("join", { ...roomPlayer.toJSON(), roomId: this.id });
    
    return roomPlayer;
  }

  /**
   * 离开座位
   * @param {string | IPlayer} player 玩家 / 玩家 id
   */
  leaveSeat(playerId: string): RoomPlayer;
  leaveSeat(player: IPlayer): RoomPlayer;
  leaveSeat(player: IPlayer | string) {
    const playerId = typeof player === "string" ? player : player.id;
    const roomPlayer = this.searchPlayer(playerId);
    if (roomPlayer && roomPlayer.role === PlayerRole.player) {
      roomPlayer.role = PlayerRole.watcher;
      roomPlayer.isReady = false;
      this.emit("leave",  { ...roomPlayer, roomId: this.id });
      if (roomPlayer.isCreator && this.validPlayers.length > 0) {
        this.validPlayers[0].isCreator = true;
        this.emit("update", this);
      }
    }
    return roomPlayer!;
  }

  /**
   * 踢出玩家
   * @param {string | IPlayer} player 玩家 / 玩家 id
   */
  kickPlayer(playerId: string): RoomPlayer;
  kickPlayer(player: IPlayer): RoomPlayer;
  kickPlayer(player: IPlayer | string) {
    const playerId = typeof player === "string" ? player : player.id;
    const index = this.players.findIndex((p) => p.id == playerId);
    const roomPlayer = this.players[index];
    if (index > -1) {
      roomPlayer.status = PlayerStatus.online;
      this.emit("leave",  { ...roomPlayer, roomId: this.id });
      this.players.splice(index, 1);
      if (roomPlayer.isCreator && this.players.length > 0) {
        this.players[0].isCreator = true;
        this.emit("update", this);
      }
    }
    return roomPlayer;
  }

  /**
   * 搜索玩家
   * @param {string | IPlayer} player 玩家 / 玩家 id
   */
  searchPlayer(playerId: string): RoomPlayer | undefined;
  searchPlayer(player: IPlayer): RoomPlayer | undefined;
  searchPlayer(player: string | IPlayer) {
    const playerId = typeof player === "string" ? player : player?.id;
    return this.players.find((player) => player.id == playerId);
  }

  /**
   * 开始游戏
   */
  start(sender: IPlayer) {
    if (!this.isReady) {
      throw new Error('room is not ready.');
    }
    if (this.status === RoomStatus.playing) {
      throw new Error('room is already started.');
    }
    this.players.forEach((player) => {
      if (player.role != PlayerRole.player) return;
      player.status = PlayerStatus.playing;
      player.emit('status', PlayerStatus.playing);
    });
    this.emit("update", this);
    return this.emit("start", this);
  }

  /**
   * 结束游戏
   */
  end() {
    this.players.forEach((player) => {
      if (player.role != PlayerRole.player) return;
      player.status = PlayerStatus.unready;
      player.emit('status', PlayerStatus.unready);
    });
    this.emit("update", this);
    return this.emit("end", this);
  }

  /**
   * 设置消息发送器
   * @param sender 消息发送器
   */
  setSender(sender: (type: string, ...message: any) => void) {
    this.sender = sender;
    return this;
  }
}
