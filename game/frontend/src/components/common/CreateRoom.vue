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
      <select v-model.number="room.attrs.point" class="select w-32" required placeholder="积分" 
        v-if="currentGame.points && Object.keys(currentGame.points).length">
        <option disabled selected hidden value="">积分</option>
        <option v-for="(point, key) in currentGame.points" :key="key" :value="point">
          {{ key }}
        </option>
      </select>
      <select v-model.number="room.attrs.rate" class="select w-32" required 
        v-if="currentGame.rates && Object.keys(currentGame.rates).length">
        <option disabled selected hidden value="">倍率</option>
        <option v-for="(rate, key) in currentGame.rates" :key="key" :value="rate">
          {{ key }}
        </option>
      </select>
      <button type="submit" :disabled="!!gameStore.roomPlayer" class="btn btn-primary whitespace-nowrap mr-0 ml-auto">
        创建
      </button>
    </div>
    <p class="text-sm text-base-content/60">{{ currentGame?.description }}</p>
    <div role="alert" class="alert alert-warning alert-soft" v-if="room.attrs.point || room.attrs.rate">
      <Icon icon="ic:round-warning" />
      <span>
        <span v-if="room.attrs.point">注意：当前房间每局游戏需扣除 {{ room.attrs.point }} 积分。</span>
        <span v-if="Math.floor(((room.attrs.rate || 1) * room.attrs.point + room.attrs.point) * 0.9) > 1">
          胜利将获得 {{ Math.floor(((room.attrs.rate || 1) * room.attrs.point + room.attrs.point) * 0.9) }} 积分（税额 10%）。
        </span>
        <span v-if="room.attrs.rate > 1">失败将扣除 {{ Math.ceil(room.attrs.rate * room.attrs.point) - room.attrs.point }}。</span>
        <span v-if="room.size > 2">
          失败将扣除 {{ Math.ceil((room.attrs.rate || 1) * room.attrs.point)}} × 胜利人数 - {{ room.attrs.point }}。
        </span>
      </span>
    </div>
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
  attrs: { type: 'othello', passwd: '', rate: '', point: '' } as Record<string, any>,
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
  room.value.attrs.rate = '';
  room.value.attrs.point = '';
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
