<template>
  <router-view v-if="!loading" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { useTheme } from "@/hook/useTheme";

useTheme();

const gameStore = useGameStore()

const loading = ref(true);
onMounted(async () => {
  await gameStore.initConfig()
  loading.value = false;
})
</script>
