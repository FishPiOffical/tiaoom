import { PlayEvents } from "@lib/events/player";
import EventEmitter from "events";

export interface PlayerOptions {
  id?: string;
  name: string;
  attributes?: any;
}

export interface IPlayer extends PlayerOptions {
}

export class Player extends EventEmitter implements IPlayer {
  on<K extends keyof PlayEvents>(event: K, listener: PlayEvents[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof PlayEvents>(event: K, ...args: Parameters<PlayEvents[K]>): boolean {
    return super.emit(event, ...args);
  }
  
  id: string = "";
  name: string = "";
  attributes?: any;

  constructor({ id = new Date().getTime().toString(), name = '', attributes }: PlayerOptions) {
    super();
    this.id = id;
    this.name = name;
    this.attributes = attributes;
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
}
