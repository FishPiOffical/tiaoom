import { PlayerEvents } from "@lib/events/player";
import EventEmitter from "events";

/**
 * 玩家选项接口
 */
export interface IPlayerOptions {
  /**
   * 玩家ID
   */
  id: string;
  /**
   * 玩家名称
   */
  name: string;
  /**
   * 玩家属性
   */
  attributes?: any;
  /**
   * 发送者函数
   */
  sender?: (type: string, ...message: any) => void;
}

/**
 * 玩家状态枚举
 */
export enum PlayerStatus {
  /**
   * 已准备
   */
  ready = 'ready',
  /**
   * 未准备
   */
  unready = 'unready',
  /**
   * 在线
   */
  online = 'online',
  /**
   * 游戏中
   */
  playing = 'playing',
}

/**
 * 玩家接口
 */
export interface IPlayer extends IPlayerOptions {
  /**
   * 玩家状态
   */
  status: PlayerStatus;
}

/**
 * 玩家
 */
export class Player extends EventEmitter implements IPlayer {
  /**
   * 监听玩家事件
   * @param event 事件名，具体见 PlayEvents
   * @param listener 监听器
   * @returns this
   */
  on<K extends keyof PlayerEvents>(event: K, listener: PlayerEvents[K]): this {
    return super.on(event, listener);
  }

  /**
   * 触发玩家事件
   * @param event 事件名，具体见 PlayEvents
   * @param args 参数
   * @returns 是否有监听器被触发
   */
  emit<K extends keyof PlayerEvents>(event: K, ...args: Parameters<PlayerEvents[K]>): boolean {
    return super.emit(event, ...args);
  }
  
  id: string = "";
  name: string = "";
  attributes?: any;
  status: PlayerStatus = PlayerStatus.online;
  sender?: (type: string, ...message: any) => void;

  constructor({ id = new Date().getTime().toString(), name = '', attributes, sender }: IPlayerOptions) {
    super();
    this.id = id;
    this.name = name;
    this.attributes = attributes;
    this.sender = sender;

    this.on('status', (status: PlayerStatus) => {
      this.status = status;
    });
    
    const events: Array<keyof PlayerEvents> = ['command', 'message', 'status'];
    events.forEach((event) => {
      this.on(event, (...data: any) => {
        this.sender?.(event, ...data);
      });
    });  
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      attributes: this.attributes,
      status: this.status,
    };
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  /**
   * 设置发送者函数
   * @param {(type: string, ...message: any) => void} sender 发送者函数
   * @returns this
   */
  setSender(sender: (type: string, ...message: any) => void) {
    this.sender = sender;
    return this;
  }
}