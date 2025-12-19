<template>
  <form @submit.prevent="createRoom" class="space-y-4 max-w-2xl mx-auto">
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import msg from '@/components/msg'

const gameStore = useGameStore()

const showPasswd = ref(false)
const room = ref({
  name: '',
  size: 4,
  minSize: 4,
  attrs: { type: 'othello', passwd: '' }
})

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
    msg.error('请填写房间名称')
    return
  }
  if (gameStore.rooms.some(r => r.name === room.value.name)) {
    msg.error('房间名称已存在，请更换一个')
    return
  }
  room.value.minSize = Math.min(room.value.minSize, currentGame.value.minSize)
  room.value.size = Math.min(room.value.size, currentGame.value.maxSize)
  room.value.size = Math.max(room.value.size, room.value.minSize)
  await gameStore.game?.createRoom(room.value)
}
</script>

<style scoped>
.input .grow { flex: 1 }
</style>
