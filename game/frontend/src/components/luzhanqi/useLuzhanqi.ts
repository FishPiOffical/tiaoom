import { ref, computed, onUnmounted, watch } from 'vue';
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';

// Constants
export const CAMPS = [
  [2,1], [2,3], [3,2], [4,1], [4,3],
  [7,1], [7,3], [8,2], [9,1], [9,3]
];
export const HQS = [
  [0,1], [0,3], [11,1], [11,3]
];
const ROWS = 12;
const COLS = 5;

const PIECE_SET = [
  { rank: 40, type: 'living', name: '司令', count: 1 },
  { rank: 39, type: 'living', name: '军长', count: 1 },
  { rank: 38, type: 'living', name: '师长', count: 2 },
  { rank: 37, type: 'living', name: '旅长', count: 2 },
  { rank: 36, type: 'living', name: '团长', count: 2 },
  { rank: 35, type: 'living', name: '营长', count: 2 },
  { rank: 34, type: 'living', name: '连长', count: 3 },
  { rank: 33, type: 'living', name: '排长', count: 3 },
  { rank: 32, type: 'living', name: '工兵', count: 3 },
  { rank: 41, type: 'mine',   name: '地雷', count: 3 },
  { rank: 0,  type: 'bomb',   name: '炸弹', count: 2 },
  { rank: 0,  type: 'flag',   name: '军旗', count: 1 },
];

