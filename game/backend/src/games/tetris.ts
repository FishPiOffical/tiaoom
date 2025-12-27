import { PlayerRole, PlayerStatus, RoomPlayer, RoomStatus } from "tiaoom";
import { GameRoom, IGameCommand } from ".";
import { sleep } from "@/utils";

export const name = "俄罗斯方块";
export const minSize = 1;
export const maxSize = 1;
export const description = "经典俄罗斯方块游戏，单人挑战模式";
export const points = {
  '我就玩玩': 1,
  '小博一下': 100,
};
export const rates = {
  '翻倍奖励': 2,
}

const TETROMINOES = {
  I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: '#00bcd4' },
  J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: '#2196f3' },
  L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: '#ff9800' },
  O: { shape: [[1, 1], [1, 1]], color: '#ffeb3b' },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: '#4caf50' },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: '#9c27b0' },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: '#f44336' }
};

export type TetrominoType = keyof typeof TETROMINOES;
export type BoardCell = { filled: boolean; color: string } | null;

export interface TetrisGameState {
  board: BoardCell[][];
  currentPiece: {
    type: TetrominoType;
    shape: number[][];
    x: number;
    y: number;
    color: string;
  } | null;
  nextPiece: TetrominoType;
  score: number;
  level: number;
  lines: number;
  gameOver: boolean;
  isPaused: boolean;
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const DROP_INTERVAL_BASE = 1000;

class TetrisGameRoom extends GameRoom {
  gameState: TetrisGameState | null = null;
  gameLoop: NodeJS.Timeout | null = null;

  saveIgnoreProps = ['gameLoop'];

  init() {
    // 如果房间已经在游戏中，恢复游戏循环
    if (this.room.status === RoomStatus.playing) {
        this.startGameLoop();
    }
    return super.init().on('player-offline', async (player) => {
      // 等待30秒，给玩家重连的机会
      await sleep(30 * 1000);
      // 修复：如果玩家仍然离线，则踢出玩家并结束游戏
      if (this.isPlayerOnline(player)) return;
      this.room.kickPlayer(player);
      if (this.room.status === RoomStatus.playing && player.role === PlayerRole.player) {
        this.say(`玩家 ${player.name} 已离线，游戏结束。`);
        this.finishGame();
      }
    }).on('join', (player) => {
      // 玩家重新加入时，同步当前游戏状态
      if (this.gameState) {
        const p = this.room.validPlayers.find((p) => p.id === player.id);
        if (p?.role === PlayerRole.player) {
          this.commandTo('game:state', { gameState: this.gameState }, p);
        }
      }
    });
  }

  getStatus(sender: RoomPlayer) {
    return {
      ...super.getStatus(sender),
      status: this.room.status,
      gameState: this.gameState,
    };
  }

  onStart() {
    if (this.room.validPlayers.length < this.room.minSize) {
      return this.say(`玩家人数不足，无法开始游戏。`);
    }
    this.startGame();
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    const sender = message.sender as RoomPlayer;
    const commandType = message.type;

    // 验证玩家权限：只有真正的玩家才能操作游戏
    if (sender.role !== PlayerRole.player) {
      return;
    }

    if (commandType === 'tetris:restart') {
        this.restartGame();
        return;
    }
    
    if (commandType === 'end') {
        this.finishGame();
        return;
    }

    if (!this.gameState) return;

    switch (commandType) {
      case 'tetris:move_left':
        this.movePiece(-1, 0);
        this.command('game:state', this.gameState, sender);
        break;

      case 'tetris:move_right':
        this.movePiece(1, 0);
        this.command('game:state', this.gameState, sender);
        break;

      case 'tetris:move_down':
        this.movePiece(0, 1);
        this.command('game:state', this.gameState, sender);
        break;

      case 'tetris:rotate':
        this.rotatePieceHandler();
        this.command('game:state', this.gameState, sender);
        break;

      case 'tetris:drop':
        this.dropPiece();
        this.command('game:state', this.gameState);
        break;

      case 'tetris:pause':
        this.pauseGame();
        break;
    }
    this.save();
  }

