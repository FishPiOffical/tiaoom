<template>
  <div class="flex flex-col h-screen w-full bg-base-100 text-base-content">
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
      <div class="flex items-center gap-2">
        <div class="indicator">
          <span v-if="unreadMessages.length" class="indicator-item status status-error"></span>
          <button @click="handleMenuClick" class="icon-btn" title="聊天">
            <Icon icon="carbon:chat" />
          </button>
        </div>
        
        <button 
          @click="handleLogout"
          :disabled="gameStore.playerStatus === 'playing'"
          class="icon-btn-hidden hidden md:inline-flex"
        >
          <Icon icon="mingcute:exit-line" />
        </button>
      </div>
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
          flex-none border-r border-base-content/20 overflow-auto pt-4 bg-base-200/95 backdrop-blur md:bg-base-200/50
          fixed inset-y-0 left-0 z-50 w-72 transition-all duration-300 ease-in-out
          md:relative md:translate-x-0 md:z-auto flex flex-col content-start
        "
        :class="[
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isDesktopSidebarCollapsed ? 'md:w-0 md:p-0 md:border-none md:overflow-hidden' : 'md:w-80'
        ]"
      >
        <div class="flex justify-between items-center pb-2 border-b border-base-content/20 px-4">
          <!-- PC端折叠按钮 -->
          <button @click="isDesktopSidebarCollapsed = true" class="icon-btn-hidden hidden md:flex">
            <Icon icon="ep:fold" />
          </button>
          <section class="inline-flex items-center gap-2">
            <div 
              class="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80" 
              @click="router.push('/')"
            >
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
              <span class="font-medium truncate max-w-[8em]">{{ gameStore.player?.nickname }}</span>
            </div>
          </section>
          <ThemeController />
          <div class="flex items-center gap-2">
            <router-link 
              to="/leaderboard"
              class="icon-btn tooltip tooltip-bottom"
              data-tip="排行榜"
            >
              <Icon icon="mdi:trophy-outline" />
            </router-link>
            <router-link 
              v-if="gameStore.player?.isAdmin || gameManages.filter(g => g.canManage).length > 0"
              to="/admin"
              class="icon-btn tooltip tooltip-bottom"
              data-tip="房间管理"
            >
              <Icon icon="mingcute:settings-3-line" />
            </router-link>
            
            <template v-if="gameStore.player?.isVisitor">
              <button
                 class="icon-btn tooltip tooltip-bottom"
                 data-tip="设置名字"
                 @click="showEditName = true; newVisitorName = gameStore.player?.nickname?.replace(' (游客)', '') || ''"
              >
                <Icon icon="mingcute:edit-line" />
              </button>
              <button
                 class="icon-btn tooltip tooltip-bottom"
                 @click="gameStore.showLoginModal = true"
                 data-tip="登录"
              >
                <Icon icon="akar-icons:game-controller" />
              </button>
            </template>
            <button
              v-else
              @click="handleLogout"
              :disabled="gameStore.playerStatus === 'playing'"
              :title="gameStore.playerStatus === 'playing' ? '游戏中不可退出账号' : ''"
              class="icon-btn"
            >
              <Icon icon="mingcute:exit-line" />
            </button>
          </div>
        </div>

        <div class="flex flex-col flex-1 min-h-0">
          <!-- Tabs -->
          <div class="tabs tabs-lift p-1 flex-none grid grid-cols-2">
            <a 
              class="tab h-auto py-2 transition-all duration-200 gap-2" 
              :class="{ 'tab-active': activeTab === 'rooms' }"
              @click="activeTab = 'rooms'"
            >
              <Icon icon="fluent:chess-16-filled" class="text-lg" />
              <span class="hidden md:inline">在线房间 ({{ gameStore.rooms.length }})</span>
              <span class="md:hidden text-xs">{{ gameStore.rooms.length }}</span>
            </a>
            <a 
              class="tab h-auto py-2 transition-all duration-200 gap-2"
              :class="{ 'tab-active': activeTab === 'players' }"
              @click="activeTab = 'players'"
            >
              <Icon icon="fluent:people-16-filled" class="text-lg" />
              <span class="hidden md:inline">在线玩家 ({{ gameStore.players.length }})</span>
              <span class="md:hidden text-xs">{{ gameStore.players.length }}</span>
            </a>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-auto min-h-0 relative bg-base-100">
            <!-- Rooms Panel -->
            <div v-show="activeTab === 'rooms'" class="h-full flex flex-col p-2">
              <div class="sticky top-0 z-10 backdrop-blur pb-2">
                <section class="flex justify-end">
                  <select v-model="gameType" class="text-xs select select-bordered select-sm w-full max-w-[10em]">
                    <option value="">全部游戏</option>
                    <option v-for="(game, key) in gameStore.games" :key="key" :value="key">
                      {{ game.name }}
                    </option>
                  </select>
                </section>
              </div>
              <ul class="space-y-2 pb-4">
                <li v-for="r in roomList" :key="r.id" class="flex items-center justify-between p-2 rounded bg-base-300/50 hover:bg-base-300 transition-colors">
                  <div class="flex items-center gap-1 overflow-hidden">
                    <Icon icon="solar:lock-linear" v-if="r.attrs.passwd" />
                    <Icon v-if="r.attrs?.point" icon="ph:coins-duotone" class="text-yellow-400 tooltip tooltip-right" :data-tip="`单局积分: ${r.attrs.point}`" />
                    <span class="truncate text-sm" :class="{'font-bold text-base-content': r.players.some(p => p.id === gameStore.player?.id)}">
                      【{{ gameStore.games[r.attrs.type]?.name }}】{{ r.name }}
                    </span>
                    <span class="text-xs text-base-content/60 whitespace-nowrap">
                      <template v-if="r.size === 0">
                        ({{ r.players.filter(p => p.role === 'player').length }})
                      </template>
                      <template v-else>
                        ({{ r.players.filter(p => p.role === 'player').length }}/{{ r.size }})
                      </template>
                    </span>
                  </div>
                  <button
                    v-if="!gameStore.roomPlayer || gameStore.roomPlayer.role === 'watcher' && gameStore.roomPlayer.room.id !== r.id"
                    @click="joinRoom(r)"
                    class="px-2 py-1 btn-xs whitespace-nowrap btn"
                    :disabled="gameStore.player?.from !== 'fishpi' && r.attrs.point > 0 && !(r.size === 0 || r.players.filter(p => p.role === 'player').length < r.size)"
                  >
                    {{ (gameStore.player?.from !== 'fishpi' && r.attrs.point > 0 || gameStore.player?.isVisitor) ? '围观' : (r.size === 0 || r.players.filter(p => p.role === 'player').length < r.size ? '进入' : '围观') }}
                  </button>
                </li>
              </ul>
              <span v-if="roomList.length === 0" class="text-sm text-base-content/60 text-center mt-4">暂无房间</span>
            </div>

            <!-- Players Panel -->
            <div v-show="activeTab === 'players'" class="h-full overflow-auto p-2">
              <ul class="space-y-1 pb-4">
                <li
                  v-for="p in gameStore.players"
                  :key="p.id"
                  class="text-sm text-base-content/80 flex items-center gap-2 p-2 hover:bg-base-300 rounded transition-colors cursor-pointer"
                  @click="$router.push(`/u/${p.attributes.username}`)"
                >
                  <div 
                    class="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center text-xs overflow-hidden border border-base-content/10"
                  >
                    <img v-if="p.attributes.avatar" :src="p.attributes.avatar" class="w-full h-full object-cover" />
                    <span v-else>{{ p.name[0] }}</span>
                  </div>
                  <span>{{ p.name }}</span>
                  <Icon icon="mdi:github" v-if="p.attributes.from == 'github'" />
                  <Icon icon="mdi:steam" v-if="p.attributes.from == 'steam'" />
                </li>
              </ul>
            </div>
          </div>
        </div>
        <footer class="text-base-content/50 text-center font-serif text-sm bg-base-100 py-2">
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

    <!-- Mobile LobbyChat (overlay + panel). visibility controlled by isLobbyChatOpen -->
    <div v-show="isLobbyChatOpen" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/50" @click="isLobbyChatOpen = false"></div>
      <div class="absolute inset-y-0 right-0 w-80">
        <LobbyChat @close="isLobbyChatOpen = false" />
      </div>
    </div>

    <!-- Broadcast Modal -->
    <dialog ref="broadcastModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">公告</h3>
        <div class="prose max-w-none" v-html="broadcastContent"></div>
        <div class="modal-action">
          <form method="dialog">
            <button class="btn">关闭</button>
          </form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
    <LoginModal v-model="gameStore.showLoginModal" />
    
    <!-- Edit Name Modal -->
    <dialog class="modal" :class="{ 'modal-open': showEditName }">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">修改游客名称</h3>
        <input 
          v-model="newVisitorName" 
          type="text" 
          placeholder="请输入新的名字" 
          class="input input-bordered w-full"
          @keyup.enter="saveVisitorName"
        />
        <div class="modal-action">
          <button class="btn" @click="showEditName = false">取消</button>
          <button class="btn btn-primary" @click="saveVisitorName">确定</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="showEditName = false">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { IRoomOptions } from 'tiaoom/client'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const router = useRouter()