export function useLuzhanqi(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
    const board = ref<any[][]>([]);
    const mySide = ref<number>(-1);
    const turn = ref<number>(0);
    const phase = ref<'deploy' | 'playing'>('deploy');
    const isReady = ref(false);
    const countdown = ref(0);
    const targetTime = ref(0);
    
    // Playing State
    const selected = ref<{r:number, c:number} | null>(null);

    // Deploy State
    const localBoard = ref<(any | null)[][]>([]);
    const selectedPieceType = ref<string | null>(null);

    // Helpers
    function isCamp(r: number, c: number) { 
        return CAMPS.some(p => p[0]===r && p[1]===c); 
    }
    function isHQ(r: number, c: number) { 
        return HQS.some(p => p[0]===r && p[1]===c); 
    }

    // Countdown logic
    function updateCountdown() {
        if (targetTime.value > 0) {
            const diff = Math.max(0, Math.ceil((targetTime.value - Date.now()) / 1000));
            countdown.value = diff;
        } else {
            countdown.value = 0;
        }
    }
    const timerId = setInterval(updateCountdown, 1000);
    onUnmounted(() => clearInterval(timerId));

    // Computed
    const shouldFlip = computed(() => mySide.value === 0);

    const inventory = computed(() => {
        if (phase.value !== 'deploy') return [];
        const counts: Record<string, number> = {};
        PIECE_SET.forEach(p => counts[p.name] = 0);
        
        if (localBoard.value.length > 0) {
            localBoard.value.flat().forEach(p => {
                if (p) counts[p.name]++;
            });
        }
        
        return PIECE_SET.map(p => ({
            ...p,
            left: p.count - (counts[p.name] || 0)
        }));
    });

    const isFull = computed(() => {
        return inventory.value.every(p => p.left === 0);
    });

    const mode = computed(() => {
        const m = roomPlayer.room.attrs ? roomPlayer.room.attrs.mode : 0;
        return Number(m); 
    });

    // Actions
    function initLocalBoard() {
        localBoard.value = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    }

    function clearBoard() {
        initLocalBoard();
    }

    function autoDeploy() {
        if (mySide.value === -1) return;
        initLocalBoard();
        
        let deck: any[] = [];
        PIECE_SET.forEach(p => {
            for(let i=0; i<p.count; i++) deck.push({ ...p, side: mySide.value });
        });
        deck.sort(() => Math.random() - 0.5);
        
        const side = mySide.value;
        const isBack = (r: number) => side === 0 ? r < 2 : r > 9;
        const isFront = (r: number) => side === 0 ? r === 5 : r === 6;

        const slots: {r:number, c:number}[] = [];
        const hqSlots: {r:number, c:number}[] = [];
        
        for (let r = side === 0 ? 0 : 6; r <= (side === 0 ? 5 : 11); r++) {
            for (let c = 0; c < 5; c++) {
                if (isCamp(r, c)) continue;
                if (isHQ(r, c)) hqSlots.push({r, c});
                else slots.push({r, c});
            }
        }

        // Flag
        const flagIndex = deck.findIndex(p => p.type === 'flag');
        const flag = deck.splice(flagIndex, 1)[0];
        const hqIdx = Math.floor(Math.random() * hqSlots.length);
        const flagPos = hqSlots.splice(hqIdx, 1)[0];
        localBoard.value[flagPos.r][flagPos.c] = flag;

        // Mines
        const mines = deck.filter(p => p.type === 'mine');
        deck = deck.filter(p => p.type !== 'mine');

        // Bombs
        const bombs = deck.filter(p => p.type === 'bomb');
        deck = deck.filter(p => p.type !== 'bomb');
        
        // Guard
        const guard = deck.pop();
        const otherHq = hqSlots[0];
        if (otherHq) localBoard.value[otherHq.r][otherHq.c] = guard; 
        
        // Back & Rest
        const takeRandom = (pool: any[], count: number) => {
            const res: any[] = [];
            for(let i=0; i<count; i++) {
                if (pool.length === 0) break;
                const idx = Math.floor(Math.random() * pool.length);
                res.push(pool.splice(idx, 1)[0]);
            }
            return res;
        };

        // Unrestricted Mines
        const minePos = takeRandom(slots, 3);
        minePos.forEach(p => localBoard.value[p.r][p.c] = mines.pop());
        
        const availableNonFront = slots.filter(s => !isFront(s.r));
        const bombPos = takeRandom(availableNonFront, 2);
        bombPos.forEach(p => {
            localBoard.value[p.r][p.c] = bombs.pop();
            const idx = slots.findIndex(s => s.r === p.r && s.c === p.c);
            if (idx !== -1) slots.splice(idx, 1);
        });
        
        const rest = [...deck, ...mines, ...bombs];
        rest.forEach(p => {
            if (slots.length > 0) {
            const idx = Math.floor(Math.random() * slots.length);
            const pos = slots.splice(idx, 1)[0];
            localBoard.value[pos.r][pos.c] = p;
            }
        });
    }

    function confirmDeploy() {
        if (!isFull.value) return;
        const pieces: {r:number, c:number, name: string}[] = [];
        for(let r=0; r<ROWS; r++) {
            for(let c=0; c<COLS; c++) {
                if(localBoard.value[r][c]) {
                    pieces.push({
                        r, c,
                        name: localBoard.value[r][c].name
                    });
                }
            }
        }
        
        game.command(roomPlayer.room.id, {
            type: 'deploy',
            data: pieces
        });
    }

    function handleDeployClick(dr: number, dc: number) {
         if (isReady.value) return; 
         
         let r = dr;
         let c = dc;
         if (shouldFlip.value) {
            r = 11 - dr;
            c = 4 - dc;
         }

         // Only allow clicking my side
         const myRowStart = mySide.value === 0 ? 0 : 6;
         const myRowEnd = mySide.value === 0 ? 5 : 11;
         if (r < myRowStart || r > myRowEnd) return;
         
         if (isCamp(r, c)) return; 
         
         const current = localBoard.value[r][c];
         
         if (selectedPieceType.value) {
            const isFt = mySide.value === 0 ? r === 5 : r === 6;
            const isHq = isHQ(r, c);
            
            if (selectedPieceType.value === '军旗' && !isHq) return; 
            if (selectedPieceType.value === '地雷' && isHq) return; 
            if (selectedPieceType.value === '炸弹' && isFt) return;
            
            const pDef = PIECE_SET.find(x => x.name === selectedPieceType.value);
            if (!pDef) return;
            
            const stock = inventory.value.find(x => x.name === selectedPieceType.value);
            if (!stock || stock.left <= 0) return;
    
            localBoard.value[r][c] = {
               ...pDef,
               side: mySide.value
            };
            
            if (stock.left - 1 <= 0) selectedPieceType.value = null;
            
         } else {
            if (current) {
               localBoard.value[r][c] = null;
               selectedPieceType.value = current.name; // Pick it up
            }
         }
    }

    // Command Handler
    function onCommand(msg: any) {
        if (msg.type === 'status') {
            board.value = msg.data.board;
            mySide.value = msg.data.mySide;
            turn.value = msg.data.turn;
            phase.value = msg.data.phase || 'deploy';
            isReady.value = msg.data.isReady;
            
            targetTime.value = msg.data.countdown || 0;
            updateCountdown();
            
            // Auto init local board if needed
            if (phase.value === 'deploy' && localBoard.value.length === 0 && mySide.value !== -1) {
                initLocalBoard();
            }
        }
    }

    // Watchers
    watch(() => mySide.value, (val) => {
        if (val !== -1 && localBoard.value.length === 0) initLocalBoard();
    });

    // Playing phase interaction
    function handlePlayingClick(dr: number, dc: number) {
        let r = dr;
        let c = dc;
        if (shouldFlip.value) {
            r = 11 - dr;
            c = 4 - dc;
        }

        const p = board.value[r] ? board.value[r][c] : null;
        if (selected.value) {
            if (selected.value.r === r && selected.value.c === c) {
                selected.value = null;
                return;
            }
            if (p && p.side === mySide.value) {
                selected.value = {r, c};
                return;
            }
            game.command(roomPlayer.room.id, {
                type: 'move',
                data: { from: selected.value, to: {r, c} }
            });
            selected.value = null;
        } else {
            if (p && p.side === mySide.value) {
                selected.value = {r, c};
            }
        }
    }
    
    function isSelected(r: number, c: number) {
        if (phase.value === 'deploy') return false; 
        return selected.value && selected.value.r === r && selected.value.c === c;
    }
    
    // Unified Click Handler for View
    function handleCellClick(dr: number, dc: number) {
         if (phase.value === 'deploy') {
             handleDeployClick(dr, dc);
         } else {
             handlePlayingClick(dr, dc);
         }
    }

    return {
        // State
        board,
        mySide,
        turn,
        phase,
        isReady,
        countdown,
        selected,
        localBoard,
        selectedPieceType,
        
        // Logic / Getters
        shouldFlip,
        inventory,
        isFull,
        isSelected,
        mode,
        
        // Actions
        onCommand,
        handleCellClick,
        handlePlayingClick, // Exporting for Lite if needed, or Lite can use handleClick too if it checks phase
        autoDeploy,
        clearBoard,
        confirmDeploy,
        
        // Constants (Optional, maybe view needs them for rendering background)
        CAMPS,
        HQS,
    };
}
