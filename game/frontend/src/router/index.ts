import { createRouter, createWebHashHistory } from 'vue-router'
import { useGameStore } from '@/stores/game'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue')
    },
    {
      path: '/lite',
      name: 'lite',
      component: () => import('@/views/Lite.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/lite/chat',
      name: 'lite-chat',
      component: () => import('@/components/common/GameChatLite.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const gameStore = useGameStore()
  
  if (to.meta.requiresAuth) {
    const hasSession = await gameStore.checkSession()
    if (!hasSession) {
      next('/login')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
