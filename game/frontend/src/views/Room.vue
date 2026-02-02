<script lang="ts" setup>
import { getComponent } from "@/components";
import { openSmallWindow } from "@/utils/dom";
import { computed, onMounted, watch, ref, nextTick, onUnmounted } from "vue";
import { useRoom } from '@/hook/useRoom';

const { room, gameStore } = useRoom();

const isAlertExpanded = ref(false);
const showExpandBtn = ref(false);
const alertContentRef = ref<HTMLElement | null>(null);

const checkAlertOverflow = () => {
  const el = alertContentRef.value;
  if (el) {
    if (isAlertExpanded.value) {
       showExpandBtn.value = el.clientHeight > 20;
    } else {
       showExpandBtn.value = el.scrollHeight > el.clientHeight;
    }
  }
};

watch(() => gameStore.roomPlayer?.room, () => {
  nextTick(checkAlertOverflow);
}, { deep: true });

onMounted(() => {
  window.addEventListener('resize', checkAlertOverflow);
});

function loaded() {
  gameStore.game!.init(gameStore.roomPlayer!.room.id, gameStore.player!.player)
}

onUnmounted(() => {
  window.removeEventListener('resize', checkAlertOverflow);
});

const ComponentLite = computed(() => getComponent(gameStore.roomPlayer?.room.attrs?.type, 'Lite'))
const ComponentRoom = computed(() => getComponent(gameStore.roomPlayer?.room.attrs?.type, 'Room'))
const ComponentRoomControls = computed(() => getComponent(gameStore.roomPlayer?.room.attrs?.type, 'RoomControls'))

function openLobbyChat() {
  window.dispatchEvent(new Event('open-lobby-chat'))
}
</script>

<template>
  <main
    v-if="!gameStore.roomPlayer"
    class="flex-1 overflow-auto bg-base-100 w-full flex items-center justify-center"
  >
    <span>正在加载房间...</span>
  </main>
  <section v-else class="h-full flex flex-col w-full">
    <header
      class="border-b border-base-content/20 flex justify-between items-center px-4 py-2 pb-2"
    >
      <section>
        <h3 class="text-xl font-light text-base-content mb-1">
          <span>我的房间: {{ gameStore.roomPlayer.room.name }} </span>
          <span class="text-sm text-base-content/60 ml-1">
            ({{
              gameStore.roomPlayer.room.players.filter(
                (p) => p.role === "player"
              ).length
            }}<span v-if="gameStore.roomPlayer.room.size > 0">/{{ gameStore.roomPlayer.room.size }})</span>
          </span>
        </h3>
        <div
          role="alert"
          class="alert alert-soft py-1 pl-1 gap-1 relative"
          :class="{ 'pr-8': showExpandBtn }"
          v-if="room && (room.attrs.point || room.attrs.rate)"
        >
          <div v-if="gameStore.player?.from == 'fishpi'" class="text-xs w-full" :class="{ 'line-clamp-1': !isAlertExpanded }" ref="alertContentRef">
            ⚠️
            <span v-if="room.attrs.point"
              >注意：当前房间每局游戏需扣除 {{ room.attrs.point }} 积分。</span
            >
            <template v-if="!gameStore.games[room.attrs.type]?.rewardDescription">
              <span v-if="Math.floor(((room.attrs.rate || 1) * room.attrs.point + room.attrs.point) * 0.9) > 1">
                胜利将获得 {{ Math.floor(((room.attrs.rate || 1) * room.attrs.point + room.attrs.point) * 0.9) }} 积分（税额 10%）。
              </span>
              <span v-if="room.attrs.rate > 1">失败将扣除 {{ Math.ceil(room.attrs.rate * room.attrs.point) - room.attrs.point }}。</span>
              <span v-if="room.size > 2">
                失败将扣除 {{ Math.ceil((room.attrs.rate || 1) * room.attrs.point)}} × 胜利人数 - {{ room.attrs.point }}。
              </span>
            </template>
            <span v-else>
              {{ gameStore.games[room.attrs.type]?.rewardDescription }}
            </span>
          </div>
          <span v-else>⚠️ 你不是摸鱼派账号，无法游玩积分局！</span>
          <button 
            v-show="showExpandBtn"
            class="btn btn-xs btn-ghost btn-circle absolute right-1 top-0"
            @click="isAlertExpanded = !isAlertExpanded"
          >
            <Icon :icon="isAlertExpanded ? 'ion:caret-up' : 'ion:caret-down'" />
          </button>
        </div>
      </section>
      <section>
        <RoomControls
          v-if="gameStore.game"
          :game="gameStore.game"
          :room-player="gameStore.roomPlayer"
        >
          <component 
            v-if="gameStore.roomPlayer && ComponentRoomControls" 
            :is="ComponentRoomControls" 
            :game="gameStore.game" 
            :room-player="gameStore.roomPlayer"
          />
                <button
                  v-if="ComponentLite"
                  class="btn btn-circle md:btn-lg btn-soft hidden md:flex tooltip tooltip-left"
                  data-tip="弹出"
                  @click="openSmallWindow('/#/lite')"
                >
                  <Icon icon="majesticons:open-line" />
                </button>
                <button
                  class="btn btn-circle md:btn-lg btn-soft tooltip tooltip-left"
                  data-tip="公共频道"
                  @click="openLobbyChat"
                >
                  <Icon icon="carbon:chat" />
                </button>
          
        </RoomControls>
      </section>
    </header>
      
    <!-- 动态游戏组件 -->
    <div class="flex-1 overflow-auto md:p-4">
      <component 
        v-if="gameStore.roomPlayer.room.attrs?.type && ComponentRoom" 
        :is="ComponentRoom" 
        :game="gameStore.game" 
        :room-player="gameStore.roomPlayer"
        @loaded="loaded"
      />
    </div>
  </section>
</template>
