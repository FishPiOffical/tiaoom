import { PlayerEvents } from "@lib/events/player";
import EventEmitter from "events";

export interface PlayerOptions {
  id?: string;
  name: string;
  attributes?: any;
}

export enum PlayerStatus {
  ready = 'ready',
  unready = 'unready',
  online = 'online',
  offline = 'offline',
  playing = 'playing',
}

export interface IPlayer extends PlayerOptions {
  id: string;
  status: PlayerStatus;
}

export class Player extends EventEmitter implements IPlayer {
  on<K extends keyof PlayerEvents>(event: K, listener: PlayerEvents[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof PlayerEvents>(event: K, ...args: Parameters<PlayerEvents[K]>): boolean {
    return super.emit(event, ...args);
  }
  
  id: string = "";
  name: string = "";
  attributes?: any;
  status: PlayerStatus = PlayerStatus.online;
  sender?: (type: string, ...message: any) => void;

  constructor({ id = new Date().getTime().toString(), name = '', attributes }: PlayerOptions) {
    super();
    this.id = id;
    this.name = name;
    this.attributes = attributes;

    this.on('status', (status: PlayerStatus) => {
      this.status = status;
    });
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      attributes: this.attributes,
    };
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  setSender(sender: (type: string, ...message: any) => void) {
    const events: Array<keyof PlayerEvents> = ['command', 'message', 'join', 'leave', 'status'];
    this.sender = sender;
    events.forEach((event) => {
      this.on(event, (...data: any) => {
        this.sender!(event, ...data);
      });
    });
    return this;
  }
}