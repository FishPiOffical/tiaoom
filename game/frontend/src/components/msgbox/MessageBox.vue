<template>
  <div v-if="visible" class="modal modal-open fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/50" @click="handleClose"></div>
    <div class="modal-box bg-base-100 text-base-content rounded shadow-lg max-w-lg w-full mx-4 z-10">
      <div class="flex items-center justify-between pb-2">
        <div class="text-lg font-bold">{{ title }}</div>
        <button class="btn btn-ghost btn-circle btn-sm" @click="handleClose">✕</button>
      </div>
      <div class="py-4">
        <div v-if="isString" class="whitespace-pre-wrap">{{ message }}</div>
        <div v-else>
          <slot />
        </div>
      </div>
      <div class="pt-2 flex justify-end gap-3">
        <button v-if="showCancel" @click="handleCancel" class="btn">{{ cancelText }}</button>
        <button @click="handleConfirm" class="btn btn-primary">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  visible: boolean,
  title: string,
  message: string | object,
  showCancel: boolean,
  confirmText: string,
  cancelText: string
}>(),{
  visible: false,
  title: '提示' ,
  message: '',
  showCancel: true ,
  confirmText: '确定',
  cancelText: '取消',
})

const emit = defineEmits(['confirm', 'cancel', 'close'])

const isString = computed(() => typeof props.message === 'string')

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
}

function handleClose() {
  emit('close')
}
</script>

<style scoped>
/* Let daisyui/tailwind handle colors */
</style>
