import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game'
import { useGameEvents } from '@/hook/useGameEvents'

// 定义俄罗斯方块游戏相关的类型
type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z'

interface BoardCell {
  filled: boolean
  color: string
}

export interface TetrisGameState {
  board: (BoardCell | null)[][]
  currentPiece: {
    type: TetrominoType
    shape: number[][]
    x: number
    y: number
    color: string
  } | null
  nextPiece: TetrominoType
  score: number
  level: number
  lines: number
  gameOver: boolean
  isPaused: boolean
}

export function useTetris(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  const gameStatus = ref<'waiting' | 'playing'>('waiting')
  const gameState = ref<TetrisGameState | null>(null)
  const achievements = ref<Record<string, { win: number; lost: number; draw: number }>>({})
  const clearedLines = ref<number[]>([])

  function onRoomStart() {
    gameStatus.value = 'playing'
  }

  function onRoomEnd() {
    gameStatus.value = 'waiting'
    gameState.value = null
  }

  function onCommand(cmd: any) {
    if (roomPlayer.room.attrs?.type !== 'tetris') return

    switch (cmd.type) {
      case 'status':
        gameStatus.value = cmd.data.status
        gameState.value = cmd.data.gameState
        achievements.value = cmd.data.achievements || {}
        break
      case 'game:state':
        // 检查是否有清除行
        if (cmd.data && gameState.value) {
          // 检测是否发生了消行
          const prevLines = gameState.value.lines || 0;
          const newLines = cmd.data.lines || 0;
          
          if (newLines > prevLines) {
            // 触发消行动画
            const linesToClear: number[] = [];
            for (let y = 0; y < cmd.data.board.length; y++) {
              if (cmd.data.board[y].every((cell: BoardCell | null) => cell?.filled)) {
                linesToClear.push(y);
              }
            }
            
            clearedLines.value = linesToClear;
            
            // 300ms 后清除动画标记
            setTimeout(() => {
              clearedLines.value = [];
            }, 300);
          }
        }
        gameState.value = cmd.data
        break
      case 'achievements':
        achievements.value = cmd.data
        break
    }
  }

  function moveLeft() {
    if (gameStatus.value !== 'playing' || roomPlayer.role !== 'player') return
    game?.command(roomPlayer.room.id, { type: 'tetris:move_left' })
  }

  function moveRight() {
    if (gameStatus.value !== 'playing' || roomPlayer.role !== 'player') return
    game?.command(roomPlayer.room.id, { type: 'tetris:move_right' })
  }

  function moveDown() {
    if (gameStatus.value !== 'playing' || roomPlayer.role !== 'player') return
    game?.command(roomPlayer.room.id, { type: 'tetris:move_down' })
  }

  function rotate() {
    if (gameStatus.value !== 'playing' || roomPlayer.role !== 'player') return
    game?.command(roomPlayer.room.id, { type: 'tetris:rotate' })
  }

  function drop() {
    if (gameStatus.value !== 'playing' || roomPlayer.role !== 'player') return
    game?.command(roomPlayer.room.id, { type: 'tetris:drop' })
  }

  function pause() {
    if (gameStatus.value !== 'playing' || roomPlayer.role !== 'player' || !gameState.value) return
    game?.command(roomPlayer.room.id, { type: 'tetris:pause' })
  }

  function startGame() {
    if (gameStatus.value !== 'waiting' || roomPlayer.role !== 'player') return
    game?.command(roomPlayer.room.id, { type: 'start' })
  }
  
  function restartGame() {
    // 发送特殊命令处理重新开始
    if (roomPlayer.role !== 'player') return
    game?.command(roomPlayer.room.id, { type: 'tetris:restart' })
  }
  
  function endGame() {
    // 结束游戏，回到等待状态
    if (roomPlayer.role !== 'player') return
    game?.command(roomPlayer.room.id, { type: 'end' })
  }

  // 键盘控制
  const handleKeyDown = (e: KeyboardEvent) => {
    if (document.activeElement !== document.body) return;
    
    switch (e.key.toLowerCase()) {
      case 'arrowleft':
      case 'a':
        moveLeft();
        break;
      case 'arrowright':
      case 'd':
        moveRight();
        break;
      case 'arrowdown':
      case 's':
        moveDown();
        break;
      case 'arrowup':
      case 'w':
        rotate();
        break;
      case ' ':
        drop();
        e.preventDefault();
        break;
      case 'p':
        pause();
        break;
    }
  };

  useGameEvents(game, {
    'room.start': onRoomStart,
    'room.end': onRoomEnd,
    'player.command': onCommand,
    'room.command': onCommand,
  })

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  // 计算属性 - 将游戏板转换为可渲染的格式
  const renderedBoard = computed(() => {
    if (!gameState.value) return []

    // 深拷贝游戏板
    const board = JSON.parse(JSON.stringify(gameState.value.board))
    const currentPiece = gameState.value.currentPiece

    // 添加当前活动方块到游戏板
    if (currentPiece) {
      const { shape, x, y, color } = currentPiece
      for (let py = 0; py < shape.length; py++) {
        for (let px = 0; px < shape[py].length; px++) {
          if (shape[py][px] !== 0) {
            const boardY = y + py
            const boardX = x + px
            if (boardY >= 0 && boardY < board.length && boardX >= 0 && boardX < board[0].length) {
              board[boardY][boardX] = { filled: true, color }
            }
          }
        }
      }
    }

    return board
  })

  // 计算带阴影预览的游戏板
  const renderedBoardWithGhost = computed(() => {
    if (!gameState.value) return []

    // 深拷贝游戏板
    const board = JSON.parse(JSON.stringify(gameState.value.board))
    const currentPiece = gameState.value.currentPiece

    // 添加当前活动方块到游戏板
    if (currentPiece) {
      const { shape, x, y, color } = currentPiece
      
      // 计算 ghost piece 位置
      let ghostY = y
      while (ghostY < BOARD_HEIGHT) {
        // 检查是否可以继续下落
        let canMoveDown = true
        for (let py = 0; py < shape.length; py++) {
          for (let px = 0; px < shape[py].length; px++) {
            if (shape[py][px] !== 0) {
              const boardY = ghostY + py + 1
              const boardX = x + px
              
              // 检查边界和碰撞
              if (boardY >= BOARD_HEIGHT || 
                  (boardY >= 0 && board[boardY][boardX]?.filled)) {
                canMoveDown = false
                break
              }
            }
          }
          if (!canMoveDown) break
        }
        
        if (canMoveDown) {
          ghostY++
        } else {
          break
        }
      }

      // 添加 ghost piece（轮廓形式）
      for (let py = 0; py < shape.length; py++) {
        for (let px = 0; px < shape[py].length; px++) {
          if (shape[py][px] !== 0) {
            const boardY = ghostY + py
            const boardX = x + px
            if (boardY >= 0 && boardY < board.length && boardX >= 0 && boardX < board[0].length && !board[boardY][boardX]?.filled) {
              board[boardY][boardX] = { filled: true, color: `outline-${color}` }
            }
          }
        }
      }

      // 添加当前活动方块
      for (let py = 0; py < shape.length; py++) {
        for (let px = 0; px < shape[py].length; px++) {
          if (shape[py][px] !== 0) {
            const boardY = y + py
            const boardX = x + px
            if (boardY >= 0 && boardY < board.length && boardX >= 0 && boardX < board[0].length) {
              board[boardY][boardX] = { filled: true, color }
            }
          }
        }
      }
    }

    return board
  })

  // 计算下一个方块预览
  const renderedNextPiece = computed(() => {
    if (!gameState.value || !gameState.value.nextPiece) return null

    const TETROMINOES: Record<TetrominoType, { shape: number[][], color: string }> = {
      I: {
        shape: [
          [0, 0, 0, 0],
          [1, 1, 1, 1],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        color: '#00bcd4'  // 青色
      },
      J: {
        shape: [
          [1, 0, 0],
          [1, 1, 1],
          [0, 0, 0]
        ],
        color: '#2196f3'  // 蓝色
      },
      L: {
        shape: [
          [0, 0, 1],
          [1, 1, 1],
          [0, 0, 0]
        ],
        color: '#ff9800'  // 橙色
      },
      O: {
        shape: [
          [1, 1],
          [1, 1]
        ],
        color: '#ffeb3b'  // 黄色
      },
      S: {
        shape: [
          [0, 1, 1],
          [1, 1, 0],
          [0, 0, 0]
        ],
        color: '#4caf50'  // 绿色
      },
      T: {
        shape: [
          [0, 1, 0],
          [1, 1, 1],
          [0, 0, 0]
        ],
        color: '#9c27b0'  // 紫色
      },
      Z: {
        shape: [
          [1, 1, 0],
          [0, 1, 1],
          [0, 0, 0]
        ],
        color: '#f44336'  // 红色
      }
    }

    const nextPieceType = gameState.value.nextPiece
    const pieceData = TETROMINOES[nextPieceType]

    return pieceData ? {
      type: nextPieceType,
      shape: pieceData.shape,
      color: pieceData.color
    } : null
  })

  return {
    gameStatus,
    gameState,
    achievements,
    renderedBoard,
    renderedBoardWithGhost,
    renderedNextPiece,
    moveLeft,
    moveRight,
    moveDown,
    rotate,
    drop,
    pause,
    startGame,
    restartGame,
    endGame,
    clearedLines
  }
}

// 游戏板尺寸常量
const BOARD_HEIGHT = 20