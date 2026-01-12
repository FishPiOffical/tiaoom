<template>
  <div class="drawer drawer-end pointer-events-none fixed inset-0 z-100" :class="{ 'drawer-open': visible }">
    <input id="room-manage-drawer" type="checkbox" class="drawer-toggle" :checked="visible" @change="$emit('update:visible', ($event.target as HTMLInputElement).checked)" />
    <div class="drawer-side pointer-events-auto h-full absolute right-0 top-0">
      <label for="room-manage-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
      <div v-if="room" class="menu p-4 w-80 min-h-full bg-base-200 text-base-content h-full overflow-y-auto">
        <h3 class="text-xl font-bold mb-4 border-b border-base-content/10 pb-2 flex justify-between items-center">
          <span>{{ room.name }}</span>
          <button class="btn btn-ghost btn-sm btn-circle" @click="$emit('update:visible', false)">
            <Icon icon="carbon:close" class="w-5 h-5" />
          </button>
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
                    <span class="text-[0.6rem] opacity-50 truncate font-mono">{{ p.id }}</span>
                  </div>
                </div>
                
                <div class="flex gap-1" v-if="(canManage)">
                  <button class="btn btn-ghost btn-xs btn-square text-warning opacity-0 group-hover:opacity-100 transition-opacity" 
                          v-if="!p.isCreator"
                          @click="transferOwner(p)" title="移交房主">
                    <Icon icon="mingcute:transfer-line" />
                  </button>
                  <button class="btn btn-ghost btn-xs btn-square text-error opacity-0 group-hover:opacity-100 transition-opacity" 
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
                    <span class="text-[0.6rem] opacity-50 truncate font-mono">{{ p.id }}</span>
                  </div>
                </div>
                
                <div class="flex gap-1" v-if="canManage">
                  <button class="btn btn-ghost btn-xs btn-square text-error opacity-0 group-hover:opacity-100 transition-opacity" 
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Room, RoomPlayer } from 'tiaoom/client'
import { useGameStore } from '@/stores/game'
import msgbox from '@/components/msgbox'

const props = defineProps<{
  visible: boolean
  room: Room | null
}>()

const emit = defineEmits(['update:visible'])

const gameStore = useGameStore()

const players = computed(() => props.room?.players.filter(p => p.role === 'player') || [])
const watchers = computed(() => props.room?.players.filter(p => p.role === 'watcher') || [])

const currentPlayer = computed(() => gameStore.player) // global player
const canManage = computed(() => {
  if (!props.room || !currentPlayer.value) return false
  return currentPlayer.value.isAdmin || props.room.players.some(p => p.id === currentPlayer.value?.id && p.isCreator)
})

async function kickPlayer(player: RoomPlayer) {
  if (!props.room) return
  try {
     await msgbox.confirm(`确定要踢出玩家 "${player.name}" 吗？`)
     gameStore.game?.kickPlayer(props.room.id, player.id)
  } catch {}
}

async function transferOwner(player: RoomPlayer) {
  if (!props.room) return
  try {
     await msgbox.confirm(`确定将房主移交给 "${player.name}" 吗？`)
     gameStore.game?.transferRoom(props.room.id, player.id)
  } catch {}
}
</script>
