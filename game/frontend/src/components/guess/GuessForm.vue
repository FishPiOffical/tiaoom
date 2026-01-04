<template>
  <div class="space-y-4">
    <div class="alert alert-info">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div class="text-sm">
        <p><strong>游戏规则：</strong></p>
        <p>• 房间人数：1-999人（固定）</p>
        <p>• 禁止围观，所有玩家都可参与游戏</p>
        <p>• 房主可在等待阶段设置分类和难度</p>
        <p>• 猜出完整标题即为完成</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 这个组件主要用于展示游戏说明
// 实际的分类和难度设置在 GuessRoom.vue 中由房主操作
</script>
