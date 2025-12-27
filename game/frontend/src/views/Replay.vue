<script setup lang="ts">
import { api } from '@/api';
import { getComponent } from '@/main';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const id = route.params.id as string;

const type = ref<string>('');
const replayData = ref<any>({});
function load() {
  api.getRecord(Number(id)).then((res) => {
    replayData.value = res.data;
    type.value = res.type;
  });
}

onMounted(() => {
  load();
});

const hasReplayComponent = computed(() => {
  try {
    const typeValue = type.value
    if (!typeValue) return false
    return !!getComponent(typeValue.slice(0, 1).toUpperCase() + typeValue.slice(1) + 'Replay')
  } catch {
    return false
  }
})
</script>

<template>
  <section class="h-full flex flex-col w-full bg-base-200">
    <header
      class="flex justify-between items-center px-4 py-2 bg-base-100 shadow-sm z-10"
    >
      <button class="btn btn-ghost btn-sm gap-2" @click="$router.back()">
        <Icon icon="mdi:arrow-left" />
        返回
      </button>
      <h1 class="text-lg font-bold">游戏回放</h1>
      <div class="w-16"></div> <!-- Spacer for centering -->
    </header>
    <component
      v-if="type && hasReplayComponent"
      :is="type + '-replay'" 
      v-bind="replayData"
    />
    <section v-else-if="type" class="flex flex-col items-center justify-center h-full p-4">
      <Icon icon="mdi:history" class="text-6xl text-base-content/30 mb-4" />
      <span class="text-base-content/50 text-lg">此游戏不支持回放</span>
    </section>
    <section v-else class="flex flex-col items-center justify-center h-full p-4">
      <Icon icon="mdi:loading" class="animate-spin text-6xl text-base-content/30 mb-4" />
      <span class="text-base-content/50 text-lg">正在加载回放数据...</span>
    </section>
  </section>
</template>