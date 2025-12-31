<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">
    <div class="flex-1 flex flex-col items-center justify-center gap-4 p-4 overflow-y-auto">
      <div v-if="roomPlayer.room.status === 'waiting' && !revealedDice" class="text-xl opacity-60">
        等待游戏开始...
      </div>
      <template v-else>
        <!-- Last Bid Info -->
        <div v-if="lastBid" class="text-xl font-bold flex items-center gap-2">
          上家叫号: {{ lastBid.count }} 个 <Icon :icon="getDiceIcon(lastBid.face)" class="text-2xl" />
          <span v-if="isZhai" class="badge badge-error">斋</span>
        </div>
        <div v-else-if="roomPlayer.room.status === 'waiting'" class="text-xl font-bold">
          等待游戏开始
        </div>
        <div v-else class="text-xl font-bold">
          等待开始叫号
        </div>

        <!-- Current Player -->
        <div class="text-lg">
          当前回合: <span class="font-bold text-primary">{{ currentPlayer?.name }}</span>
        </div>

        <!-- My Dice -->
        <div class="flex flex-col items-center gap-2 bg-base-200 p-4 card">
          <h3 class="font-bold">我的骰子</h3>
          <div class="flex gap-2">
            <div v-for="(d, i) in myDice" :key="i" class="text-4xl text-secondary">
              <Icon :icon="getDiceIcon(d)" />
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div v-if="isMyTurn" class="inline-flex flex-col gap-4 items-center bg-base-200 p-4 card">
          <div class="inline-flex flex-col gap-2 w-full">
            <div class="flex items-center gap-2 justify-center">
              <button class="btn btn-circle" @click="bidCount--">
                <Icon icon="mdi:minus" />
              </button>
              <input type="number" v-model.number="bidCount" class="input input-bordered w-20 text-center" min="1" />
              <button class="btn btn-circle" @click="bidCount++">
                <Icon icon="mdi:plus" />
              </button>
              <span>个</span>
            </div>
            
            <div class="join justify-center">
              <button 
                v-for="f in 6" 
                :key="f" 
                class="btn join-item btn-lg" 
                :class="{ 'btn-primary': bidFace === f }"
                @click="bidFace = f"
              >
                <Icon :icon="getDiceIcon(f)" class="text-xl" />
              </button>
            </div>
            <div class="flex justify-center items-center gap-2">
              <label class="label cursor-pointer gap-2">
                  <span class="label-text font-bold">斋</span> 
                  <input type="checkbox" class="checkbox checkbox-primary" v-model="bidZhai" :disabled="isZhai || bidFace === 1" />
              </label>
            </div>
          </div>
          <div class="inline-flex gap-4 w-full">
            <button class="btn btn-success flex-1" @click="handleBid" :disabled="!isValidBid">叫号</button>
            <button class="btn btn-error flex-1" @click="open" :disabled="!lastBid">开！</button>
          </div>
        </div>
        <div v-else class="text-base-content/60">
          等待 {{ currentPlayer?.name }} 操作...
        </div>

        <!-- Revealed Dice (Game Over) -->
        <div v-if="revealedDice" class="w-full mt-4">
          <h3 class="text-center font-bold mb-2">开牌结果</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div v-for="(dice, pid) in revealedDice" :key="pid" class="bg-base-200 p-2 rounded flex justify-between items-center">
              <div class="font-bold truncate">{{ getPlayerName(pid) }}</div>
              <div class="flex gap-1">
                <Icon v-for="(d, i) in dice" :key="i" :icon="getDiceIcon(d)" class="text-2xl" :class="{'text-primary': isHit(d)}" />
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <template #rules>
      <ul class="space-y-2 text-sm">
        <li>1. 每人5颗骰子。</li>
        <li>2. 轮流叫号，必须比上家大（数量更多，或数量相同点数更大）。</li>
        <li>3. 1点可以作为任意点数（除非叫的是1点，或者已经进入“斋”局）。</li>
        <li>4. 叫“斋”或者叫“1点”后，本局游戏进入“斋”模式，1点不再作为赖子。</li>
        <li>5. 觉得上家吹牛可以“开”，比较实际数量与叫号数量。</li>
      </ul>
    </template>
  </GameView>
</template>

<script setup lang="ts">
import { RoomPlayer, Room } from "tiaoom/client";
import { GameCore } from "@/core/game";
import { useLiarsDice } from "./useLiarsDice";
import { ref, computed, watch } from "vue";

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room };
  game: GameCore;
}>();

const { onCommand, bid, open, isMyTurn, myDice, currentPlayer, lastBid, revealedDice, isZhai } = useLiarsDice(props.game, props.roomPlayer);

const bidCount = ref(1);
const bidFace = ref(2);
const bidZhai = ref(false);

// Auto update bid inputs based on lastBid
watch(lastBid, (newVal) => {
  if (newVal) {
    bidCount.value = newVal.count;
    bidFace.value = newVal.face;
    // 如果上家是斋，或者叫的是1，或者当前已经是斋局，则默认勾选斋
    if (newVal.zhai || newVal.face === 1 || isZhai.value) {
        bidZhai.value = true;
    } else {
        bidZhai.value = false;
    }
  }
});

// 监听 isZhai 变化，强制勾选
watch(isZhai, (val) => {
    if (val) bidZhai.value = true;
});

// 监听 bidFace 变化，如果是1，强制勾选
watch(bidFace, (val) => {
    if (val === 1) bidZhai.value = true;
    else if (!isZhai.value) bidZhai.value = false;
});

const isValidBid = computed(() => {
  if (!lastBid.value) return bidCount.value > 0;
  
  // 数量必须增加或不变
  if (bidCount.value < lastBid.value.count) return false;

  // 如果数量增加，肯定合法
  if (bidCount.value > lastBid.value.count) return true;

  // 如果数量不变
  // 点数必须增加
  if (bidFace.value > lastBid.value.face) return true;
  
  // 如果点数也不变（或者变小），看是否是从飞变斋
  if (bidFace.value === lastBid.value.face) {
      // 只有当上家没斋，且我现在斋了，才算大
      if (!lastBid.value.zhai && (bidZhai.value || bidFace.value === 1)) return true;
  }

  return false;
});

function handleBid() {
  if (isValidBid.value) {
    bid(bidCount.value, bidFace.value, bidZhai.value);
  }
}

function getDiceIcon(face: number) {
  return `mdi:dice-${face}`;
}

function getPlayerName(id: string) {
  return props.roomPlayer.room.players.find(p => p.id === id)?.name || id;
}

function isHit(face: number) {
    if (!lastBid.value) return false;
    // 如果是斋局，只有点数相同才算
    if (isZhai.value) {
        return face === lastBid.value.face;
    }
    // 否则 1 也是赖子
    return face === lastBid.value.face || face === 1;
}
</script>
