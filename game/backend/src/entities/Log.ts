import { Entity, Column } from "typeorm";

@Entity({ comment: '日志表', name: 'log' })
export class Log {
  @Column({ comment: "日志ID", primary: true, unique: true, generated: 'increment' })
  id: number;
  
  @Column({ comment: "类型" })
  type: string = '';

  @Column('simple-json', { comment: "数据" })
  data: any = '';

  @Column({ comment: '发送者ID', nullable: true })
  senderId?: string;

  @Column('simple-json', { comment: "错误信息", nullable: true })
  error: any;

  @Column('bigint', { comment: "创建时间" })
  createdAt: number = Date.now();
}
