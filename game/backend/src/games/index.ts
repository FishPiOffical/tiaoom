import { Column, Entity, EntityTarget, PrimaryGeneratedColumn, Repository } from "typeorm";
import { IPlayer, IRoomPlayer, PlayerRole, PlayerStatus, Room, RoomPlayer, RoomStatus } from 'tiaoom';
import * as glob from 'glob';
import * as path from "path";
import { Model } from '@/model';
import { getPlayerStat, isConfigured, omit, setPoints, updatePlayerStats } from '@/utils';
import { AppDataSource, RecordRepo } from '@/entities';
import { Router } from "express";
const files = glob.sync(path.join(__dirname, '*.*').replace(/\\/g, '/')).filter(f => f.endsWith('.ts') || f.endsWith('.js')).concat(
  glob.sync(path.join(__dirname, '**', 'index.*').replace(/\\/g, '/')).filter(f => f.endsWith('.ts') || f.endsWith('.js'))
);

export interface IGame extends IGameInfo {
  default: (room: Room, methods: IGameMethod) => any;
}

export interface IGameInfo {
  /**
   * 游戏名称
   */
  name: string;
  /**
   * 游戏最小人数
   */
  minSize: number;
  /**
   * 游戏最大人数
   */
  maxSize: number;
  /**
   * 游戏描述
   */
  description: string;

  /**
   * 开始游戏是否需要所有玩家准备
   * - true: 需要所有玩家准备（默认）
   * - false: 只要人数满足即可开始
   */
  requireAllReadyToStart?: boolean;
  /**
   * 房间积分奖励
   */
  points?: Record<string, number>;
  /**
   * 房间积分倍率
   */
  rates?: Record<string, number>;
  /**
   * 房间积分奖励说明，若自行实现积分奖励，需填写此字段
   */
  rewardDescription?: string;
  /**
   * 扩展页面入口
   */
  extendPages?: {
    /** 
     * 入口名称 
     **/
    name: string;
    /**
     * 入口图标
     */
    icon?: string;
    /** 
     * 页面路径 
     **/
    component: string;
  }[];
}

export interface IGameMethod {
  save: (data: Record<string, any>) => Promise<void>;
  restore: () => Promise<Record<string, any> | null>;
}

export type GameMap = { [key: string]: (IGame | ({ default: typeof GameRoom & IGameData<any>, Model?: EntityTarget<any> } & IGameInfo)) };

const games :GameMap = {};
async function loadGames() {
  await Promise.all(files.map(async (file) => {
    let name = path.basename(file.replace(/\.(ts|js)$/, ''));
    if (name == 'index') {
      name = path.basename(path.dirname(file));
      if (name == 'games') return;
    }
    file = './' + name;
    const game = await import(file);
    if (!game) return;
    games[name] = game;
    return game;
  }));
  return games;
}

export const gameLoaded = loadGames();

export default games;

export interface IRoomMessage {
  /**
   * 消息内容
   */
  content: string;
  /**
   * 消息发送者
   */
  sender?: IRoomPlayer;
  /**
   * 消息创建时间
   */
  createdAt: number;
}

export interface IRoomAchievement {
  /**
   * 胜利次数
   */
  win: number;
  /**
   * 失败次数
   */
  lost: number;
  /**
   * 平局次数
   */
  draw: number;
  /**
   * 最高得分
   */
  score?: number;
}

export interface IGameCommand {
  /**
   * 指令类型
   */
  type: string;
  /**
   * 指令数据
   */
  data?: any;
  /**
   * 指令发送者
   */
  sender: IRoomPlayer;
}

export class GameRoom {
  /**
   * 房间消息历史
   */
  messageHistory: IRoomMessage[] = [];
  /**
   * 房间成就数据
   */
  achievements: Record<string, IRoomAchievement> = {};
  /**
   * 允许观众使用的指令
   */
  publicCommands: string[] = ['say', 'status'];
  /**
   * 忽略保存的属性列表
   */
  saveIgnoreProps: string[] = [];
  /**
   * 计时器ID记录
   */
  tickTimeout: Record<string, NodeJS.Timeout> = {};
  /**
   * 计时器结束时间记录
   */
  tickEndTime: Record<string, number> = {};
  /**
   * 游戏房间实例
   */
  room: Room;
  /**
   * 游戏开始时间
   */
  beginTime: number = 0;

