<script lang="ts" setup>
  import { api, User } from '@/api';
  import { ref, watch, computed } from 'vue';
  import { useRoute } from 'vue-router';
  import Icon from '@/components/common/Icon.vue';
  import { useGameStore } from '@/stores/game';
  import { getComponent } from '@/main';

  const user = ref<User>();
  const route = useRoute();
  const gameStore = useGameStore();
  const error = ref<string>('正在加载中...');

  const records = ref<any[]>([]);
  const page = ref(1);
  const total = ref(0);
  const pageSize = 10;

  const totalPages = computed(() => Math.ceil(total.value / pageSize));

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
      loadRecords();
    }).catch(() => {
      error.value = '用户不存在';
    });
  }

  function loadRecords() {
    if (!user.value) return;
    api.getUserRecords(user.value.username, page.value, pageSize).then(res => {
      records.value = res.records;
      total.value = res.total;
    });
  }

  function prevPage() {
    if (page.value > 1) {
      page.value--;
      loadRecords();
    }
  }

  function nextPage() {
    if (page.value < totalPages.value) {
      page.value++;
      loadRecords();
    }
  }
  
  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleString();
  }
  
  function getResult(record: any) {
    if (record.score) return `得分: ${record.score}`;
    if (!record.winners || record.winners.length === 0) return '平局';
    if (record.winners.includes(user.value?.username)) return '胜利';
    return '失败';
  }
  
  function getResultClass(record: any) {
    if (record.score) return 'text-info';
    if (!record.winners || record.winners.length === 0) return 'text-warning';
    if (record.winners.includes(user.value?.username)) return 'text-success';
    return 'text-error';
  }

  const hasReplayComponent = (type: string) => {
    try {
      if (!type) return false
      return !!getComponent(type.split('-').map(t => t.slice(0, 1).toUpperCase() + t.slice(1)).join('') + 'Replay')
    } catch {
      return false
    }
  }
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
      <Back />
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

      <!-- Stats Section -->
      <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h3 class="card-title text-lg mb-4">
              <Icon icon="mdi:chart-box" class="text-primary" />
              胜负统计
            </h3>
            
            <div v-if="user.state && user.state.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div v-for="stat in user.state" :key="stat.type" class="stat bg-base-200 rounded-box p-4">
                    <header class="flex justify-between items-baseline">
                      <div class="stat-title text-sm font-bold mb-1">{{ gameStore.games[stat.type]?.name || stat.type }}</div>
                      <div class="text-xs opacity-60" v-if="stat.score">最高得分</div>
                    </header>
                    <template v-if="!stat.score">
                      <div class="flex justify-between text-xs">
                          <span class="text-success">胜: {{ stat.wins }}</span>
                          <span class="text-warning">平: {{ stat.draws }}</span>
                          <span class="text-error">负: {{ stat.losses }}</span>
                      </div>
                      <div class="w-full bg-base-300 rounded-full h-2 mt-2 overflow-hidden flex">
                          <div class="bg-success h-full" :style="{ width: (stat.wins / stat.total * 100) + '%' }"></div>
                          <div class="bg-warning h-full" :style="{ width: (stat.draws / stat.total * 100) + '%' }"></div>
                          <div class="bg-error h-full" :style="{ width: (stat.losses / stat.total * 100) + '%' }"></div>
                      </div>
                    </template>
                    <template v-else>
                      <div class="flex flex-col items-center justify-center py-2">
                        <div class="text-3xl font-black text-info">{{ stat.score }}</div>
                      </div>
                    </template>
                    <div class="text-right text-xs mt-1 opacity-60">游玩次数：{{ stat.total }}</div>
                </div>
            </div>
            <div v-else class="flex items-center justify-center h-32 bg-base-200 rounded-lg border-2 border-dashed border-base-300">
              <span class="text-base-content/50">暂无统计数据</span>
            </div>
          </div>
      </div>

      <!-- Game History Section -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h3 class="card-title text-lg">
              <Icon icon="mdi:history" class="text-secondary" />
              游玩记录
            </h3>
            <div class="join">
                <button class="join-item btn btn-sm" :disabled="page <= 1" @click="prevPage">
                  <Icon icon="flowbite:caret-left-solid" />
                </button>
                <button class="join-item btn btn-sm">Page {{ page }}</button>
                <button class="join-item btn btn-sm" :disabled="page >= totalPages" @click="nextPage">
                  <Icon icon="flowbite:caret-right-solid" />
                </button>
            </div>
          </div>
          
          <div v-if="records.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div v-for="record in records" :key="record.id" class="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors">
                  <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-base-100 flex items-center justify-center text-primary shadow-sm">
                          <Icon icon="mdi:gamepad-variant" class="text-xl" />
                      </div>
                      <div class="flex flex-col">
                          <span class="font-bold text-sm space-x-1 inline-flex items-center">
                            <span>{{ gameStore.games[record.type]?.name || record.type }}</span>
                            <button  
                              v-if="hasReplayComponent(record.type)"
                              class="btn btn-text btn-outline tooltip"
                              @click="$router.push(`/p/${record.id}`)"
                              data-tip="查看回放"
                            >
                              <Icon icon="mdi:play-circle-outline" />
                            </button>
                          </span>
                          <span class="text-xs opacity-60">{{ record.roomName }}</span>
                      </div>
                  </div>
                  <div class="flex flex-col items-end">
                      <span :class="['font-bold text-sm', getResultClass(record)]">{{ getResult(record) }}</span>
                      <span class="text-xs opacity-50">{{ formatDate(Number(record.createdAt)) }}</span>
                  </div>
              </div>
          </div>
          
          <div v-else class="flex flex-col items-center justify-center py-12 bg-base-200 rounded-lg border-2 border-dashed border-base-300">
            <Icon icon="mdi:gamepad-variant-outline" class="text-4xl text-base-content/30 mb-2" />
            <span class="text-base-content/50">暂无游玩记录</span>
          </div>
        </div>
      </div>
    </main>
  </section>
</template>