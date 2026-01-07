<template>
  <div class="h-full relative w-full">
    <div class="p-4 h-full flex flex-col overflow-hidden">
      <div class="navbar flex justify-between items-center mb-4 w-full">
        <div class="flex items-center">
          <Back />
          <div role="tablist" class="tabs tabs-box">
            <a role="tab" class="tab space-x-1" :class="{ 'tab-active': activeTab == 'room'}" @click="activeTab = 'room'" v-if="gameStore.player?.isAdmin">
              <Icon icon="mingcute:settings-3-line" />
              <span>房间管理</span>
            </a>
            <a 
              role="tab" 
              class="tab space-x-1" 
              @click="activeTab = manage.key" 
              v-for="manage in manageList" 
              :key="manage.key" 
              :class="{ 'tab-active': activeTab == manage.key}"
            >
              <Icon icon="material-symbols:database" />
              <span>{{ manage.name }}</span>
            </a>
            <a role="tab" class="tab space-x-1" :class="{ 'tab-active': activeTab == 'config'}" @click="activeTab = 'config'" v-if="!gameStore.isConfigured">
              <Icon icon="mingcute:tool-line" />
              <span>初始化配置</span>
            </a>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" @click="openBroadcastModal" v-if="gameStore.player?.isAdmin">
          <Icon icon="bi:broadcast" />
          发布公告
        </button>
      </div>
      <!-- Content -->
      <section class="flex-1 overflow-auto">
        <template v-if="activeTab == 'config'">
          <Config />
        </template>
  
        <template v-if="activeTab == 'room'">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="room in gameStore.rooms" :key="room.id" 
                class="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer border border-base-content/10"
                @click="openRoomDetail(room)">
              <div class="card-body p-4">
                <div class="flex justify-between items-start">
                  <h2 class="card-title text-lg">
                    {{ room.name }}
                    <div class="badge badge-primary badge-outline text-xs">{{ getGameName(room.attrs.type) }}</div>
                  </h2>
                  <div class="flex gap-1">
                    <button class="btn btn-ghost btn-xs btn-square text-info" @click.stop="broadcastToRoom(room)" title="发送广播">
                      <Icon icon="bi:broadcast" class="text-lg" />
                    </button>
                    <button class="btn btn-ghost btn-xs btn-square text-error" @click.stop="closeRoom(room)" title="关闭房间">
                      <Icon icon="mingcute:close-circle-line" class="text-lg" />
                    </button>
                  </div>
                </div>
                
                <div class="flex gap-4 text-sm text-base-content/70 mt-2">
                  <div class="flex items-center gap-1" title="玩家/容量">
                    <Icon icon="mingcute:user-3-line" />
                    <span>{{ room.players.filter(p => p.role === 'player').length }} / {{ room.size }}</span>
                  </div>
                  <div class="flex items-center gap-1" title="观众">
                    <Icon icon="mingcute:eye-2-line" />
                    <span>{{ room.players.filter(p => p.role === 'watcher').length }}</span>
                  </div>
                </div>
                
                <div class="text-xs text-base-content/40 mt-2 font-mono">ID: {{ room.id }}</div>
              </div>
            </div>
          </div>
          
          <div v-if="gameStore.rooms.length === 0" class="text-center py-10 text-base-content/50">
            暂无活跃房间
          </div>
        </template>
  
        <template v-for="m in manageList" :key="m.key">
          <component :is="getGameForm(m.key)" v-if="activeTab == m.key && getGameForm(m.key)" />
        </template>
      </section>
    </div>
    <RoomManagementDrawer v-model:visible="isDrawerOpen" :room="selectedRoom" />

    <!-- Broadcast Modal -->
    <dialog ref="broadcastModal" class="modal">
      <div class="modal-box w-11/12 max-w-5xl h-[80vh] flex flex-col">
        <h3 class="font-bold text-lg mb-4">发布公告</h3>
        <div class="flex-1 flex gap-4 min-h-0">
          <div class="flex-1 flex flex-col gap-2">
            <label class="text-sm font-bold opacity-70">编辑 (Markdown)</label>
            <textarea 
              v-model="broadcastInput" 
              class="textarea flex-1 resize-none font-mono"
              placeholder="请输入公告内容..."
            ></textarea>
          </div>
          <div class="flex-1 flex flex-col gap-2">
            <label class="text-sm font-bold opacity-70">预览</label>
            <div class="flex-1 border border-base-content/20 rounded-lg p-4 overflow-y-auto bg-base-100">
              <div class="prose max-w-none" v-html="broadcastPreview"></div>
            </div>
          </div>
        </div>
        <div class="modal-action">
          <form method="dialog">
            <button class="btn btn-ghost mr-2">取消</button>
          </form>
          <button class="btn btn-primary" @click="sendBroadcast">发送</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { Icon } from '@iconify/vue'
import { Room } from 'tiaoom/client'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { getComponent } from '@/main'
import Config from './Config.vue'
import RoomManagementDrawer from '@/components/common/RoomManagementDrawer.vue'

const gameStore = useGameStore()
const isDrawerOpen = ref(false)
const selectedRoom = ref<Room | null>(null)

const broadcastModal = ref<HTMLDialogElement | null>(null)
const broadcastInput = ref('')
const broadcastPreview = ref('')

watch(broadcastInput, async (newVal) => {
  const parsed = await marked.parse(newVal)
  broadcastPreview.value = DOMPurify.sanitize(parsed)
})

function getGameName(type: string) {
  return gameStore.games[type]?.name || type
}

function openRoomDetail(room: Room) {
  selectedRoom.value = room
  isDrawerOpen.value = true
}

function closeRoom(room: Room) {
  if (!confirm(`确定要强制关闭房间 "${room.name}" 吗？`)) return
  gameStore.game?.closeRoom(room.id)
}

function openBroadcastModal() {
  broadcastInput.value = gameStore.globalBoardcastMessage || ''
  broadcastModal.value?.showModal()
}

function sendBroadcast() {
  if (!broadcastInput.value) return
  gameStore.game?.command({ type: 'boardcast', data: broadcastInput.value })
  broadcastModal.value?.close()
}

function broadcastToRoom(room: Room) {
  const msg = prompt(`向房间 "${room.name}" 发送广播:`)
  if (!msg) return
  gameStore.game?.command(room.id, { type: 'broadcast', data: msg })
}

const manageList = computed(() => {
  return gameStore.gameManages.filter(m => m.canManage)
})
function getGameForm(type: string) {
  try {
    return getComponent(type.split('-').map(t => t.slice(0, 1).toUpperCase() + t.slice(1)).join('') + 'Form')
  } catch {
    return null
  }
}

const activeTab = ref(gameStore.player?.isAdmin ? 'room' : manageList.value[0]?.key || '')
watch(() => manageList.value, (newList) => {
  if (!activeTab.value) {
    activeTab.value = newList[0]?.key || ''
  }
}, { immediate: true })
</script>
