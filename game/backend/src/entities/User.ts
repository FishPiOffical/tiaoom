import { Entity, Column } from "typeorm";

@Entity({ comment: '用户表', name: 'user' })
export class User {
  @Column({ comment: "用户ID", primary: true, unique: true })
  id: string;

  @Column({ comment: "用户名" })
  username: string;

  @Column({ comment: "昵称" })
  nickname: string;

  @Column({ comment: "头像链接", default: '' })
  avatar: string = '';

  @Column('bigint', { comment: "上次登录时间" })
  lastLogin: number = Date.now();

  @Column({ comment: "注册来源" })
  from: string = '';

  @Column({ comment: "是否管理员", default: false })
  isAdmin: boolean = false;

  @Column({ comment: "最后登录 IP 地址", default: '' })
  ip: string = '';

  constructor(id = '', username: string = '', nickname: string = '') {
    this.id = id;
    this.username = username;
    this.nickname = nickname || username;
  }
}