const gameStore = useGameStore()
const globalBoardcastMessage = computed(() => gameStore.globalBoardcastMessage);

const broadcastModal = ref<HTMLDialogElement | null>(null)
const broadcastContent = ref('')

watch(globalBoardcastMessage, async (newVal) => {
  if (newVal && newVal !== localStorage.getItem('lastBroadcastMessage')) {
    const parsed = await marked.parse(newVal)
    broadcastContent.value = DOMPurify.sanitize(parsed)
    nextTick(() => {
      broadcastModal.value?.showModal()
      localStorage.setItem('lastBroadcastMessage', newVal)
    })
  }
}, { immediate: true })

const isSidebarOpen = ref(false)
const isDesktopSidebarCollapsed = ref(false)
const activeTab = ref<'rooms' | 'players'>('rooms')

function joinRoom(r: IRoomOptions) {
  router.push(`/r/${r.id}`)
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

const showEditName = ref(false);
const newVisitorName = ref('');

function saveVisitorName() {
  if (newVisitorName.value.trim()) {
    gameStore.updateVisitorName(newVisitorName.value.trim());
    showEditName.value = false;
  }
}

onMounted(() => {
  gameStore.initGame();

  // 全局自定义事件：允许任意界面触发唤出/切换/关闭聊天侧栏
  const openHandler = () => {
    handleMenuClick()
  }
  const toggleHandler = () => {
    isLobbyChatOpen.value = !isLobbyChatOpen.value
    if (isLobbyChatOpen.value) {
      readedTime.value = Date.now();
      localStorage.setItem('lobbyChatReadedTime', readedTime.value.toString());
    }
  }
  const closeHandler = () => { isLobbyChatOpen.value = false }

  window.addEventListener('open-lobby-chat', openHandler)
  window.addEventListener('toggle-lobby-chat', toggleHandler)
  window.addEventListener('close-lobby-chat', closeHandler)

  onBeforeUnmount(() => {
    window.removeEventListener('open-lobby-chat', openHandler)
    window.removeEventListener('toggle-lobby-chat', toggleHandler)
    window.removeEventListener('close-lobby-chat', closeHandler)
  })
})

const gameManages = computed(() => gameStore.gameManages);

const globalMessages = computed(() => gameStore.globalMessages)
const readedTime = ref(localStorage.getItem('lobbyChatReadedTime') ? parseInt(localStorage.getItem('lobbyChatReadedTime')!) : 0);
const isLobbyChatOpen = ref(false);
const unreadMessages = computed(() => {
  return globalMessages.value.filter(m => new Date(m.createdAt).getTime() > readedTime.value);
});
watch(globalMessages, () => {
  if (isLobbyChatOpen.value) {
    readedTime.value = Date.now();
    localStorage.setItem('lobbyChatReadedTime', readedTime.value.toString());
  }
});

function handleMenuClick() {
  isLobbyChatOpen.value = true;
  readedTime.value = Date.now();
  localStorage.setItem('lobbyChatReadedTime', readedTime.value.toString());
}

</script>

<style scoped>
/* No scoped styles needed for tabs as we use utility classes */
</style>
