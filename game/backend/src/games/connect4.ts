import { PlayerRole, PlayerStatus, RoomPlayer, RoomStatus } from "tiaoom";
import { GameRoom, IGameCommand } from ".";
import { sleep } from "@/utils";

/**
 * 四子棋落子与胜负检查
 * @param {number[][]} board - 当前棋盘二维数组
 * @param {number} y - 当前落子列
 * @param {number} player - 当前落子的棋子（1 黑棋，2 白棋）
 * @returns {false|true|number[][]} 不合法返回 false，胜利返回 true，否则返回最新棋盘
 */
function checkFourConnect(board: number[][], y: number, player: number): false | true | number[][] {
  const N = board.length;    // 行数
  const M = board[0].length; // 列数

  // 检查列是否合法
  if (y < 0 || y >= M) return false;

  // 找到该列最底部可落子的位置
  let x = -1;
  for (let i = N - 1; i >= 0; i--) {
    if (board[i][y] === 0) {
      x = i;
      break;
    }
  }
  // 如果该列已满或最底部不可落子
  if (x === -1 || board[x][y] === -1) return false;

  // 落子
  const newBoard = board.map(row => row.slice());
  newBoard[x][y] = player;

  // 激活上方格子
  if (x - 1 >= 0 && newBoard[x - 1][y] === -1) {
    newBoard[x - 1][y] = 0;
  }

  // 检查四连
  const directions = [
    { dx: 0, dy: 1 },  // 横向
    { dx: 1, dy: 0 },  // 纵向
    { dx: 1, dy: 1 },  // 主对角
    { dx: 1, dy: -1 }, // 副对角
  ];
  function count(dx: number, dy: number) {
    let cnt = 1; // 当前落子的这一颗计入

    // 正方向
    for (let step = 1; step < 4; step++) {
      let nx = x + dx * step;
      let ny = y + dy * step;
      if (
        nx >= 0 && nx < N &&
        ny >= 0 && ny < M &&
        newBoard[nx][ny] === player
      ) {
        cnt++;
      } else {
        break;
      }
    }

    // 反方向
    for (let step = 1; step < 4; step++) {
      let nx = x - dx * step;
      let ny = y - dy * step;
      if (
        nx >= 0 && nx < N &&
        ny >= 0 && ny < M &&
        newBoard[nx][ny] === player
      ) {
        cnt++;
      } else {
        break;
      }
    }

    return cnt;
  }
  for (const { dx, dy } of directions) {
    if (count(dx, dy) >= 4) {
      board[x][y] = player;
      return true;
    }
  }

  return newBoard;
}

export const name = '四子棋';
export const minSize = 2;
export const maxSize = 2;
export const description = `两个玩家轮流在棋盘上放置自己的棋子，率先将四个棋子连成一线（横、竖、斜均可）的一方获胜。
棋子只能放置在底部或已有棋子之上。`;
export const points = {
  '我就玩玩': 0,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
}

class Connect4GameRoom extends GameRoom {
  currentPlayer?: RoomPlayer;
  lastLosePlayer?: RoomPlayer;
  board: number[][] = Array.from({ length: 8 }, () => Array(8).fill(-1));
  history: { place: string, time: number }[] = [];
  turnStartTime: number = 0;
  turnRemainingTime: number = 60000;
  playerTimeRemaining: Record<string, number> = {};
  isSealed: boolean = false;
  sealRequesterId: string | null = null;

  startTurnTimer(duration?: number) {
    // 0: 不计时, 1: 每步60s, 2: 每人15分钟
    const countDownWay = this.room.attrs?.countDownWay ?? 1;
    
    if (countDownWay === 0) {
      this.stopTimer('turn');
      return;
    }
    
    if (this.isSealed) return;

    if (duration === undefined) {
      if (countDownWay === 2 && this.currentPlayer) {
        duration = this.playerTimeRemaining[this.currentPlayer.id] ?? (15 * 60 * 1000);
      } else {
        // model 1 or default
        duration = 60000;
      }
    }

    this.turnRemainingTime = duration;
    this.turnStartTime = Date.now();
    this.startTimer(() => this.handleTurnTimeout(), duration, 'turn');
  }

