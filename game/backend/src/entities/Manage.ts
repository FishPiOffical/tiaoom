import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity({ comment: '数据管理表', name: 'manage' })
export class Manage {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column({ comment: "游戏类型" })
  type: string = '';

  @Column('simple-json', { comment: "管理员用户名" })
  manages: string[] = [];

  @Column('bigint', { comment: "创建时间" })
  createdAt: number = Date.now();

  @Column('bigint', { comment: "更新时间" })
  updatedAt: number = Date.now();
}
