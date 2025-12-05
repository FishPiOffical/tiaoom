<template>
  <div class="flex flex-col h-screen bg-background text-primary">
    <!-- 移动端顶部栏 -->
    <header class="md:hidden flex justify-between items-center p-4 border-b border-border bg-surface/50 flex-none">
      <div class="flex items-center gap-3 truncate">
        <button @click="isSidebarOpen = true" class="text-lg icon-btn">
          <Icon icon="mingcute:menu-fill" />
        </button>
        <span class="font-medium truncate">欢迎回来~ {{ gameStore.player?.name }}</span>
      </div>
      <button 
        @click="handleLogout"
        :disabled="gameStore.playerStatus === 'playing'"
        class="icon-btn"
      >
        <Icon icon="mingcute:exit-line" />
      </button>
    </header>

    <section class="flex flex-row flex-1 h-full overflow-hidden relative">
      <!-- 移动端遮罩 -->
      <div 
        v-if="isSidebarOpen" 
        class="fixed inset-0 bg-black/50 z-40 md:hidden"
        @click="isSidebarOpen = false"
      ></div>

      <!-- 侧边栏 -->
      <aside 
        class="
          flex-none border-r border-border overflow-auto p-4 space-y-4 bg-surface/95 backdrop-blur md:bg-surface/50
          fixed inset-y-0 left-0 z-50 w-72 transition-all duration-300 ease-in-out
          md:relative md:translate-x-0 md:z-auto flex flex-col content-start
        "
        :class="[
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isDesktopSidebarCollapsed ? 'md:w-0 md:p-0 md:border-none md:overflow-hidden' : 'md:w-80'
        ]"
      >
        <div class="flex justify-between items-center pb-2 border-b border-border">
          <!-- PC端折叠按钮 -->
          <button @click="isDesktopSidebarCollapsed = true" class="icon-btn hidden md:flex">
            <Icon icon="ep:fold" />
          </button>
          <span class="font-medium">欢迎回来~ {{ gameStore.player?.name }}</span>
          <div class="flex items-center gap-2">
            <button 
              @click="handleLogout"
              :disabled="gameStore.playerStatus === 'playing'"
              :title="gameStore.playerStatus === 'playing' ? '游戏中不可退出账号' : ''"
              class="icon-btn"
            >
              <Icon icon="mingcute:exit-line" />
            </button>
          </div>
        </div>

        <div class="border-b pb-5 border-border flex-shrink-1 overflow-auto">
          <section class="flex justify-between mb-2">
            <h2 class="text-sm font-bold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1">
              <Icon icon="fluent:chess-16-filled" size="1.5em"/>
              <span>在线房间</span>
            </h2>
            <select v-model="gameType" class="text-xs">
              <option value="">全部游戏</option>
              <option v-for="(game, key) in gameStore.games" :key="key" :value="key">
                {{ game.name }}
              </option>
            </select>
          </section>
          <ul class="space-y-2">
            <li v-for="r in roomList" :key="r.id" class="flex items-center justify-between p-2 rounded bg-surface-light/50 hover:bg-surface-light transition-colors">
              <div class="flex items-center gap-2 overflow-hidden">
                <span class="truncate text-sm" :class="{'font-bold text-white': r.players.some(p => p.id === gameStore.player?.id)}">
                  【{{ gameStore.games[r.attrs.type].name }}】{{ r.name }}
                </span>
                <span class="text-xs text-secondary whitespace-nowrap">
                  ({{ r.players.filter(p => p.role === 'player').length }}/{{ r.size }})
                </span>
              </div>
              <button 
                v-if="!gameStore.roomPlayer"
                @click="gameStore.game?.joinRoom(r.id); isSidebarOpen = false"
                class="px-2 py-1 text-xs whitespace-nowrap"
              >
                {{ r.status === 'waiting' && r.players.length < r.size ? '进入' : '围观' }}
              </button>
            </li>
          </ul>
          <span v-if="gameStore.rooms.length === 0" class="text-sm text-secondary">暂无房间</span>
        </div>
        
        <div class="flex-shrink-1 overflow-auto">
          <h2 class="text-sm font-bold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1">
            <Icon icon="fluent:people-16-filled" size="1.5em"/>
            <span>在线玩家</span>
          </h2>
          <ul class="space-y-1">
            <li v-for="p in gameStore.players" :key="p.id" class="text-sm text-primary/80">
              - {{ p.name }}
            </li>
          </ul>
        </div>
      </aside>
      
      <!-- PC端展开按钮 -->
      <div v-if="isDesktopSidebarCollapsed" class="hidden md:flex flex-col justify-start p-4">
        <button 
          @click="isDesktopSidebarCollapsed = false" 
          class="icon-btn"
          title="展开侧边栏"
        >
          <Icon icon="ep:expand" />
        </button>
      </div>

      <!-- 主内容区 -->
      <main class="flex-1 p-4 md:p-6 overflow-auto bg-background w-full">
        <!-- 创建房间 -->
        <form v-if="!gameStore.roomPlayer" @submit.prevent="createRoom" class="space-y-4 max-w-2xl mx-auto">
          <h3 class="text-xl font-light text-white">创建房间</h3>
          <div class="flex flex-wrap items-center gap-2">
            <input 
              v-model="room.name" 
              type="text" 
              placeholder="房间名称" 
              required 
              class="flex-1 min-w-[200px]"
            />
            <select v-model="room.attrs.type" @change="onTypeChange" class="min-w-[120px]">
              <option v-for="(game, key) in gameStore.games" :key="key" :value="key">
                {{ game.name }}
              </option>
            </select>
            <select 
              v-if="currentGame && currentGame.minSize !== currentGame.maxSize" 
              v-model="room.size"
              @change="room.minSize = Math.min(room.minSize, room.size)"
              class="w-24"
            >
              <option 
                v-for="i in (currentGame.maxSize - currentGame.minSize + 1)" 
                :key="i"
                :value="i + currentGame.minSize - 1"
              >
                {{ i + currentGame.minSize - 1 }} 玩家
              </option>
            </select>
            <input 
              v-if="currentGame && currentGame.minSize !== currentGame.maxSize"
              v-model.number="room.minSize"
              type="number" 
              title="最小开始人数" 
              placeholder="最小人数" 
              :min="currentGame.minSize" 
              :max="room.size" 
              class="w-24"
            />
            <button type="submit" :disabled="!!gameStore.roomPlayer" class="whitespace-nowrap">
              创建
            </button>
          </div>
          <p class="text-sm text-secondary">{{ currentGame?.description }}</p>
        </form>
        
        <!-- 全局聊天 -->
        <section v-if="!gameStore.roomPlayer" class="mt-8 space-y-4 max-w-2xl mx-auto">
          <div class="border-t border-border pt-4"></div>
          <div class="flex items-center gap-2">
            <input 
              v-model="msg" 
              type="text"
              @keyup.enter="sendMessage" 
              placeholder="随便聊聊" 
              class="flex-1"
            />
            <button @click="sendMessage">发送</button>
          </div>
          <section class="bg-surface-light/30 p-3 rounded h-64 overflow-auto border border-border/50">
            <p v-for="(m, i) in gameStore.globalMessages" :key="i" class="text-sm text-primary/90">{{ m }}</p>
          </section>
        </section>
        
        <!-- 房间内容 -->
        <section v-if="gameStore.roomPlayer" class="space-y-4 h-full flex flex-col">
          <h3 class="text-xl font-light text-white border-b border-border pb-2">
            我的房间: {{ gameStore.roomPlayer.room.name }} 
            <span class="text-sm text-secondary ml-2">
              ({{ gameStore.roomPlayer.room.players.filter(p => p.role === 'player').length }}/{{ gameStore.roomPlayer.room.size }})
            </span>
          </h3>
          
          <!-- 动态游戏组件 -->
          <div class="flex-1 overflow-auto">
            <component 
              v-if="gameStore.roomPlayer.room.attrs?.type" 
              :is="gameStore.roomPlayer.room.attrs.type + '-room'" 
              :game="gameStore.game" 
              :room-player="gameStore.roomPlayer"
            />
          </div>
        </section>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'

