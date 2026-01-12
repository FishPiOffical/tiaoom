<template>
  <GameView :room-player="roomPlayer" :game="game" @command="onCommand">
    <div class="flex-1 flex flex-col items-center justify-center p-4">
      <!-- Players Info -->
      <div class="w-full max-w-[600px] flex flex-wrap gap-4 justify-center mb-4">
        <div v-for="(p, i) in players" :key="p.id"
             class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border-2 transition-all shadow-sm"
             :class="[
               {
                 'scale-110 ring-2 ring-primary ring-offset-2 z-10': turnIndex === i,
                 'opacity-60 grayscale': turnIndex !== i
               },
               getZoneData(p.color).border,
               turnIndex === i ? 'bg-base-100 text-base-content' : '',
               turnIndex !== i ? getZoneData(p.color).text : ''
             ]">
          <div class="w-3 h-3 rounded-full shadow-inner" :class="getZoneData(p.color).bg"></div>
          <span>{{ p.name }}</span>
          <span v-if="p.id === roomPlayer.id" class="badge badge-xs ml-1">我</span>
        </div>
      </div>

      <!-- Game Board -->
      <div class="relative w-full max-w-[600px] aspect-square select-none p-4">
        <svg viewBox="-140 -140 280 280" class="w-full h-full drop-shadow-2xl filter transition-transform duration-700 ease-in-out" 
             :style="{ transform: `rotate(${boardRotation}deg)` }">
            <!-- Board Base -->
            <polygon :points="boardPolygon" class="fill-base-300 stroke-base-content/10 stroke-1" />

            <!-- Hint Lines (Optional) -->
            
            <!-- Holes -->
            <g v-for="h in hexes" :key="h.key">
                <circle :cx="h.x" :cy="h.y" r="4.8" 
                   class="transition-colors duration-200 stroke-base-content/50 stroke-[0.5] "
                   :class="[
                      // Interactive state (selectable or reachable)
                      isInteractive(h) ? 'fill-base-content/40 cursor-pointer hover:fill-primary/50' : '',
                      
                      // Zone background (if empty and not interactive)
                      !isInteractive(h) && !isReachable(h) && getHexZoneIndex(h.q, h.r, h.s) !== -1 ? 'fill-base-content/20' : '',

                      // Default empty background
                      !isInteractive(h) && !isReachable(h) && getHexZoneIndex(h.q, h.r, h.s) === -1 ? 'fill-base-content/20' : '',
                      
                      isReachable(h) ? 'cursor-pointer' : ''
                   ]"
                   @click="handleClick(h)" />
                
                <!-- Reachable Hint -->
                <circle v-if="isReachable(h)" :cx="h.x" :cy="h.y" r="2.5" 
                   class="fill-success/80 animate-pulse pointer-events-none" />
            </g>

            <!-- Selection Ring -->
             <circle v-if="selected" :cx="selected.x" :cy="selected.y" r="7" 
                    class="fill-none stroke-primary stroke-2 opacity-80 pointer-events-none" />

            <!-- Pieces -->
            <g v-for="piece in pieceList" :key="piece.key">
                 <circle :cx="piece.x" :cy="piece.y" r="4.5"
                    class="transition-all duration-300 shadow-sm"
                    :class="[
                        getZoneData(getPlayerColorCode(piece.pid)).fill,
                        {
                            'opacity-50': lastMoveFrom === piece.key,
                            'opacity-60': piece.pid !== players[turnIndex]?.id,
                            'stroke-2 stroke-base-100': true,
                            'cursor-pointer': isMyTurn && piece.pid === roomPlayer.id
                        }
                    ]"
                    style="filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.3));"
                    @click="handleClick(piece)"
                 />
                 <!-- Highlight last moved piece -->
                 <circle v-if="lastMoveTo === piece.key" :cx="piece.x" :cy="piece.y" r="4.5"
                    class="fill-base-content animate-ping opacity-30 pointer-events-none" />
            </g>

            <!-- Animating Piece -->
             <circle v-if="animatingPiece" :cx="animatingPiece.x" :cy="animatingPiece.y" r="4.8"
                class="transition-all duration-300 ease-in-out shadow-lg pointer-events-none"
                :class="[
                   getZoneData(getPlayerColorCode(animatingPiece.pid)).fill,
                   'stroke-2 stroke-base-100'
                ]"
                style="filter: drop-shadow(0 2px 2px rgb(0 0 0 / 0.4));"
             />
        </svg>

        <!-- Victory Overlay -->
        <div v-if="winnerText" class="absolute inset-0 z-50 flex items-center justify-center bg-base-300/30 backdrop-blur-[1px] rounded-full">
             <div class="bg-base-100/90 text-primary shadow-xl px-8 py-4 rounded-xl border-2 border-primary/20 text-2xl font-black animate-bounce whitespace-nowrap">
                 {{ winnerText }}
             </div>
        </div>
      </div>

       <div class="h-8 flex items-center justify-center gap-2">
            <button v-if="isMyTurn && isMoving" @click="commitMove" class="btn btn-sm btn-primary">完成回合</button>
            <button v-if="isMyTurn && isMoving" @click="cancelMove" class="btn btn-sm btn-ghost">撤回重置</button>
            <button v-if="isMyTurn && ((!isMoving && selected))" @click="resetSelection" class="btn btn-sm btn-ghost">取消选择</button>
       </div>
    </div>

    <template #rules>
        <div class="space-y-2 text-sm opacity-80">
            <p>1. 目标：率先将所有棋子移动到对面的三角形区域。</p>
            <p>2. 平移：移动到相邻的一个空位。</p>
            <p>3. 跳跃：隔一个棋子跳到前方空位，且可连续跳跃。</p>
        </div>
    </template>

    <template #actions="{ isPlaying }">
      <button v-if="isPlaying" class="btn btn-error w-full" @click="resign">认输</button>
      <button v-if="isPlaying && players.length == 2" class="btn btn-warning w-full" @click="offerDraw">求和</button>
    </template>
  </GameView>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';
