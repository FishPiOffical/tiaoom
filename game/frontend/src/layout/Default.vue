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
        <span class="font-medium truncate cursor-pointer" @click="router.push('/')">{{ gameStore.player?.nickname }}</span>
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
          <section class="inline-flex items-center gap-2 cursor-pointer" @click="router.push('/')">
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
            <router-link 
              v-if="gameStore.player?.isAdmin"
              to="/admin"
              class="icon-btn"
              title="房间管理"
            >
              <Icon icon="mingcute:settings-3-line" />
            </router-link>
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
      <router-view />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { IRoomOptions } from 'tiaoom/client'

const router = useRouter()
const gameStore = useGameStore()

const isSidebarOpen = ref(false)
const isDesktopSidebarCollapsed = ref(false)

function joinRoom(r: IRoomOptions) {
  let passwd: string | undefined;
  if (r.attrs?.passwd) {
    passwd = prompt('请输入房间密码：') || '';
    if (!passwd) return
  }
  gameStore.game?.joinRoom(r.id, { passwd }); 
  isSidebarOpen.value = false
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
</script>
