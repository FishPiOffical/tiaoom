<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">
    <div class="flex-1 flex flex-col items-center justify-center gap-6 p-4">
      <div class="text-center space-y-2">
        <div class="text-3xl font-bold">底池: {{ pot }} 筹码</div>
        <div class="text-xl">当前下注: {{ currentBet }}</div>
        <div class="badge badge-primary badge-lg">{{ stageText }}</div>
      </div>

      <div class="flex gap-2 min-h-[100px] items-center">
        <div v-for="card in communityCards" :key="`${card.suit}-${card.rank}`" class="card bg-base-100 shadow-xl w-16 h-24 flex items-center justify-center">
          <div class="text-center">
            <div class="text-2xl" :class="getCardColor(card.suit)">{{ card.rank }}</div>
            <div class="text-xl">{{ card.suit }}</div>
          </div>
        </div>
        <div v-if="communityCards.length === 0" class="text-gray-400">等待发牌...</div>
      </div>

      <div class="grid grid-cols-3 gap-4 w-full max-w-2xl">
        <div v-for="player in playerStates" :key="player.id" class="card bg-base-200 p-3" :class="{ 'ring-2 ring-primary': player.id === currentPlayerId }">
          <div class="font-semibold">{{ getPlayerName(player.id) }}</div>
          <div class="text-sm">筹码: {{ player.chips }}</div>
          <div class="text-sm">下注: {{ player.bet }}</div>
          <div v-if="player.folded" class="badge badge-error">已弃牌</div>
          <div v-if="player.allIn" class="badge badge-warning">全下</div>
        </div>
      </div>

      <div v-if="myCards.length > 0" class="space-y-2">
        <div class="text-center font-semibold">我的手牌</div>
        <div class="flex gap-2">
          <div v-for="card in myCards" :key="`${card.suit}-${card.rank}`" class="card bg-base-100 shadow-xl w-20 h-28 flex items-center justify-center">
            <div class="text-center">
              <div class="text-3xl" :class="getCardColor(card.suit)">{{ card.rank }}</div>
              <div class="text-2xl">{{ card.suit }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="countdown > 0" class="text-2xl font-bold text-warning">
        {{ countdown }}s
      </div>
    </div>

    <template #actions>
      <div v-if="isMyTurn" class="space-y-3">
        <button class="btn btn-error btn-block" @click="handleFold">
          弃牌
        </button>
        <button class="btn btn-primary btn-block" @click="handleCall" :disabled="currentBet === 0">
          跟注 {{ callAmount }}
        </button>
        <div class="form-control">
          <label class="label">
            <span class="label-text">加注金额</span>
          </label>
          <input v-model.number="raiseAmount" type="number" class="input input-bordered" :min="currentBet + 10" />
          <button class="btn btn-success btn-block mt-2" @click="handleRaise">
            加注
          </button>
        </div>
        <button class="btn btn-warning btn-block" @click="handleAllIn">
          全下
        </button>
      </div>
      <div v-else class="text-center text-gray-500">
        等待其他玩家...
      </div>
    </template>

    <template #rules>
      <ul class="space-y-2 text-sm">
        <li>1. 每位玩家获得2张底牌</li>
        <li>2. 5张公共牌分3轮发出（翻牌3张、转牌1张、河牌1张）</li>
        <li>3. 每轮发牌后进行下注</li>
        <li>4. 可选择弃牌、跟注、加注或全下</li>
        <li>5. 最后比较牌型大小，最大者获胜</li>
        <li>6. 每回合30秒倒计时，超时自动弃牌</li>
      </ul>
    </template>
  </GameView>
</template>

<script setup lang="ts">
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';
import { computed, ref } from 'vue';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room };
  game: GameCore;
}>();

interface Card {
  suit: string;
  rank: string;
}

interface PlayerState {
  id: string;
  chips: number;
  bet: number;
  folded: boolean;
  allIn: boolean;
}

const myCards = ref<Card[]>([]);
const communityCards = ref<Card[]>([]);
const pot = ref(0);
const currentBet = ref(0);
const currentPlayerId = ref('');
const stage = ref<'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('preflop');
const playerStates = ref<PlayerState[]>([]);
const countdown = ref(0);
const raiseAmount = ref(0);

let timer: any = null;

const stageText = computed(() => {
  const stages = {
    preflop: '翻牌前',
    flop: '翻牌',
    turn: '转牌',
    river: '河牌',
    showdown: '摊牌',
  };
  return stages[stage.value];
});

const isMyTurn = computed(() => {
  return (
    props.roomPlayer.role === 'player' &&
    props.roomPlayer.room.status === 'playing' &&
    currentPlayerId.value === props.roomPlayer.id
  );
});

const myState = computed(() => {
  return playerStates.value.find(p => p.id === props.roomPlayer.id);
});

const callAmount = computed(() => {
  if (!myState.value) return 0;
  return currentBet.value - myState.value.bet;
});

function getPlayerName(playerId: string): string {
  const player = props.roomPlayer.room.players.find(p => p.id === playerId);
  return player?.name || '未知';
}

function getCardColor(suit: string): string {
  return suit === '♥' || suit === '♦' ? 'text-red-500' : 'text-black';
}

function handleFold() {
  props.game.command(props.roomPlayer.room.id, { type: 'fold' });
}

function handleCall() {
  props.game.command(props.roomPlayer.room.id, { type: 'call' });
}

function handleRaise() {
  if (raiseAmount.value <= currentBet.value) {
    alert('加注金额必须大于当前下注');
    return;
  }
  props.game.command(props.roomPlayer.room.id, {
    type: 'raise',
    data: { amount: raiseAmount.value - currentBet.value },
  });
}

function handleAllIn() {
  props.game.command(props.roomPlayer.room.id, { type: 'allin' });
}

function startLocalTimer() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) clearInterval(timer);
  }, 1000);
}

function onCommand(msg: any) {
  switch (msg.type) {
    case 'deal':
      myCards.value = msg.data.cards;
      break;

    case 'state':
      pot.value = msg.data.pot;
      currentBet.value = msg.data.currentBet;
      currentPlayerId.value = msg.data.currentPlayerId;
      stage.value = msg.data.stage;
      communityCards.value = msg.data.communityCards || [];
      playerStates.value = msg.data.players;
      raiseAmount.value = currentBet.value + 10;
      break;

    case 'stage':
      stage.value = msg.data.stage;
      communityCards.value = msg.data.communityCards;
      break;

    case 'showdown':
      break;

    case 'countdown':
      countdown.value = msg.data.seconds;
      startLocalTimer();
      break;

    case 'status':
      myCards.value = msg.data.myCards || [];
      pot.value = msg.data.pot || 0;
      currentBet.value = msg.data.currentBet || 0;
      stage.value = msg.data.stage || 'preflop';
      communityCards.value = msg.data.communityCards || [];
      playerStates.value = msg.data.players || [];
      raiseAmount.value = currentBet.value + 10;

      if (msg.data.tickTimeEnd?.['action']) {
        countdown.value = Math.max(
          0,
          Math.ceil((msg.data.tickTimeEnd['action'] - Date.now()) / 1000)
        );
        startLocalTimer();
      }
      break;
  }
}
</script>