  constructor(room: Room) {
    this.room = room;
  }

  get Routers(): Router | null {
    return null;
  }

  /**
   * 初始化游戏房间
   * @returns room 实例
   */
  init() {
    process.on('beforeExit', async () => {
      await this.save();
    });
    return this.room.on('player-command', (message: any) => {
      // 允许观众使用的指令
      const players = this.publicCommands.includes(message.type)
        ? this.room.players
        : this.room.validPlayers;
      const sender = players.find((p) => p.id == message.sender?.id)!;
      if (!sender) return;
      if (sender.role != PlayerRole.player && message.type == 'say') {
        // 游玩时间观众发言仅广播给其他观众
        if (this.room.status == RoomStatus.playing) {
          this.onWatcherSay(message);
          return;
        }
      }
      this.onCommand({ ...message, sender });
    }).on('start', () => {
      this.onStart();
      this.beginTime = Date.now();
      this.save();
      if (this.room.attrs?.point && !isNaN(this.room.attrs.point) && this.room.attrs.point > 0) {
        this.room.validPlayers.forEach((p) => {
          if (!p.attributes.username) return;
          setPoints(-this.room.attrs!.point, p.attributes.username, `参与游戏房间【${this.room.name}】扣除`)
        });
      }
    }).on('end', () => {
      this.room.emit('command', { type: 'end' });
      this.save();
      this.stopTimer();
    }).on('message', (message: { content: string; sender?: IRoomPlayer }) => {
      this.messageHistory.unshift({ ...message, createdAt: Date.now() });
      if (this.messageHistory.length > 100) this.messageHistory.splice(this.messageHistory.length - 100);
      this.save();
    }).on('player-ready', () => {
      this.save();
    }).on('player-unready', () => {
      this.save();
    }).on('join', () => {
      this.save();
    }).on('leave', () => {
      this.save();
    }).on('close', () => {
      this.stopTimer();
    });
  }

  /**
   * 检查玩家是否在线
   * @param player 玩家
   * @returns 是否在线
   */
  isPlayerOnline(player: IPlayer): boolean {
    return !this.room.players.find((p) => p.id === player.id && p.status === PlayerStatus.offline);
  }

  /**
   * 通过玩家ID获取玩家实例
   * @param playerId 玩家ID
   * @returns 玩家实例，未找到则返回 null
   */
  getPlayerById(playerId: string): RoomPlayer | null {
    const player = this.room.players.find((p) => p.id === playerId);
    return player || null;
  }

  /**
   * 保存游戏数据
   */
  save() {
    Model.saveGameData(this.room.id, omit(this, ['room', 'tickTimeout', ...this.saveIgnoreProps]));
  }

  /**
   * 获取游戏状态
   * @param sender 请求状态的玩家
   * @returns 游戏状态
   */
  getStatus(sender: IRoomPlayer): any {
    return {
      messageHistory: this.messageHistory,
      achievements: this.achievements,
      tickEndTime: this.tickEndTime,
    };
  }

  /**
   * 当前局游戏数据，用于游戏结束保存游戏过程
   * @returns 游戏数据
   */
  getData(): any | Promise<any> {
    return {};
  }

  /**
   * 设置玩家属性
   * @param player 玩家
   * @param attributes 属性 
   */
  setPlayerAttributes(playerId: string, attributes: Record<string, any>) {
    const player = this.room.players.find((p) => p.id === playerId);
    if (!player) return;
    player.attributes = { ...player.attributes, ...attributes };
    this.save();
  }

  onPreStart(sender: IPlayer, room: Room) {

  }

  /**
   * 游戏开始时调用，继承时重写
   */
  onStart() {
    throw new Error("Method not implemented.");
  }

