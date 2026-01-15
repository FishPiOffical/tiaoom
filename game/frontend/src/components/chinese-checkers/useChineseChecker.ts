import { computed, ref, nextTick } from 'vue';
import { RoomPlayer, Room } from 'tiaoom/client';
import { GameCore } from '@/core/game';

export interface Hex {
    q: number;
    r: number;
    s: number;
    x: number;
    y: number;
    key: string;
}

export const HEX_SIZE = 10;

export const ZONES = [
  { fill: 'fill-warning', text: 'text-warning', border: 'border-warning', bg: 'bg-warning', name: 'warning' },
  { fill: 'fill-primary', text: 'text-primary', border: 'border-primary', bg: 'bg-primary', name: 'primary' },
  { fill: 'fill-secondary', text: 'text-secondary', border: 'border-secondary', bg: 'bg-secondary', name: 'secondary' },
  { fill: 'fill-error', text: 'text-error', border: 'border-error', bg: 'bg-error', name: 'error' },
  { fill: 'fill-info', text: 'text-info', border: 'border-info', bg: 'bg-info', name: 'info' },
  { fill: 'fill-accent', text: 'text-accent', border: 'border-accent', bg: 'bg-accent', name: 'accent' },
];

export function getZoneData(idx: number) {
    return ZONES[idx % ZONES.length];
}

