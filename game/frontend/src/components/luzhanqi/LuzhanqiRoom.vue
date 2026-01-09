<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">
    <div class="flex-1 flex flex-col items-center justify-center p-2 select-none overflow-hidden w-full h-full relative">
      <!-- Board Container -->
      <div 
        class="relative bg-base-200 border-4 border-neutral rounded shadow-2xl overflow-hidden shrink-0" 
        style="aspect-ratio: 5/12; height: 100%; max-width: 100%;"
      >
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
             @click="handleCellClick(Math.floor((i-1)/5), (i-1)%5)"
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
                  p.side === 0 ? 'border-error text-error' : 'border-success text-success',
                  isSelected(p.r, p.c) ? 'ring-4 ring-primary scale-105 z-30' : ''
                ]"
             >
                <div v-if="p.hidden" class="w-full h-full bg-base-300 flex items-center justify-center pattern-diagonal-lines">
                   <span class="text-base-content/50 text-xs text-center">?</span>
                </div>
                <template v-else>
                    <span class="text-[10px] sm:text-xs md:text-sm font-black">{{ p.name }}</span>
                </template>
             </div>
        </div>
      </div>
    </div>

    <!-- Actions Slot -->
    <template #actions>
      <!-- Playing Phase Actions -->
      <div v-if="phase === 'playing'" class="flex flex-col gap-2 w-full max-w-sm">
         <div class="flex gap-4 p-2 bg-base-100 rounded-lg shadow">
           <div class="flex-1 text-center">
              <div class="text-xs text-base-content/60">我的阵营</div>
              <div class="font-bold text-lg" :class="mySide === 0 ? 'text-error' : 'text-success'">
                 {{ mySide === 0 ? '红方' : '绿方' }}
              </div>
           </div>
           <div class="flex-1 text-center">
              <div class="text-xs text-base-content/60">当前回合</div>
              <div class="font-bold text-lg" :class="turn === 0 ? 'text-error' : 'text-success'">
                 {{ turn === 0 ? '红方' : '绿方' }} <span class="text-sm text-base-content/70 font-normal">({{ countdown }}s)</span>
              </div>
           </div>
         </div>
         <div class="text-xs text-center text-base-content/40">
            模式: {{ mode === 0 ? '暗棋' : '明棋' }}
         </div>
      </div>
      
      <!-- Deployment Actions -->
      <div v-else-if="phase === 'deploy' && isPlaying" class="flex flex-col gap-4 w-full">
           <div class="flex justify-between items-center bg-base-100 p-2 rounded-lg shadow">
               <span class="font-bold text-sm">{{ isReady ? '等待对手...' : `布阵中 (${countdown}s)` }}</span>
               <div class="flex gap-1" v-if="!isReady">
                   <button class="btn btn-xs btn-ghost" @click="autoDeploy">自动</button>
                   <button class="btn btn-xs btn-error btn-outline" @click="clearBoard">清空</button>
                   <button class="btn btn-xs btn-primary" :disabled="!isFull" @click="confirmDeploy">完成</button>
               </div>
           </div>
           
           <!-- Inventory -->
           <div v-if="!isReady" class="grid grid-cols-4 gap-1 max-h-60 overflow-y-auto p-1 bg-base-200 rounded-lg">
               <button 
                  v-for="p in inventory" 
                  :key="p.name"
                  class="btn btn-xs h-auto py-1 flex flex-col items-center gap-0.5"
                  :class="selectedPieceType === p.name ? 'btn-primary' : 'btn-ghost bg-base-100'"
                  :disabled="p.left === 0"
                  @click="selectedPieceType = p.name"
               >
                  <span class="text-xs scale-90">{{ p.name }}</span>
                  <span class="badge badge-xs badge-neutral">{{ p.left }}</span>
               </button>
           </div>
      </div>
    </template>
    
    <template #rules>
       <div class="text-xs space-y-1">
         <p>1. 军旗被夺或所有可移动棋子被灭，则输。</p>
         <p>2. 司令 > 军长 > ... > 工兵。</p>
         <p>3. 炸弹与任何棋子同归于尽。</p>
         <p>4. 地雷胜过除工兵、炸弹外所有棋子。</p>
         <p>5. 军旗需在大本营，炸弹不在第一排。</p>
       </div>
    </template>
  </GameView>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';
import { useLuzhanqi } from './useLuzhanqi';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>();

const { 
  board, 
  mySide, 
  turn, 
  phase, 
  isReady, 
  countdown, 
  localBoard, 
  selectedPieceType, 
  inventory, 
  isFull, 
  autoDeploy, 
  clearBoard, 
  confirmDeploy, 
  handleCellClick, 
  isSelected, 
  onCommand: onGameCommand, 
  shouldFlip,
  mode,
  CAMPS, 
  HQS 
} = useLuzhanqi(props.game, props.roomPlayer);

const isPlaying = computed(() => {
  return props.roomPlayer.role === 'player' && props.roomPlayer.room.status === 'playing';
});

const displayPieces = computed(() => {
  const pieces: any[] = [];
  // Use localBoard if deploy (but don't show when ready if backend not sync?), actually if ready, show backend?
  // If ready, we wait. Backend will broadcast playing eventually.
  // We can show our deployment.
  const src = (phase.value === 'deploy' && !isReady.value) ? localBoard.value : board.value;
  
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
         const name = hidden ? '' : p.name;
         
         pieces.push({
            r, c, 
            dr, dc,
            key: `${r}-${c}`,
            side: p.side,
            name,
            rank: p.rank,
            hidden,
            type: p.type
         });
       }
    }
  }
  return pieces;
});

function onCommand(msg: any) {
  onGameCommand(msg);
}
</script>

<style scoped>
.pattern-diagonal-lines {
  background-image: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.05) 5px, rgba(0,0,0,0.05) 10px);
}
</style>
