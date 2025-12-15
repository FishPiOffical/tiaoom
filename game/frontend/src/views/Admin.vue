<template>
  <div class="drawer drawer-end">
    <input id="room-drawer" type="checkbox" class="drawer-toggle" v-model="isDrawerOpen" />
    
    <div class="drawer-content p-4">
      <h1 class="text-2xl font-bold mb-4 flex items-center gap-2">
        <Icon icon="mingcute:settings-3-line" />
        房间管理
      </h1>
      
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
    </div>
    
    <div class="drawer-side z-50">
      <label for="room-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
      <div class="menu p-4 w-80 min-h-full bg-base-200 text-base-content">
        <div v-if="selectedRoom">
          <h3 class="text-xl font-bold mb-4 border-b border-base-content/10 pb-2">
            {{ selectedRoom.name }}
          </h3>
          
          <div class="space-y-6">
            <!-- Players -->
            <div>
              <h4 class="font-bold text-sm opacity-70 mb-2 flex items-center gap-2">
                <Icon icon="mingcute:game-2-line" />
                玩家 ({{ players.length }})
              </h4>
              <ul class="space-y-2">
                <li v-for="p in players" :key="p.id" class="bg-base-100 rounded p-2 flex flex-row items-center justify-between group">
                  <div class="flex items-center gap-2 overflow-hidden">
                    <div class="avatar placeholder">
                      <div class="bg-neutral text-neutral-content rounded-full w-8 flex items-center justify-center font-bold">
                        <img v-if="p.attributes?.avatar" :src="p.attributes.avatar" />
                        <span v-else>{{ p.name[0] }}</span>
                      </div>
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="font-medium truncate flex items-center gap-1">
                        {{ p.name }}
                        <Icon v-if="p.isCreator" icon="bxs:crown" class="text-warning" />
                      </span>
                      <span class="text-xs opacity-50 truncate">{{ p.id }}</span>
                    </div>
                  </div>
                  
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="btn btn-ghost btn-xs btn-square text-warning" 
                            v-if="!p.isCreator"
                            @click="transferOwner(p)" title="移交房主">
                      <Icon icon="mingcute:transfer-line" />
                    </button>
                    <button class="btn btn-ghost btn-xs btn-square text-error" 
                            @click="kickPlayer(p)" title="踢出">
                      <Icon icon="mingcute:exit-line" />
                    </button>
                  </div>
                </li>
              </ul>
            </div>

            <!-- Spectators -->
            <div v-if="watchers.length > 0">
              <h4 class="font-bold text-sm opacity-70 mb-2 flex items-center gap-2">
                <Icon icon="mingcute:eye-2-line" />
                观众 ({{ watchers.length }})
              </h4>
              <ul class="space-y-2">
                <li v-for="p in watchers" :key="p.id" class="bg-base-100 rounded p-2 flex flex-row items-center justify-between group">
                  <div class="flex items-center gap-2 overflow-hidden">
                    <div class="avatar placeholder">
                      <div class="bg-neutral text-neutral-content rounded-full w-8 flex items-center justify-center font-bold">
                        <img v-if="p.attributes?.avatar" :src="p.attributes.avatar" />
                        <span v-else>{{ p.name[0] }}</span>
                      </div>
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="font-medium truncate">{{ p.name }}</span>
                      <span class="text-xs opacity-50 truncate">{{ p.id }}</span>
                    </div>
                  </div>
                  
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="btn btn-ghost btn-xs btn-square text-error" 
                            @click="kickPlayer(p)" title="踢出">
                      <Icon icon="mingcute:exit-line" />
                    </button>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { Icon } from '@iconify/vue'
import { Room, RoomPlayer } from 'tiaoom/client'

const gameStore = useGameStore()
const isDrawerOpen = ref(false)
const selectedRoom = ref<Room | null>(null)

const players = computed(() => selectedRoom.value?.players.filter(p => p.role === 'player') || [])
const watchers = computed(() => selectedRoom.value?.players.filter(p => p.role === 'watcher') || [])

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

function broadcastToRoom(room: Room) {
  const msg = prompt(`向房间 "${room.name}" 发送广播:`)
  if (!msg) return
  gameStore.game?.command(room.id, { type: 'broadcast', data: msg })
}

function kickPlayer(player: RoomPlayer) {
  if (!selectedRoom.value) return
  if (!confirm(`确定要踢出玩家 "${player.name}" 吗？`)) return
  gameStore.game?.kickPlayer(selectedRoom.value.id, player.id)
}

function transferOwner(player: RoomPlayer) {
  if (!selectedRoom.value) return
  if (!confirm(`确定将房主移交给 "${player.name}" 吗？`)) return
  gameStore.game?.transferRoom(selectedRoom.value.id, player.id)
}
</script>
