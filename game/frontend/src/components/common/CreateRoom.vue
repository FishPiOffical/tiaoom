<template>
  <div class="animate-fade-in">
    <div class="card bg-base-100 shadow-xl border border-base-200">
      <div class="card-body p-6 sm:p-8">
        <h2 class="card-title text-2xl font-bold mb-6 flex items-center gap-2 text-primary">
          <Icon icon="carbon:game-console" class="w-8 h-8" />
          创建房间
        </h2>
        
        <form @submit.prevent="createRoom" class="space-y-6">
          <!-- 基础信息区域 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="form-control w-full">
              <label class="label">
                <span class="label-text font-medium">房间名称</span>
              </label>
              <input
                v-model.trim="room.name"
                type="text"
                placeholder="给房间起个响亮的名字"
                required
                class="input input-bordered input-primary w-full focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            
            <div class="form-control w-full">
              <label class="label">
                <span class="label-text font-medium">游戏类型</span>
              </label>
              <select 
                v-model="room.attrs.type" 
                @change="onTypeChange" 
                class="select select-bordered select-primary w-full font-medium"
              >
                <option v-for="(game, key) in gameStore.games" :key="key" :value="key">
                  {{ game.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- 游戏简介 -->
          <div class="bg-base-200/60 rounded-xl p-4 flex gap-3 items-start border border-base-300/50" v-if="currentGame?.description">
            <Icon icon="carbon:information" class="text-primary mt-0.5 shrink-0 w-5 h-5" />
            <span class="text-sm text-base-content/80 leading-relaxed">{{ currentGame.description }}</span>
          </div>

          <!-- 高级设置区域 -->
          <div class="divider text-sm text-base-content/40 my-2">房间设置</div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <!-- 房间密码 -->
            <div class="form-control w-full">
              <label class="label"><span class="label-text">房间密码</span></label>
              <div class="relative">
                <input
                  v-model="room.attrs.passwd"
                  :type="showPasswd ? 'text' : 'password'"
                  placeholder="留空即为公开"
                  class="input input-bordered w-full pr-10"
                  autocomplete="new-password"
                />
                <button 
                  type="button" 
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-primary transition-colors cursor-pointer" 
                  @click="showPasswd = !showPasswd"
                >
                   <Icon :icon="showPasswd ? 'carbon:view' : 'carbon:view-off'" class="w-5 h-5" />
                </button>
              </div>
            </div>

            <!-- 人数设置 (根据游戏动态显示) -->
            <template v-if="currentGame && currentGame.minSize !== currentGame.maxSize">
               <div class="form-control w-full">
                <label class="label"><span class="label-text">最大人数</span></label>
                <select
                  v-model="room.size"
                  @change="room.minSize = Math.min(room.minSize, room.size)"
                  class="select select-bordered w-full"
                >
                  <option
                    v-for="i in (currentGame.maxSize - currentGame.minSize + 1)"
                    :key="i"
                    :value="i + currentGame.minSize - 1"
                  >
                    {{ i + currentGame.minSize - 1 }} 玩家
                  </option>
                </select>
              </div>

               <div class="form-control w-full">
                <label class="label"><span class="label-text">最少开始人数</span></label>
                <div class="relative">
                  <input
                    v-model.number="room.minSize"
                    type="number"
                    :min="currentGame.minSize"
                    :max="room.size"
                    class="input input-bordered w-full"
                  />
                  <div class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-base-content/40 pointer-events-none">
                    人
                  </div>
                </div>
              </div>
            </template>
            
            <!-- 积分与倍率 -->
            <div class="form-control w-full" v-if="currentGame.points && Object.keys(currentGame.points).length">
              <label class="label"><span class="label-text">底分</span></label>
              <select v-model.number="room.attrs.point" class="select select-bordered w-full" required>
                <option disabled selected hidden value="">请选择底分</option>
                <option v-for="(point, key) in currentGame.points" :key="key" :value="point">
                  {{ key }}
                </option>
              </select>
            </div>
             
            <div class="form-control w-full" v-if="currentGame.rates && Object.keys(currentGame.rates).length">
              <label class="label"><span class="label-text">倍率</span></label>
              <select v-model.number="room.attrs.rate" class="select select-bordered w-full" required>
                <option disabled selected hidden value="">请选择倍率</option>
                <option v-for="(rate, key) in currentGame.rates" :key="key" :value="rate">
                  {{ key }}
                </option>
              </select>
            </div>

            <component 
              :is="room.attrs.type + '-attrs'" 
              :game="gameStore.game" 
              v-model:attrs="room.attrs"
            />
          </div>

          <!-- 警告提示 -->
          <div role="alert" class="alert alert-warning alert-soft shadow-inner text-sm mt-4 border border-warning/20" v-if="room.attrs.point || room.attrs.rate">
            <Icon icon="ic:round-warning" class="text-2xl shrink-0" />
            <div class="flex flex-col gap-1">
              <span v-if="room.attrs.point" class="font-medium">注意：每局游戏将扣除 {{ room.attrs.point }} 积分</span>
              <div class="text-xs opacity-90 space-y-0.5">
                <template v-if="!gameStore.games[room.attrs.type]?.rewardDescription">
                  <p v-if="Math.floor(((room.attrs.rate || 1) * room.attrs.point + room.attrs.point) * 0.9) > 1">
                    • 胜利获得: 約 {{ Math.floor(((room.attrs.rate || 1) * room.attrs.point + room.attrs.point) * 0.9) }} 积分 (含税)
                  </p>
                  <p v-if="room.attrs.rate > 1">
                    • 失败扣除: {{ Math.ceil(room.attrs.rate * room.attrs.point) - room.attrs.point }} 积分
                  </p>
                  <p v-if="room.size > 2">
                    • 多人局失败: {{ Math.ceil((room.attrs.rate || 1) * room.attrs.point)}} × 胜者数 - {{ room.attrs.point }}
                  </p>
                </template>
                <div v-else>
                  {{ gameStore.games[room.attrs.type]?.rewardDescription }}
                </div>
              </div>
            </div>
          </div>
          
           <!-- 底部操作栏 -->
          <div class="card-actions justify-between items-center sm:mt-8 mt-4 pt-4 border-t border-base-200">
             <div class="flex gap-2 flex-wrap">
               <!-- 扩展页面按钮 -->
               <button 
                 type="button" 
                 v-for="page in currentGame.extendPages" 
                 :key="page.name" 
                 class="btn btn-sm btn-soft gap-2 hover:bg-base-200"
                 @click="extendPage = page.component"
               >
                <Icon v-if="page.icon" :icon="page.icon" class="w-4 h-4" />
                <span>{{ page.name }}</span>
              </button>
             </div>
             
             <button 
               type="submit" 
               :disabled="!!gameStore.roomPlayer || !room.name" 
               class="btn btn-primary px-8 shadow-lg hover:shadow-primary/30 min-w-[120px]"
             >
               <span v-if="!gameStore.roomPlayer">创建</span>
               <span v-else>游戏中</span>
             </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- 侧边栏/模态框 Exnted Page -->
    <div v-if="extendPage" class="fixed inset-0 z-50 flex justify-end">
      <div 
        class="absolute inset-0 bg-base-300/60 backdrop-blur-sm transition-opacity" 
        @click="extendPage = null"
      ></div>
      <div class="relative w-full max-w-2xl bg-base-100 h-full shadow-2xl overflow-y-auto p-6 md:p-8 animate-slide-left border-l border-base-200">
        <div class="flex justify-between items-center mb-2 sticky top-0 bg-base-100 z-10 py-2 border-b border-base-100">
          <h3 class="text-xl font-bold flex items-center gap-2">
            <div class="p-2 bg-primary/10 rounded-lg text-primary">
              <Icon 
                v-if="currentGame.extendPages?.find((p: any) => p.component === extendPage)?.icon" 
                :icon="currentGame.extendPages.find((p: any) => p.component === extendPage)?.icon" 
                class="w-6 h-6" 
              />
            </div>
            <span>{{ currentGame.extendPages?.find((p: any) => p.component === extendPage)?.name || '设置' }}</span>
          </h3>
          <button class="btn btn-sm btn-circle btn-ghost" @click="extendPage = null">
            <Icon icon="carbon:close" class="w-6 h-6" />
          </button>
        </div>
        <component :is="extendPage" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import msg from '@/components/msg'

const gameStore = useGameStore()

const showPasswd = ref(false)
const extendPage = ref<any>(null)
const room = ref({
  name: '',
  size: 4,
  minSize: 4,
  requireAllReadyToStart: true,
  attrs: { type: 'othello', passwd: '', rate: '', point: '' } as Record<string, any>,
})

const currentGame = computed(() => {
  return gameStore.games[room.value.attrs.type]
})

function onTypeChange() {
  const game = gameStore.games[room.value.attrs.type]
  console.log('[CreateRoom] 切换游戏类型:', room.value.attrs.type, 'minSize:', game.minSize, 'maxSize:', game.maxSize)

  room.value.requireAllReadyToStart = game.requireAllReadyToStart ?? true
  
  // 如果 minSize 和 maxSize 都是 0，表示不限制人数
  if (game.minSize === 0 && game.maxSize === 0) {
    room.value.size = 0
    room.value.minSize = 0
    console.log('[CreateRoom] 设置为不限制人数: size=0, minSize=0')
  } else {
    // 有人数限制的游戏，设置为游戏的默认最小人数
    room.value.minSize = game.minSize
    room.value.size = game.minSize
    console.log('[CreateRoom] 设置人数限制: size=' + room.value.size + ', minSize=' + room.value.minSize)
  }
  
  room.value.attrs.rate = '';
  room.value.attrs.point = '';
}

async function createRoom() {
  if (!room.value.name) {
    msg.error('请填写房间名称')
    return
  }
  if (gameStore.rooms.some(r => r.name === room.value.name)) {
    msg.error('房间名称已存在，请更换一个')
    return
  }
  
  // 根据游戏类型设置人数限制
  const game = currentGame.value
  if (game.minSize === 0 && game.maxSize === 0) {
    // 不限制人数的游戏（如猜盐）
    room.value.minSize = 0
    room.value.size = 0
  } else {
    // 有人数限制的游戏
    room.value.minSize = Math.min(room.value.minSize, game.minSize)
    room.value.size = Math.min(room.value.size, game.maxSize)
    room.value.size = Math.max(room.value.size, room.value.minSize)  
  }
  
  // 创建房间数据对象，确保所有字段都明确传递
  const roomData = {
    name: room.value.name,
    size: room.value.size,
    minSize: room.value.minSize,
    requireAllReadyToStart: game.requireAllReadyToStart ?? true,
    attrs: { ...room.value.attrs }
  }
  
  console.log('[CreateRoom] 创建房间数据:', roomData)
  await gameStore.game?.createRoom(roomData)
}
</script>

<style scoped>
/* 简单的淡入动画 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes slideLeft {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.animate-slide-left {
  animation: slideLeft 0.3s ease-out;
}
</style>
