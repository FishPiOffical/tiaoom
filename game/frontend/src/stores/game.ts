import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameConfig } from '@/types'
import { Player, Room } from 'tiaoom/client'
import { GameCore } from '@/core/game'
import { api, IUser } from '@/api'

export const useGameStore = defineStore('game', () => {
  const game = ref<GameCore | null>(null)
  const player = ref<IUser | null>(null)
  const players = ref<Player[]>([])
  const rooms = ref<Room[]>([])
  const games = ref<Record<string, GameConfig>>({})
  const globalMessages = ref<string[]>([])

  const roomPlayer = computed(() => {
    if (!player.value) return null
    for (const room of rooms.value) {
      const rp = room.players.find(p => p.id === player.value!.id)
      if (rp) return { ...rp, room }
    }
    return null
  })

  const playerStatus = computed(() => {
    return roomPlayer.value?.status || 
           players.value.find(p => p.id === player.value?.id)?.status || 
           'offline'
  })

  async function initConfig() {
    try {
      games.value = await api.getConfig();
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  async function checkSession() {
    try {
      const session = await api.getSession()
      player.value = session.player
      return true
    } catch (error) {
      return false
    }
  }

  function initGame() {
    if (game.value) return

    game.value = new GameCore('/ws')
    
    game.value.run()
      .on('global.error', (err) => {
        alert(err.message)
      })
      .onReady(() => {
        if (player.value) {
          game.value!.login(new Player({ ...player.value, attributes: { avatar: player.value.avatar } }))
        }
      })
      .onPlayerStatus((data) => {
        const p = players.value.find(p => p.id === data.id)
        if (p) {
          p.status = data.status
        }
      })
      .onPlayerList(data => {
        console.log('Player List:', data)
        players.value = [...data]
        
        // 初始化游戏状态
        if (roomPlayer.value) {
          game.value!.init(roomPlayer.value.room.id, player.value!)
        }
      })
      .onRoomList(data => {
        console.log('Room List:', data)
        rooms.value = [...data]
      })
      .onPlayerReady(onPlayerReady)
      .onPlayerUnready(onPlayerReady)

    game.value.on('global.command', (cmd) => {
      if (cmd.type === 'say') {
        globalMessages.value.push(`[${cmd.sender.name}]: ${cmd.data}`)
      }
    })
  }

  function onPlayerReady(data: any) {
    const roomId = data.roomId
    const room = rooms.value.find(r => r.id === roomId)
    if (room) {
      const p = room.players.find(p => p.id === data.id)
      if (p) {
        p.isReady = data.isReady
      }
    }
  }

  async function login(name: string) {
    try {
      player.value = await api.login(name)
      return true
    } catch (error) {
      throw error
    }
  }

  async function logout() {
    try {
      await api.logout()
      player.value = null
      if (game.value) {
        game.value.close()
        game.value = null
      }
      return true
    } catch (error) {
      throw error
    }
  }

  return {
    game,
    player,
    players,
    rooms,
    games,
    globalMessages,
    roomPlayer,
    playerStatus,
    initConfig,
    checkSession,
    initGame,
    login,
    logout,
  }
})
