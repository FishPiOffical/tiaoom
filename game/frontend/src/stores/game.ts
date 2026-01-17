import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameConfig } from '@/types'
import { Player, Room } from 'tiaoom/client'
import { GameCore } from '@/core/game'
import { api, IManageData, User } from '@/api'
import msg from '@/components/msg';
import router from '@/router'
import { store } from '.'

export const useGameStore = defineStore('game', () => {
  const game = ref<GameCore | null>(null)
  const player = ref<User | null>(null)
  const players = ref<Player[]>([])
  const rooms = ref<Room[]>([])
  const games = ref<Record<string, GameConfig>>({})
  const thirdParty = ref<string[]>([])
  const globalMessages = ref<{ data: string, sender?: Player, createdAt: number }[]>([])
  const globalBoardcastMessage = ref<string>('');
  const gameManages = ref<IManageData[]>([]);
  const isConfigured = ref<boolean>(false);
  const showLoginModal = ref(false);

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
      isConfigured.value = await api.isConfigured();
      const { game: gameData, thirdParty: thirdPartyList } = await api.getConfig();
      games.value = gameData;
      thirdParty.value = thirdPartyList;
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  async function checkSession() {
    try {
      // If we already have a regular user, return true
      if (player.value && !player.value.isVisitor) {
        initGame(); // Ensure game is initialized
        return true;
      }
      
      const user = await api.getUserInfo()
      if (user) {
        player.value = user
        initGame() // Use initGame instead of connect
      }
      return true
    } catch (error) {
      if (!player.value) {
        // Visitor Mode
        await loginVisitor()
      }
      return false
    }
  }

  async function loadMessages() {
    try {
      const res = await api.getMessages()
      globalMessages.value = res.messages
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  api.getManages().then(manages => {
    gameManages.value = manages;
  });

  loadMessages();

  function initGame(): GameCore{
    if (game.value) return game.value as GameCore;

    game.value = new GameCore('/ws')
    
    return game.value.run()
      .on('global.error', (err) => {
        if (err.message) msg.error(err.message)
      })
      .on('player.error', (err) => {
        if (err.message) msg.error(err.message)
      })
      .on('room.join', (roomPlayer) => {
        if (roomPlayer.id === player.value?.id) {
          game.value?.init(roomPlayer.roomId, player.value!.player)
        }
      })
      .onReady(() => {
        if (player.value) {
          game.value!.login(player.value.player)
        }
      })
      .onPlayerStatus((data) => {
        const p = players.value.find(p => p.id === player.value?.id)
        if (p) {
          p.status = data
        }
      })
      .onPlayerList(data => {
        console.log('Player List:', data)
        players.value = [...data]
        
        // 初始化游戏状态
        if (roomPlayer.value) {
          game.value!.init(roomPlayer.value.room.id, player.value!.player)
        }
      })
      .onRoomList(data => {
        console.log('Room List:', data)
        rooms.value = [...data]
      })
      .onRoomCreate((room) => {
        if (room.players.find(p => p.id === player.value?.id))
          router.push('/r/' + room.id)
      })
      .onPlayerReady(onPlayerReady)
      .onPlayerUnready(onPlayerReady)
      .onMessage(({ content, sender }) => {
        globalMessages.value.push({ data: content, sender, createdAt: Date.now() })
      }).on('global.command', (command) => {
        if (command.type === 'boardcast' && command.data) {
          globalBoardcastMessage.value = command.data;
        }
      });
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
      if (game.value) {
        // Re-login with new player info
        game.value.login(player.value.player)
      } else {
        initGame()
      }
      return true
    } catch (error) {
      throw error
    }
  }

  async function loginVisitor() {
    const user = await api.loginVisitor();
    player.value = user;
    if (game.value) {
      game.value.login(user.player)
    } else {
      initGame()
    }
    return true;
  }

  function updateVisitorName(name: string) {
    if (player.value && player.value.isVisitor) {
      const newName = name.replace(/\s*\(游客\)$/, '');
      api.updateVisitorName(newName).then(() => {
        msg.success('昵称更新成功');
        setTimeout(() => {
          location.reload();
        }, 1000);
      }).catch((err) => {
        msg.error(err.message || '昵称更新失败');
      });
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
    globalBoardcastMessage,
    roomPlayer,
    playerStatus,
    gameManages,
    isConfigured,
    thirdParty,
    initConfig,
    checkSession,
    initGame,
    login,
    logout,
    updateVisitorName,
    showLoginModal
  }
})

export function useGameStoreWithOut() {
  return useGameStore(store);
}