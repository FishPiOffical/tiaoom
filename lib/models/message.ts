export class Message {
  type: string;
  data: any;
  constructor(type: string, data: any) {
    this.type = type;
    this.data = data;
  }
}
