import { PlayerRole, PlayerStatus, RoomPlayer, RoomStatus } from "tiaoom";
import { GameRoom, IGameCommand } from ".";
import { sleep } from "@/utils";

/**
 * 检查黑白棋（Othello/Reversi）落子有效性，并返回落子后的棋盘状态
 * @param {number[][]} board - 当前棋盘二维数组（1黑棋，2白棋，0空格）
 * @param {number} x - 当前落子位置 行索引
 * @param {number} y - 当前落子位置 列索引
 * @param {number} player - 当前玩家（1黑棋，2白棋）
 * @returns {false|number[][]} 如果不能落子返回false，否则返回新棋盘（1黑，2白，0空，-1不可落子）
 */
function checkOthelloMove(board: number[][], { x, y }: { x: number, y: number }, player: number): false | number[][] {
  const size = board.length;
  if (board[x][y] !== 0) return false; // 已有子不能落子
  const directions = [
    [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]
  ];
  const opponent = player === 1 ? 2 : 1;
  let valid = false;
  const toFlip = [];

  for (const [dx, dy] of directions) {
    let nx = x + dx, ny = y + dy;
    let pieces = [];
    let foundOpponent = false;
    while (nx >= 0 && nx < size && ny >= 0 && ny < size) {
      if (board[nx][ny] === opponent) {
        pieces.push([nx, ny]);
        foundOpponent = true;
      } else if (board[nx][ny] === player && foundOpponent) {
        toFlip.push(...pieces);
        valid = true;
        break;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
    }
  }

  if (!valid) return false;

  // 生成新的棋盘状态
  const newBoard = board.map(row => row.slice());
  newBoard[x][y] = player;
  for (const [fx, fy] of toFlip) {
    newBoard[fx][fy] = player;
  }

  return markValidPlaces(newBoard, 3 - player);
}

/**
 * 检查指定位置是否为有效落子点
 * @param {number[][]} board 棋盘
 * @param {number} x - 当前落子位置 行索引
 * @param {number} y - 当前落子位置 列索引
 * @param {number} player - 当前玩家（1黑棋，2白棋）
 * @returns 是否为有效落子点
 */
function isValidPlace(board: number[][], { x, y }: { x: number; y: number }, player: number) {
  const piece = board[x][y];
  const size = board.length;
  if ([1, 2].includes(piece)) return false;

  const piecesValid: {x: number, y: number}[] = [];
  const pieces: {x: number, y: number}[] = [];

  function checkPieces(x: number, y: number) {
    const piece = board[x][y];
    if (![1, 2].includes(piece)) {
      return false;
    }
    if ((piece ^ player) === 3) {
      pieces.push({x, y});
    }
    if (piece === player) {
      piecesValid.push(...pieces);
      return false;
    }
  }

  for(let i = x - 1; i >= 0; i--) {
    if(checkPieces(i, y) === false) break;
  }

  pieces.length = 0;
  for(let i = x + 1; i < size; i++) {
    if(checkPieces(i, y) === false) break;
  }

  pieces.length = 0;
  for(let i = y - 1; i >= 0; i--) {
    if(checkPieces(x, i) === false) break;
  }

  pieces.length = 0;
  for(let i = y + 1; i < size; i++) {
    if(checkPieces(x, i) === false) break;
  }

  pieces.length = 0;
  for(let i = x - 1, j = y - 1; i >= 0 && j >= 0; i--, j--) {
    if(checkPieces(i, j) === false) break;
  }

  pieces.length = 0;
  for(let i = x + 1, j = y - 1; i < size && j >= 0; i++, j--) {
    if(checkPieces(i, j) === false) break;
  }

  pieces.length = 0;
  for(let i = x + 1, j = y + 1; i < size && j < size; i++, j++) {
    if(checkPieces(i, j) === false) break;
  }

  pieces.length = 0;
  for(let i = x - 1, j = y + 1; i >= 0 && j < size; i--, j++) {
    if(checkPieces(i, j) === false) break;
  }

  return piecesValid.length > 0;
}

/**
 * 标记所有可落子的位置
 * @param {number[][]} board 棋盘
 * @param {number} player 当前玩家
 * @returns 标记后的棋盘
 */
function markValidPlaces(board: number[][], player: number) {
  const size = board.length;
  // 标记所有不可落子的位置
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if ([1, 2].includes(board[i][j])) continue;
      if (!isValidPlace(board, {x: i, y: j}, player))
        board[i][j] = -1;
      else
        board[i][j] = 0; 
    }
  }
  return board;

}

/**
 * 检查黑白棋游戏是否结束及胜负情况
 * @param {number[][]} board 棋盘
 * @returns 胜利方（1黑棋，2白棋），0平局，null 游戏未结束
 */
