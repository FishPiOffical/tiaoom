<template>
  <section class="flex items-center justify-center min-h-screen bg-base-100 text-base-content p-4">
    <div class="w-full max-w-md p-8 rounded-xl bg-base-200 border border-base-content/20 shadow-2xl text-center space-y-8">
      <h1 class="text-4xl font-light tracking-[0.2em] text-base-content">GAME ROOMS</h1>
      
      <p v-if="error" class="text-error text-sm bg-error/10 py-2 rounded border border-error/20">{{ error }}</p>
      
      <div class="flex flex-col gap-4">
        <button
          class="btn btn-lg flex items-center justify-center gap-3 w-full py-3 bg-base-300 hover:bg-base-content/10 transition-all border border-base-content/20 group"
          @click="loginWithFishpi"
        >
          <img src="/fishpi.svg" class="w-[2em] group-hover:opacity-100 transition-opacity" />
          <span class="tracking-wide">摸鱼派登录</span>
        </button>
        
        <template v-if="isDevMode()">
          <div class="space-y-4">
            <input 
              v-model="name" 
              type="text"
              placeholder="起个名字吧(本地开发专用)" 
              class="w-full text-center py-3 text-lg input input-bordered"
              @keyup.enter="handleLogin"
              required 
            />
            <button
              @click="handleLogin"
              class="btn w-full py-3 btn-primary"
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
import { api } from '@/api'
import { isDevMode } from '@/utils/env'

const router = useRouter()
const gameStore = useGameStore()

const name = ref('')
const error = ref('')

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

api.checkLoginError()
  .then(() => {
    // No error
  })
  .catch((err: any) => {
    error.value = err || '登录失败，请使用普通登录'
  })

</script>
