import { ref } from 'vue'
import { Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game'
import { useGameEvents } from '@/hook/useGameEvents'
import { confirm } from '@/components/msgbox'

export type Piece = string | ''

type Side = 'red' | 'green'

export function useXiangqi(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  const gameStatus = ref<'waiting' | 'playing'>('waiting')
  const currentPlayer = ref<any>(null)
  const board = ref<Piece[][]>(Array(10).fill(0).map(() => Array(9).fill('')))
  const achivents = ref<Record<string, any>>({})
  const countdown = ref<number>(0)
  let ticker: any = null

  const selected = ref<{ x: number; y: number } | null>(null)

  function onRoomStart() {
    gameStatus.value = 'playing'
    selected.value = null
  }

  function onRoomEnd() {
    gameStatus.value = 'waiting'
    currentPlayer.value = null
    selected.value = null
    countdown.value = 0
    if (ticker) { clearInterval(ticker); ticker = null }
  }

  function onCommand(cmd: any) {
    if (roomPlayer.room.attrs?.type !== 'xiangqi') return

    switch (cmd.type) {
      case 'status':
        gameStatus.value = cmd.data.status
        currentPlayer.value = cmd.data.current
        board.value = cmd.data.board
        achivents.value = cmd.data.achivents || {}
        if (cmd.data.countdown) startCountdown(cmd.data.countdown)
        break
      case 'board':
        board.value = cmd.data
        break
      case 'turn':
        currentPlayer.value = cmd.data.player
        gameStatus.value = 'playing'
        // countdown will be sent separately, but reset locally
        break
      case 'countdown':
        startCountdown(cmd.data.end)
        break
      case 'move':
        selected.value = null
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

  function startCountdown(endAt: number) {
    if (!endAt) return
    if (ticker) { clearInterval(ticker); ticker = null }
    const update = () => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
      countdown.value = left
      if (left <= 0 && ticker) { clearInterval(ticker); ticker = null }
    }
    update()
    ticker = setInterval(update, 250)
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

  return {
    gameStatus,
    currentPlayer,
    board,
    achivents,
    selected,
    countdown,
    trySelectOrMove,
  }
}