  handleTurnTimeout() {
    if (!this.currentPlayer) return;
    this.say(`玩家 ${this.currentPlayer.name} 落子超时，判负。`);
    this.lastLosePlayer = this.currentPlayer;
    const winner = this.room.validPlayers.find((p) => p.id !== this.currentPlayer?.id);
    this.saveAchievements(winner ? [winner] : null);
    this.room.end();
  }

  init() {
    this.restoreTimer({
      turn: () => this.handleTurnTimeout(),
    });
    return super.init().on('player-offline', async (player) => {
      await sleep(4 * 60 * 1000); // 等待 4 分钟，判定为离线
      if (!this.isPlayerOnline(player)) return;
      if (this.room.status === RoomStatus.playing && player.role === PlayerRole.player) {
        this.stopTimer('turn');
        this.say(`玩家 ${player.name} 已离线，游戏结束。`);
        this.lastLosePlayer = this.room.validPlayers.find((p) => p.id != player.id)!;
        this.saveAchievements([this.lastLosePlayer]);
        this.room.end();
      }
      this.room.kickPlayer(player);
    }).on('join', (player) => {
      this.room.validPlayers.find((p) => p.id === player.id)?.emit('command', {
        type: 'achievements',
        data: this.achievements
      });
    });
  }

  getStatus(sender: RoomPlayer) {
    return {
      ...super.getStatus(sender),
      current: this.currentPlayer,
      board: this.isSealed ? [] : this.board,
      color: sender.attributes?.color,
      playerTimeRemaining: this.playerTimeRemaining,
      isSealed: this.isSealed,
      sealRequesterId: this.sealRequesterId,
    }
  }

  getData() {
    return {
      history: this.history,
      players: this.room.validPlayers.map((p) => ({
        username: p.attributes?.username,
        name: p.name,
        color: p.attributes?.color,
      })),
      message: this.messageHistory,
    };
  }

