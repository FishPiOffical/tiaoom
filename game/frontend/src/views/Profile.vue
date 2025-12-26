<script lang="ts" setup>
  import { api, User } from '@/api';
  import { ref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import Icon from '@/components/common/Icon.vue';

  const user = ref<User>();
  const route = useRoute();
  const router = useRouter();
  const error = ref<string>('正在加载中...');

  watch(
    () => route.params.username,
    () => {
      load();
    },
    { immediate: true }
  );
  
  function load() {
    user.value = undefined;
    error.value = '正在加载中...';
    api.getUser(route.params.username as string).then(u => {
      user.value = u;
    }).catch(() => {
      error.value = '用户不存在';
    });
  }

  load();
</script>

<template> 
  <main
    v-if="!user"
    class="flex-1 overflow-auto bg-base-100 w-full flex items-center justify-center"
  >
    <span class="text-lg text-base-content/70">{{ error }}</span>
  </main>
  <section v-else class="h-full flex flex-col w-full bg-base-200">
    <header
      class="flex justify-between items-center px-4 py-2 bg-base-100 shadow-sm z-10"
    >
      <button class="btn btn-ghost btn-sm gap-2" @click="router.push('/')">
        <Icon icon="mdi:arrow-left" />
        返回
      </button>
      <h1 class="text-lg font-bold">用户资料</h1>
      <div class="w-16"></div> <!-- Spacer for centering -->
    </header>
      
    <main class="flex-1 overflow-auto p-4 space-y-6 max-w-4xl mx-auto w-full">
      <!-- User Info Card -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body flex-row items-center gap-6">
          <div class="avatar placeholder">
            <div class="bg-neutral text-neutral-content rounded-full w-24">
              <img v-if="user.avatar" :src="user.avatar" :alt="user.nickname" />
              <span v-else class="text-3xl">{{ user.nickname.charAt(0).toUpperCase() }}</span>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <h2 class="card-title text-2xl flex items-center gap-2">
              {{ user.nickname }}
              <div v-if="user.isAdmin" class="badge badge-primary badge-sm">管理员</div>
            </h2>
            <p class="text-base-content/70">@{{ user.username }}</p>
            <div class="flex items-center gap-2 text-sm text-base-content/60 mt-1">
              <img src="/fishpi.svg" class="w-[1.5em] group-hover:scale-110 transition-transform" />
              <a :href="`https://fishpi.cn/member/${user.username}`" target="_blank" rel="noopener noreferrer">
                访问摸鱼派主页
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Section (Placeholder) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h3 class="card-title text-lg mb-2">
              <Icon icon="mdi:chart-box" class="text-primary" />
              胜负统计
            </h3>
            <div class="flex items-center justify-center h-32 bg-base-200 rounded-lg border-2 border-dashed border-base-300">
              <span class="text-base-content/50">暂无数据 (开发中)</span>
            </div>
          </div>
        </div>

        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
             <h3 class="card-title text-lg mb-2">
              <Icon icon="mdi:trophy" class="text-warning" />
              成就
            </h3>
            <div class="flex items-center justify-center h-32 bg-base-200 rounded-lg border-2 border-dashed border-base-300">
              <span class="text-base-content/50">暂无数据 (开发中)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Game History Section (Placeholder) -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h3 class="card-title text-lg mb-4">
            <Icon icon="mdi:history" class="text-secondary" />
            游玩记录
          </h3>
          
          <div class="flex flex-col items-center justify-center py-12 bg-base-200 rounded-lg border-2 border-dashed border-base-300">
            <Icon icon="mdi:gamepad-variant-outline" class="text-4xl text-base-content/30 mb-2" />
            <span class="text-base-content/50">暂无游玩记录</span>
          </div>
        </div>
      </div>
    </main>
  </section>
</template>