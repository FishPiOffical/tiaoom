import { PlayEvents } from "@lib/events/player";
import EventEmitter from "events";

export class Player  extends EventEmitter {
  on<K extends keyof PlayEvents>(event: K, listener: PlayEvents[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof PlayEvents>(event: K, ...args: Parameters<PlayEvents[K]>): boolean {
    return super.emit(event, ...args);
  }
  id: string;
  data?: any;
  isReady: boolean = false;
  currentRomId?: string;
  constructor(id: string, data: any) {
    super();
    this.id = id;
    this.data = data;
  }
}