export function formatTime(ms?: number) {
  if (ms === undefined || ms === null) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const hexes: Hex[] = [];
// Generate star board
for (let q = -8; q <= 8; q++) {
    for (let r = -8; r <= 8; r++) {
        const s = -q - r;
        if (Math.abs(s) > 8) continue;
        
        // Star = Union of two large triangles
        const inInv = q <= 4 && r <= 4 && s <= 4;
        const inUpr = q >= -4 && r >= -4 && s >= -4;
        
        if (inInv || inUpr) {
            const x = HEX_SIZE * Math.sqrt(3) * (q + r/2);
            const y = HEX_SIZE * 3/2 * r;
            hexes.push({ q, r, s, x, y, key: `${q},${r}` });
        }
    }
}

export { hexes };

export function getHexZoneIndex(q: number, r: number, s: number): number {
    if (Math.abs(q) <= 4 && Math.abs(r) <= 4 && Math.abs(s) <= 4) return -1;
    if (r > 4) return 0;
    if ((-q-r) < -4) return 1;
    if (q > 4) return 2;
    if (r < -4) return 3;
    if ((-q-r) > 4) return 4;
    if (q < -4) return 5;
    return -1;
}

export function getHex(key: string) {
    return hexes.find(h => h.key === key);
}

export interface Move {
    color: number; // 0-5
    path: { q: number, r: number }[];
    time: number;
}

export interface PlayerInfo {
    id: string;
    name: string;
    color: number; // zone index 0-5
    target: number;
}

export function useChineseChecker(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
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
    const playbackSpeed = ref(1); // 1x by default
    const moveHistory = ref<{ playerId: string, path: {q:number,r:number}[], from: any, to: any }[]>([]);
    const canReplay = computed(() => moveHistory.value.length > 0);

    const boardRotation = computed(() => {
        const me = players.value.find(p => p.id === roomPlayer.id);
        if (!me) return 0;
        return me.color * 60;
    });

    const isMyTurn = computed(() => {
        return players.value[turnIndex.value]?.id === roomPlayer.id;
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

    function isInteractive(h: Hex) {
        if (!isMyTurn.value) return false;
        if (board.value[h.key] === roomPlayer.id) {
            if (isMoving.value) {
                return h.key === selected.value?.key; 
            }
            return true;
        }
        if (selected.value && !board.value[h.key] && reachable.value[h.key]) return true;
        return false;
    }

    function isReachable(h: Hex) {
        return !!(selected.value && reachable.value[h.key]);
    }

    // --- Pathfinding ---
    function calculateOneStepReachable(start: Hex, allowStep: boolean) {
        const res: Record<string, Hex[]> = {};
        const dirs = [
            {dq: 1, dr: 0}, {dq: -1, dr: 0},
            {dq: 0, dr: 1}, {dq: 0, dr: -1},
            {dq: 1, dr: -1}, {dq: -1, dr: 1}
        ];
        
        if (allowStep) {
            for (const d of dirs) {
                const nKey = `${start.q + d.dq},${start.r + d.dr}`;
                if (!board.value[nKey]) {
                    const nHex = getHex(nKey);
                    if (nHex) {
                        res[nKey] = [start, nHex];
                    }
                }
            }
        }

        for (const d of dirs) {
                for (let k = 1; k < 15; k++) {
                    const pivotQ = start.q + k * d.dq;
                    const pivotR = start.r + k * d.dr;
                    const pivotKey = `${pivotQ},${pivotR}`;
                    const pivotHex = getHex(pivotKey);
                    if (!pivotHex) break; 
                    
                    if (board.value[pivotKey]) {
                        const landQ = pivotQ + k * d.dq;
                        const landR = pivotR + k * d.dr;
                        const landKey = `${landQ},${landR}`;
                        let pathBlocked = false;
                        for (let j = 1; j < 2 * k; j++) {
                             if (j === k) continue; 
                             const checkQ = start.q + j * d.dq;
                             const checkR = start.r + j * d.dr;
                             if (board.value[`${checkQ},${checkR}`]) {
                                 pathBlocked = true;
                                 break;
                             }
                        }
                        if (pathBlocked) break; 
                        
                        const landHex = getHex(landKey);
                        if (!landHex) break; 
                        if (board.value[landKey]) break; 
                        
                        // Prevent jumping back to immediate previous spot
                        if (pendingPath.value.length >= 2) {
                            const prev = pendingPath.value[pendingPath.value.length - 2];
                            if (prev.key === landKey) {
                                // break; 
                            }
                        }

                        res[landKey] = [start, landHex];
                        break;
                    }
                }
        }
        
        reachable.value = res;
    }

    function resetSelection() {
        selected.value = null;
        reachable.value = {};
        pendingPath.value = [];
        isMoving.value = false;
    }

    async function animatePath(playerId: string, path: {q: number, r: number}[]) {
        if (!path || path.length < 2) return;

        const startKey = `${path[0].q},${path[0].r}`;
        const startHex = getHex(startKey);
        if (!startHex) return;

        // Temporarily remove from board
        const originalOwner = board.value[startKey];
        delete board.value[startKey];

        animatingPiece.value = {
            pid: playerId,
            x: startHex.x,
            y: startHex.y
        };

        await nextTick();

        const stepTime = 300 / playbackSpeed.value;

        for (let i = 1; i < path.length; i++) {
            await new Promise(resolve => setTimeout(resolve, stepTime));
            
            const nextHex = getHex(`${path[i].q},${path[i].r}`);
            if (nextHex) {
                animatingPiece.value.x = nextHex.x;
                animatingPiece.value.y = nextHex.y;
            }
        }

        await new Promise(resolve => setTimeout(resolve, stepTime));

        const end = path[path.length - 1];
        const endKey = `${end.q},${end.r}`;
        
        // Restore to end position (if it wasn't already set, but here we just ensure consistency)
        // If replaying history without changing actual state, we might need to handle differently.
        // But for live animation, we assume state is updated AFTER animation or partially during.
        // In existing code, board update happens here.
        
        animatingPiece.value = null;
        if (!board.value[endKey]) { // Only set if not occupied (race condition check)
             board.value[endKey] = playerId;
        }
        
        // If this was a replay of a past move, we shouldn't modify current board state permanently 
        // if the state differs... but simpler to just animate visually for "replay".
        // HOWEVER, the logic in 'moved' event modifies board immediately for opponent move 
        // -> wait, 'moved' calls animatePath. 
        // We should refine this: animatePath handles the visual transition.
        
        lastMoveFrom.value = startKey;
        lastMoveTo.value = endKey;
    }

    async function replayLastMove() {
        if (moveHistory.value.length === 0) {
            console.log('No move history to replay');
            return;
        }
        const lastMove = moveHistory.value[moveHistory.value.length - 1];
        console.log('Replaying move:', lastMove);
        
        // Setup board for replay: restore piece to 'from' temporarily?
        // Or simply animate a 'ghost' piece?
        // Replaying on top of current state might be confusing if pieces moved.
        // Better: Use a ghost piece for replay that doesn't affect actual board state.
        
        // Let's modify animatePath to support "ghost" mode or just handle the piece visually.
        // For simplicity:
        // 1. Identify start/end.
        // 2. Hide piece at 'To' (it should be there now).
        // 3. Show animating piece from Start -> End.
        // 4. Restore piece at 'To'.
        
        const { playerId, path, to } = lastMove;
        const toKey = `${to.q},${to.r}`;
        const originalOwner = board.value[toKey];
        
        // Strict check: if piece is not at 'to' position, maybe it was moved again or captured?
        if (originalOwner !== playerId) {
            console.warn(`Cannot replay: Piece at ${toKey} is ${originalOwner}, expected ${playerId}`);
            // Force replay anyway? It might look weird if piece starts from occupied spot or lands on occupied spot.
            // But let's try to proceed if we just want to show the animation.
            // However, we rely on HIDING the target piece. If target piece is someone else's, hiding it is confusing.
            // If target piece is empty (undefined), then we can just run animation.
            
            if (originalOwner) {
                 return; 
            }
        }
        
        if (originalOwner === playerId) {
            delete board.value[toKey]; // Hide current piece
        }
            // Run animation
            // Note: animatePath deletes 'start' from board, which might be wrong if 'start' is now empty.
            // We need a more robust animate function.
            // Let's create a specialized replay function.
            
            const startKey = `${path[0].q},${path[0].r}`;
            const startHex = getHex(startKey);
             if (!startHex) {
                 if (originalOwner === playerId) board.value[toKey] = originalOwner;
                 return;
             }

            animatingPiece.value = {
                pid: playerId,
                x: startHex.x,
                y: startHex.y
            };
            
            const stepTime = 300 / playbackSpeed.value;
            
             for (let i = 1; i < path.length; i++) {
                await new Promise(resolve => setTimeout(resolve, stepTime));
                const nextHex = getHex(`${path[i].q},${path[i].r}`);
                if (nextHex) {
                    animatingPiece.value.x = nextHex.x;
                    animatingPiece.value.y = nextHex.y;
                }
            }
             await new Promise(resolve => setTimeout(resolve, stepTime));
             
             animatingPiece.value = null;
             if (originalOwner === playerId) board.value[toKey] = originalOwner; // Restore
        // }
    }

    function handleClick(h: Hex) {
        if (!isMyTurn.value) return;

        if (board.value[h.key] === roomPlayer.id && !isMoving.value) {
            selected.value = h;
            pendingPath.value = [h];
            calculateOneStepReachable(h, true);
            return;
        }

        if (selected.value && !board.value[h.key] && reachable.value[h.key]) {
            const start = selected.value;
            const dq = h.q - start.q;
            const dr = h.r - start.r;
            const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq-dr));
            const isStep = dist === 1;

            if (isStep) {
                 game.command(roomPlayer.room.id, {
                    type: 'move',
                    data: { path: [{q: start.q, r: start.r}, {q: h.q, r: h.r}] }
                });
                resetSelection();
            } else {
                isMoving.value = true;
                delete board.value[selected.value.key];
                board.value[h.key] = roomPlayer.id;
                
                selected.value = h;
                pendingPath.value.push(h);
                
                calculateOneStepReachable(h, false);
            }
        } else {
            if (!isMoving.value) {
                resetSelection();
            }
        }
    }

    function commitMove() {
         if (pendingPath.value.length < 2) return;
         game.command(roomPlayer.room.id, {
            type: 'move',
            data: { path: pendingPath.value.map(p => ({q:p.q, r:p.r})) }
        });
        resetSelection();
    }

    function cancelMove() {
        if (pendingPath.value.length > 0) {
            const start = pendingPath.value[0];
            const current = pendingPath.value[pendingPath.value.length - 1];
            
            if (start.key !== current.key) {
                 delete board.value[current.key];
                 board.value[start.key] = roomPlayer.id;
            }
        }
        resetSelection();
    }

    function resign() {
        if (!confirm('确定要认输吗？此操作无法撤销。')) return;
        game.command(roomPlayer.room.id, { type: 'resign' });
    }

    function offerDraw() {
        if (!confirm('确定要向对方求和吗？')) return;
        game.command(roomPlayer.room.id, { type: 'request-draw' });
    }

    function onCommand(msg: any) {
        if (msg.type === 'state' || msg.type === 'status') {
            winnerText.value = null;
            board.value = msg.data.board;
            players.value = msg.data.players;
            turnIndex.value = msg.data.turnIndex !== undefined ? msg.data.turnIndex : msg.data.turn;
        } else if (msg.type === 'turn') {
            winnerText.value = null;
            turnIndex.value = msg.data.playerIndex;
        } else if (msg.type === 'moved') {
            const { playerId, from, to, path } = msg.data;
            const fromKey = `${from.q},${from.r}`;
            const toKey = `${to.q},${to.r}`;

             // Record move
            moveHistory.value.push({
                playerId,
                path: path || [from, to],
                from,
                to
            });

            if (playerId === roomPlayer.id) {
                delete board.value[fromKey];
                board.value[toKey] = playerId;
                lastMoveFrom.value = fromKey;
                lastMoveTo.value = toKey;
            } else {
                if (path && Array.isArray(path)) {
                    animatePath(playerId, path);
                } else {
                    delete board.value[fromKey];
                    board.value[toKey] = playerId;
                    lastMoveFrom.value = fromKey;
                    lastMoveTo.value = toKey;
                }
            }
        } else if (msg.type === 'request-draw') {
            const who = msg.data.player?.name || '对方';
            if (confirm(`${who} 请求和棋，是否同意？`)) {
                 game.command(roomPlayer.room.id, { type: 'draw' });
            } else {
                 game.command(roomPlayer.room.id, { type: 'reject-draw' });
            }
        } else if (msg.type === 'reject-draw') {
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

    return {
        board,
        players,
        turnIndex,
        selected,
        reachable,
        lastMoveFrom,
        lastMoveTo,
        pendingPath,
        isMoving,
        animatingPiece,
        winnerText,
        boardRotation,
        isMyTurn,
        pieceList,
        getPlayerColorCode,
        handleClick,
        commitMove,
        cancelMove,
        resetSelection,
        isInteractive,
        isReachable,
        onCommand,
        resign,
        offerDraw,
        playbackSpeed,
        replayLastMove,
        canReplay
    };
}
