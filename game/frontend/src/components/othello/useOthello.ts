import { computed, ref } from 'vue'
import { Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game';
import { useGameEvents } from '@/hook/useGameEvents';
import { confirm } from '@/components/msgbox';

export function useOthello(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  const currentPlayer = ref<any>()
  const board = ref(Array(8).fill(0).map(() => Array(8).fill(-1)))
  const currentPlace = ref<{ x: number; y: number } | null>(null)
  const achievements = ref<Record<string, any>>({})
  const timer = ref(0)
  let timerInterval: any

  function startLocalTimer(seconds: number) {
    timer.value = seconds
    if (timerInterval) clearInterval(timerInterval)
    timerInterval = setInterval(() => {
      timer.value--
      if (timer.value <= 0) clearInterval(timerInterval)
    }, 1000)
  }

  function onRoomStart() {
    currentPlace.value = null
  }

  function onRoomEnd() {
    currentPlayer.value = null
    if (timerInterval) clearInterval(timerInterval)
  }

  function onCommand(cmd: any) {
    if (roomPlayer.room.attrs?.type !== 'othello') return
    
    switch (cmd.type) {
      case 'status':
        currentPlayer.value = cmd.data.current
        board.value = cmd.data.board
        achievements.value = cmd.data.achievements || {}
        if (cmd.data.tickEndTime?.turn) {
          startLocalTimer(Math.max(0, Math.ceil((cmd.data.tickEndTime.turn - Date.now()) / 1000)))
        }
        break
      case 'countdown':
        if (cmd.data.name === 'turn') {
          startLocalTimer(cmd.data.seconds)
        }
        break
      case 'board':
        board.value = cmd.data
        break
      case 'place-turn':
        currentPlayer.value = cmd.data.player
        break
      case 'place':
        const { x, y } = cmd.data
        currentPlace.value = { x, y }
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

  function placePiece(row: number, col: number) {
    if (!isPlaying.value) return
    if (currentPlayer.value?.id !== roomPlayer.id) return
    if (board.value[row][col] !== 0) return
    game?.command(roomPlayer.room.id, { type: 'place', data: { x: row, y: col } })
    // Optimistic update or wait for server? Original code did optimistic update
    board.value[row][col] = currentPlayer.value.attributes?.color
  }

  useGameEvents(game, {
    'room.start': onRoomStart,
    'room.end': onRoomEnd,
    'player.command': onCommand,
    'room.command': onCommand,
  })

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
    currentPlayer,
    board,
    currentPlace,
    achievements,
    placePiece,
    requestDraw,
    requestLose,
    timer,
  }
}
