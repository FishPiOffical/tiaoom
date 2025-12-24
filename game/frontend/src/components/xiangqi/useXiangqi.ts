import { ref, computed } from 'vue'
import { Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game'
import { useGameEvents } from '@/hook/useGameEvents'
import { confirm } from '@/components/msgbox'

export type Piece = string | ''

type Side = 'red' | 'green'

export function useXiangqi(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  const gameStatus = computed(() => roomPlayer.room.status)
  const currentPlayer = ref<any>(null)
  const board = ref<Piece[][]>(Array(10).fill(0).map(() => Array(9).fill('')))
  const achivents = ref<Record<string, any>>({})
  const countdown = ref<number>(0)
  let ticker: any = null

  const selected = ref<{ x: number; y: number } | null>(null)
  const lastMove = ref<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null)

  function inferLastMoveFromBoards(prev: Piece[][], next: Piece[][]) {
    const changed: Array<{ x: number; y: number; prev: Piece; next: Piece }> = []
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 9; y++) {
        const p = prev?.[x]?.[y] ?? ''
        const n = next?.[x]?.[y] ?? ''
        if (p !== n) changed.push({ x, y, prev: p, next: n })
      }
    }

    // Normal move/capture should change exactly two squares: from becomes empty, to becomes piece.
    if (changed.length === 2) {
      const from = changed.find(c => c.next === '' && c.prev !== '')
      const to = changed.find(c => c.next !== '')
      if (from && to) return { from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y } }
    }

    // Fallback: if only one square changed (rare), treat it as destination.
    if (changed.length === 1 && changed[0].next !== '') {
      return { from: { x: changed[0].x, y: changed[0].y }, to: { x: changed[0].x, y: changed[0].y } }
    }

    return null
  }

  function applyBoard(nextBoard: Piece[][]) {
    const prev = board.value
    board.value = nextBoard
    const inferred = inferLastMoveFromBoards(prev, nextBoard)
    if (inferred) lastMove.value = inferred
  }

  function onRoomStart() {
    selected.value = null
    lastMove.value = null
  }

  function onRoomEnd() {
    currentPlayer.value = null
    selected.value = null
    lastMove.value = null
    countdown.value = 0
    if (ticker) { clearInterval(ticker); ticker = null }
  }

  function onCommand(cmd: any) {
    if (roomPlayer.room.attrs?.type !== 'xiangqi') return

    switch (cmd.type) {
      case 'status':
        currentPlayer.value = cmd.data.current
        applyBoard(cmd.data.board)
        achivents.value = cmd.data.achivents || {}
        if (cmd.data.countdown) startCountdown(cmd.data.countdown)
        break
      case 'board':
        applyBoard(cmd.data)
        break
      case 'turn':
        currentPlayer.value = cmd.data.player
        break
      case 'countdown':
        startCountdown(cmd.data.seconds)
        break
      case 'move':
        selected.value = null
        if (cmd.data?.from && cmd.data?.to) {
          lastMove.value = { from: cmd.data.from, to: cmd.data.to }
        }
        break
      case 'achivements':
        achivents.value = cmd.data
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

  function startCountdown(seconds: number) {
    if (ticker) { clearInterval(ticker); ticker = null }
    countdown.value = seconds
    ticker = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        countdown.value = 0
        clearInterval(ticker)
        ticker = null
      }
    }, 1000)
  }

  function trySelectOrMove(x: number, y: number) {
    if (gameStatus.value !== 'playing') return
    if (currentPlayer.value?.id !== roomPlayer.id) return

    const pieceAt = board.value[x][y]
    const mySide: Side | undefined = (roomPlayer as any).attributes?.side ?? currentPlayer.value?.attributes?.side
    const sideOfPiece = (p: Piece): Side | null => {
      if (!p) return null
      return p[0] === 'r' ? 'red' : 'green'
    }

    // If nothing selected: only allow selecting own piece.
    if (!selected.value) {
      if (pieceAt && mySide && sideOfPiece(pieceAt) === mySide) selected.value = { x, y }
      return
    }

    // Toggle deselect
    if (selected.value.x === x && selected.value.y === y) {
      selected.value = null
      return
    }

    // If clicked a piece: reselect own, or capture enemy.
    if (pieceAt) {
      const clickedSide = sideOfPiece(pieceAt)
      if (mySide && clickedSide === mySide) {
        selected.value = { x, y }
        return
      }

      const from = selected.value
      game?.command(roomPlayer.room.id, { type: 'move', data: { from, to: { x, y } } })
      return
    }

    // Empty square move
    const from = selected.value
    game?.command(roomPlayer.room.id, { type: 'move', data: { from, to: { x, y } } })
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

  return {
    isPlaying,
    gameStatus,
    currentPlayer,
    board,
    achivents,
    selected,
    lastMove,
    countdown,
    trySelectOrMove,
    requestDraw,
    requestLose,
  }
}
