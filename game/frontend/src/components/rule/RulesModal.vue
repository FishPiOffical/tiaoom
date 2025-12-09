<template>
  <div v-if="visible" class="fixed inset-0 bg-base-300/50 flex items-center justify-center z-50" @click.self="close">
    <div class="bg-base-100 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
      <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
        <Icon icon="mdi:book-open-variant" /> 游戏规则
      </h3>
      <div class="space-y-2 text-sm">
        <slot></slot>
      </div>
      <button @click="close" class="btn btn-primary mt-6 w-full py-2 rounded">
        知道了
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'

const visible = ref(false)

function open() {
  visible.value = true
}

function close() {
  visible.value = false
}

defineExpose({
  open,
  close
})
</script>