  startGame() {
    // 生成第一个方块和下一个方块
    const firstPiece = this.getRandomTetromino();
    const nextPiece = this.getRandomTetromino();
    
    this.gameState = {
      board: this.createEmptyBoard(),
      currentPiece: null,
      nextPiece,
      score: 0,
      level: 1,
      lines: 0,
      gameOver: false,
      isPaused: false
    };

    // 使用第一个方块作为当前方块
    this.spawnNewPiece(firstPiece);

    // 设置所有玩家状态为游戏中
    this.room.players.forEach(player => {
      if (player.role === PlayerRole.player) {
        player.status = PlayerStatus.playing;
      }
    });

    this.save();
    this.command('game:state', this.gameState);
    this.startGameLoop();
  }

  startGameLoop() {
    // 清除旧的游戏循环
    if (this.gameLoop) clearInterval(this.gameLoop);

    // 根据当前等级设置下落速度，等级越高速度越快
    const currentLevel = this.gameState?.level || 1;
    const dropInterval = DROP_INTERVAL_BASE / currentLevel;

    this.gameLoop = setInterval(() => {
      if (this.gameState && !this.gameState.gameOver && !this.gameState.isPaused) {
        this.movePiece(0, 1);
        this.command('game:state', this.gameState);
      }
    }, dropInterval);
  }

  stopGameLoop() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }

  restartGame() {
    // 停止当前游戏循环
    this.stopGameLoop();
    this.gameState = null;
    
    // 直接开始新游戏，startGame 会处理房间状态
    this.startGame();
  }

  async saveScore(finalScore: number) {
    if (finalScore > 0) {
      super.saveScore(finalScore);

      const maxScore = await this.getMaxScore(this.room.validPlayers[0]);
      if (finalScore > maxScore) {
        this.say(`游戏已结束，得分：${finalScore}（新纪录！）`);
        this.saveAchievements(this.room.validPlayers, false);
      } else {
        this.say(`游戏已结束，得分：${finalScore}（最高分：${maxScore}）`);
        this.saveAchievements(finalScore == maxScore ? null : [], false);
      }
    }
  }

  async finishGame() {
    this.stopGameLoop();
    
    // 记录玩家成绩：单人游戏，根据分数判断是否算作胜利
    // 这里简单以分数大于0作为完成游戏的标志
    const finalScore = this.gameState?.score || 0;
    
    this.saveScore(finalScore);
    
    // 设置游戏结束状态并广播
    if (this.gameState) {
      this.gameState.gameOver = true;
      this.command('game:state', this.gameState);
    }
    
    this.gameState = null;
    this.say(`游戏已结束`);
    this.room.end();
    this.save();
  }

  pauseGame() {
    if (!this.gameState) return;
    // 切换暂停状态
    this.gameState.isPaused = !this.gameState.isPaused;
    // 使用command方法广播给所有玩家，确保状态同步
    this.command('game:state', this.gameState);
    this.save();
  }

  createEmptyBoard(): BoardCell[][] {
    return Array(BOARD_HEIGHT).fill(null).map(() =>
      Array(BOARD_WIDTH).fill(null).map(() => null)
    );
  }

  getRandomTetromino(): TetrominoType {
    const tetrominoes = Object.keys(TETROMINOES) as TetrominoType[];
    return tetrominoes[Math.floor(Math.random() * tetrominoes.length)];
  }

  spawnNewPiece(type: TetrominoType) {
    if (!this.gameState) return;

    const piece = TETROMINOES[type];
    const x = Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2);
    const y = 0;

    this.gameState.currentPiece = {
      type,
      shape: piece.shape,
      x,
      y,
      color: piece.color
    };

