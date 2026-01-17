<template>
  <dialog class="modal" :class="{ 'modal-open': modelValue }">
    <div class="modal-box p-0 bg-transparent shadow-none max-w-md overflow-visible">
      <button 
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-50 bg-base-100 shadow-sm"
        @click="$emit('update:modelValue', false)"
      >✕</button>
      <LoginCard @success="$emit('update:modelValue', false)" />
    </div>
    <form method="dialog" class="modal-backdrop bg-black/50" @click="$emit('update:modelValue', false)">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
</script>