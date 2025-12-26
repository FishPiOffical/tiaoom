import { Entity, Column, PrimaryGeneratedColumn, Index, UpdateDateColumn } from "typeorm";

@Entity({ comment: '玩家游戏统计表', name: 'player_stats' })
@Index(["player", "type"], { unique: true })
export class PlayerStats {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: "玩家用户名" })
  player: string;

  @Column({ comment: "游戏类型" })
  type: string;

  @Column({ comment: "总场数", default: 0 })
  total: number;

  @Column({ comment: "胜场数", default: 0 })
  wins: number;

  @Column({ comment: "平局数", default: 0 })
  draws: number;

  @Column({ comment: "负场数", default: 0 })
  losses: number;

  @Column({ comment: "最高得分", nullable: true })
  score?: number;

  @UpdateDateColumn({ comment: "更新时间" })
  updatedAt: Date;
}
