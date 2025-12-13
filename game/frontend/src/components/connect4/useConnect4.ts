import { ref, computed } from 'vue'
import { Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game';
import { useGameEvents } from '@/hook/useGameEvents';
import { IMessage } from '..';

export function useConnect4(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  const gameStatus = ref<'waiting' | 'playing'>('waiting')
  const currentPlayer = ref<any>()
  const board = ref(Array(8).fill(0).map(() => Array(8).fill(-1)))
  const achivents = ref<Record<string, any>>({})
  const currentPlace = ref<{ x: number; y: number } | null>(null)
  const hoverCol = ref<number>(-1)

  const isMyTurn = computed(() => 
    gameStatus.value === 'playing' && 
    currentPlayer.value?.id === roomPlayer.id
  )

  // 初始化最底行为可落子位置
  board.value[board.value.length - 1] = board.value[board.value.length - 1].map(() => 0)

  function onRoomStart() {
    gameStatus.value = 'playing'
    currentPlace.value = null
  }

  function onRoomEnd() {
    gameStatus.value = 'waiting'
    currentPlayer.value = null
  }

  function onCommand(cmd: any) {
    if (roomPlayer.room.attrs?.type !== 'connect4') return
    
    switch (cmd.type) {
      case 'status':
        gameStatus.value = cmd.data.status
        currentPlayer.value = cmd.data.current
        board.value = cmd.data.board
        achivents.value = cmd.data.achivents || {}
        break
      case 'board':
        board.value = cmd.data
        break
      case 'request-draw':
        confirm(`玩家 ${cmd.data.player.name} 请求和棋。是否同意？`) && 
          game?.command(roomPlayer.room.id, { type: 'draw' })
        break
      case 'place-turn':
        currentPlayer.value = cmd.data.player
        gameStatus.value = 'playing'
        break
      case 'achivements':
        achivents.value = cmd.data
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

  function requestLose() {
    if (gameStatus.value !== 'playing') return
    game?.command(roomPlayer.room.id, { type: 'request-lose' })
  }

  return {
    gameStatus,
    currentPlayer,
    board,
    achivents,
    currentPlace,
    hoverCol,
    isMyTurn,
    handleColumnClick,
    placePiece,
    requestDraw,
    requestLose,
  }
}
