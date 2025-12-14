import { ref, computed } from 'vue'
import { Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game';
import { useGameEvents } from '@/hook/useGameEvents';

export type SpyRoomPlayer = RoomPlayer & { isDead?: boolean }

export interface SpyRoom extends Room {
  players: SpyRoomPlayer[]
}

export function useSpy(game: GameCore, roomPlayer: SpyRoomPlayer & { room: SpyRoom }) {
  const canVotePlayer = ref<string[]>([])
  const currentTalkPlayer = ref<any>(null)
  const voted = ref(false)
  const gameStatus = ref<'waiting' | 'talking' | 'voting'>('waiting')
  const word = ref('')
  const currentPlayer = computed(() => roomPlayer.id)
  const countdown = ref(0)
  let countdownTimer: any = null

  const voting = computed(() => gameStatus.value === 'voting')

  const canSpeak = computed(() => {
    return (gameStatus.value === 'talking' && currentTalkPlayer.value?.id === currentPlayer.value) || 
           gameStatus.value === 'waiting'
  })

  function onRoomStart() {
    gameStatus.value = 'talking'
    currentTalkPlayer.value = null
  }
  function onRoomEnd() {
    gameStatus.value = 'waiting'
    currentTalkPlayer.value = null
  }

  function onCommand(cmd: any) {
    if (roomPlayer.room.attrs?.type !== 'spy') return
    
    switch (cmd.type) {
      case 'talk':
        currentTalkPlayer.value = cmd.data.player
        gameStatus.value = 'talking'
        if (countdownTimer) clearInterval(countdownTimer)
        countdown.value = 0
        if (currentTalkPlayer.value?.id === currentPlayer.value) {
          // 如果是自己发言，开始倒计时
          countdown.value = 300
          countdownTimer = setInterval(() => {
            countdown.value--
            if (countdown.value <= 0) {
              clearInterval(countdownTimer)
            }
          }, 1000)
        }
        break;
      case 'talk-countdown':
        countdown.value = cmd.data.seconds
        if (countdownTimer) clearInterval(countdownTimer)
        countdownTimer = setInterval(() => {
          countdown.value--
          if (countdown.value <= 0) {
            clearInterval(countdownTimer)
          }
        }, 1000)
        break
      case 'vote':
        gameStatus.value = 'voting'
        voted.value = false
        if (countdownTimer) clearInterval(countdownTimer)
        countdown.value = 0
        if (cmd.data) {
          canVotePlayer.value = cmd.data.map((p: any) => p.id)
        } else {
          canVotePlayer.value = roomPlayer.room.players
            .filter((p: any) => !p.isDead)
            .map((p: any) => p.id)
        }
        break
      case 'word':
        word.value = cmd.data.word
        break
      case 'status':
        gameStatus.value = cmd.data.status
        word.value = cmd.data.word
        currentTalkPlayer.value = cmd.data.talk
        voted.value = cmd.data.voted
        canVotePlayer.value = cmd.data.canVotePlayers.map((p: any) => p.id)
        if (cmd.data.deadPlayers) {
          for (const dp of cmd.data.deadPlayers) {
            const p: SpyRoomPlayer | undefined = roomPlayer.room.players.find((p: any) => p.id === dp.id)
            if (p) p.isDead = true
          }
        }
        if (cmd.data.countdown) {
          countdown.value = cmd.data.countdown
          if (countdownTimer) clearInterval(countdownTimer)
          countdownTimer = setInterval(() => {
            countdown.value--
            if (countdown.value <= 0) {
              clearInterval(countdownTimer)
            }
          }, 1000)
        }
        break
      case 'voted':
        voted.value = true
        break
      case 'dead':
        if (cmd.data.player.id === currentPlayer.value && !roomPlayer.isDead ) {
          alert('你已出局')
          roomPlayer.isDead = true
        }
        const deadPlayer: SpyRoomPlayer | undefined = roomPlayer.room.players.find((p: any) => p.id === cmd.data.player.id)
        if (deadPlayer) deadPlayer.isDead = true
        break
    }
  }

  useGameEvents(game, {
    'room.start': onRoomStart,
    'room.end': onRoomEnd,
    'player.command': onCommand,
    'room.command': onCommand,
  })

  function sendTalked() {
    game?.command(roomPlayer.room.id, { type: 'talked' })
    if (countdownTimer) clearInterval(countdownTimer)
    countdown.value = 0
  }

  function votePlayer(playerId: string) {
    if (voted.value) return
    game?.command(roomPlayer.room.id, { type: 'voted', data: { id: playerId } })
  }

  function kickPlayer(playerId: string) {
    if (!confirm('确定要踢出该玩家吗？')) return
    game?.kickPlayer(roomPlayer.room.id, playerId)
  }

  function transferOwner(playerId: string) {
    if (!confirm('确定要转让房主给该玩家吗？')) return
    game?.transferRoom(roomPlayer.room.id, playerId)
  }

  return {
    canVotePlayer,
    currentTalkPlayer,
    voted,
    gameStatus,
    word,
    currentPlayer,
    countdown,
    voting,
    canSpeak,
    sendTalked,
    votePlayer,
    kickPlayer,
    transferOwner
  }
}
