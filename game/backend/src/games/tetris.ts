import { PlayerRole, PlayerStatus, RoomPlayer, RoomStatus } from "tiaoom";
import { GameRoom, IGameCommand } from ".";
import { sleep } from "@/utils";

export const name = "俄罗斯方块";
export const minSize = 1;
export const maxSize = 1;
export const description = "经典俄罗斯方块游戏，单人挑战模式";

export const TETROMINOES = {
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
    if (this.room.status === RoomStatus.playing) {
        this.startGameLoop();
    }
    return super.init().on('player-offline', async (player) => {
      await sleep(4 * 60 * 1000);
      if (!this.isPlayerOnline(player)) return;
      this.room.kickPlayer(player);
      if (this.room.status === RoomStatus.playing && player.role === PlayerRole.player) {
        this.room.emit('message', { content: `玩家 ${player.name} 已离线，游戏结束。` });
        this.finishGame();
      }
    }).on('join', (player) => {
      this.room.validPlayers.find((p) => p.id === player.id)?.emit('command', {
        type: 'achievements',
        data: this.achievements
      });
      if (this.gameState) {
         this.room.validPlayers.find((p) => p.id === player.id)?.emit('command', {
            type: 'game:state',
            data: this.gameState
         });
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
        return this.room.emit('message', { content: `玩家人数不足，无法开始游戏。` });
      }
      this.startGame();
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    const sender = message.sender as RoomPlayer;
    const commandType = message.type;

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
        this.room.emit('command', {type: 'game:state', data: this.gameState});
        break;

      case 'tetris:move_right':
        this.movePiece(1, 0);
        this.room.emit('command', {type: 'game:state', data: this.gameState});
        break;

      case 'tetris:move_down':
        this.movePiece(0, 1);
        this.room.emit('command', {type: 'game:state', data: this.gameState});
        break;

      case 'tetris:rotate':
        this.rotatePieceHandler();
        this.room.emit('command', {type: 'game:state', data: this.gameState});
        break;

      case 'tetris:drop':
        this.dropPiece();
        this.room.emit('command', {type: 'game:state', data: this.gameState});
        break;

      case 'tetris:pause':
        this.pauseGame();
        break;
    }
    this.save();
  }

  startGame() {
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

    this.spawnNewPiece(this.getRandomTetromino());

    this.room.players.forEach(player => {
      if (player.role === PlayerRole.player) {
        player.status = PlayerStatus.playing;
      }
    });

    this.save();
    this.room.emit('command', {type: 'game:state', data: this.gameState});
    this.startGameLoop();
  }

  startGameLoop() {
    if (this.gameLoop) clearInterval(this.gameLoop);

    this.gameLoop = setInterval(() => {
      if (this.gameState && !this.gameState.gameOver && !this.gameState.isPaused) {
        this.movePiece(0, 1);
        this.room.emit('command', {type: 'game:state', data: this.gameState});
      }
    }, DROP_INTERVAL_BASE / (this.gameState?.level || 1));
  }

  stopGameLoop() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }

  restartGame() {
    this.stopGameLoop();
    this.gameState = null;
    this.startGame();
  }

  finishGame() {
    this.stopGameLoop();
    this.gameState = null;
    
    this.room.validPlayers.forEach(player => {
      if (!this.achievements[player.name]) {
        this.achievements[player.name] = {win: 0, lost: 0, draw: 0};
      }
      this.achievements[player.name].lost += 1;
    });
    
    this.room.emit('message', { content: `游戏已结束` });
    this.room.emit('command', { type: 'achievements', data: this.achievements });
    this.room.end();
    this.save();
  }

  pauseGame() {
    if (!this.gameState) return;
    this.gameState.isPaused = !this.gameState.isPaused;
    this.room.emit('command', {type: 'game:state', data: this.gameState});
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

    if (this.checkCollision()) {
      this.gameState.gameOver = true;
      this.stopGameLoop();

      this.room.validPlayers.forEach(player => {
        if (!this.achievements[player.name]) {
          this.achievements[player.name] = {win: 0, lost: 0, draw: 0};
        }
        this.achievements[player.name].lost += 1;
      });
      this.room.emit('command', { type: 'achievements', data: this.achievements });
      this.room.emit('message', {content: `游戏结束！最终得分：${this.gameState.score}`});
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

    const linePoints = [0, 40, 100, 300, 1200];
    this.gameState.score += linePoints[lines] * this.gameState.level;
    this.gameState.lines += lines;
    this.gameState.level = Math.floor(this.gameState.lines / 10) + 1;
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

    if (!this.checkCollision(0, 0, rotatedShape)) {
      if (this.gameState.currentPiece) {
        this.gameState.currentPiece.shape = rotatedShape;
      }
    }
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
