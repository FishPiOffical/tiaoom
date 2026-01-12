import { computed, ref } from 'vue'
import { Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game';
import { useGameEvents } from '@/hook/useGameEvents';
import { confirm } from '@/components/msgbox';

type Side = 'red' | 'black';
type PieceType = 'K' | 'A' | 'B' | 'R' | 'N' | 'C' | 'P';

interface ChessPiece {
  id: number;
  type?: PieceType;
  side?: Side;
  level?: number;
  name?: string;
  isOpen: boolean;
}

type Cell = ChessPiece | null;

export function useChessflip(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  const currentPlayer = ref<any>()
  const BOARD_ROWS = 4
  const BOARD_COLS = 8

  function createDefaultBoard(): Cell[][] {
    return Array.from({ length: BOARD_ROWS }, () => Array<Cell>(BOARD_COLS).fill(null))
  }

  // 归一化棋盘：避免后端未开始时返回空数组导致 v-for 不渲染任何行/列
  function normalizeBoard(next: unknown): Cell[][] {
    if (!Array.isArray(next) || next.length === 0) return createDefaultBoard()

    const normalized: Cell[][] = []
    for (let x = 0; x < BOARD_ROWS; x++) {
      const row = (next as any)[x]
      const normalizedRow: Cell[] = []
      for (let y = 0; y < BOARD_COLS; y++) {
        const cell = Array.isArray(row) ? row[y] : null
        normalizedRow.push((cell ?? null) as Cell)
      }
      normalized.push(normalizedRow)
    }
    return normalized
  }

  const board = ref<Cell[][]>(createDefaultBoard())
  const achievements = ref<Record<string, any>>({})
  const myCamp = ref<Side | undefined>()
  const isFirstFlip = ref(true)
  const selectedCell = ref<{ x: number; y: number } | null>(null)
  const countdown = ref(60)
  const campAssignment = ref<Record<string, Side>>({})

  // 动画状态
  const flippingCell = ref<{ x: number; y: number } | null>(null)
  const capturedCell = ref<{ x: number; y: number } | null>(null)
  const lastMoveFrom = ref<{ x: number; y: number } | null>(null)
  const lastMoveTo = ref<{ x: number; y: number } | null>(null)

  function onRoomStart() {
    selectedCell.value = null
    myCamp.value = undefined
    isFirstFlip.value = true
    campAssignment.value = {}
    flippingCell.value = null
    capturedCell.value = null
    lastMoveFrom.value = null
    lastMoveTo.value = null
  }

  function onRoomEnd() {
    currentPlayer.value = null
    selectedCell.value = null
  }

  function onCommand(cmd: any) {
    if (roomPlayer.room.attrs?.type !== 'chessflip') return

    switch (cmd.type) {
      case 'status':
        currentPlayer.value = cmd.data.current
        board.value = normalizeBoard(cmd.data.board)
        achievements.value = cmd.data.achievements || {}
        myCamp.value = cmd.data.camp
        isFirstFlip.value = cmd.data.isFirstFlip ?? true
        countdown.value = cmd.data.countdown ?? 60
        break

      case 'board':
        board.value = normalizeBoard(cmd.data?.board ?? cmd.data)
        break

      case 'turn':
        currentPlayer.value = cmd.data.player
        isFirstFlip.value = cmd.data.isFirstFlip ?? false
        break

      case 'flip':
        // 翻棋动画
        {
          const { x, y, piece } = cmd.data
          flippingCell.value = { x, y }
          // 动画结束后更新棋盘
          setTimeout(() => {
            if (board.value[x]) {
              board.value[x][y] = piece
            }
            flippingCell.value = null
          }, 300)
        }
        break

      case 'move':
        // 移动/吃子动画
        {
          const { from, to } = cmd.data
          lastMoveFrom.value = from
          lastMoveTo.value = to
          // 如果目标位置有棋子，显示吃子效果
          if (board.value[to.x]?.[to.y]) {
            capturedCell.value = to
            setTimeout(() => {
              capturedCell.value = null
            }, 500)
          }
          // 清除高亮
          setTimeout(() => {
            lastMoveFrom.value = null
            lastMoveTo.value = null
          }, 1000)
        }
        break

      case 'camp-assigned':
        campAssignment.value = cmd.data
        myCamp.value = cmd.data[roomPlayer.id]
        break

      case 'achievements':
        achievements.value = cmd.data
        break

      case 'request-draw':
        confirm(`玩家 ${cmd.data.player.name} 请求和棋。是否同意？`, '和棋', {
          confirmText: '同意',
          cancelText: '拒绝',
        }).then((ok) => {
          if (ok) game?.command(roomPlayer.room.id, { type: 'draw', data: { agree: true } })
          else game?.command(roomPlayer.room.id, { type: 'draw', data: { agree: false } })
        })
        break
    }
  }

  useGameEvents(game, {
    'room.start': onRoomStart,
    'room.end': onRoomEnd,
    'player.command': onCommand,
    'room.command': onCommand,
  })

  // 处理格子点击
  function handleCellClick(x: number, y: number) {
    if (!isPlaying.value) return
    if (currentPlayer.value?.id !== roomPlayer.id) return

    const cell = board.value[x]?.[y]

    // 如果已有选中的棋子
    if (selectedCell.value) {
      const { x: sx, y: sy } = selectedCell.value
      const selectedPiece = board.value[sx]?.[sy]

      // 点击同一个格子，取消选中
      if (sx === x && sy === y) {
        selectedCell.value = null
        return
      }

      // 如果选中的是己方已翻开的棋子
      if (selectedPiece?.isOpen && selectedPiece.side === myCamp.value) {
        // 尝试移动或吃子
        game?.command(roomPlayer.room.id, {
          type: 'move',
          data: {
            from: { x: sx, y: sy },
            to: { x, y }
          }
        })
        selectedCell.value = null
        return
      }
    }

    // 没有选中棋子时的逻辑
    if (!cell) {
      // 空格子
      selectedCell.value = null
      return
    }

    if (!cell.isOpen) {
      // 未翻开的棋子 - 翻棋
      game?.command(roomPlayer.room.id, { type: 'flip', data: { x, y } })
      selectedCell.value = null
      return
    }

    // 已翻开的棋子
    if (cell.side === myCamp.value) {
      // 己方棋子 - 选中
      selectedCell.value = { x, y }
    } else {
      // 对方棋子
      // 如果已选中己方棋子，尝试吃子
      if (selectedCell.value) {
        const { x: sx, y: sy } = selectedCell.value
        game?.command(roomPlayer.room.id, {
          type: 'move',
          data: {
            from: { x: sx, y: sy },
            to: { x, y }
          }
        })
        selectedCell.value = null
      }
    }
  }

  function requestDraw() {
    if (roomPlayer.room.status !== 'playing') return
    game?.command(roomPlayer.room.id, { type: 'request-draw' })
  }

  function requestLose() {
    if (roomPlayer.room.status !== 'playing') return
    game?.command(roomPlayer.room.id, { type: 'request-lose' })
  }

  const isPlaying = computed(() => roomPlayer.room.status === 'playing')
  const isMyTurn = computed(() => currentPlayer.value?.id === roomPlayer.id)

  // 获取棋子显示样式类
  function getPieceClass(cell: Cell) {
    if (!cell) return ''
    if (!cell.isOpen) return 'piece-hidden'
    return cell.side === 'red' ? 'piece-red' : 'piece-black'
  }

  // 获取棋子显示文字
  function getPieceText(cell: Cell) {
    if (!cell) return ''
    if (!cell.isOpen) return '?'
    return cell.name || ''
  }

  return {
    isPlaying,
    isMyTurn,
    currentPlayer,
    board,
    achievements,
    myCamp,
    isFirstFlip,
    selectedCell,
    countdown,
    campAssignment,
    // 动画状态
    flippingCell,
    capturedCell,
    lastMoveFrom,
    lastMoveTo,
    handleCellClick,
    requestDraw,
    requestLose,
    getPieceClass,
    getPieceText,
  }
}
