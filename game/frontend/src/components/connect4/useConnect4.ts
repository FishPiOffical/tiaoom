import { ref, computed } from 'vue'
import { Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game';
import { useGameEvents } from '@/hook/useGameEvents';
import { confirm } from '@/components/msgbox';

export function useConnect4(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  const gameStatus = computed(() => roomPlayer.room.status)
  const currentPlayer = ref<any>()
  const board = ref(Array(8).fill(0).map(() => Array(8).fill(-1)))
  const achievements = ref<Record<string, any>>({})
  const currentPlace = ref<{ x: number; y: number } | null>(null)
  const hoverCol = ref<number>(-1);
  const timer = ref(0)
  const isSealed = ref(false)
  const sealRequesterId = ref<string | null>(null)
  let timerInterval: any

  const timerStr = computed(() => {
    const m = Math.floor(timer.value / 60).toString().padStart(2, '0')
    const s = (timer.value % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  })

  function startLocalTimer(seconds: number) {
    timer.value = seconds
    if (timerInterval) clearInterval(timerInterval)

    if (isSealed.value) return 

    timerInterval = setInterval(() => {
      timer.value--
      if (timer.value <= 0) clearInterval(timerInterval)
    }, 1000)
  }

  function stopLocalTimer() {
    if (timerInterval) clearInterval(timerInterval)
  }

  const isMyTurn = computed(() => 
    gameStatus.value === 'playing' && 
    currentPlayer.value?.id === roomPlayer.id
  )

  // 初始化最底行为可落子位置
  board.value[board.value.length - 1] = board.value[board.value.length - 1].map(() => 0)

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
    if (roomPlayer.room.attrs?.type !== 'connect4') return
    
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
      case 'request-draw':
        confirm(`玩家 ${cmd.data.player.name} 请求和棋。是否同意？`, '和棋', {
          confirmText: '同意',
          cancelText: '拒绝',
        }).then((ok) => {          
          if (ok) game?.command(roomPlayer.room.id, { type: 'draw', data: { agree: true } })
          else game?.command(roomPlayer.room.id, { type: 'draw', data: { agree: false } })
        })
        break
      case 'place-turn':
        currentPlayer.value = cmd.data.player
        break
      case 'achievements':
        achievements.value = cmd.data
        break
      case 'place':
        const { x, y } = cmd.data
        currentPlace.value = { x, y }
        break
    }
  }

  function placePiece(row: number, col: number) {
    if (gameStatus.value !== 'playing') return
    if (currentPlayer.value?.id !== roomPlayer.id) return
    if (board.value[row][col] !== 0) return
    game?.command(roomPlayer.room.id, { type: 'place', data: { x: row, y: col } })
  }

  function handleColumnClick(col: number) {
    if (!isMyTurn.value) return
    // 找到该列值为 0 的行 (可落子位置)
    const row = board.value.findIndex(r => r[col] === 0)
    if (row !== -1) {
      placePiece(row, col)
    }
  }

  useGameEvents(game, {
    'room.start': onRoomStart,
    'room.end': onRoomEnd,
    'player.command': onCommand,
    'room.command': onCommand,
  })

  function requestDraw() {
    if (gameStatus.value !== 'playing') return
    game?.command(roomPlayer.room.id, { type: 'request-draw' })
  }

  function requestSeal() {
    if (gameStatus.value !== 'playing') return
    game?.command(roomPlayer.room.id, { type: 'request-seal' })
  }

  function unseal() {
    if (!isSealed.value) return
    game?.command(roomPlayer.room.id, { type: 'unseal' })
  }

  function requestLose() {
    if (gameStatus.value !== 'playing') return
    game?.command(roomPlayer.room.id, { type: 'request-lose' })
  }

  const isPlaying = computed(() => roomPlayer.room.status === 'playing')

  return {
    isPlaying,
    gameStatus,
    currentPlayer,
    board,
    achievements,
    currentPlace,
    hoverCol,
    isMyTurn,
    handleColumnClick,
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
