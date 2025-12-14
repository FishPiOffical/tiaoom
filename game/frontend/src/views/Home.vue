<template>
  <div class="flex flex-col h-screen bg-base-100 text-base-content">
    <!-- 移动端顶部栏 -->
    <header class="md:hidden flex justify-between items-center p-4 border-b border-base-content/20 bg-base-200/50 flex-none">
      <div class="flex items-center gap-3 truncate">
        <button @click="isSidebarOpen = true" class="text-lg icon-btn">
          <Icon icon="mingcute:menu-fill" />
        </button>
        <div 
          v-if="gameStore.player?.avatar"
          class="w-[1.2em] h-[1.2em] rounded-full bg-base-200 border border-base-content/20 flex items-center justify-center text-xl font-bold relative"
        >
          <img
            :src="gameStore.player?.avatar" 
            alt="avatar" 
            class="w-full h-full object-cover rounded-full"
          />
        </div>
        <span class="font-medium truncate">{{ gameStore.player?.nickname }}</span>
      </div>
      <button 
        @click="handleLogout"
        :disabled="gameStore.playerStatus === 'playing'"
        class="icon-btn-hidden hidden md:inline-flex"
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
          flex-none border-r border-base-content/20 overflow-auto p-4 space-y-4 bg-base-200/95 backdrop-blur md:bg-base-200/50
          fixed inset-y-0 left-0 z-50 w-72 transition-all duration-300 ease-in-out
          md:relative md:translate-x-0 md:z-auto flex flex-col content-start
        "
        :class="[
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isDesktopSidebarCollapsed ? 'md:w-0 md:p-0 md:border-none md:overflow-hidden' : 'md:w-80'
        ]"
      >
        <div class="flex justify-between items-center pb-2 border-b border-base-content/20">
          <!-- PC端折叠按钮 -->
          <button @click="isDesktopSidebarCollapsed = true" class="icon-btn-hidden hidden md:flex">
            <Icon icon="ep:fold" />
          </button>
          <section class="inline-flex items-center gap-2">
            <span 
              v-if="gameStore.player?.avatar"
              class="w-[1.2em] h-[1.2em] rounded-full bg-base-200 border border-base-content/20 inline-flex items-center justify-center text-xl font-bold relative"
            >
              <img 
                v-if="gameStore.player?.avatar"
                :src="gameStore.player?.avatar" 
                alt="avatar" 
                class="w-full h-full object-cover rounded-full"
              />
            </span>
            <span class="font-medium">{{ gameStore.player?.nickname }}</span>
          </section>
          <div class="flex items-center gap-2">
            <ThemeController />
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

        <div class="border-b pb-5 border-base-content/20 shrink overflow-auto">
          <section class="flex justify-between mb-2">
            <h2 class="text-sm font-bold text-base-content/60 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Icon icon="fluent:chess-16-filled" size="1.5em"/>
              <span>在线房间 ({{ gameStore.rooms.length }})</span>
            </h2>
            <select v-model="gameType" class="text-xs select w-[10em]">
              <option value="">全部游戏</option>
              <option v-for="(game, key) in gameStore.games" :key="key" :value="key">
                {{ game.name }}
              </option>
            </select>
          </section>
          <ul class="space-y-2">
            <li v-for="r in roomList" :key="r.id" class="flex items-center justify-between p-2 rounded bg-base-300/50 hover:bg-base-300 transition-colors">
              <div class="flex items-center gap-2 overflow-hidden">
                <Icon icon="solar:lock-linear" v-if="r.attrs.passwd" />
                <span class="truncate text-sm" :class="{'font-bold text-base-content': r.players.some(p => p.id === gameStore.player?.id)}">
                  【{{ gameStore.games[r.attrs.type].name }}】{{ r.name }}
                </span>
                <span class="text-xs text-base-content/60 whitespace-nowrap">
                  ({{ r.players.filter(p => p.role === 'player').length }}/{{ r.size }})
                </span>
              </div>
              <button
                v-if="!gameStore.roomPlayer"
                @click="joinRoom(r)"
                class="px-2 py-1 btn-xs whitespace-nowrap btn"
              >
                {{ r.status === 'waiting' && r.players.filter(p => p.role === 'player').length < r.size ? '进入' : '围观' }}
              </button>
            </li>
          </ul>
          <span v-if="roomList.length === 0" class="text-sm text-base-content/60">暂无房间</span>
        </div>
        
        <div class="shrink overflow-auto">
          <h2 class="text-sm font-bold text-base-content/60 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Icon icon="fluent:people-16-filled" size="1.5em"/>
            <span>在线玩家 ({{ gameStore.players.length }})</span>
          </h2>
          <ul class="space-y-1">
            <li v-for="p in gameStore.players" :key="p.id" class="text-sm text-base-content/80">
              - {{ p.name }}
            </li>
          </ul>
        </div>
        <footer class="text-base-content/50 mt-auto text-center font-serif text-sm">
          <p>
            Power By <a href="https://tiaoom.com" target="_blank" rel="noopener noreferrer">Tiaoom</a>
            &copy; {{ new Date().getFullYear() }}
          </p>
        </footer>
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
      <main class="flex-1 p-4 md:p-6 overflow-auto bg-base-100 w-full">
        <!-- 创建房间 -->
        <form v-if="!gameStore.roomPlayer" @submit.prevent="createRoom" class="space-y-4 max-w-2xl mx-auto">
          <h3 class="text-xl font-light text-base-content">创建房间</h3>
          <div class="flex flex-wrap items-center gap-2">
            <input 
              v-model.trim="room.name" 
              type="text" 
              placeholder="房间名称" 
              required 
              class="flex-1 w-[200px] input"
            />
            <select v-model="room.attrs.type" @change="onTypeChange" class="w-[120px] select">
              <option v-for="(game, key) in gameStore.games" :key="key" :value="key">
                {{ game.name }}
              </option>
            </select>
            <select 
              v-if="currentGame && currentGame.minSize !== currentGame.maxSize" 
              v-model="room.size"
              @change="room.minSize = Math.min(room.minSize, room.size)"
              class="w-24 select"
              title="最大可容纳玩家"
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
              class="w-24 input"
            />
            <label class="input w-[150px]">
              <input
                v-model="room.attrs.passwd"
                :type="showPasswd ? 'text' : 'password'" 
                placeholder="房间密码 (可选)" 
                class="grow"
                autocomplete="new-password"
              />
              <Icon class="cursor-pointer" :icon="showPasswd ? 'carbon:view' : 'carbon:view-off'" @click="showPasswd = !showPasswd" />
            </label>
            <button type="submit" :disabled="!!gameStore.roomPlayer" class="btn btn-primary whitespace-nowrap">
              创建
            </button>
          </div>
          <p class="text-sm text-base-content/60">{{ currentGame?.description }}</p>
        </form>
        
        <!-- 全局聊天 -->
        <section v-if="!gameStore.roomPlayer" class="mt-8 space-y-4 max-w-2xl mx-auto flex flex-col">
          <div class="border-t border-base-content/20 pt-4"></div>
          <div class="join w-full">
            <input 
              v-model="msg" 
              type="text"
              @keyup.enter="sendMessage" 
              placeholder="随便聊聊" 
              class="flex-1 input join-item"
            />
            <button class="btn btn-secondary join-item" @click="sendMessage">发送</button>
          </div>
          <section class="bg-base-300/30 p-3 rounded min-h-64 overflow-auto border border-base-content/10 relative group">
            <button class="btn btn-text tooltip tooltip-left absolute top-0 right-2 group-hover:inline hidden" data-tip="弹出" @click="openSmallWindow('/#/lite/chat')">
              <Icon icon="mdi:open-in-new" />
            </button>
            <div ref="messageListRef" class="flex-1 overflow-y-auto p-3 space-y-1 scroll-smooth">
              <div v-if="gameStore.globalMessages.length === 0" class="text-center text-base-content/30 text-sm py-4">
                暂无消息
              </div>
              <div 
                v-for="(m, i) in gameStore.globalMessages" 
                :key="i" 
                class="text-sm wrap-break-word flex flex-col" 
                :class="{ 
                  'items-end': m.sender?.id === gameStore.player?.id,
                  'items-start': m.sender?.id !== gameStore.player?.id
                }"
              >
                <div v-if="m.sender" class="text-[10px] opacity-50 mb-0.5 px-1 flex gap-1">
                    <span>{{ m.sender.name }}</span>
                </div>
                <div 
                    class="px-3 py-1.5 rounded-2xl max-w-[85%]"
                    :class="{
                        'bg-primary text-primary-content rounded-tr-none': m.sender?.id === gameStore.player?.id,
                        'bg-base-300 text-base-content rounded-tl-none': m.sender?.id !== gameStore.player?.id && m.sender,
                        'bg-base-300/50 text-base-content/70 w-full text-center max-w-full! rounded text-xs py-1': !m.sender
                    }"
                >
                    {{ m.data }}
                </div>
                <time class="text-base-content/30 text-xs my-0.5">{{ new Date(m.createdAt).toLocaleString() }}</time>
              </div>
            </div>
          </section>
        </section>
        
        <!-- 房间内容 -->
        <section v-if="gameStore.roomPlayer" class="space-y-4 h-full flex flex-col">
          <header class="border-b border-base-content/20 flex justify-between">
            <h3 class="text-xl font-light text-base-content pb-2">
              我的房间: {{ gameStore.roomPlayer.room.name }} 
              <span class="text-sm text-base-content/60 ml-2">
                ({{ gameStore.roomPlayer.room.players.filter(p => p.role === 'player').length }}/{{ gameStore.roomPlayer.room.size }})
              </span>
            </h3>
            <span>
              <button v-if="hasLiteComponent" class="btn btn-text hidden md:inline tooltip tooltip-left" data-tip="弹出" @click="openSmallWindow('/#/lite')"><Icon icon="majesticons:open-line" /></button>
              {{ getComponent(gameStore.roomPlayer.room.attrs.type + '-lite') }}
            </span>
          </header>
          
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
import { IRoomOptions } from 'tiaoom/client'
import { openSmallWindow } from '@/utils/dom'
import { getComponent } from '@/main';
import { error } from '@/components/msg';

