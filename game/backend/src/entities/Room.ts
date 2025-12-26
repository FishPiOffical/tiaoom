import { Entity, Column, PrimaryGeneratedColumn, ObjectIdColumn } from "typeorm";
import { IRoom, RoomPlayer } from "tiaoom";

export class Room {
  /**
   * 游戏类型
   */
  type: string;
  /**
   * 房间名称
   */
  name: string;
  /**
   * 最小玩家数
   */
  minSize: number = 2;
  /**
   * 房间容量
   */
  size: number = 2;
  /**
   * 房间密码
   */
  passwd: string = '';
  /**
   * 玩家列表
   */
  players: RoomPlayer[] = [];
  /**
   * 游戏数据
   */
  gameData: any;
  /**
   * 创建时间
   */
  createdAt: number = Date.now();
  /**
   * 更新时间
   */
  updatedAt: number = Date.now();
  /**
   * 房间ID
   */
  roomId: string;
  /**
   * 房间属性
   */
  attrs: Record<string, any> = {};

  toRoom(): IRoom {
    return {
      id: this.roomId,
      name: this.name,
      size: this.size,
      minSize: this.minSize,
      attrs: {
        ...this.attrs,
        type: this.type,
        passwd: this.passwd,
      },
      players: this.players.map(p => new RoomPlayer(p, p.role)),
    };
  }

  constructor(room?: IRoom) {
    this.roomId = room?.id || '';
    this.type = room?.attrs?.type || '';
    this.name = room?.name || '';
    this.minSize = room?.minSize || 2;
    this.size = room?.size || 2;
    this.passwd = room?.attrs?.passwd || '';
    this.players = room?.players || [];
    this.attrs = room?.attrs || {};
  }
}

export abstract class RoomBase extends Room {
  @Column({ comment: "游戏类型" })
  type: string = '';

  @Column({ comment: "房间名称" })
  name: string = '';

  @Column({ comment: "最小玩家数" })
  minSize: number = 2;

  @Column({ comment: "房间容量", default: 2 })
  size: number = 2;

  @Column({ comment: "房间密码", default: '' })
  passwd: string = '';

  @Column({ comment: "房间属性", type: 'simple-json', nullable: true })
  attrs: Record<string, any> = {};
  
  @Column('simple-json', { comment: "玩家列表" })
  players: RoomPlayer[] = [];

  @Column('simple-json', { comment: "游戏数据", nullable: true })
  gameData: any = null;

  @Column('bigint', { comment: "创建时间" })
  createdAt: number = Date.now();

  @Column('bigint', { comment: "更新时间" })
  updatedAt: number = Date.now();

  abstract roomId: string;

  constructor(room?: IRoom) {
    super(room);
    this.type = room?.attrs?.type || '';
    this.name = room?.name || '';
    this.minSize = room?.minSize || 2;
    this.size = room?.size || 2;
    this.passwd = room?.attrs?.passwd || '';
    this.players = room?.players || [];
    this.attrs = room?.attrs || {};
  }
}

@Entity({ comment: '房间表', name: 'room' })
export class RoomSQL extends RoomBase {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column({ comment: "房间ID", primary: true, unique: true })
  roomId: string;

  constructor(room?: IRoom) {
    super(room);
    this.roomId = room?.id || '';
  }
}

@Entity({ comment: '房间表', name: 'room' })
export class RoomMongo extends RoomBase {
  @ObjectIdColumn()
  _id: any;

  @Column({ comment: "房间ID", unique: true })
  roomId: string;

  constructor(room?: IRoom) {
    super(room);
    this.roomId = room?.id || '';
  }
}