import { 
    Hex, hexes, getHex, getZoneData, getHexZoneIndex 
} from './useChineseChecker';

const props = defineProps<{
  roomPlayer: RoomPlayer & { room: Room }
  game: GameCore
}>();

function resign() {
    if (!confirm('确定要认输吗？此操作无法撤销。')) return;
    props.game.command(props.roomPlayer.room.id, { type: 'resign' });
}

function offerDraw() {
    if (!confirm('确定要向对方求和吗？')) return;
    props.game.command(props.roomPlayer.room.id, { type: 'request-draw' });
}

// --- Types ---
interface PlayerInfo {
    id: string;
    name: string;
    color: number; // zone index 0-5
    target: number;
}

// --- State ---
const board = ref<Record<string, string>>({}); // key -> playerId
const players = ref<PlayerInfo[]>([]);
const turnIndex = ref(0);
const selected = ref<Hex | null>(null);
const reachable = ref<Record<string, Hex[]>>({}); // key -> path to get there (array of Hex)
const lastMoveFrom = ref<string | null>(null);
const lastMoveTo = ref<string | null>(null);
const pendingPath = ref<Hex[]>([]);
const isMoving = ref(false);
const animatingPiece = ref<{ pid: string, x: number, y: number } | null>(null);
const winnerText = ref<string | null>(null);

const boardRotation = computed(() => {
    const me = players.value.find(p => p.id === props.roomPlayer.id);
    if (!me) return 0;
    // 0: Bottom, 1: SE, 2: NE, 3: Top, 4: NW, 5: SW (CCW arrangement)
    // To bring "me" to Bottom: rotate CW by color * 60
    return me.color * 60;
});

// --- Layout Polygon logic (approximate for background)
const boardPolygon = computed(() => {
    // Just a large hexagon or star shape points?
    // Simplified: No background polygon or simple circle.
    return "";
});

// --- Helpers ---
const isMyTurn = computed(() => {
    return players.value[turnIndex.value]?.id === props.roomPlayer.id;
});

function getPlayerColorCode(pid: string) {
    const p = players.value.find(p => p.id === pid);
    return p ? p.color : 0;
}

const pieceList = computed(() => {
    return Object.entries(board.value).map(([key, pid]) => {
        const h = getHex(key);
        if (!h) return null;
        return { ...h, pid };
    }).filter(Boolean) as (Hex & { pid: string })[];
});


// --- Game Logic ---

