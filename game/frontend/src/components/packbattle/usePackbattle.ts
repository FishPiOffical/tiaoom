import { ref } from 'vue'
import { Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game'
import { useGameEvents } from '@/hook/useGameEvents'
import { confirm } from '@/components/msgbox'

export type Phase = 'pick' | 'swap' | 'end'
export type Capsule = 'left' | 'right'

export function usePackbattle(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  const gameStatus = ref<'waiting' | 'playing'>('waiting')
  const phase = ref<Phase>('pick')
  const active = ref<any>()
  const passive = ref<any>()
  const given = ref<Capsule | null>(null)
  const swapped = ref<boolean | null>(null)
  const countdown = ref<number>(0)
  let countdownTimer: any = null
  const poisonHint = ref<Capsule | null>(null)

  const result = ref<{ poison: Capsule; given: Capsule | null; swapped: boolean | null; winner?: any; loser?: any } | null>(null)

  function onRoomStart() {
    gameStatus.value = 'playing'
    result.value = null
    poisonHint.value = null
    if (countdownTimer) clearInterval(countdownTimer)
    countdown.value = 0
  }

  function onRoomEnd() {
    gameStatus.value = 'waiting'
    if (countdownTimer) clearInterval(countdownTimer)
    countdown.value = 0
  }

  function onCommand(cmd: any) {
    if (roomPlayer.room.attrs?.type !== 'packbattle') return

    switch (cmd.type) {
      case 'status':
        gameStatus.value = cmd.data.status
        phase.value = cmd.data.phase
        active.value = cmd.data.active
        passive.value = cmd.data.passive
        given.value = cmd.data.given
        swapped.value = cmd.data.swapped
        if (typeof cmd.data.countdown === 'number') {
          countdown.value = cmd.data.countdown
          if (countdownTimer) clearInterval(countdownTimer)
          countdownTimer = setInterval(() => {
            countdown.value--
            if (countdown.value <= 0) {
              countdown.value = 0
              clearInterval(countdownTimer)
            }
          }, 1000)
        }
        break
      case 'poison':
        poisonHint.value = cmd.data.capsule
        break
      case 'give-turn':
        phase.value = 'pick'
        active.value = cmd.data.player
        break
      case 'swap-turn':
        phase.value = 'swap'
        passive.value = cmd.data.player
        break
      case 'countdown':
        countdown.value = cmd.data.seconds
        if (countdownTimer) clearInterval(countdownTimer)
        countdownTimer = setInterval(() => {
          countdown.value--
          if (countdown.value <= 0) {
            countdown.value = 0
            clearInterval(countdownTimer)
          }
        }, 1000)
        break
      case 'result':
        result.value = cmd.data
        phase.value = 'end'
        gameStatus.value = 'waiting'
        if (countdownTimer) clearInterval(countdownTimer)
        countdown.value = 0
        break
      case 'achivements':
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

  function give(capsule: Capsule) {
    if (gameStatus.value !== 'playing') return
    if (phase.value !== 'pick') return
    if (active.value?.id !== roomPlayer.id) return
    game?.command(roomPlayer.room.id, { type: 'give', data: { capsule } })
  }

  function decideSwap(swap: boolean) {
    if (gameStatus.value !== 'playing') return
    if (phase.value !== 'swap') return
    if (passive.value?.id !== roomPlayer.id) return
    game?.command(roomPlayer.room.id, { type: 'swap', data: { swap } })
  }

  return {
    gameStatus,
    phase,
    active,
    passive,
    given,
    swapped,
    countdown,
    poisonHint,
    result,
    give,
    decideSwap,
  }
}
