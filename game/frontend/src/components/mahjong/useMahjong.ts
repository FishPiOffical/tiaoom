import { ref, computed } from 'vue'
import { Room, RoomPlayer, PlayerRole } from 'tiaoom/client'
import { GameCore } from '@/core/game'
import { useGameEvents } from '@/hook/useGameEvents'
import type { MahjongTile, Meld, AvailableAction, MeldType } from '$/backend/src/games/mahjong'

// 游戏状态类型
export type GameStatus = 'waiting' | 'playing' | 'action' | 'ended'

// 可见的游戏状态
export interface VisibleGameState {
  phase: string
  wallRemaining: number
  playerOrder: string[]
  dealerIndex: number
  currentPlayerIndex: number
  lastDiscard: MahjongTile | null
  lastDiscardPlayer: string | null
  winner: string | null
  winType: 'zimo' | 'dianpao' | null
  turnTimeLeft?: number
  hosted?: { [playerId: string]: boolean }
  dianpaoPlayer?: string | null
  winningTile?: MahjongTile | null // 胡牌的那张牌
  players: {
    [playerId: string]: {
      tiles: MahjongTile[]
      melds: Meld[]
      discards: MahjongTile[]
      tileCount: number
    }
  }
  drawTile?: MahjongTile
  availableActions?: AvailableAction[]
}

