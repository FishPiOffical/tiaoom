import { Entity, Column } from "typeorm";

@Entity({ comment: '第三方账号绑定表', name: 'user-bind' })
export class UserBind {
  @Column({ comment: "用户ID", primary: true, unique: true })
  id: string;

  @Column({ comment: "用户名" })
  username: string = '';

  @Column({ comment: "绑定来源" })
  from: string = '';

  @Column({ comment: "第三方账号ID" })
  thirdPartyId: string = '';

  @Column({ comment: "第三方账号昵称" })
  thirdPartyNickname: string = '';

  @Column({ comment: "第三方用户名", default: '' })
  thirdPartyUsername: string = '';
}