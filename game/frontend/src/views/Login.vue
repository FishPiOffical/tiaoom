<template>
  <section class="flex items-center justify-center min-h-screen bg-background text-primary p-4">
    <div class="w-full max-w-md p-8 rounded-xl bg-surface border border-border shadow-2xl text-center space-y-8">
      <h1 class="text-4xl font-light tracking-[0.2em] text-white">GAME ROOMS</h1>
      
      <p v-if="error" class="text-red-400 text-sm bg-red-900/20 py-2 rounded border border-red-900/50">{{ error }}</p>
      
      <div class="flex flex-col gap-4">
        <button 
          v-if="loginType === 'fishpi'"
          class="flex items-center justify-center gap-3 w-full py-3 bg-surface-light hover:bg-border transition-all rounded border border-border group"
          @click="loginWithFishpi"
        >
          <img src="/fishpi.svg" class="w-6 h-6 opacity-80 group-hover:opacity-100 transition-opacity" />
          <span class="tracking-wide">摸鱼派登录</span>
        </button>
        
        <template v-else>
          <div class="space-y-4">
            <input 
              v-model="name" 
              type="text"
              placeholder="起个名字吧" 
              class="w-full text-center py-3 text-lg"
              @keyup.enter="handleLogin"
              required 
            />
            <button 
              @click="handleLogin"
              class="w-full py-3 bg-white text-black font-bold hover:bg-gray-200 transition-all rounded border-none"
            >
              登录
            </button>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'

const router = useRouter()
const gameStore = useGameStore()

const name = ref('')
const error = ref('')
const loginType = ref('fishpi') // 'fishpi' or 'normal'

async function handleLogin() {
  if (!name.value.trim()) {
    error.value = '请输入名字'
    return
  }
  
  try {
    await gameStore.login(name.value)
    router.push('/')
  } catch (err: any) {
    error.value = err || '登录失败'
  }
}

function loginWithFishpi() {
  window.location.href = '/api/login/fishpi'
}
</script>