const router = useRouter()
const gameStore = useGameStore()

const isSidebarOpen = ref(false)
const isDesktopSidebarCollapsed = ref(false)

const room = ref({
  name: '',
  size: 4,
  minSize: 4,
  attrs: { type: 'othello' },
})

const msg = ref('')

const currentGame = computed(() => {
  return gameStore.games[room.value.attrs.type]
})

onMounted(() => {
  gameStore.initGame()
})

function onTypeChange() {
  const game = gameStore.games[room.value.attrs.type]
  if (room.value.size < game.minSize) {
    room.value.size = game.minSize
  }
  if (room.value.size > game.maxSize) {
    room.value.size = game.maxSize
  }
  if (room.value.minSize < game.minSize) {
    room.value.minSize = game.minSize
  }
}

async function createRoom() {
  if (!room.value.name) {
    alert('请填写房间名称')
    return
  }
  if (gameStore.rooms.some(r => r.name === room.value.name)) {
    alert('房间名称已存在，请更换一个')
    return
  }
  room.value.minSize = Math.min(room.value.minSize, currentGame.value.minSize);
  room.value.size = Math.min(room.value.size, currentGame.value.maxSize);
  room.value.size = Math.max(room.value.size, room.value.minSize);
  await gameStore.game?.createRoom(room.value)
}

function sendMessage() {
  if (!msg.value.trim()) return
  gameStore.game?.command({ type: 'say', data: msg.value })
  msg.value = ''
}

async function handleLogout() {
  await gameStore.logout()
  router.push('/login')
}

const gameType = ref('');
const roomList = computed(() => {
  if (!gameType.value) return gameStore.rooms;
  return gameStore.rooms.filter(r => r.attrs.type === gameType.value);
});
</script>
