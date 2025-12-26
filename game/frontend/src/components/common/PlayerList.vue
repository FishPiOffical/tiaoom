<template>
  <ul class="space-y-1 max-h-50 overflow-auto">
    <li 
      v-for="p in players.filter(p => p.role === 'player')" 
      :key="p.id" 
      class="flex items-center gap-2 text-sm p-1 rounded hover:bg-base-200/50 cursor-pointer"
      :class="{ 'opacity-50': p.status == PlayerStatus.offline }"
      @click="$router.push(`/u/${p.attributes.username}`)"
    >
      <slot :player="p">
        <span>[{{ p.isReady ? '已准备' : '未准备' }}]</span>
        <span>{{ p.name }}</span>
      </slot>
    </li>
    <li 
      v-for="p in players.filter(p => p.role !== 'player')" 
      :key="p.id" 
      class="flex items-center gap-2 text-sm p-1 rounded hover:bg-base-200/50 text-base-content/60"
    >
      <slot :player="p">
        <span>[围观中]</span>
        <span>{{ p.name }}</span>
      </slot>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { PlayerStatus, RoomPlayer } from 'tiaoom/client'

defineProps<{
  players: RoomPlayer[]
}>()
</script>