  /**
   * 游戏指令处理，继承时扩展，重写时需调用 super.onCommand(message)
   * @param message 游戏指令
   */
  onCommand(message: IGameCommand) {
    const sender = message.sender as RoomPlayer;
    switch (message.type) {
      case 'say':
        this.onSay(message);
        break;
      case 'status': {
        const player = this.room.players.find((p) => p.id == message.data.id);
        if (!player) break;
        player.emit('command', {
          type: 'status',
          data: this.getStatus(player),
        });
        break;
      }
    }
  }

  /**
   * 在游戏中时，观众聊天指令处理，继承时可重写
   * @param message 游戏指令
   */
  onWatcherSay(message: IGameCommand) {
    const sender = message.sender as RoomPlayer;
    this.room.watchers.forEach((watcher) => {
      watcher.emit('message', { content: `${message.data}`, sender });
    });
  }

  /** 
   * 玩家聊天指令处理，继承时可重写
   * @param message 游戏指令
   */
  onSay(message: IGameCommand) {
    const sender = message.sender as RoomPlayer;
    this.say(message.data, sender);
  }

  /**
   * 房间消息频道内发送消息
   * @param message 消息内容
   * @param sender 发送者，若为空则为系统消息
   */
  say(message: string, sender?: IRoomPlayer) {
    this.room.emit('message', { content: message, sender });
  }

  /**
   * 发送消息给指定玩家
   * @param message 消息内容
   * @param receiver 接收者
   */
  sayTo(message: string, receiver: RoomPlayer) {
    receiver.emit('message', { content: message });
  }

  /**
   * 发送游戏指令到房间内所有玩家
   * @param type 指令类型
   * @param data 指令数据
   * @param sender 发送者，若为空则为系统指令
   */
  command(type: string, data?: any, sender?: { id: string }) {
    this.room.emit('command', { type, data, sender });
  }

  /**
   * 发送游戏指令到指定玩家
   * @param type 指令类型
   * @param data 指令数据
   * @param receiver 接收者
   */
  commandTo(type: string, data: any, receiver: RoomPlayer) {
    receiver.emit('command', { type, data });
  }

  /**
   * 模拟玩家发出房间指令
   * @param type 指令类型
   * @param data 指令数据
   * @param sender 发送者
   */
  virtualCommand(type: string, data: any, sender: RoomPlayer) {
    this.room.emit('player-command', { type, data, sender } );
  }

  /**
   * 保存成就数据
   * @param winner 当前局胜者，无胜者传 null 或 undefined
   */
  async saveAchievements(winners?: RoomPlayer[] | null, saveRecord: boolean = true) {
    this.room.validPlayers.forEach((p) => {
      if (!this.achievements[p.name]) {
        this.achievements[p.name] = { win: 0, lost: 0, draw: 0 };
      }
      if (winners?.some(w => w.id === p.id)) {
        this.achievements[p.name].win += 1;
      } else {
        this.achievements[p.name].lost += 1;
      }

      if (p.attributes.username && saveRecord) {
        let result: 'win' | 'draw' | 'loss' = 'draw';
        if (winners && winners.length > 0) {
           if (winners.some(w => w.id === p.id)) {
             result = 'win';
           } else {
             result = 'loss';
           }
        }
        updatePlayerStats(p.attributes.username, this.room.attrs!.type, result).catch(console.error);
      }
    });
    if (winners?.length && this.room.attrs?.point && !isNaN(this.room.attrs.point) && this.room.attrs.point > 0) {
      const winPoint = Math.floor(((this.room.attrs.rate || 1) * this.room.attrs.point + this.room.attrs.point) * 0.9);
      winners.forEach((winner) => {
        if (!winner.attributes.username) return;
        setPoints(winPoint, winner.attributes.username, `游戏房间【${this.room.name}】获胜奖励`);
      });
      const loserPoint = Math.ceil(this.room.attrs.rate * this.room.attrs.point * winners.length - this.room.attrs.point);
      if (this.room.attrs.rate > 1) {
        this.room.validPlayers.forEach((p) => {
          if (!winners.some(w => w.id === p.id)) {
            if (!p.attributes.username) return;
            setPoints(-loserPoint, p.attributes.username, `游戏房间【${this.room.name}】失败扣除`);
          }
        });
      }
    }
    this.room.emit('command', { type: 'achievements', data: this.achievements });
    this.save();
    if (!saveRecord) return;
    this.saveRecord(winners);
  }

