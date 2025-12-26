import { ref, computed } from 'vue'
import { Room, RoomPlayer, PlayerRole } from 'tiaoom/client'
import { GameCore } from '@/core/game'
import { useGameEvents } from '@/hook/useGameEvents'
import type { DoudizhuGameState, DoudizhuCard } from '$/backend/src/games/doudizhu'

export type GameStatus = 'waiting' | 'calling' | 'grabbing' | 'counter-grabbing' | 'playing' | 'ended'

export function useDoudizhu(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  // 游戏状态
  const gameState = ref<DoudizhuGameState | null>(null)
  const currentTimer = ref<number | null>(null)
  const gameStatus = ref<GameStatus>('waiting')
  const achievements = ref<Record<string, { win: number; lost: number; draw?: number }>>({})
  const selectedCards = ref<string[]>([])
  const showNotification = ref(false)
  const notificationMessage = ref('')

  // 计算属性
  const myHand = computed<DoudizhuCard[]>(() => {
    if (!gameState.value || !roomPlayer.id) return []
    return gameState.value.players[roomPlayer.id] || []
  })

  const otherPlayers = computed(() => {
    if (!gameState.value) return []
    return Object.keys(gameState.value.players).filter(id => id !== roomPlayer.id)
  })

  const isCurrentPlayer = computed(() => {
    if (!gameState.value || !roomPlayer.id) return false
    if (['calling', 'grabbing', 'counter-grabbing'].includes(gameState.value.phase)) {
      return gameState.value.currentBidder === roomPlayer.id
    }
    return gameState.value.currentPlayer === roomPlayer.id
  })

  const canPass = computed(() => {
    if (!gameState.value || !isCurrentPlayer.value) return false
    if (gameState.value.phase !== 'playing') return false
    return gameState.value.lastPlayer && gameState.value.lastPlayer !== roomPlayer.id
  })

  const canPlay = computed(() => {
    if (!isCurrentPlayer.value) return false
    if (gameState.value?.phase !== 'playing') return false
    return selectedCards.value.length > 0
  })

  const isWinner = computed(() => {
    if (!gameState.value?.winner || !roomPlayer.id) return false
    const isLandlord = roomPlayer.id === gameState.value.landlord
    const landlordWon = gameState.value.winnerRole === 'landlord'
    return isLandlord === landlordWon
  })

  const isPlaying = computed(() =>
    ['playing', 'calling', 'grabbing', 'counter-grabbing'].includes(gameStatus.value)
  )

  const isPlayer = computed(() => roomPlayer.role === PlayerRole.player)

  // 工具方法
  const getPlayerName = (playerId: string) => {
    const player = roomPlayer.room.players.find((p: any) => p.id === playerId)
    return player?.name || '未知玩家'
  }

  const getPlayerStatus = (p: any) => {
    if (!p.isReady) return '未准备'
    if (gameStatus.value === 'waiting' || gameStatus.value === 'ended') return '已准备'

    if (['calling', 'grabbing', 'counter-grabbing'].includes(gameState.value?.phase || '')) {
      if (gameState.value?.currentBidder === p.id) {
        if (gameState.value.phase === 'calling') return '叫地主中'
        if (gameState.value.phase === 'grabbing') return '抢地主中'
        return '反抢中'
      }
    }
    if (gameState.value?.phase === 'playing' && gameState.value.currentPlayer === p.id) {
      return '出牌中'
    }
    if (isPlaying.value) return '等待中'
    return '已准备'
  }

  const isPlayerCurrentTurn = (playerId: string) => {
    if (!gameState.value) return false
    if (['calling', 'grabbing', 'counter-grabbing'].includes(gameState.value.phase)) {
      return gameState.value.currentBidder === playerId
    }
    if (gameState.value.phase === 'playing') {
      return gameState.value.currentPlayer === playerId
    }
    return false
  }

  // 卡牌选择
  const toggleCardSelection = (cardId: string) => {
    if (!isCurrentPlayer.value || gameState.value?.phase !== 'playing') return
    const index = selectedCards.value.indexOf(cardId)
    if (index > -1) {
      selectedCards.value.splice(index, 1)
    } else {
      selectedCards.value.push(cardId)
    }
  }

  const clearSelection = () => {
    selectedCards.value = []
  }

  // 游戏操作
  const callLandlord = (bid: boolean) => {
    if (!gameState.value) return
    if (!['calling', 'grabbing', 'counter-grabbing'].includes(gameState.value.phase)) return
    if (gameState.value.currentBidder !== roomPlayer.id) return

    game?.command(roomPlayer.room.id, {
      type: 'doudizhu:bid',
      data: { bid }
    })
  }

  const playSelectedCards = () => {
    if (!canPlay.value) return

    game?.command(roomPlayer.room.id, {
      type: 'doudizhu:play',
      data: { cardIds: selectedCards.value }
    })
    clearSelection()
  }

  const passPlay = () => {
    if (!canPass.value) return

    game?.command(roomPlayer.room.id, {
      type: 'doudizhu:pass',
      data: {}
    })
  }

  const requestLose = () => {
    if (!isPlaying.value) return
    game?.command(roomPlayer.room.id, { type: 'request-lose' })
  }

  // 通知
  const showError = (msg: string) => {
    notificationMessage.value = msg
    showNotification.value = true
    setTimeout(() => {
      showNotification.value = false
    }, 2000)
  }

  // 事件处理
  const onRoomStart = () => {
    gameState.value = null
    gameStatus.value = 'playing'
    clearSelection()
  }

  const onRoomEnd = () => {
    gameStatus.value = 'waiting'
    gameState.value = null
    currentTimer.value = null
    clearSelection()
  }

  const onCommand = (command: any) => {
    switch (command.type) {
      case 'game:state':
        gameState.value = command.data
        if (command.data.phase === 'ended') {
          gameStatus.value = 'ended'
        } else if (command.data.phase === 'calling') {
          gameStatus.value = 'calling'
        } else if (command.data.phase === 'grabbing') {
          gameStatus.value = 'grabbing'
        } else if (command.data.phase === 'counter-grabbing') {
          gameStatus.value = 'counter-grabbing'
        } else {
          gameStatus.value = 'playing'
        }
        if (command.data.turnTimeLeft !== undefined) {
          currentTimer.value = command.data.turnTimeLeft
        }
        break

      case 'timer:update':
        if (command.data?.timeLeft !== undefined) {
          currentTimer.value = command.data.timeLeft
        }
        break

      case 'game:over':
        if (gameState.value) {
          gameState.value.winner = command.data.winner
          gameState.value.winnerRole = command.data.winnerRole
        }
        gameStatus.value = 'ended'
        break

      case 'doudizhu:invalid':
        showError(command.data.message)
        break

      case 'achievements':
        achievements.value = command.data
        break

      case 'status':
        if (command.data?.status) {
          if (command.data.status === 'ended') {
            gameStatus.value = 'ended'
          } else if (command.data.status === 'playing') {
            if (gameState.value?.phase === 'calling') {
              gameStatus.value = 'calling'
            } else if (gameState.value?.phase === 'grabbing') {
              gameStatus.value = 'grabbing'
            } else if (gameState.value?.phase === 'counter-grabbing') {
              gameStatus.value = 'counter-grabbing'
            } else {
              gameStatus.value = 'playing'
            }
          } else if (command.data.status === 'waiting' && gameStatus.value !== 'ended') {
            gameStatus.value = 'waiting'
          }
        }
        break

      case 'end':
        gameStatus.value = 'waiting'
        gameState.value = null
        currentTimer.value = null
        clearSelection()
        break
    }
  }

  // 初始化事件监听
  useGameEvents(game, {
    'room.start': onRoomStart,
    'room.end': onRoomEnd,
    'player.command': onCommand,
    'room.command': onCommand,
  })

  // 初始化请求
  const init = () => {
    const roomId = roomPlayer.room.id
    game?.command(roomId, { type: 'status', data: {} })
    game?.command(roomId, { type: 'game:state' })
    game?.command(roomId, { type: 'achievements' })

    gameStatus.value = roomPlayer.room.status === 'playing' ? 'playing' : 'waiting'
  }

  return {
    // 状态
    gameState,
    currentTimer,
    gameStatus,
    achievements,
    selectedCards,
    showNotification,
    notificationMessage,

    // 计算属性
    myHand,
    otherPlayers,
    isCurrentPlayer,
    canPass,
    canPlay,
    isWinner,
    isPlaying,
    isPlayer,

    // 方法
    getPlayerName,
    getPlayerStatus,
    isPlayerCurrentTurn,
    toggleCardSelection,
    clearSelection,
    callLandlord,
    playSelectedCards,
    passPlay,
    requestLose,
    showError,
    init,
  }
}
