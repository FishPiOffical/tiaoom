import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity({ comment: '游戏记录表', name: 'record' })
export class Record {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column({ comment: "游戏类型" })
  type: string = '';

  @Column({ comment: "房间名称" })
  roomName: string = '';

  @Column('simple-json', { comment: "游戏数据" })
  data: any = '';

  @Column('simple-json', { comment: '玩家', nullable: true })
  players: string[];

  @Column('simple-json', { comment: "赢家", nullable: true })
  winners: string[];

  @Column('bigint', { comment: "创建时间" })
  createdAt: number = Date.now();
}
