<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useTheme } from "@/hook/useTheme";

useTheme();

const gameStore = useGameStore()

onMounted(async () => {
  await gameStore.initConfig()
})
</script>
