import { createRouter, createWebHistory } from 'vue-router'
import { useGameStore } from '@/stores/game'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue')
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
