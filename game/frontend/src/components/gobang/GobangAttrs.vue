<script setup lang="ts">
import { onMounted } from 'vue';

  const attrs = defineModel<{
    countDownWay: number
  }>('attrs', {
    default: () => ({
      countDownWay: 0
    })
  })

  onMounted(() => {
    if (attrs.value.countDownWay === undefined) {
      attrs.value.countDownWay = 0;
    }
  });
</script>
<template>
  <div class="form-control w-full">
    <label class="label"><span class="label-text">计时方式</span></label>
    <select v-model.number="attrs.countDownWay" class="select select-bordered w-full" required>
      <option selected value="0">不计时</option>
      <option selected value="1">60s/步</option>
      <option selected value="2">15min/人</option>
    </select>
  </div>
</template>