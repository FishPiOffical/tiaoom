import {IRoomPlayer, PlayerRole, PlayerStatus, Room, RoomStatus} from "tiaoom";
import {IGameMethod} from "./index";
import {sleep} from "@/utils";

export const name = "俄罗斯方块";
export const minSize = 1;
export const maxSize = 1;
export const description = "经典俄罗斯方块游戏，单人挑战模式";

// 方块形状定义
export const TETROMINOES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#00bcd4' // 青色
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#2196f3' // 蓝色
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#ff9800' // 橙色
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#ffeb3b' // 黄色
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: '#4caf50' // 绿色
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#9c27b0' // 紫色
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: '#f44336' // 红色
  }
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

const createEmptyBoard = (): BoardCell[][] => {
  return Array(BOARD_HEIGHT).fill(null).map(() =>
    Array(BOARD_WIDTH).fill(null).map(() => null)
  );
};

const getRandomTetromino = (): TetrominoType => {
  const tetrominoes = Object.keys(TETROMINOES) as TetrominoType[];
  return tetrominoes[Math.floor(Math.random() * tetrominoes.length)];
};

const rotatePiece = (shape: number[][]): number[][] => {
  const N = shape.length;
  const rotated = Array(N).fill(null).map(() => Array(N).fill(0));

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      rotated[j][N - 1 - i] = shape[i][j];
    }
  }

  return rotated;
};

