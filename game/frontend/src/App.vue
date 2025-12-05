<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()

onMounted(async () => {
  await gameStore.initConfig()
})
</script>
