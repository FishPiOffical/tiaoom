<template>
  <div class="flex flex-col h-full">
    <div class="flex-1 flex items-center justify-center overflow-auto p-4 bg-base-100">
      <div class="inline-block p-3 rounded">
        <AeroplaneChessBoard
          :state="currentState"
          :my-player-id="''"
          :movable="[]"
          :can-move="false"
          :cell-px="cellPx"
        />
      </div>
    </div>
    
    <!-- Controls -->
    <div class="p-4 bg-base-200 border-t border-base-300 shrink-0">
      <div class="flex items-center gap-4 mb-2">
        <button class="btn btn-sm btn-ghost" @click="step = 0" :disabled="step <= 0">
          <span class="text-lg">⏮</span>
        </button>
        <button class="btn btn-sm btn-ghost" @click="step--" :disabled="step <= 0">
          <span class="text-lg">◀</span>
        </button>
        <span class="flex-1 text-center text-sm font-mono">
          {{ step }} / {{ history.length }}
        </span>
        <button class="btn btn-sm btn-ghost" @click="step++" :disabled="step >= history.length">
          <span class="text-lg">▶</span>
        </button>
        <button class="btn btn-sm btn-ghost" @click="step = history.length" :disabled="step >= history.length">
          <span class="text-lg">⏭</span>
        </button>
      </div>
      <input 
        type="range" 
        min="0" 
        :max="history.length" 
        v-model.number="step" 
        class="range range-xs range-primary" 
      />
      <div class="mt-2 text-center text-sm h-6 font-bold text-primary">
        {{ currentHistoryItem?.text || '游戏开始' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AeroplaneChessBoard from './AeroplaneChessBoard.vue';
import { AeroplaneColor } from './board';
import { AeroplaneGameState } from './useAeroplaneChess';

interface AeroplaneHistoryItem {
  playerId: string;
  action: 'roll' | 'move';
  roll?: number;
  pieceIndex?: number;
  to?: string;
  text: string;
  timestamp: number;
}

interface AeroplanePiece {
  index: 0 | 1 | 2 | 3;
  area: 'hangar' | 'main' | 'home' | 'finish';
  pos: string;
  posIndex: number;
}

interface AeroplanePlayerState {
  playerId: string;
  color: AeroplaneColor;
  pieces: AeroplanePiece[];
}

const props = defineProps<{
  history: AeroplaneHistoryItem[];
  players: { id: string; name: string; color: AeroplaneColor }[];
}>();

const step = ref(0);
const cellPx = ref(34);

const currentHistoryItem = computed(() => {
  if (step.value === 0) return null;
  return props.history[step.value - 1];
});

const currentState = computed<AeroplaneGameState>(() => {
  // Initialize state
  const players: Record<string, AeroplanePlayerState> = {};
  
  props.players.forEach(p => {
    players[p.id] = {
      playerId: p.id,
      color: p.color,
      pieces: [0, 1, 2, 3].map(n => ({
        index: n as 0|1|2|3,
        area: 'hangar',
        pos: `${p.color}h${n}`,
        posIndex: -1
      }))
    };
  });

  // Apply history up to step
  for (let i = 0; i < step.value; i++) {
    const item = props.history[i];
    if (item.action === 'move' && item.pieceIndex !== undefined && item.to) {
      const p = players[item.playerId];
      if (p) {
        const piece = p.pieces.find(pc => pc.index === item.pieceIndex);
        if (piece) {
          piece.pos = item.to;
          // Update area
          if (piece.pos.includes('h')) {
            piece.area = 'hangar';
          } else if (piece.pos.endsWith('19') && piece.pos.startsWith(p.color)) {
             piece.area = 'finish';
          } else {
            piece.area = 'main'; // or home
          }
          
          // Check for captures
          Object.values(players).forEach(otherP => {
            if (otherP.playerId === item.playerId) return;
            otherP.pieces.forEach(otherPiece => {
              if (otherPiece.area !== 'hangar' && otherPiece.area !== 'finish' && otherPiece.pos === piece.pos) {
                // Capture!
                otherPiece.area = 'hangar';
                otherPiece.pos = `${otherP.color}h${otherPiece.index}`;
                otherPiece.posIndex = -1;
              }
            });
          });
        }
      }
    }
  }

  return { players } as any as AeroplaneGameState;
});

</script>
