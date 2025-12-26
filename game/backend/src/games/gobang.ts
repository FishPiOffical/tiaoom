import { PlayerRole, PlayerStatus, RoomPlayer, RoomStatus } from "tiaoom";
import { GameRoom, IGameCommand } from ".";
import { sleep } from "@/utils";

/**
 * 判断五子棋胜负情况与禁手
 * @param {number[][]} board 19*19二维数组，0未落子，1黑子，2白子
 * @param {number} x 当前落子行索引
 * @param {number} y 当前落子列索引
 * @param {number} color 当前落子颜色，1黑子，2白子
 * @returns {number} 1黑胜，2白胜，0未分胜负，-1黑棋禁手
 */
function gomokuJudge(board: number[][], { x, y }: { x: number, y: number }, color: number): number {
  const SIZE = 19;
  const directions = [
    [1, 0],   // 横
    [0, 1],   // 竖
    [1, 1],   // 主对角线
    [1, -1]   // 副对角线
  ];

  // 判断direction方向上的连续同色棋子数、两端状态
  function countContinuous(dir: number[]) {
    let [dx, dy] = dir;
    let count = 1;
    let minX = x, minY = y, maxX = x, maxY = y;
    // 向正方向
    for (let step = 1; step < SIZE; step++) {
      let nx = x + dx * step, ny = y + dy * step;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE || board[nx][ny] !== color) break;
      count++;
      maxX = nx; maxY = ny;
    }
    // 向反方向
    for (let step = 1; step < SIZE; step++) {
      let nx = x - dx * step, ny = y - dy * step;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE || board[nx][ny] !== color) break;
      count++;
      minX = nx; minY = ny;
    }
    return { count, minX, minY, maxX, maxY, dx, dy };
  }

  // 检查是否有五连
  for (let dir of directions) {
    let res = countContinuous(dir);
    if (res.count === 5) {
      return color;
    }
  }

  // 黑棋禁手判断（仅对黑棋有效）
  if (color === 1) {
    // 长连禁手（>5）
    for (let dir of directions) {
      let res = countContinuous(dir);
      if (res.count > 5) {
        return -1; // 长连禁手
      }
    }

    // 活四/活三辅助：在direction方向连length个棋，且两端均为空
    function countAlive(length: number) {
      let aliveCount = 0;
      for (let dir of directions) {
        let { count, minX, minY, maxX, maxY, dx, dy } = countContinuous(dir);
        if (count === length) {
          // 判断两端是否为空（活）
          let beforeX = minX - dx, beforeY = minY - dy;
          let afterX = maxX + dx, afterY = maxY + dy;
          let beforeEmpty = beforeX >= 0 && beforeX < SIZE && beforeY >= 0 && beforeY < SIZE && board[beforeX][beforeY] === 0;
          let afterEmpty = afterX >= 0 && afterX < SIZE && afterY >= 0 && afterY < SIZE && board[afterX][afterY] === 0;
          if (beforeEmpty && afterEmpty) aliveCount++;
        }
      }
      return aliveCount;
    }

    // 双活四禁手
    if (countAlive(4) >= 2) return -1;
    // 双活三禁手
    if (countAlive(3) >= 2) return -1;
  }

  // 白子胜利判断（和黑子一样，只需五连，不判禁手）
  if (color === 2) {
    for (let dir of directions) {
      let res = countContinuous(dir);
      if (res.count === 5) {
        return 2;
      }
    }
  }

  // 未分胜负
  return 0;
}

export const name = '五子棋';
export const minSize = 2;
export const maxSize = 2;
export const description = `两个玩家轮流在19x19的棋盘上放置黑白棋子，率先将五个棋子连成一线（横、竖、斜均可）的一方获胜。
黑棋需注意禁手规则。`;
export const points = {
  '我就玩玩': 1,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
}

class GobangGameRoom extends GameRoom {
  currentPlayer?: RoomPlayer;
  lastLosePlayer?: RoomPlayer;
  board: number[][] = Array.from({ length: 19 }, () => Array(19).fill(0));
  history: { place: string, time: number }[] = [];

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
          this.sayTo(`游戏未开始，无法落子。`, sender);
          break;
        }
        if (sender.id !== this.currentPlayer?.id) {
          this.sayTo(`轮到玩家 ${this.currentPlayer?.name} 落子。`, sender);
          break;
        }
        const { x, y } = message.data;
        if (this.board[x][y] !== 0) {
          this.sayTo(`该位置已有棋子，请重新落子。`, sender);
          break;
        }
        const color = sender.attributes?.color;
        const result = gomokuJudge(this.board, { x, y }, color);
        if (result === -1) {
          this.commandTo('board', this.board, sender);
          this.sayTo(`玩家 ${sender.name} 触发禁手，撤回落子！`, sender);
          break;
        }

        this.board[x][y] = color;
        this.command('board', this.board);
        this.command('place', { x, y });
        if (result === color) {
          this.say(`玩家 ${sender.name} 获胜！`);
          this.lastLosePlayer = this.room.validPlayers.find((p) => p.id != sender.id)!;
          this.saveAchievements([sender]);
          this.room.end();
          return;
        }
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
    this.board = Array.from({ length: 19 }, () => Array(19).fill(0));
    this.messageHistory = [];
    
    this.setPlayerAttributes(this.currentPlayer.id, { color: 1 }); // 黑子先行
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

export default GobangGameRoom;