function isWin(board: number[][]): number | null {
  const placeCount = board.flat().filter(cell => cell === 0).length;
  const blackCount = board.flat().filter(cell => cell === 1).length;
  const whiteCount = board.flat().filter(cell => cell === 2).length;
  if (placeCount === 0 || blackCount === 0 || whiteCount === 0) {
    if (blackCount > whiteCount) return 1;
    else if (whiteCount > blackCount) return 2;
    else return 0; // 平局
  }
  return null; // 游戏未结束
}

const size = 8;
export const name = '黑白棋';
export const minSize = 2;
export const maxSize = 2;
export const description = `两个玩家轮流在8x8的棋盘上放置黑白棋子，通过夹击对方棋子将其翻转为己方颜色。
游戏结束时，棋盘上棋子数量多的一方获胜。`;

class OthelloGameRoom extends GameRoom {
  currentPlayer?: RoomPlayer;
  lastLosePlayer?: RoomPlayer;
  board: number[][] = Array.from({ length: size }, () => Array(size).fill(-1))

  init() {
    return super.init().on('player-offline', async (player) => {
      await sleep(4 * 60 * 1000); // 等待 4 分钟，判定为离线
      if (!this.isPlayerOnline(player)) return;
      this.room.kickPlayer(player);
      if (this.room.status === RoomStatus.playing && player.role === PlayerRole.player) {
        this.say(`玩家 ${player.name} 已离线，游戏结束。`);
        this.lastLosePlayer = this.room.validPlayers.find((p) => p.id != player.id)!;
        this.saveAchievements(this.lastLosePlayer);
        this.room.end();
        return;
      }
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
    /**
     * # room command
     * - say: player say something
     * - status: game status update
     * - place: place piece
     * - request-draw: request draw
     * - request-lose: request lose
     * - draw: game draw
     * 
     * # player command
     * - color: send color to player
     * - request-draw: player request draw
     */
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
        let result = checkOthelloMove(this.board, { x, y }, color);
        if (!result) {
          this.commandTo('board', this.board, sender);
          this.sayTo(`无效落子！`, sender);
          return;
        }

        if (!result.flat().some(cell => cell === 0) && result.flat().filter(cell => cell <= 0).length) {
          result = markValidPlaces(result, color);
          if (!result.flat().some(cell => cell === 0)) {
            this.say(`双方均无法落子，结算！`);
          } else {
            this.say(`${3 - color ? '黑' : '白'}方无法落子，跳过！`);
            this.currentPlayer = this.room.validPlayers.find((p) => p.id != this.currentPlayer?.id)!;
          }
        }

        this.board = result;
        this.command('board', this.board);
        this.command('place', { x, y });

        const winnerPlayer = isWin(this.board);
        if (winnerPlayer !== null) {
          // 棋盘已满，游戏结束
          let winner: RoomPlayer | null = null;
          if (winnerPlayer === 1) {
            this.say(`玩家 ${this.room.validPlayers.find(p => p.attributes?.color === 1)?.name} 获胜！`);
            winner = this.room.validPlayers.find(p => p.attributes?.color === 1)!;
            this.lastLosePlayer = this.room.validPlayers.find(p => p.attributes?.color === 2)!;
          } else if (winnerPlayer === 2) {
            this.say(`玩家 ${this.room.validPlayers.find(p => p.attributes?.color === 2)?.name} 获胜！`);
            winner = this.room.validPlayers.find(p => p.attributes?.color === 2)!;
            this.lastLosePlayer = this.room.validPlayers.find(p => p.attributes?.color === 1)!;
          } else {
            this.say(`游戏以平局结束！`);
          }
          this.saveAchievements(winner);
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
        this.room.validPlayers.forEach((player) => {
          if (!this.achievements[player.name]) {
            this.achievements[player.name] = { win: 0, lost: 0, draw: 0 };
          }
          if (player.id == sender.id) {
            this.achievements[player.name].lost += 1;
          } else {
            this.achievements[player.name].win += 1;
          }
        });
        this.lastLosePlayer = this.room.validPlayers.find((p) => p.id == sender.id);
        this.saveAchievements(this.room.validPlayers.find((p) => p.id != sender.id));
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
      default:
        break;
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
    this.board = Array.from({ length: size }, () => Array(size).fill(-1));
    // 初始化黑白棋起始位置
    this.board[size / 2 - 1][size / 2 - 1] = 2; // 白
    this.board[size / 2][size / 2] = 2;         // 白
    this.board[size / 2 - 1][size / 2] = 1;     // 黑
    this.board[size / 2][size / 2 - 1] = 1;     // 黑

    // 标记所有可落子的位置
    this.board[size / 2 - 2][size / 2 - 1] = 0;
    this.board[size / 2 - 1][size / 2 - 2] = 0;
    this.board[size / 2][size / 2 + 1] = 0;
    this.board[size / 2 + 1][size / 2] = 0;
    this.messageHistory = [];

    this.currentPlayer.attributes = { color: 1 }; // 黑子先行
    this.room.validPlayers.forEach((player) => {
      if (player.id !== this.currentPlayer?.id) {
        player.attributes = { color: 2 }; // 白子
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

export default OthelloGameRoom;