    // 检查是否发生碰撞（游戏结束条件）
    if (this.checkCollision()) {
      this.gameState.gameOver = true;
      this.stopGameLoop();

      // 记录成绩
      this.saveScore(this.gameState.score);
      
      // 广播游戏结束状态
      this.command('game:state', this.gameState);
      this.say(`游戏结束！最终得分：${this.gameState.score}`);
      
      // 结束游戏并返回等待状态
      this.room.end();
      this.save();
    }
  }

  checkCollision(xOffset = 0, yOffset = 0, shape = this.gameState?.currentPiece?.shape): boolean {
    if (!this.gameState || !this.gameState.currentPiece || !shape) return false;

    const {x, y} = this.gameState.currentPiece;

    for (let py = 0; py < shape.length; py++) {
      for (let px = 0; px < shape[py].length; px++) {
        if (shape[py][px] !== 0) {
          const newX = x + px + xOffset;
          const newY = y + py + yOffset;

          if (
            newX < 0 ||
            newX >= BOARD_WIDTH ||
            newY >= BOARD_HEIGHT ||
            (newY >= 0 && this.gameState.board[newY][newX]?.filled)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  mergePieceToBoard() {
    if (!this.gameState || !this.gameState.currentPiece) return;

    const {shape, x, y, color} = this.gameState.currentPiece;

    for (let py = 0; py < shape.length; py++) {
      for (let px = 0; px < shape[py].length; px++) {
        if (shape[py][px] !== 0) {
          const boardY = y + py;
          const boardX = x + px;

          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            this.gameState.board[boardY][boardX] = {filled: true, color};
          }
        }
      }
    }
  }

  clearLines(): number {
    if (!this.gameState) return 0;

    let linesCleared = 0;

    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (this.gameState.board[y].every(cell => cell?.filled)) {
        this.gameState.board.splice(y, 1);
        this.gameState.board.unshift(Array(BOARD_WIDTH).fill(null).map(() => null));
        linesCleared++;
        y++;
      }
    }
    return linesCleared;
  }

  updateScore(lines: number) {
    if (!this.gameState) return;

    // 根据消除行数计算分数：1行40分，2行100分，3行300分，4行1200分
    const linePoints = [0, 40, 100, 300, 1200];
    this.gameState.score += linePoints[lines] * this.gameState.level;
    this.gameState.lines += lines;
    
    // 记录旧等级
    const oldLevel = this.gameState.level;
    // 每消除10行升一级
    this.gameState.level = Math.floor(this.gameState.lines / 10) + 1;
    
    // 如果等级提升，需要更新游戏循环速度
    if (this.gameState.level > oldLevel) {
      this.startGameLoop();
    }
  }

  movePiece(dx: number, dy: number) {
    if (!this.gameState || !this.gameState.currentPiece || this.gameState.gameOver || this.gameState.isPaused) return false;

    if (!this.checkCollision(dx, dy)) {
      this.gameState.currentPiece.x += dx;
      this.gameState.currentPiece.y += dy;
      return true;
    }

    if (dy > 0) {
      this.mergePieceToBoard();
      const lines = this.clearLines();
      this.updateScore(lines);

      const nextPiece = this.gameState.nextPiece;
      this.gameState.nextPiece = this.getRandomTetromino();
      this.spawnNewPiece(nextPiece);
      return false;
    }
    return false;
  }

  rotatePieceHandler() {
    if (!this.gameState || !this.gameState.currentPiece || this.gameState.gameOver || this.gameState.isPaused) return;

    const rotatedShape = this.rotatePiece(this.gameState.currentPiece.shape);

    // Wall Kick 系统：尝试多个位置偏移来完成旋转
    // 按优先级尝试：原位 -> 右移1格 -> 左移1格 -> 右移2格 -> 左移2格 -> 上移1格
    const kickOffsets = [
      { x: 0, y: 0 },   // 原位置
      { x: 1, y: 0 },   // 右移1格
      { x: -1, y: 0 },  // 左移1格
      { x: 2, y: 0 },   // 右移2格（用于I方块）
      { x: -2, y: 0 },  // 左移2格（用于I方块）
      { x: 0, y: -1 }   // 上移1格（用于贴底情况）
    ];

    // 尝试每个偏移位置
    for (const offset of kickOffsets) {
      if (!this.checkCollision(offset.x, offset.y, rotatedShape)) {
        // 找到可行位置，应用旋转和位置调整
        if (this.gameState.currentPiece) {
          this.gameState.currentPiece.shape = rotatedShape;
          this.gameState.currentPiece.x += offset.x;
          this.gameState.currentPiece.y += offset.y;
        }
        return; // 成功旋转，退出
      }
    }
    
    // 所有位置都无法旋转，保持原样（静默失败）
  }

  rotatePiece(shape: number[][]): number[][] {
    const N = shape.length;
    const rotated = Array(N).fill(null).map(() => Array(N).fill(0));

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        rotated[j][N - 1 - i] = shape[i][j];
      }
    }
    return rotated;
  }

  dropPiece() {
    if (!this.gameState || this.gameState.gameOver || this.gameState.isPaused) return;
    while (this.movePiece(0, 1)) {
    }
  }
}

export default TetrisGameRoom;