  /**
   * 保存分数记录
   * @param score 分数 
   */
  async saveScore(score: number) {
    this.room.validPlayers.forEach((p) => {
      if (!p.attributes.username) return;
      updatePlayerStats(p.attributes.username, this.room.attrs!.type, 'draw', score).catch(console.error);
      if (!this.achievements[p.name]) this.achievements[p.name] = { win: 0, lost: 0, draw: 0, score: 0 };
      this.achievements[p.name].score = Math.max(this.achievements[p.name].score || 0, score);
    });
    this.room.emit('command', { type: 'achievements', data: this.achievements });
    this.save();
    this.saveRecord(null, score);
  }

  /**
   * 保存游戏记录
   * @param winners 当前局胜者，无胜者传 null 或 undefined
   * @param score 分数
   */
  async saveRecord(winners: RoomPlayer[] | null | undefined, score?: number) {
    RecordRepo().save(RecordRepo().create({
      type: this.room.attrs!.type,
      roomName: this.room.name,
      data: await this.getData(),
      players: this.room.validPlayers.map(p => p.attributes.username),
      winners: winners?.map(w => w.attributes.username) || [],
      beginTime: this.beginTime,
      score,
    })).catch(console.error);
  }

  async getMaxScore(player: RoomPlayer): Promise<number> {
    const state = await getPlayerStat(player.attributes.username, this.room.attrs!.type);
    return state?.score || 0;
  }

  /**
   * 启动计时器
   * @param callback 计时器结束回调
   * @param ms 计时器时间，单位毫秒
   * @param name 计时器名称
   */
  startTimer(callback: () => void, ms: number, name = '') {
    this.stopTimer();
    this.tickEndTime[name] = Date.now() + ms;
    this.tickTimeout[name] = setTimeout(() => {
      delete this.tickTimeout[name];
      delete this.tickEndTime[name];
      callback();
    }, ms);
    this.room.emit('command', { type: 'countdown', data: { seconds: ms / 1000, name, end: this.tickEndTime[name] } });
  }

  /**
   * 停止计时器
   * @param name 计时器名称，未指定则停止所有计时器
   */
  stopTimer(name='') {
    if (name &&this.tickTimeout[name]) {
      clearTimeout(this.tickTimeout[name]);
      delete this.tickTimeout[name];
      delete this.tickEndTime[name];
    } else if (!name) {
      Object.keys(this.tickTimeout).forEach((key) => {
        clearTimeout(this.tickTimeout[key]);
        delete this.tickTimeout[key];
        delete this.tickEndTime[key];
      });
    }
  }

  /**
   * 恢复计时器，在恢复游戏时调用，可重写 init 方法时调用
   * @param timer 计时器回调集合
   */
  restoreTimer(timer: Record<string, () => void>) {
    Object.keys(this.tickEndTime).forEach((name) => {
      const endTime = this.tickEndTime[name];
      const now = Date.now();
      if (endTime > now) {
        this.startTimer(timer[name], endTime - now, name);
      } else {
        delete this.tickEndTime[name];
        delete this.tickTimeout[name];
        timer[name]();
      }
    });
  }
}

export class BaseModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint', { comment: "创建时间" })
  createdAt: number = Date.now();

  @Column('bigint', { comment: "更新时间" })
  updatedAt: number = Date.now();

  static getRepo<T extends BaseModel>(target: EntityTarget<T>): Repository<T> {
    if (!isConfigured()) {
      throw new Error("系统未配置数据库，无法使用该功能");
    }
    return AppDataSource.getRepository<T>(target);
  }
}

export interface IGameData<T> {
  getList(query: { [key: string]: any, page: number, count: number }): Promise<{ records: T[], total: number }>;
  insert(data: T): Promise<T>;
  update(id: string, data: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
}
