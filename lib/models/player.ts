export class Player {
  id: string;
  data?: any;
  isReady: boolean = false;
  currentRomId?: string;
  constructor(id: string, data: any) {
    this.id = id;
    this.data = data;
  }
}
