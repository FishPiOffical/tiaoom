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
  const isSealed = ref(false)
  const sealRequesterId = ref<string | null>(null)
  let timerInterval: any

  function startLocalTimer(seconds: number) {
    timer.value = seconds
    if (timerInterval) clearInterval(timerInterval)
    if (isSealed.value) return // 封盘不计时

    timerInterval = setInterval(() => {
      timer.value--
      if (timer.value <= 0) clearInterval(timerInterval)
    }, 1000)
  }

  function stopLocalTimer() {
    if (timerInterval) clearInterval(timerInterval)
  }

  function onRoomStart() {
    currentPlace.value = null
    isSealed.value = false
    sealRequesterId.value = null
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
        isSealed.value = cmd.data.isSealed ?? false
        sealRequesterId.value = cmd.data.sealRequesterId
        if (cmd.data.tickEndTime?.turn && !isSealed.value) {
          startLocalTimer(Math.max(0, Math.ceil((cmd.data.tickEndTime.turn - Date.now()) / 1000)))
        }
        break
      case 'countdown':
        if (cmd.data.name === 'turn' && !isSealed.value) {
          startLocalTimer(cmd.data.seconds)
        }
        break
      case 'board':
        board.value = cmd.data
        break
      case 'request-seal':
        confirm(`玩家 ${cmd.data.player.name} 请求封盘。是否同意？`, '封盘请求', {
          confirmText: '同意',
          cancelText: '拒绝',
        }).then((ok) => {
          game?.command(roomPlayer.room.id, { type: 'seal', data: { agree: ok, requesterId: cmd.data.player.id } })
        })
        break
      case 'seal':
        isSealed.value = true
        sealRequesterId.value = cmd.data.sealRequesterId
        stopLocalTimer()
        break
      case 'unseal':
        isSealed.value = false
        sealRequesterId.value = null
        startLocalTimer(cmd.data.remaining)
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
    if (isSealed.value) return
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

  function requestSeal() {
    if (roomPlayer.room.status !== 'playing' || isSealed.value) return
    game?.command(roomPlayer.room.id, { type: 'request-seal' })
  }

  function unseal() {
    if (!isSealed.value) return
    game?.command(roomPlayer.room.id, { type: 'unseal' })
  }

  const isPlaying = computed(() => roomPlayer.room.status === 'playing')
  const timerStr = computed(() => {
    const min = Math.floor(timer.value / 60).toString().padStart(2, '0')
    const sec = (timer.value % 60).toString().padStart(2, '0')
    return `${min}:${sec}`
  })

  return {
    isPlaying,
    currentPlayer,
    board,
    currentPlace,
    achievements,
    placePiece,
    requestDraw,
    requestLose,
    requestSeal,
    unseal,
    timer,
    timerStr,
    isSealed,
    sealRequesterId,
  }
}
