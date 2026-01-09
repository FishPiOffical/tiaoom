<template>
  <div class="flex flex-col gap-2 w-full shrink-0 select-none">
    <div class="relative bg-base-200 border-4 border-neutral rounded shadow-2xl overflow-hidden shrink-0" 
         style="aspect-ratio: 5 / 12; width: 100%;">
    <!-- SVG Board Background -->
    <svg class="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="-0.5 -0.5 5 12">
        <!-- Background -->
        <rect x="-0.5" y="-0.5" width="6" height="13" class="fill-base-200" />
        <!-- River -->
        <rect x="-0.5" y="5.1" width="6" height="0.8" class="fill-info/20" />
        <!-- Grid Lines & Camps -->
        <g class="stroke-base-content/30" stroke-width="0.04" stroke-linecap="round">
           <!-- Basic Grid -->
           <template v-for="r in 12">
             <line :x1="0" :y1="r-1" :x2="4" :y2="r-1" />
           </template>
           <template v-for="c in 5">
              <line :x1="c-1" :y1="0" :x2="c-1" :y2="5" />
              <line :x1="c-1" :y1="6" :x2="c-1" :y2="11" />
           </template>
           <!-- Diagonals (Camps) -->
           <line x1="0" y1="1" x2="2" y2="3" /> <line x1="2" y1="1" x2="0" y2="3" />
           <line x1="2" y1="1" x2="4" y2="3" /> <line x1="4" y1="1" x2="2" y2="3" />
           <line x1="1" y1="2" x2="3" y2="4" /> <line x1="3" y1="2" x2="1" y2="4" />
           <line x1="0" y1="3" x2="2" y2="5" /> <line x1="2" y1="3" x2="0" y2="5" />
           <line x1="2" y1="3" x2="4" y2="5" /> <line x1="4" y1="3" x2="2" y2="5" />
           
           <line x1="0" y1="6" x2="2" y2="8" /> <line x1="2" y1="6" x2="0" y2="8" />
           <line x1="2" y1="6" x2="4" y2="8" /> <line x1="4" y1="6" x2="2" y2="8" />
           <line x1="1" y1="7" x2="3" y2="9" /> <line x1="3" y1="7" x2="1" y2="9" />
           <line x1="0" y1="8" x2="2" y2="10" /> <line x1="2" y1="8" x2="0" y2="10" />
           <line x1="2" y1="8" x2="4" y2="10" /> <line x1="4" y1="8" x2="2" y2="10" />

           <!-- Railroads -->
           <g class="stroke-base-content/50" stroke-width="0.08" stroke-dasharray="0.1,0.05">
              <line x1="0" y1="1" x2="4" y2="1" /> <line x1="0" y1="5" x2="4" y2="5" />
              <line x1="0" y1="6" x2="4" y2="6" /> <line x1="0" y1="10" x2="4" y2="10" />
              <line x1="0" y1="1" x2="0" y2="10" /> <line x1="4" y1="1" x2="4" y2="10" />
              <line x1="0" y1="5" x2="0" y2="6" stroke-dasharray="0" />
              <line x1="2" y1="5" x2="2" y2="6" stroke-dasharray="0" />
              <line x1="4" y1="5" x2="4" y2="6" stroke-dasharray="0" />
           </g>
        </g>
        <!-- Camps Circles -->
        <g fill="none" class="stroke-base-content/30" stroke-width="0.05">
           <circle v-for="(c,i) in CAMPS" :key="i" :cx="c[1]" :cy="c[0]" r="0.35" class="fill-base-300" />
        </g>
        <!-- HQs -->
        <g v-for="(h,i) in HQS" :key="i">
           <rect :x="h[1]-0.6" :y="h[0]-0.4" width="1.2" height="0.8" rx="0.2" class="fill-warning/20 stroke-warning" stroke-width="0.05" />
           <text :x="h[1]" :y="h[0]" font-size="0.3" text-anchor="middle" dominant-baseline="middle" class="fill-warning">大本营</text>
        </g>
        <text x="2" y="5.7" font-size="0.4" text-anchor="middle" class="fill-info/50">山 界 &nbsp; 山 界</text>
    </svg>

        <!-- Clickable Grid -->
        <div class="absolute inset-0 z-10 grid grid-cols-5 grid-rows-12">
           <div 
             v-for="i in 60" 
             :key="i"
             @click="handlePlayingClick(Math.floor((i-1)/5), (i-1)%5)"
             class="cursor-pointer hover:bg-base-content/5 active:bg-base-content/10 transition-colors"
           ></div>
        </div>

    <!-- Pieces -->
    <div 
         v-for="p in displayPieces" 
         :key="p.key"
         class="absolute pointer-events-none flex items-center justify-center transition-all duration-300"
         :style="{
            top: (p.dr * 8.333) + '%',
            left: (p.dc * 20) + '%',
            width: '20%',
            height: '8.333%',
            padding: '2px'
         }"
    >
         <div 
            class="w-full h-full rounded shadow-md border-2 flex flex-col items-center justify-center text-sm font-bold bg-base-100 relative"
            :class="[
               p.covered ? 'border-neutral bg-neutral-content text-neutral' :
               p.side === 0 ? 'border-error text-error' : 
               p.side === 1 ? 'border-success text-success' : 'border-neutral',
               isSelected(p.r, p.c) ? 'ring-4 ring-primary scale-105 z-30' : ''
            ]"
         >
            <div v-if="p.hidden || p.covered" class="w-full h-full bg-base-300 flex items-center justify-center pattern-diagonal-lines">
               <span v-if="p.covered" class="text-base-content/50 text-xs font-black">?</span>
               <span v-else class="text-base-content/50 text-xs text-center">?</span>
            </div>
            <template v-else>
                <span class="text-[10px] sm:text-xs md:text-sm font-black">{{ p.name }}</span>
            </template>
         </div>
    </div>
  </div>

  <div class="bg-base-100 rounded-lg shadow-sm border border-base-content/10 p-3 flex justify-between items-center">
      <div class="flex flex-col">
          <span class="text-xs font-bold text-base-content/70">当前回合</span>
          <span class="text-[10px] text-base-content/40">{{ mode === 0 ? '暗棋' : mode === 1 ? '明棋' : '翻棋' }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-black" :class="turn === 0 ? 'text-error' : 'text-success'">
            {{ turn === 0 ? '红方' : '绿方' }}
        </span>
        <span v-if="currentPlayer" class="font-bold text-sm text-base-content/90">
            ({{ currentPlayer.name }})
        </span>
      </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';
import { useGameEvents } from "@/hook/useGameEvents";
import { useLuzhanqi } from './useLuzhanqi';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>();

const { 
  board, 
  mySide, 
  turn,
  handlePlayingClick, 
  shouldFlip, 
  isSelected, 
  mode,
  onCommand 
} = useLuzhanqi(props.game, props.roomPlayer);

const currentPlayer = computed(() => {
  // Try to find player by side
  return mySide.value == turn.value ? props.roomPlayer.room.players.find(p => p.id === props.roomPlayer.id) :
         props.roomPlayer.room.players.find(p => p.id !== props.roomPlayer.id && p.role === 'player') || null;
});

useGameEvents(props.game, {
  "player.command": onCommand,
  "room.command": onCommand,
});

const CAMPS = [
  [2,1], [2,3], [3,2], [4,1], [4,3],
  [7,1], [7,3], [8,2], [9,1], [9,3]
];
const HQS = [
  [0,1], [0,3], [11,1], [11,3]
];

const displayPieces = computed(() => {
  const pieces: any[] = [];
  const src = board.value;
  
  if (!src || src.length === 0) return pieces;
  
  for(let r=0; r<12; r++) {
    for(let c=0; c<5; c++) {
       const p = src[r][c];
       if (p) {
         let dr = r;
         let dc = c;
         if (shouldFlip.value) {
           dr = 11 - r;
           dc = 4 - c;
         }
         
         const isMine = p.side === mySide.value;
         const hidden = ! isMine && p.type === 'unknown'; 
         // Flip Mode: if p.revealed is false, it is strictly hidden (back of card)
         // Backend sends side=-1, type='unknown', revealed=false for everyone
         const covered = mode.value === 2 && p.revealed === false;
         
         const name = (hidden || covered) ? '?' : p.name;
         
         pieces.push({
            r, c, 
            dr, dc,
            key: `${r}-${c}`,
            side: p.side,
            name,
            rank: p.rank,
            hidden,
            covered,
            type: p.type
         });
       }
    }
  }
  return pieces;
});
</script>

<style scoped>
.pattern-diagonal-lines {
  background-image: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.05) 5px, rgba(0,0,0,0.05) 10px);
}
</style>
