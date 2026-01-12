<template>
  <section class="flex flex-col md:flex-row gap-4 md:h-full">
    <section class="flex-1 md:h-full flex flex-col items-center justify-start md:justify-center overflow-auto p-4">
      <div class="rounded-box border border-base-content/20 bg-base-100 w-full max-w-xl p-4 space-y-3">
        <div class="w-full h-36 md:h-48 rounded-box overflow-hidden border border-base-content/10">
          <img :src="packImg" alt="药丸博弈" class="w-full h-full object-cover" />
        </div>
        <h3 class="text-lg font-medium">药丸博弈 · 夏洛克与出租车司机</h3>
        <p class="text-sm text-base-content/70 space-y-1 leading-7">
          <span>场上有两颗外观完全相同的胶囊。<b>出租车司机</b>提前知道哪一颗含毒，并将其中一颗递给<b>夏洛克</b>；随后，夏洛克在“交换/不交换”之间做出抉择。无论选择如何，双方都会同时吞下各自的胶囊，谁中毒谁失败。</span>
          <br />
          <span>这是一场信息不对称的心理博弈：出租车司机需要“诱导/反诱导”，夏洛克则要“识破/反识破”。每个决策阶段有 <b>60 秒</b> 思考时间，<b>超时直接判负</b>。请<b>深思熟虑</b>后再点击按钮，最好不要乱点；你也可以在右侧聊天栏公开表达你的想法与策略。</span>
        </p>

        <div v-if="gameStatus === 'playing'" class="flex items-center gap-2">
          <span class="text-sm">倒计时：</span>
          <span class="badge badge-outline">{{ countdown }}s</span>
        </div>

        <div v-if="poisonHint && active?.id === roomPlayer.id" class="alert alert-info">
          <span>你是<b>出租车司机</b>，毒胶囊在：<b>{{ poisonHint === 'left' ? '左' : '右' }}</b></span>
        </div>

        <div v-if="phase === 'pick'" class="space-y-2">
          <div class="text-sm">当前<b>出租车司机</b>：<b>{{ active?.name }}</b></div>
          <div class="join w-full">
            <button class="btn join-item" :disabled="active?.id !== roomPlayer.id || gameStatus !== 'playing'" @click="give('left')">把左胶囊给夏洛克</button>
            <button class="btn join-item" :disabled="active?.id !== roomPlayer.id || gameStatus !== 'playing'" @click="give('right')">把右胶囊给夏洛克</button>
          </div>
        </div>

        <div v-if="phase === 'swap'" class="space-y-2">
          <div class="text-sm">当前<b>夏洛克</b>：<b>{{ passive?.name }}</b></div>
          <div class="join w-full">
            <button class="btn join-item" :disabled="passive?.id !== roomPlayer.id || gameStatus !== 'playing'" @click="decideSwap(true)">交换</button>
            <button class="btn join-item" :disabled="passive?.id !== roomPlayer.id || gameStatus !== 'playing'" @click="decideSwap(false)">不交换</button>
          </div>
        </div>

        <div v-if="result" class="mt-3 p-3 rounded border border-base-content/10 bg-base-300/20 text-sm">
          <div>毒胶囊：<b>{{ result.poison === 'left' ? '左' : '右' }}</b></div>
          <div>出租车司机给出的胶囊：<b>{{ result.given === 'left' ? '左' : '右' }}</b></div>
          <div>夏洛克选择：<b>{{ result.swapped ? '交换' : '不交换' }}</b></div>
          <div class="mt-2">结果：
            <b v-if="result.winner">{{ winnerRole }} {{ result.winner.name }} 获胜</b>
            <span v-else>平局</span>
          </div>
        </div>
      </div>
    </section>

    <aside class="w-full md:w-96 flex-none border-t md:border-t-0 md:border-l border-base-content/20 pt-4 md:pt-0 md:pl-4 space-y-4 md:h-full flex flex-col">
      <!-- 操作按钮 -->
      <div v-if="isPlaying && roomPlayer.role === PlayerRole.player" class="group flex gap-2">
        <button class="btn" 
          @click="requestDraw"
          :disabled="(phase === 'pick' ? active?.id : passive?.id) !== roomPlayer.id"
        >
          求和
        </button>
        <button class="btn" 
          @click="requestLose"
          :disabled="(phase === 'pick' ? active?.id : passive?.id) !== roomPlayer.id"
        >
          认输
        </button>
      </div>

      <PlayerList :players="roomPlayer.room.players">
        <template #default="{ player: p }">
          <span v-if="p.role === 'player'">
            <span>[{{ getRoleLabel(p) }}]</span>
            <span>[{{ getPlayerStatus(p) }}]</span>
          </span>
          <span v-else>[围观中]</span>
          <span>{{ p.name }}</span>
        </template>
      </PlayerList>

      <GameChat>
        <template #rules>
          <ul class="space-y-2 text-sm">
            <li>1. <b>出租车司机</b>知道哪颗胶囊有毒。</li>
            <li>2. 出租车司机将其中一颗交给<b>夏洛克</b>。</li>
            <li>3. 夏洛克可选择是否<b>交换</b>。</li>
            <li>4. 双方吃下各自胶囊；<b>中毒者失败</b>。</li>
            <li>5. 每个决策阶段有 <b>60 秒</b> 倒计时，<b>超时直接判负</b>。</li>
            <li>6. 支持明牌聊天，所有人可见；<b>请慎重点击，操作不可撤销</b>。</li>
          </ul>
        </template>
      </GameChat>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { PlayerRole, type RoomPlayer, type Room } from 'tiaoom/client'
import type { GameCore } from '@/core/game'
import GameChat from '@/components/common/GameChat.vue'
import { usePackbattle } from './usePackbattle'
import { computed, onMounted } from 'vue'

const props = defineProps<{ roomPlayer: RoomPlayer & { room: Room }, game: GameCore }>()

const packImg = new URL('@/assets/images/pack.png', import.meta.url).href

const {
  isPlaying,
  gameStatus,
  phase,
  active,
  passive,
  countdown,
  poisonHint,
  result,
  give,
  decideSwap,
  requestDraw,
  requestLose,
} = usePackbattle(props.game, props.roomPlayer)

const winnerRole = computed(() => {
  if (!result || !result.value || !result.value.winner) return ''
  return result.value.winner.id === active?.value?.id ? '出租车司机' : '夏洛克'
})

function getRoleLabel(p: any) {
  if (p.role !== 'player') return '观众'
  if (gameStatus.value !== 'playing') return '玩家'
  if (active?.value?.id === p.id) return '出租车司机'
  if (passive?.value?.id === p.id) return '夏洛克'
  return '玩家'
}

function getPlayerStatus(p: any) {
  if (!p.isReady) return '未准备'
  if (gameStatus.value === 'waiting') return '准备好了'
  if (phase.value === 'pick' && active?.value?.id === p.id) return '思考中'
  if (phase.value === 'swap' && passive?.value?.id === p.id) return '思考中'
  if (gameStatus.value === 'playing') return '等待中'
  return '准备好了'
}

const emit = defineEmits<{
  (e: 'loaded'): void
}>()
onMounted(() => {
  emit("loaded");
})
</script>
