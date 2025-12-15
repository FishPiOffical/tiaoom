import { createRouter, createWebHashHistory } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { Default } from '@/layout'

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
      component: Default,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/Home.vue')
        },
        {
          path: 'admin',
          name: 'admin',
          component: () => import('@/views/Admin.vue'),
          meta: { requiresAdmin: true }
        },
      ]
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  const gameStore = useGameStore()
  
  if (to.meta.requiresAuth) {
    const hasSession = await gameStore.checkSession()
    if (!hasSession) {
      next('/login')
      return
    }
  }

  if (to.meta.requiresAdmin) {
    // Ensure session is checked if we navigated directly here
    if (!gameStore.player) {
       const hasSession = await gameStore.checkSession()
       if (!hasSession) {
         next('/login')
         return
       }
    }
    
    if (!gameStore.player?.isAdmin) {
      next('/')
      return
    }
  }
  
  next()
})


export default router
