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
  '我就玩玩': 1,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
}

class Connect4GameRoom extends GameRoom {
  currentPlayer?: RoomPlayer;
  lastLosePlayer?: RoomPlayer;
  board: number[][] = Array.from({ length: 8 }, () => Array(8).fill(-1));

  init() {
    return super.init().on('player-offline', async (player) => {
      await sleep(4 * 60 * 1000); // 等待 4 分钟，判定为离线
      if (!this.isPlayerOnline(player)) return;
      if (this.room.status === RoomStatus.playing && player.role === PlayerRole.player) {
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
      board: this.board,
      color: sender.attributes?.color,
    }
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
        }
        break;
      }
      case 'request-draw': {
        this.say(`玩家 ${sender.name} 请求和棋。`);
        const otherPlayer = this.room.validPlayers.find((p) => p.id != sender.id)!;
        this.commandTo('request-draw', { player: sender }, otherPlayer);
        break;
      }
      case 'request-lose': {
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
    this.command('place-turn', { player: this.currentPlayer });
    this.command('board', this.board);
  }
}

export default Connect4GameRoom;
