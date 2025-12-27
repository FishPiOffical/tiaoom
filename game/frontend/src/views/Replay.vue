<script setup lang="ts">
import { api } from '@/api';
import { onMounted, ref } from 'vue';
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
      v-if="type"
      :is="type + '-replay'" 
      v-bind="replayData"
    />
  </section>
</template>