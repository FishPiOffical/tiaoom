import { Entity, Column } from "typeorm";
import { IRoom, RoomPlayer } from "tiaoom";

@Entity({ comment: '房间表', name: 'room' })
export class Room {
  @Column({ comment: "房间ID", primary: true, unique: true })
  id: string;

  @Column({ comment: "游戏类型" })
  type: string;

  @Column({ comment: "房间名称" })
  name: string;

  @Column({ comment: "最小玩家数" })
  minSize: number = 2;

  @Column({ comment: "房间容量", default: 2 })
  size: number = 2;

  @Column({ comment: "房间密码", default: '' })
  passwd: string = '';
  
  @Column('simple-json', { comment: "玩家列表" })
  players: RoomPlayer[] = [];

  @Column('simple-json', { comment: "游戏数据", nullable: true })
  gameData: any;

  @Column('bigint', { comment: "创建时间" })
  createdAt: number = Date.now();

  @Column('bigint', { comment: "更新时间" })
  updatedAt: number = Date.now();

  toRoom(): IRoom {
    return {
      id: this.id,
      name: this.name,
      size: this.size,
      minSize: this.minSize,
      attrs: {
        type: this.type,
        passwd: this.passwd,
      },
      players: this.players.map(p => new RoomPlayer(p, p.role)),
    };
  }

  constructor(room?: IRoom) {
    this.id = room?.id || '';
    this.type = room?.attrs?.type || '';
    this.name = room?.name || '';
    this.minSize = room?.minSize || 2;
    this.size = room?.size || 2;
    this.passwd = room?.attrs?.passwd || '';
    this.players = room?.players || [];
  }
}
