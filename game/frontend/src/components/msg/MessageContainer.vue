<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-3">
    <transition-group name="msg" tag="div">
      <div v-for="m in messages" :key="m.id" class="w-80">
        <div class="flex justify-between" :class="['alert shadow-lg', typeClass(m.type)]">
          <div class="flex-1">
            <div class="text-sm wrap-break-word">{{ m.content }}</div>
          </div>
          <div class="flex-none">
            <button class="btn btn-ghost btn-circle btn-sm" @click="close(m.id)">✕</button>
          </div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

type MsgType = 'success' | 'info' | 'warning' | 'error'
type Msg = { id: number; type: MsgType; content: string; duration: number; onClose?: () => void }

const messages = ref<Msg[]>([])
let idSeq = 1

function typeClass(type: MsgType) {
  switch (type) {
    case 'success':
      return 'alert-success'
    case 'warning':
      return 'alert-warning'
    case 'error':
      return 'alert-error'
    default:
      return 'alert-info'
  }
}

function add(payload: Omit<Msg, 'id'>) {
  const id = idSeq++
  const msg: Msg = { id, ...payload }
  messages.value.push(msg)

  if (msg.duration > 0) {
    setTimeout(() => {
      remove(id)
    }, msg.duration)
  }

  return id
}

function remove(id: number) {
  const idx = messages.value.findIndex((m) => m.id === id)
  if (idx !== -1) {
    const [m] = messages.value.splice(idx, 1)
    if (m.onClose) m.onClose()
  }
}

function close(id: number) {
  remove(id)
}

defineExpose({ add, remove })
</script>

<style scoped>
.msg-enter-from { opacity: 0; transform: translateY(-6px); }
.msg-enter-active { transition: all 200ms; }
.msg-leave-to { opacity: 0; transform: translateY(-6px); }
.msg-leave-active { transition: all 200ms; }
</style>