  onCommand(message: IGameCommand): void {
    super.onCommand(message);
    const sender = message.sender as RoomPlayer;
    switch (message.type) {
      case 'place': {
        if (this.room.status !== RoomStatus.playing) {
          this.sayTo('游戏未开始，无法落子。', sender);
          break;
        }
        if (this.isSealed) {
          this.sayTo('游戏已封盘，无法落子。', sender);
          break;
        }
        if (sender.id !== this.currentPlayer?.id) {
          this.sayTo(`轮到玩家 ${this.currentPlayer?.name} 落子。`, sender);
          break;
        }

        const { x, y } = message.data;

        const color = this.currentPlayer.attributes?.color;
        const result = checkFourConnect(this.board, y, color);

        if (!result) {
          this.commandTo('board', this.board, sender);
          this.sayTo(`无效落子！`, sender);
          return;
        }

        this.stopTimer('turn');
        this.history.push({ place: `${String.fromCharCode(65 + y)}${8 - x}`, time: Date.now() - this.beginTime });

        // 更新当前玩家剩余时间 (仅模式2有效)
        const elapsed = Date.now() - this.turnStartTime;
        if (this.room.attrs?.countDownWay === 2) {
          this.playerTimeRemaining[sender.id] = Math.max(0, this.turnRemainingTime - elapsed);
        }

        if (result == true) {
          this.command('board', this.board);
          this.say(`玩家 ${sender.name} 获胜！`);
          this.lastLosePlayer = this.room.validPlayers.find((p) => p.id != sender.id)!;
          this.saveAchievements([sender]);
          this.room.end();
          return;
        }
        
        this.board = result;
        this.command('board', this.board);
        this.command('place', { x, y });

        // 切换当前玩家
        const current = this.room.validPlayers.find((p) => p.id != this.currentPlayer?.id);
        if (current) {
          this.currentPlayer = current;
          this.command('place-turn', { player: this.currentPlayer });
          this.save();
          this.startTurnTimer();
        }
        break;
      }
      case 'request-draw': {
        this.say(`玩家 ${sender.name} 请求和棋。`);
        const otherPlayer = this.room.validPlayers.find((p) => p.id != sender.id)!;
        this.commandTo('request-draw', { player: sender }, otherPlayer);
        break;
      }
      case 'request-seal': {
        if (this.room.status !== RoomStatus.playing) return;
        this.say(`玩家 ${sender.name} 请求封盘。`);
        const otherPlayer = this.room.validPlayers.find((p) => p.id != sender.id)!;
        this.commandTo('request-seal', { player: sender }, otherPlayer);
        break;
      }
      case 'seal': {
        if (message.data.agree) {
          this.stopTimer('turn');
          if (this.room.attrs?.countDownWay === 2 && this.currentPlayer) {
            const elapsed = Date.now() - this.turnStartTime;
            this.turnRemainingTime = Math.max(0, this.turnRemainingTime - elapsed);
            this.playerTimeRemaining[this.currentPlayer.id] = this.turnRemainingTime;
          } else {
             const elapsed = Date.now() - this.turnStartTime;
             this.turnRemainingTime = Math.max(0, this.turnRemainingTime - elapsed);
          }
          this.isSealed = true;
          this.sealRequesterId = message.data.requesterId;
          this.say(`双方同意封盘，游戏暂停，棋盘已隐藏。`);
          this.command('seal', { sealRequesterId: this.sealRequesterId });
        } else {
          this.sayTo('对方拒绝了封盘请求。', this.room.validPlayers.find((p) => p.id == message.data.requesterId)!);
        }
        break;
      }
      case 'unseal': {
        if (this.isSealed) {
          this.isSealed = false;
          this.sealRequesterId = null;
          this.say(`封盘解除，游戏继续。`);
          this.command('unseal', { remaining: Math.ceil(this.turnRemainingTime / 1000) });
          this.command('board', this.board);
          this.startTurnTimer(this.turnRemainingTime);
    this.isSealed = false;
    this.sealRequesterId = null;
        }
        break;
      }
      case 'request-lose': {
        this.stopTimer('turn');
        this.say(`玩家 ${sender.name} 认输。`);
        this.lastLosePlayer = sender;
        this.saveAchievements([this.room.validPlayers.find((p) => p.id != sender.id)!]);
        this.room.end();
        break;
      }
      case 'draw': {
        if (!message.data.agree) {
          this.say(`玩家 ${sender.name} 拒绝和棋，游戏继续。`);
          break;
        }
        this.stopTimer('turn');
        this.say(`玩家 ${sender.name} 同意和棋，游戏结束。`);
        this.lastLosePlayer = this.room.validPlayers.find((p) => p.id != sender.id)!;
        this.saveAchievements(null);
        this.room.end();
        break;
      }
    }
  }

  onStart() {
    if (this.room.validPlayers.length < this.room.minSize) {
      return this.say(`玩家人数不足，无法开始游戏。`);
    }
    if (!this.room.validPlayers.some((p) => p.id == this.lastLosePlayer?.id)) {
      this.lastLosePlayer = undefined;
    }
    this.currentPlayer = this.lastLosePlayer || this.room.validPlayers[0];
    this.board = Array.from({ length: 8 }, () => Array(8).fill(-1));
    this.board[this.board.length - 1] = this.board[this.board.length - 1].map(() => 0);
    this.messageHistory = [];
    this.history = [];
    
    // 黑子先行
    this.setPlayerAttributes(this.currentPlayer.id, { color: 1 });
    this.room.validPlayers.forEach((player) => {
      if (player.id !== this.currentPlayer?.id) {
        this.setPlayerAttributes(player.id, { color: 2 }); // 白子
        this.commandTo('color', { color: 2 }, player);
      } else {
        this.commandTo('color', { color: 1 }, player);
      }
    });
    this.command('achievements', this.achievements);
    this.say(`游戏开始。玩家 ${this.currentPlayer.name} 执黑先行。`);

    // 初始化时间 (模式2)
    if (this.room.attrs?.countDownWay === 2) {
      this.room.validPlayers.forEach(p => {
        this.playerTimeRemaining[p.id] = 15 * 60 * 1000;
      });
    }

    this.command('place-turn', { player: this.currentPlayer });
    this.command('board', this.board);
    this.startTurnTimer();
  }
}

export default Connect4GameRoom;