export function useMahjong(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  // 游戏状态
  const gameState = ref<VisibleGameState | null>(null)
  const currentTimer = ref<number | null>(null)
  const gameStatus = ref<GameStatus>('waiting')
  const achievements = ref<Record<string, { win: number; lost: number; draw?: number }>>({})
  const selectedTileId = ref<string | null>(null)
  const showNotification = ref(false)
  const notificationMessage = ref('')
  const seatOrder = ref<string[]>([])

  // 计算属性 - 我的手牌
  const myHand = computed<MahjongTile[]>(() => {
    if (!gameState.value || !roomPlayer.id) return []
    return gameState.value.players[roomPlayer.id]?.tiles || []
  })

  // 我的副露
  const myMelds = computed<Meld[]>(() => {
    if (!gameState.value || !roomPlayer.id) return []
    return gameState.value.players[roomPlayer.id]?.melds || []
  })

  // 我的打出的牌
  const myDiscards = computed<MahjongTile[]>(() => {
    if (!gameState.value || !roomPlayer.id) return []
    return gameState.value.players[roomPlayer.id]?.discards || []
  })

  // 摸到的牌
  const drawTile = computed<MahjongTile | null>(() => {
    return gameState.value?.drawTile || null
  })

  // 其他玩家列表（按顺序：下家、对家、上家）
  const otherPlayers = computed(() => {
    if (!gameState.value || !roomPlayer.id) return []
    const myIndex = gameState.value.playerOrder.indexOf(roomPlayer.id)
    if (myIndex === -1) return gameState.value.playerOrder.filter(id => id !== roomPlayer.id)
    
    const order: string[] = []
    for (let i = 1; i < 4; i++) {
      const idx = (myIndex + i) % 4
      order.push(gameState.value.playerOrder[idx])
    }
    return order
  })

  // 是否是当前玩家
  const isCurrentPlayer = computed(() => {
    if (!gameState.value || !roomPlayer.id) return false
    const currentPlayerId = gameState.value.playerOrder[gameState.value.currentPlayerIndex]
    return currentPlayerId === roomPlayer.id
  })

  // 是否是玩家（非观众）
  const isPlayer = computed(() => roomPlayer.role === PlayerRole.player)

  // 是否正在游戏中
  const isPlaying = computed(() => ['playing', 'action'].includes(gameStatus.value))

  // 是否可以出牌
  const canDiscard = computed(() => {
    if (!gameState.value) return false
    if (gameState.value.phase !== 'playing') return false
    return isCurrentPlayer.value
  })

  // 可用操作
  const availableActions = computed<AvailableAction[]>(() => {
    return gameState.value?.availableActions || []
  })

  // 是否是赢家
  const isWinner = computed(() => {
    if (!gameState.value?.winner || !roomPlayer.id) return false
    return gameState.value.winner === roomPlayer.id
  })

  // 牌墙剩余
  const wallRemaining = computed(() => gameState.value?.wallRemaining || 0)

  // 庄家ID
  const dealerId = computed(() => {
    if (!gameState.value) return null
    return gameState.value.playerOrder[gameState.value.dealerIndex]
  })

  // 最后打出的牌
  const lastDiscard = computed(() => gameState.value?.lastDiscard || null)

  // 最后打牌的玩家
  const lastDiscardPlayer = computed(() => gameState.value?.lastDiscardPlayer || null)

  // 工具方法
  const getPlayerName = (playerId: string) => {
    const player = roomPlayer.room.players.find((p: any) => p.id === playerId)
    return player?.name || '未知玩家'
  }

  const getPlayerStatus = (p: any) => {
    if (!p.isReady) return '未准备'
    if (gameStatus.value === 'waiting' || gameStatus.value === 'ended') return '已准备'
    
    if (gameState.value) {
      const currentPlayerId = gameState.value.playerOrder[gameState.value.currentPlayerIndex]
      if (currentPlayerId === p.id) return '出牌中'
    }
    return '等待中'
  }

  const isPlayerCurrentTurn = (playerId: string) => {
    if (!gameState.value) return false
    const currentPlayerId = gameState.value.playerOrder[gameState.value.currentPlayerIndex]
    return currentPlayerId === playerId
  }

  const isDealer = (playerId: string) => {
    return dealerId.value === playerId
  }

  const getPlayerData = (playerId: string) => {
    if (!gameState.value) return null
    return gameState.value.players[playerId] || null
  }

  // 选择牌
  const selectTile = (tile: MahjongTile) => {
    if (!canDiscard.value) return
    
    if (selectedTileId.value === tile.id) {
      // 双击出牌
      discardTile(tile.id)
    } else {
      selectedTileId.value = tile.id
    }
  }

  // 取消选择
  const clearSelection = () => {
    selectedTileId.value = null
  }

  // 出牌
  const discardTile = (tileId: string) => {
    if (!canDiscard.value) return
    
    game?.command(roomPlayer.room.id, {
      type: 'mahjong:discard',
      data: { tileId }
    })
    clearSelection()
  }

  // 出选中的牌
  const discardSelectedTile = () => {
    if (!selectedTileId.value) return
    discardTile(selectedTileId.value)
  }

  // 执行操作（吃碰杠胡）
  const doAction = (action: string, tiles?: MahjongTile[]) => {
    game?.command(roomPlayer.room.id, {
      type: 'mahjong:action',
      data: { action, tiles }
    })
  }

  // 放弃操作
  const passAction = () => {
    game?.command(roomPlayer.room.id, {
      type: 'mahjong:pass',
      data: {}
    })
  }

  // 踢人
  const kickPlayer = (playerId: string) => {
    game?.command(roomPlayer.room.id, {
      type: 'mahjong:kick',
      data: { playerId }
    })
  }

  // 是否是房主
  const isCreator = computed(() => roomPlayer.isCreator)

  // 获取点炮玩家
  const dianpaoPlayer = computed(() => gameState.value?.dianpaoPlayer|| null)

  // 获取胡牌的那张牌
  const winningTile = computed(() => gameState.value?.winningTile?.display || null)

  // 获取玩家座位位置（前4位是玩家）
  const getPlayerSeatIndex = (playerId: string) => {
    return seatOrder.value.indexOf(playerId)
  }

  // 是否是玩家位置（前4个座位）
  const isPlayerSeat = (playerId: string) => {
    const index = getPlayerSeatIndex(playerId)
    return index >= 0 && index < 4
  }

  // 显示通知
  const showError = (msg: string) => {
    notificationMessage.value = msg
    showNotification.value = true
    setTimeout(() => {
      showNotification.value = false
    }, 2000)
  }

  // 获取副露类型显示名称
  const getMeldTypeName = (type: MeldType): string => {
    switch (type) {
      case 'chi': return '吃'
      case 'peng': return '碰'
      case 'gang_ming': return '明杠'
      case 'gang_an': return '暗杠'
      case 'gang_bu': return '补杠'
      default: return ''
    }
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
        } else if (command.data.phase === 'action') {
          gameStatus.value = 'action'
        } else if (command.data.phase === 'playing') {
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

      case 'achievements':
        achievements.value = command.data
        break

      case 'seat_order':
        seatOrder.value = command.data
        break

      case 'status':
        if (command.data?.status) {
          if (command.data.status === 'ended') {
            gameStatus.value = 'ended'
          } else if (command.data.status === 'playing') {
            gameStatus.value = 'playing'
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

      case 'mahjong:error':
        showError(command.data.message)
        break

      case 'mahjong:invalid':
        showError(command.data.message)
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
    selectedTileId,
    showNotification,
    notificationMessage,
    seatOrder,

    // 计算属性
    myHand,
    myMelds,
    myDiscards,
    drawTile,
    otherPlayers,
    isCurrentPlayer,
    isPlayer,
    isPlaying,
    canDiscard,
    availableActions,
    isWinner,
    wallRemaining,
    dealerId,
    lastDiscard,
    lastDiscardPlayer,
    isCreator,
    dianpaoPlayer,
    winningTile,

    // 方法
    getPlayerName,
    getPlayerStatus,
    isPlayerCurrentTurn,
    isDealer,
    getPlayerData,
    selectTile,
    clearSelection,
    discardTile,
    discardSelectedTile,
    doAction,
    passAction,
    kickPlayer,
    getPlayerSeatIndex,
    isPlayerSeat,
    showError,
    getMeldTypeName,
    init,
  }
}
