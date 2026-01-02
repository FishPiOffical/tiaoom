import { GameRoom, IGameCommand } from '.';
import { RoomPlayer, PlayerRole } from 'tiaoom';

// 定义游戏基本属性
export const name = '抢数字'; // 游戏名称
export const minSize = 2; // 最小玩家数
export const maxSize = 2; // 最大玩家数
export const description = '玩家轮流点击按钮增加计数，谁让计数变成指定数字谁就获胜。'; // 游戏描述

export default class ClickRoom extends GameRoom {
  count = 0;
  currentPlayer: RoomPlayer | undefined;
  target = 0;
  history: { playerId: string; increment: number; time: number }[] = [];

  // 游戏开始时调用
  onStart() {
    this.count = 0;
    this.history = [];

    this.currentPlayer = this.room.validPlayers.find(p => p.id !== this.currentPlayer?.id);
    this.target = Math.floor(Math.random() * 40) + 20; // 随机目标数字在 20-60 之间
    
    // 广播初始状态
    this.room.emit('command', { type: 'update', data: { count: this.count, target: this.target } });
    this.room.emit('command', { type: 'click', data: { player: this.currentPlayer } });
  }

  // 处理玩家指令
  onCommand(message: IGameCommand) {
    super.onCommand(message); // 处理通用指令
    if (message.type === 'click') {
      // 计算增加的数值，确保在 1-4 之间
      const increment = Number(message.data - 1) % 4 + 1;
      this.count += increment;

      // 记录历史
      this.history.push({ playerId: message.sender.id, increment, time: Date.now() - this.beginTime });
      
      // 广播新状态
      this.room.emit('command', { type: 'update', data: { count: this.count } });

      // 保存状态
      this.save();
      if (this.count  === this.target) {
        this.saveAchievements(this.room.validPlayers.filter(p => p.id === message.sender.id));
        this.say(`${message.sender.name} 计数达到 ${this.count}，获胜！`);
      } else if (this.count > this.target) {
        // 大于目标分算平，无胜者
        this.saveAchievements();
        this.say(`${message.sender.name} 计数达到 ${this.count}，超过目标分，打平！`);
      } else {
        // 未达到目标数字继续游戏
        this.currentPlayer = this.room.validPlayers.find(p => p.id !== message.sender.id);
        this.room.emit('command', { type: 'click', data: { player: this.currentPlayer } });
        return;
      }
      // 大于等于目标数字，游戏结束
      this.room.end();
    }
  }

  // 获取当前游戏状态（用于断线重连等）
  getStatus(sender: any) {
    return {
      ...super.getStatus(sender),
      count: this.count,
      target: this.target,
      currentPlayer: this.currentPlayer,
    };
  }

  getData() {
    return {
      ...super.getData(),
      target: this.target,
      history: this.history,
      players: this.room.validPlayers.map(p => ({ id: p.id, name: p.name })),
    };
  }
}