export default async function onRoom(room: Room, {save, restore}: IGameMethod) {
  const gameData = await restore();
  let gameState: TetrisGameState | null = gameData?.gameState || null;
  let gameLoop: NodeJS.Timeout | null = null;
  let messageHistory: { content: string, sender?: IRoomPlayer }[] = gameData?.messageHistory || [];
  let gameStatus: 'waiting' | 'playing' = gameData?.gameStatus || 'waiting';
  let achievements: Record<string, { win: number; lost: number; draw: number }> = gameData?.achievements || {};

  const DROP_INTERVAL_BASE = 1000; // 基础下降间隔(毫秒)

  const saveGameData = async () => {
    try {
      await save({
        gameState,
        gameStatus,
        messageHistory,
        achievements,
        lastSaved: Date.now()
      });
    } catch (error) {
      console.error('Failed to save game data:', error);
    }
  };

  const startGame = async () => {
    const nextPiece = getRandomTetromino();
    spawnNewPiece(nextPiece);

    gameState = {
      board: createEmptyBoard(),
      currentPiece: null,
      nextPiece,
      score: 0,
      level: 1,
      lines: 0,
      gameOver: false,
      isPaused: false
    };

    spawnNewPiece(getRandomTetromino());

    // 设置所有玩家状态为playing
    room.players.forEach(player => {
      if (player.role === 'player') {
        player.status = PlayerStatus.playing;
      }
    });

    gameStatus = 'playing';
    await saveGameData();
    room.emit('command', {type: 'game:state', data: gameState});

    // 开始游戏循环
    startGameLoop();
  };

  const spawnNewPiece = (type: TetrominoType) => {
    if (!gameState) return;

    const piece = TETROMINOES[type];
    const x = Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2);
    const y = 0;

    gameState.currentPiece = {
      type,
      shape: piece.shape,
      x,
      y,
      color: piece.color
    };

    // 检查游戏是否结束（新方块无法放置）
    if (checkCollision()) {
      gameState.gameOver = true;
      stopGameLoop();

      // 更新成就
      room.validPlayers.forEach(player => {
        if (!achievements[player.name]) {
          achievements[player.name] = {win: 0, lost: 0, draw: 0};
        }
        achievements[player.name].lost += 1;
      });

      room.emit('message', {content: `游戏结束！最终得分：${gameState.score}`});
    }
  };

  const checkCollision = (xOffset = 0, yOffset = 0, shape = gameState?.currentPiece?.shape): boolean => {
    if (!gameState || !gameState.currentPiece || !shape) return false;

    const {x, y} = gameState.currentPiece;

    for (let py = 0; py < shape.length; py++) {
      for (let px = 0; px < shape[py].length; px++) {
        if (shape[py][px] !== 0) {
          const newX = x + px + xOffset;
          const newY = y + py + yOffset;

          if (
            newX < 0 ||
            newX >= BOARD_WIDTH ||
            newY >= BOARD_HEIGHT ||
            (newY >= 0 && gameState.board[newY][newX]?.filled)
          ) {
            return true;
          }
        }
      }
    }

    return false;
  };

  const mergePieceToBoard = () => {
    if (!gameState || !gameState.currentPiece) return;

    const {shape, x, y, color} = gameState.currentPiece;

    for (let py = 0; py < shape.length; py++) {
      for (let px = 0; px < shape[py].length; px++) {
        if (shape[py][px] !== 0) {
          const boardY = y + py;
          const boardX = x + px;

          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            gameState.board[boardY][boardX] = {filled: true, color};
          }
        }
      }
    }
  };

  const clearLines = (): number => {
    if (!gameState) return 0;

    let linesCleared = 0;

    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (gameState.board[y].every(cell => cell?.filled)) {
        // 移除此行
        gameState.board.splice(y, 1);
        // 在顶部添加新行
        gameState.board.unshift(Array(BOARD_WIDTH).fill(null).map(() => null));
        linesCleared++;
        y++; // 重新检查当前行（因为上面的行下移了）
      }
    }

    return linesCleared;
  };

  const updateScore = (lines: number) => {
    if (!gameState) return;

    const linePoints = [0, 40, 100, 300, 1200]; // 0,1,2,3,4行的分数
    gameState.score += linePoints[lines] * gameState.level;
    gameState.lines += lines;

    // 每消除10行升一级
    gameState.level = Math.floor(gameState.lines / 10) + 1;
  };

  const movePiece = (dx: number, dy: number) => {
    if (!gameState || !gameState.currentPiece || gameState.gameOver || gameState.isPaused) return false;

    if (!checkCollision(dx, dy)) {
      gameState.currentPiece.x += dx;
      gameState.currentPiece.y += dy;
      return true;
    }

    // 如果向下移动碰撞，锁定方块
    if (dy > 0) {
      mergePieceToBoard();
      const lines = clearLines();
      updateScore(lines);

      // 生成新方块
      const nextPiece = gameState.nextPiece;
      gameState.nextPiece = getRandomTetromino();
      spawnNewPiece(nextPiece);

      return false;
    }

    return false;
  };

  const rotatePieceHandler = () => {
    if (!gameState || !gameState.currentPiece || gameState.gameOver || gameState.isPaused) return;

    const rotatedShape = rotatePiece(gameState.currentPiece.shape);

    if (!checkCollision(0, 0, rotatedShape)) {
      if (gameState.currentPiece) {
        gameState.currentPiece.shape = rotatedShape;
      }
    }
  };

  const dropPiece = () => {
    if (!gameState || gameState.gameOver || gameState.isPaused) return;

    while (movePiece(0, 1)) {
      // 继续向下移动直到无法移动
    }
  };

  const startGameLoop = () => {
    if (gameLoop) clearInterval(gameLoop);

    gameLoop = setInterval(() => {
      if (gameState && !gameState.gameOver && !gameState.isPaused) {
        movePiece(0, 1);
        room.emit('command', {type: 'game:state', data: gameState});
      }
    }, DROP_INTERVAL_BASE / (gameState?.level || 1));
  };

  const stopGameLoop = () => {
    if (gameLoop) {
      clearInterval(gameLoop);
      gameLoop = null;
    }
  };

  const pauseGame = () => {
    if (!gameState) return;
    gameState.isPaused = !gameState.isPaused;
    room.emit('command', {type: 'game:state', data: gameState});
  };

  const restartGame = () => {
    // 结束当前游戏
    stopGameLoop();
    gameState = null;
    gameStatus = 'waiting';
    
    // 开始新游戏
    startGame();
  };

  room.on('join', (player) => {
    const playerSocket = room.players.find((p) => p.id === player.id);
    if (!playerSocket) return;

    // 发送成就数据
    playerSocket.emit('command', {
      type: 'achievements',
      data: achievements
    });

    // 如果游戏正在进行，发送游戏状态给新玩家
    if (gameState) {
      playerSocket.emit('command', {
        type: 'game:state',
        data: gameState
      });
    }
  }).on('player-offline', async (player) => {
    // 等待4分钟，如果期间没有重新连接则踢出房间
    await sleep(4 * 60 * 1000);
    room.kickPlayer(player);

    // 如果是游戏玩家离线，则结束游戏
    if (gameStatus === 'playing' && player.role === 'player') {
      room.emit('message', {content: `玩家 ${player.name} 已离线，游戏结束。`});
      gameStatus = 'waiting';
      stopGameLoop();

      // 更新成就
      room.validPlayers.forEach(p => {
        if (!achievements[p.name]) {
          achievements[p.name] = {win: 0, lost: 0, draw: 0};
        }
        if (p.id == player.id) {
          achievements[p.name].lost += 1;
        }
      });

      await saveGameData();
    }
  }).on('start', () => {
    if (!gameState && room.validPlayers.length >= room.minSize) {
      startGame();
    }
  }).on('end', () => {
    // 重置游戏状态
    stopGameLoop();
    gameState = null;
    gameStatus = 'waiting';
  }).on('message', (message: { content: string; sender?: IRoomPlayer }) => {
    // 保存消息历史
    messageHistory.unshift(message);
    if (messageHistory.length > 100) messageHistory.splice(messageHistory.length - 100);
    saveGameData();
  });

  return room.on('player-command', async (message: any) => {
    // 允许观众使用的指令
    const publicCommands = ['say', 'status'];
    const players = publicCommands.includes(message.type)
      ? room.players
      : room.validPlayers;
    const sender = players.find((p) => p.id == message.sender?.id)!;
    if (!sender) return;

    const commandType = message.type || message.data?.type;

    // 处理公共命令
    switch (commandType) {
      case 'say':
        // 游戏中观众发言仅广播给其他观众
        if (sender.role != PlayerRole.player && room.status == RoomStatus.playing) {
          room.watchers.forEach((watcher) => {
            watcher.emit('message', {content: `${message.data}`, sender});
          });
          return;
        }
        room.emit('message', {content: `${message.data}`, sender});
        break;

      case 'status': {
        sender.emit('command', {
          type: 'status',
          data: {
            status: gameStatus,
            messageHistory,
            gameState,
            achievements
          }
        });
        break;
      }
      
      case 'tetris:restart': {
        restartGame();
        break;
      }
      case 'end': {
        // 处理游戏结束命令 - 使用标准的 room.end() 方法
        stopGameLoop();
        gameState = null;
        gameStatus = 'waiting';
        
        // 更新成就 - 当前玩家失败
        room.validPlayers.forEach(player => {
          if (!achievements[player.name]) {
            achievements[player.name] = {win: 0, lost: 0, draw: 0};
          }
          achievements[player.name].lost += 1;
        });
        
        room.emit('message', {content: `游戏已结束`});
        room.end(); // 使用标准的房间结束方法
        await saveGameData();
        break;
      }
    }

    if (!gameState) return;

    switch (commandType) {
      case 'tetris:move_left':
        movePiece(-1, 0);
        room.emit('command', {type: 'game:state', data: gameState});
        break;

      case 'tetris:move_right':
        movePiece(1, 0);
        room.emit('command', {type: 'game:state', data: gameState});
        break;

      case 'tetris:move_down':
        movePiece(0, 1);
        room.emit('command', {type: 'game:state', data: gameState});
        break;

      case 'tetris:rotate':
        rotatePieceHandler();
        room.emit('command', {type: 'game:state', data: gameState});
        break;

      case 'tetris:drop':
        dropPiece();
        room.emit('command', {type: 'game:state', data: gameState});
        break;

      case 'tetris:pause':
        pauseGame();
        break;

      case 'game:state':
        sender.emit('command', {type: 'game:state', data: gameState});
        break;
    }

    await saveGameData();
  });
}