function handleClick(h: Hex) {
    if (!isMyTurn.value) return;

    // 1. Initial Selection
    if (board.value[h.key] === props.roomPlayer.id && !isMoving.value) {
        selected.value = h;
        pendingPath.value = [h];
        calculateOneStepReachable(h, true); // Allow Step & Jump
        return;
    }

    // 2. Continuing Move (or First Move)
    if (selected.value && !board.value[h.key] && reachable.value[h.key]) {
        // Target is Valid
        // Detect if Step or Jump
        const start = selected.value;
        const dq = h.q - start.q;
        const dr = h.r - start.r;
        const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq-dr));
        const isStep = dist === 1;

        if (isStep) {
            // Cannot continue after step. Commit immediately.
             props.game.command(props.roomPlayer.room.id, {
                type: 'move',
                data: { path: [{q: start.q, r: start.r}, {q: h.q, r: h.r}] }
            });
            resetSelection();
        } else {
            // Jump
            // Enter/Continue Moving State
            isMoving.value = true;
            
            // Update Visuals (Optimistic local move)
            delete board.value[selected.value.key];
            board.value[h.key] = props.roomPlayer.id; // Tempoarily move piece here
            
            selected.value = h;
            pendingPath.value.push(h);
            
            // Calculate next reachable (Jumps ONLY)
            calculateOneStepReachable(h, false);
        }
    } else {
        // Click elsewhere
        // If moving, maybe ignore? Or allow cancel?
        // Let's enforce using buttons for explicit actions
        if (!isMoving.value) {
            resetSelection();
        }
    }
}

function commitMove() {
     if (pendingPath.value.length < 2) return;
     props.game.command(props.roomPlayer.room.id, {
        type: 'move',
        data: { path: pendingPath.value.map(p => ({q:p.q, r:p.r})) }
    });
    resetSelection();
}

function cancelMove() {
    // Revert board state
    if (pendingPath.value.length > 0) {
        const start = pendingPath.value[0];
        const current = pendingPath.value[pendingPath.value.length - 1];
        
        // If we moved
        if (start.key !== current.key) {
             delete board.value[current.key];
             board.value[start.key] = props.roomPlayer.id;
        }
    }
    resetSelection();
}

function resetSelection() {
    selected.value = null;
    reachable.value = {};
    pendingPath.value = [];
    isMoving.value = false;
}

function isInteractive(h: Hex) {
    if (!isMyTurn.value) return false;
    // Own piece (and not moving someone else)
    if (board.value[h.key] === props.roomPlayer.id) {
        if (isMoving.value) {
            return h.key === selected.value?.key; // Only current piece interactive
        }
        return true;
    }
    // Reachable empty spot
    if (selected.value && !board.value[h.key] && reachable.value[h.key]) return true;
    return false;
}

function isReachable(h: Hex) {
    return !!(selected.value && reachable.value[h.key]);
}

// --- Pathfinding ---
function calculateOneStepReachable(start: Hex, allowStep: boolean) {
    const res: Record<string, Hex[]> = {};
    const queue: { curr: Hex, path: Hex[] }[] = [];
    
    // Neighbors
    const dirs = [
        {dq: 1, dr: 0}, {dq: -1, dr: 0},
        {dq: 0, dr: 1}, {dq: 0, dr: -1},
        {dq: 1, dr: -1}, {dq: -1, dr: 1}
    ];
    
    // 1. Steps (Length 1)
    if (allowStep) {
        for (const d of dirs) {
            const nKey = `${start.q + d.dq},${start.r + d.dr}`;
            if (!board.value[nKey]) { // Empty
                const nHex = getHex(nKey);
                if (nHex) {
                    res[nKey] = [start, nHex];
                }
            }
        }
    }

    // 2. Jumps (Single Step Jump Search)
    for (const d of dirs) {
            // Super Jump Logic:
            // Search along direction d for a pivot P.
            // Move Start -> Land.
            
            // Limit search range to prevent infinite loops or out of bounds
            for (let k = 1; k < 15; k++) {
                const pivotQ = start.q + k * d.dq;
                const pivotR = start.r + k * d.dr;
                const pivotKey = `${pivotQ},${pivotR}`;
                
                // If we hit a hole
                const pivotHex = getHex(pivotKey);
                if (!pivotHex) break; // Out of board
                
                if (board.value[pivotKey]) {
                    // Found a pivot!
                    const landQ = pivotQ + k * d.dq;
                    const landR = pivotR + k * d.dr;
                    const landKey = `${landQ},${landR}`;
                    
                    // Check path obstructions
                    let pathBlocked = false;
                    for (let j = 1; j < 2 * k; j++) {
                         if (j === k) continue; // Pivot
                         const checkQ = start.q + j * d.dq;
                         const checkR = start.r + j * d.dr;
                         if (board.value[`${checkQ},${checkR}`]) {
                             pathBlocked = true;
                             break;
                         }
                    }
                    if (pathBlocked) break; 
                    
                    const landHex = getHex(landKey);
                    if (!landHex) break; // Land out of board
                    if (board.value[landKey]) break; // Land occupied
                    
                    // Avoid jumping back to immediate previous spot? (Prevent A->B->A if wanted, but rules allow)
                    // But prevent A->A (impossible here)
                    // Prevent immediate reverse in UI? No, let user decide.
                    if (pendingPath.value.length >= 2) {
                        const prev = pendingPath.value[pendingPath.value.length - 2];
                        if (prev.key === landKey) {
                             // Optional: block jumping back immediately for UX
                             // break; 
                        }
                    }

                    res[landKey] = [start, landHex];
                    // Found the pivot for this direction, stop searching further in line
                    break;
                }
            }
    }
    
    reachable.value = res;
}

