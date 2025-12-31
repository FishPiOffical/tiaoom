<template>
  <div class="p-4 max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold mb-4">排行榜</h2>
    
    <div role="tablist" class="tabs tabs-boxed mb-4">
      <a 
        v-for="(game, key) in gameStore.games" 
        :key="key" 
        role="tab" 
        class="tab" 
        :class="{ 'tab-active': activeTab === key }"
        @click="activeTab = key as string"
      >
        {{ game.name }}
      </a>
    </div>

    <div class="overflow-x-auto bg-base-100 rounded-lg shadow">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            <th>排名</th>
            <th>玩家</th>
            <th v-if="!hasScore">胜率</th>
            <th v-if="hasScore">分数</th>
            <th>场次</th>
            <th v-if="!hasScore">胜/平/负</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="hasScore ? 4 : 5" class="text-center py-4">加载中...</td>
          </tr>
          <tr v-else-if="leaderboard.length === 0">
            <td :colspan="hasScore ? 4 : 5" class="text-center py-4">暂无数据</td>
          </tr>
          <template v-else>
            <tr v-for="(item, index) in leaderboard" :key="item.player">
              <td>
                <div class="badge" :class="getRankClass(index)">{{ index + 1 }}</div>
              </td>
              <td class="font-bold">
                <router-link :to="`/u/${item.player}`" class="link link-hover">{{ item.player }}</router-link>
              </td>
              <td v-if="!hasScore">{{ (item.winRate * 100).toFixed(1) }}%</td>
              <td v-if="hasScore">{{ item.score ?? '-' }}</td>
              <td>{{ item.total }}</td>
              <td v-if="!hasScore">{{ item.wins }} / {{ item.draws }} / {{ item.losses }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { api } from '@/api'

const gameStore = useGameStore()
const activeTab = ref<string>('')
const leaderboard = ref<any[]>([])
const loading = ref(false)

const hasScore = computed(() => {
  return leaderboard.value.some(item => item.score !== null && item.score !== undefined)
})

function getRankClass(index: number) {
  if (index === 0) return 'badge-warning'
  if (index === 1) return 'badge-secondary'
  if (index === 2) return 'badge-accent'
  return 'badge-ghost'
}

async function fetchLeaderboard(type: string) {
  if (!type) return
  loading.value = true
  try {
    const res = await api.getLeaderboard(type)
    leaderboard.value = res
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch(activeTab, (newTab) => {
  fetchLeaderboard(newTab)
})

watch(() => gameStore.games, (games) => {
  if (!activeTab.value) {
    const keys = Object.keys(games)
    if (keys.length > 0) {
      activeTab.value = keys[0]
    }
  }
}, { immediate: true })
</script>
