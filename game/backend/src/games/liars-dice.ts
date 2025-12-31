import { GameRoom, IGameCommand } from '.';
import { RoomPlayer } from 'tiaoom';

export const name = '大话骰子';
export const minSize = 2;
export const maxSize = 6;
export const description = '每人5颗骰子，轮流叫号，吹牛还是诚实？';
export const points = {
  '我就玩玩': 1,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
}

interface Bid {
  playerId: string;
  count: number;
  face: number;
  zhai: boolean;
}

export default class LiarsDiceRoom extends GameRoom {
  dice: Record<string, number[]> = {};
  currentPlayer: RoomPlayer | undefined;
  lastBid: Bid | null = null;
  isZhai = false;
  history: { type: 'bid' | 'open'; playerId: string; data?: any; time: number }[] = [];
  
  onStart() {
    this.dice = {};
    this.lastBid = null;
    this.isZhai = false;
    this.history = [];
    this.currentPlayer = this.room.validPlayers[Math.floor(Math.random() * this.room.validPlayers.length)];

    // Roll dice
    for (const player of this.room.validPlayers) {
      this.dice[player.id] = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
      this.commandTo('dice', { dice: this.dice[player.id] }, player);
    }

    // Broadcast initial state
    this.room.emit('command', { 
      type: 'update', 
      data: { 
        currentPlayer: this.currentPlayer,
        lastBid: this.lastBid,
        diceCounts: this.getDiceCounts(),
        isZhai: this.isZhai
      } 
    });
    
    this.say(`游戏开始！${this.currentPlayer.name} 请开始叫号。`);
    this.save();
  }

  getDiceCounts() {
    const counts: Record<string, number> = {};
    for (const pid in this.dice) {
      counts[pid] = this.dice[pid].length;
    }
    return counts;
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    if (message.sender.id !== this.currentPlayer?.id) return;

    if (message.type === 'bid') {
      const { count, face, zhai } = message.data;
      // Validation
      if (!Number.isInteger(count) || !Number.isInteger(face) || face < 1 || face > 6) return;
      
      // 如果叫的是1，或者已经斋了，或者玩家选择斋，则本局变为斋
      const nextIsZhai = this.isZhai || face === 1 || !!zhai;

      if (this.lastBid) {
        if (count < this.lastBid.count) return;
        if (count === this.lastBid.count && face <= this.lastBid.face) {
            // 如果数量点数都一样，且之前不是斋，现在变斋，则允许（视为加大）
            if (!(this.lastBid.zhai === false && nextIsZhai === true)) {
                return;
            }
        }
      } else {
        if (count <= 0) return;
      }

      this.isZhai = nextIsZhai;
      this.lastBid = { playerId: message.sender.id, count, face, zhai: this.isZhai };
      this.history.push({ type: 'bid', playerId: message.sender.id, data: { count, face, zhai: this.isZhai }, time: Date.now() - this.beginTime });
      this.say(`${message.sender.name} 叫了 ${count} 个 ${face}${this.isZhai ? ' (斋)' : ''}`);
      
      this.nextTurn();
      this.save();
    } else if (message.type === 'open') {
      if (!this.lastBid) return;
      
      this.history.push({ type: 'open', playerId: message.sender.id, time: Date.now() - this.beginTime });
      this.say(`${message.sender.name} 开！`);
      
      // Reveal all dice
      this.room.emit('command', { type: 'reveal', data: { dice: this.dice } });
      
      // Calculate result
      const face = this.lastBid.face;
      let total = 0;
      for (const pid in this.dice) {
        for (const d of this.dice[pid]) {
          // 如果是斋局，1不能当赖子（除非叫的是1）
          // 如果不是斋局，1可以当赖子
          if (d === face) {
              total++;
          } else if (!this.isZhai && d === 1) {
              total++;
          }
        }
      }
      
      this.say(`共有 ${total} 个 ${face} ${!this.isZhai && face !== 1 ? '(含1)' : ''}`);
      
      let winner: RoomPlayer | undefined;
      let loser: RoomPlayer | undefined;

      if (total >= this.lastBid.count) {
        // Bidder wins, Challenger loses
        this.say(`叫号成功！${total} >= ${this.lastBid.count}`);
        winner = this.room.validPlayers.find(p => p.id === this.lastBid!.playerId);
        loser = this.room.validPlayers.find(p => p.id === message.sender.id);
      } else {
        // Bidder loses, Challenger wins
        this.say(`叫号失败！${total} < ${this.lastBid.count}`);
        winner = this.room.validPlayers.find(p => p.id === message.sender.id);
        loser = this.room.validPlayers.find(p => p.id === this.lastBid!.playerId);
      }
      
      if (winner) {
          this.saveAchievements([winner]);
          this.say(`${winner.name} 获胜！`);
      }
      
      this.room.end();
    }
  }
  
  nextTurn() {
    const idx = this.room.validPlayers.findIndex(p => p.id === this.currentPlayer?.id);
    const nextIdx = (idx + 1) % this.room.validPlayers.length;
    this.currentPlayer = this.room.validPlayers[nextIdx];
    
    this.room.emit('command', { 
      type: 'update', 
      data: { 
        currentPlayer: this.currentPlayer,
        lastBid: this.lastBid,
        isZhai: this.isZhai
      } 
    });
  }

  getStatus(sender: any) {
    return {
      ...super.getStatus(sender),
      currentPlayer: this.currentPlayer,
      lastBid: this.lastBid,
      diceCounts: this.getDiceCounts(),
      myDice: this.dice[sender.id] || [],
      isZhai: this.isZhai
    };
  }
  
  getData() {
      return {
          ...super.getData(),
          dice: this.dice,
          lastBid: this.lastBid,
          currentPlayer: this.currentPlayer,
          isZhai: this.isZhai,
          history: this.history,
          players: this.room.validPlayers.map(p => ({ id: p.id, name: p.name })),
      };
  }
}
