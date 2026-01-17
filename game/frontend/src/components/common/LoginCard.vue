<template>
  <div class="p-8 rounded-xl bg-base-200 border border-base-content/20 shadow-2xl space-y-6">
    <div class="text-center space-y-4">
      <div class="inline-block p-4 rounded-full bg-base-200/50 mb-2">
        <img src="/logo.png" alt="Logo" class="w-24 h-24 object-contain" />
      </div>
      <h1 class="text-4xl font-bold tracking-widest text-base-content">摸鱼竞技大厅</h1>
      <p class="text-base-content/60">Tiaoom Game Room</p>
    </div>
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
      
      <!-- Third Party Login -->
      <div v-if="gameStore.thirdParty.length > 0" class="divider text-xs text-base-content/30">第三方登录</div>
      <div v-if="gameStore.thirdParty.length > 0" class="flex gap-2 w-full">
        <button
          v-if="gameStore.thirdParty.includes('github')"
          class="btn flex-1 gap-2 group btn-lg bg-[#24292e] text-white hover:bg-[#2f363d] dark:bg-white dark:text-[#24292e] dark:hover:bg-gray-200"
          @click="thirdPartyLogin('github')"
        >
          <Icon icon="mdi:github" class="text-xl group-hover:scale-110 transition-transform" />
          <span class="tracking-wide text-sm">GitHub</span>
        </button>

        <button
          v-if="gameStore.thirdParty.includes('steam')"
          class="btn flex-1 gap-2 group btn-lg bg-[#171a21] text-white hover:bg-[#2a475e] dark:bg-[#2a475e] dark:text-white dark:hover:bg-[#1b2838]"
          @click="thirdPartyLogin('steam')"
        >
          <Icon icon="mdi:steam" class="text-xl group-hover:scale-110 transition-transform" />
          <span class="tracking-wide text-sm">Steam</span>
        </button>
      </div>
      
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

const emit = defineEmits<{
  (e: 'success'): void
}>()

const name = ref('')
const error = ref('')

async function handleLogin() {
  if (!name.value.trim()) {
    error.value = '请输入名字'
    return
  }
  
  try {
    await gameStore.login(name.value)
    emit('success')
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

const thirdParty = gameStore.thirdParty;
function thirdPartyLogin(type: string) {
  window.location.href = `/api/login/${type}`
}

api.checkLoginError()
  .then(() => {
    // No error
  })
  .catch((err: any) => {
    error.value = err || '登录失败，请使用普通登录'
  })
</script>