// --- Animation ---
async function animatePath(playerId: string, path: {q: number, r: number}[]) {
    if (!path || path.length < 2) return;

    const startKey = `${path[0].q},${path[0].r}`;
    const startHex = getHex(startKey);
    if (!startHex) return;

    // 1. Remove from board (hide static piece)
    delete board.value[startKey];

    // 2. Initialize animating piece
    animatingPiece.value = {
        pid: playerId,
        x: startHex.x,
        y: startHex.y
    };

    await nextTick();

    // 3. Move along path
    for (let i = 1; i < path.length; i++) {
        // Wait for previous transition
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const nextHex = getHex(`${path[i].q},${path[i].r}`);
        if (nextHex) {
            animatingPiece.value.x = nextHex.x;
            animatingPiece.value.y = nextHex.y;
        }
    }

    // Wait for last step
    await new Promise(resolve => setTimeout(resolve, 300));

    // 4. Finish
    const end = path[path.length - 1];
    const endKey = `${end.q},${end.r}`;
    board.value[endKey] = playerId;
    animatingPiece.value = null;
    
    lastMoveFrom.value = startKey;
    lastMoveTo.value = endKey;
}

// --- Events ---
function onCommand(msg: any) {
    if (msg.type === 'state' || msg.type === 'status') {
        // New game or reconnect logic: verify if board is empty or not?
        // Actually state update implies we are sync with server.
        // If server says game is playing, then no winner overlay.
        // If server says game ended? 'state' command doesn't carry winner.
        // But usually 'state' comes on init.
        // Safest is to clear winnerText on state sync, assuming we're starting fresh or re-syncing.
        winnerText.value = null;

        board.value = msg.data.board;
        players.value = msg.data.players;
        turnIndex.value = msg.data.turnIndex !== undefined ? msg.data.turnIndex : msg.data.turn;
    } else if (msg.type === 'turn') {
        winnerText.value = null; // Ensure cleared on turn change
        turnIndex.value = msg.data.playerIndex;
    } else if (msg.type === 'moved') {
        const { playerId, from, to, path } = msg.data;
        const fromKey = `${from.q},${from.r}`;
        const toKey = `${to.q},${to.r}`;

        if (playerId === props.roomPlayer.id) {
            // Self move: explicit sync (visuals already updated optimistically in most cases)
            delete board.value[fromKey];
            board.value[toKey] = playerId;
            lastMoveFrom.value = fromKey;
            lastMoveTo.value = toKey;
        } else {
            // Opponent move: animate
            if (path && Array.isArray(path)) {
                animatePath(playerId, path);
            } else {
                // Fallback direct update
                delete board.value[fromKey];
                board.value[toKey] = playerId;
                lastMoveFrom.value = fromKey;
                lastMoveTo.value = toKey;
            }
        }
    } else if (msg.type === 'request-draw') {
        const who = msg.data.player?.name || '对方';
        if (confirm(`${who} 请求和棋，是否同意？`)) {
             props.game.command(props.roomPlayer.room.id, { type: 'draw' });
        } else {
             props.game.command(props.roomPlayer.room.id, { type: 'reject-draw' });
        }
    } else if (msg.type === 'reject-draw') {
         // simple notification
         console.log('对方拒绝了和棋请求');
    } else if (msg.type === 'gameOver') {
        const winners = msg.data.winners;
        if (winners && winners.length > 0) {
            winnerText.value = winners.join('、') + ' 获胜';
        } else {
            winnerText.value = '平局';
        }
    }
}
</script>
