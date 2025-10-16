import { PlayerEvents } from "@lib/events/player";
import EventEmitter from "events";

export interface PlayerOptions {
  id: string;
  name: string;
  attributes?: any;
  sender?: (type: string, ...message: any) => void;
}

export enum PlayerStatus {
  ready = 'ready',
  unready = 'unready',
  online = 'online',
  playing = 'playing',
}

export interface IPlayer extends PlayerOptions {
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

  constructor({ id = new Date().getTime().toString(), name = '', attributes, sender }: PlayerOptions) {
    super();
    this.id = id;
    this.name = name;
    this.attributes = attributes;
    this.sender = sender;

    this.on('status', (status: PlayerStatus) => {
      this.status = status;
    });
    
    const events: Array<keyof PlayerEvents> = ['command', 'message', 'join', 'leave', 'status'];
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

  setSender(sender: (type: string, ...message: any) => void) {
    this.sender = sender;
    return this;
  }
}