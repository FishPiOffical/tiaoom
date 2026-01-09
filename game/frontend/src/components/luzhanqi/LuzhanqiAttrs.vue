<script setup lang="ts">
import { onMounted } from 'vue';

  const attrs = defineModel<{
    mode: number
  }>('attrs', {
    default: () => ({
      mode: 0
    })
  })

  onMounted(() => {
    if (attrs.value.mode === undefined) {
      attrs.value.mode = 0;
    }
  });
</script>
<template>
  <div class="form-control w-full">
    <label class="label"><span class="label-text">模式</span></label>
    <select v-model.number="attrs.mode" class="select select-bordered w-full" required>
      <option value="0">暗棋</option>
      <option value="1">明棋</option>
    </select>
  </div>
</template>