const router = useRouter()
const gameStore = useGameStore()

const isSidebarOpen = ref(false)
const isDesktopSidebarCollapsed = ref(false)

const showPasswd = ref(false);
const room = ref({
  name: '',
  size: 4,
  minSize: 4,
  attrs: { type: 'othello', passwd: '' },
})

const msg = ref('')

const currentGame = computed(() => {
  return gameStore.games[room.value.attrs.type]
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
    error('请填写房间名称')
    return
  }
  if (gameStore.rooms.some(r => r.name === room.value.name)) {
    error('房间名称已存在，请更换一个')
    return
  }
  room.value.minSize = Math.min(room.value.minSize, currentGame.value.minSize);
  room.value.size = Math.min(room.value.size, currentGame.value.maxSize);
  room.value.size = Math.max(room.value.size, room.value.minSize);
  await gameStore.game?.createRoom(room.value)
}

function joinRoom(r: IRoomOptions) {
  let passwd: string | undefined;
  if (r.attrs?.passwd) {
    passwd = prompt('请输入房间密码：') || '';
    if (!passwd) return
  }
  gameStore.game?.joinRoom(r.id, { passwd }); 
  isSidebarOpen.value = false
}

function sendMessage() {
  if (!msg.value.trim()) return
  gameStore.game?.command({ type: 'say', data: msg.value })
  msg.value = ''
}

async function handleLogout() {
  if (!confirm('确定要退出登录吗？')) return
  await gameStore.logout()
  router.push('/login')
}

const gameType = ref('');
const roomList = computed(() => {
  if (!gameType.value) return gameStore.rooms;
  return gameStore.rooms.filter(r => r.attrs.type === gameType.value);
});

onMounted(() => {
  gameStore.initGame()
})

const hasLiteComponent = (type: string) => {
  try {
    getComponent(type.slice(0, 1).toUpperCase() + type.slice(1) + 'Lite')
    return true
  } catch {
    return false
  }
}
</script>
