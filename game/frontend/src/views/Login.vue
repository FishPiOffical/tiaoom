<template>
  <div class="min-h-screen bg-base-100 flex">
    <!-- Left Side: Login Form -->
    <section class="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative z-10">
      <div class="w-full max-w-md space-y-8">
        <!-- Header -->
        <div class="text-center space-y-4">
          <div class="inline-block p-4 rounded-full bg-base-200/50 mb-2">
            <img src="/logo.png" alt="Logo" class="w-24 h-24 object-contain" />
          </div>
          <h1 class="text-4xl font-bold tracking-widest text-base-content">摸鱼棋牌室</h1>
          <p class="text-base-content/60">Tiaoom Game Room</p>
        </div>

        <!-- Login Card -->
        <div class="p-8 rounded-xl bg-base-200 border border-base-content/20 shadow-2xl space-y-6">
          <p v-if="error" class="text-error text-sm bg-error/10 py-2 px-3 rounded border border-error/20 text-center">
            {{ error }}
          </p>
          
          <div class="flex flex-col gap-4">
            <button
              class="btn btn-lg bg-[#f0d35e] flex items-center justify-center gap-3 w-full py-3 transition-all group"
              @click="loginWithFishpi"
            >
              <img src="/fishpi.svg" class="w-[1.5em] group-hover:scale-110 transition-transform" />
              <span class="tracking-wide text-black">登 录</span>
            </button>
            
            <button
              class="btn btn-lg btn-soft flex items-center justify-center gap-3 w-full py-3 transition-all group"
              @click="registerWithFishpi"
            >
              <span class="tracking-wide">注 册 账 号</span>
            </button>
            
            <template v-if="isDevMode()">
              <div class="divider text-xs text-base-content/30">开发模式</div>
              <div class="space-y-3">
                <input
                  v-model="name" 
                  type="text"
                  placeholder="起个名字吧" 
                  class="w-full text-center input input-bordered"
                  @keyup.enter="handleLogin"
                  required 
                />
                <button
                  @click="handleLogin"
                  class="btn w-full btn-primary"
                >
                  本地登录
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- Footer -->
        <footer class="text-base-content/50 text-center font-serif italic text-sm pt-8">
          <p>
            Power By <a href="https://tiaoom.com" target="_blank" rel="noopener noreferrer" class="hover:text-primary transition-colors">Tiaoom</a>
            &copy; {{ new Date().getFullYear() }}
          </p>
        </footer>
      </div>
    </section>

    <!-- Right Side: Visuals (PC Only) -->
    <section class="hidden md:flex flex-1 bg-base-200 items-center justify-center relative overflow-hidden">
      <!-- Decorative Background -->
      <div class="absolute inset-0 bg-linear-to-br from-base-200 to-base-300 opacity-50"></div>
      
      <!-- Game Elements Visual -->
      <div class="relative z-10 grid grid-cols-2 gap-8 opacity-10 rotate-12 select-none">
         <div class="w-40 h-40 rounded-2xl bg-base-content/40 backdrop-blur-sm transform hover:scale-105 transition-transform duration-500 flex items-center justify-center">
            <Icon icon="fluent:chess-20-filled" class="text-6xl" />
         </div>
         <div class="w-40 h-40 rounded-full bg-primary/40 backdrop-blur-sm transform translate-y-12 hover:scale-105 transition-transform duration-500 flex items-center justify-center">
            <Icon icon="fluent:games-24-filled" class="text-6xl" />
         </div>
         <div class="w-40 h-40 rounded-full bg-secondary/40 backdrop-blur-sm transform -translate-y-12 hover:scale-105 transition-transform duration-500 flex items-center justify-center">
            <Icon icon="fluent:puzzle-piece-24-filled" class="text-6xl" />
         </div>
         <div class="w-40 h-40 rounded-2xl bg-accent/40 backdrop-blur-sm transform hover:scale-105 transition-transform duration-500 flex items-center justify-center">
            <Icon icon="fluent:trophy-24-filled" class="text-6xl" />
         </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
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
function registerWithFishpi() {
  window.location.href = '/api/register/fishpi'
}

api.checkLoginError()
  .then(() => {
    // No error
  })
  .catch((err: any) => {
    error.value = err || '登录失败，请使用普通登录'
  })

</script>
