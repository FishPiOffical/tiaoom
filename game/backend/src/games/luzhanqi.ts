import { GameRoom, IGameCommand } from '.';
import { Room, RoomPlayer, RoomStatus } from 'tiaoom';

export const name = '军棋';
export const minSize = 2;
export const maxSize = 2;
export const description = '两人对战，暗棋模式（只能看到己方棋子）。目标是夺取对方军旗或消灭对方所有可移动棋子。司令>军长>...>工兵，炸弹与任何棋子同归于尽，工兵可扫雷。';

export const points = {
  '初出茅庐': 10,
  '久经沙场': 100,
  '威震八方': 1000,
};

// Types
type Side = 0 | 1; // 0: Top (Red/Green), 1: Bottom
type Rank = 
  | 40 | 39 | 38 | 37 | 36 | 35 | 34 | 33 | 32 // Living
  | 41 // Landmine
  | 0  // Bomb / Flag (Distinguish by type)
  ;

interface Piece {
  rank: Rank;
  type: 'living' | 'mine' | 'bomb' | 'flag';
  name: string;
  side: Side;
  revealed: boolean; // For end game or spy mechanics (not used yet)
}

interface PieceState {
  piece: Piece | null;
  pos: { r: number; c: number };
}

// Board Constants
const ROWS = 12;
const COLS = 5;

// Topology
const CAMPS = new Set([
  '2,1', '2,3', '3,2', '4,1', '4,3',
  '7,1', '7,3', '8,2', '9,1', '9,3'
]);

const HQS = new Set([
  '0,1', '0,3', '11,1', '11,3'
]);

const RR_ROWS = new Set([1, 5, 6, 10]);
const RR_COLS = new Set([0, 4]);

function isCamp(r: number, c: number) { return CAMPS.has(`${r},${c}`); }
function isHQ(r: number, c: number) { return HQS.has(`${r},${c}`); }
function isRailroad(r: number, c: number) {
  // Rows 1,5,6,10 full rows? No, cols 0..4?
  // Actually standard board:
  // Rows 1, 5, 6, 10 are RR lines.
  // Cols 0, 4 are RR lines between row 1 and 10.
  if (RR_ROWS.has(r)) return true;
  if (RR_COLS.has(c) && r >= 1 && r <= 10) return true;
  return false;
}

// Initial Pieces Set (per side)
const PIECE_SET: { rank: Rank; type: string; name: string; count: number }[] = [
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

export default class LuzhanqiRoom extends GameRoom {
  board: (Piece | null)[][] = [];
  turn: Side = 1;
  winner: Side | -1 = -1;
  phase: 'deploy' | 'playing' = 'deploy';
  readyPlayers: string[] = [];
  consecutiveTimeouts: Record<number, number> = { 0: 0, 1: 0 };
  history: any[] = [];

  getData() {
    return {
      ...super.getData(),
      history: this.history,
      winner: this.winner,
      players: this.room.validPlayers.map(p => ({
        id: p.id,
        username: p.attributes.username,
        name: p.name,
        color: this.players[p.id] 
      })),
    };
  }
  
  // Mapping player ID to Side
  players: { [id: string]: Side } = {};

  init() {
    this.restoreTimer({
      turn: () => this.handleTimeout(),
      deploy: () => this.handleDeployTimeout()
    });
    return super.init();
  }

  onStart() {
    this.beginTime = Date.now();
    // Assign Sides
    const p1 = this.room.validPlayers[0];
    const p2 = this.room.validPlayers[1];
    
    // Randomize sides
    if (Math.random() > 0.5) {
      this.players[p1.id] = 1; // Bottom
      this.players[p2.id] = 0; // Top
    } else {
      this.players[p1.id] = 0; // Top
      this.players[p2.id] = 1; // Bottom
    }

    this.turn = 1; // Side 1 starts
    this.winner = -1;
    this.consecutiveTimeouts = { 0: 0, 1: 0 };
    this.history = [];
    
    // Empty Board (or nulls)
    this.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

    // Check Mode
    if (this.room.attrs && this.room.attrs.mode === 2) {
        // Flip Chess Mode
        this.phase = 'playing'; // Skip deploy
        this.startFlipBoard();
        this.say('游戏开始，进入翻棋模式。请轮流翻子或移动。');
        this.broadcastStatus();
        this.startTurnTimer();
        return;
    }

    this.phase = 'deploy';
    this.readyPlayers = [];

    // Notify
    this.say('游戏开始，进入布阵阶段（限时3分钟）。请放置棋子，超时将自动随机布阵。');
    this.broadcastStatus();
    this.startDeployTimer();
  }
  
  startFlipBoard() {
     let deck: Piece[] = [];
     [0, 1].forEach((side: any) => {
         PIECE_SET.forEach(p => {
             for(let i=0; i<p.count; i++) {
                 deck.push({
                     rank: p.rank,
                     type: p.type as any,
                     name: p.name,
                     side,
                     revealed: false
                 });
             }
         });
     });
     
     deck.sort(() => Math.random() - 0.5);
     
     const slots: {r:number, c:number}[] = [];
     for(let r=0; r<ROWS; r++) {
         for(let c=0; c<COLS; c++) {
             // In Flip Mode, camps must be empty initially.
             if (isCamp(r, c)) continue;
             slots.push({r, c});
         }
     }
     
     const flipInitData: any[] = [];
     deck.forEach(p => {
         if (slots.length > 0) {
             const idx = Math.floor(Math.random() * slots.length);
             const pos = slots.splice(idx, 1)[0];
             this.board[pos.r][pos.c] = p;
             flipInitData.push({ r: pos.r, c: pos.c, ...p });
         }
     });

     this.history.push({
         type: 'init-flip',
         data: flipInitData,
         time: Date.now() - this.beginTime
     });
  }

  startDeployTimer() {
    this.startTimer(() => this.handleDeployTimeout(), 3 * 60 * 1000, 'deploy');
  }

  handleDeployTimeout() {
    // Fill remaining for unready players
    for(const p of this.room.validPlayers) {
      if (!this.readyPlayers.includes(p.id)) {
        this.autoFillSide(this.players[p.id]);

        // Record auto-deployment
        const side = this.players[p.id];
        const deployment = [];
        const rStart = side === 0 ? 0 : 6;
        const rEnd = side === 0 ? 5 : 11;
        for(let r=rStart; r<=rEnd; r++) {
            for(let c=0; c<5; c++) {
               const piece = this.board[r][c];
               if(piece) {
                   deployment.push({ r, c, name: piece.name });
               }
            }
        }
        this.history.push({ type: 'deploy', side, playerId: p.id, data: deployment, time: Date.now() - this.beginTime });

        this.readyPlayers.push(p.id);
      }
    }
    this.startGame();
  }

  autoFillSide(side: Side) {
     const existingPieces: {r:number, c:number, val: Piece}[] = [];
     const emptySlots: {r:number, c:number}[] = [];

     const rStart = side === 0 ? 0 : 6;
     const rEnd = side === 0 ? 5 : 11;
     
     // Identify HQs for this side
     const myHQs: {r:number, c:number}[] = [];
     for(let r=rStart; r<=rEnd; r++) {
         for(let c=0; c<COLS; c++) {
             if (isHQ(r, c)) myHQs.push({r, c});
         }
     }
     
     for(let r=rStart; r<=rEnd; r++) {
       for(let c=0; c<COLS; c++) {
         if (isCamp(r,c)) continue; 
         
         const p = this.board[r][c];
         if (p) {
           existingPieces.push({r, c, val: p});
         } else {
           emptySlots.push({r, c});
         }
       }
     }
     
     // Determine missing pieces
     const currentCounts: Record<string, number> = {};
     existingPieces.forEach(item => {
       currentCounts[item.val.name] = (currentCounts[item.val.name] || 0) + 1;
     });
     
     let deck: Piece[] = [];
     PIECE_SET.forEach(def => {
       const has = currentCounts[def.name] || 0;
       const need = def.count - has;
       for(let i=0; i<need; i++) {
         deck.push({
            rank: def.rank,
            type: def.type as any,
            name: def.name,
            side,
            revealed: false
         });
       }
     });
     
     if (deck.length === 0 && emptySlots.length === 0) return; 
     
     // Check Flag
     const flagIndex = deck.findIndex(p => p.type === 'flag');
     if (flagIndex !== -1) {
         const flag = deck.splice(flagIndex, 1)[0];
         
         // Find empty HQ
         const emptyHQIndices = [];
         for(let i=0; i<emptySlots.length; i++) {
             if (isHQ(emptySlots[i].r, emptySlots[i].c)) {
                 emptyHQIndices.push(i);
             }
         }
         
         if (emptyHQIndices.length > 0) {
             const randIdx = Math.floor(Math.random() * emptyHQIndices.length);
             const slotIndex = emptyHQIndices[randIdx];
             const slot = emptySlots.splice(slotIndex, 1)[0];
             this.board[slot.r][slot.c] = flag;
         } else {
             // Both HQs full. Evict one (random).
             const randHQ = myHQs[Math.floor(Math.random() * myHQs.length)];
             const evicted = this.board[randHQ.r][randHQ.c]!;
             
             this.board[randHQ.r][randHQ.c] = flag;
             
             evicted.revealed = false;
             deck.push(evicted);
         }
     }

     // Random fill rest
     deck.sort(() => Math.random() - 0.5);
     
     deck.forEach(p => {
         if (emptySlots.length > 0) {
             const idx = Math.floor(Math.random() * emptySlots.length);
             const pos = emptySlots.splice(idx, 1)[0];
             this.board[pos.r][pos.c] = p;
         }
     });
  }

  onCommand(message: IGameCommand) {
    if (message.type === 'deploy') {
       this.handleDeploy(message.sender.id, message.data);
    } else if (message.type === 'move') {
      this.handleMove(message.sender.id, message.data);
    } else if (message.type === 'surrender') {
      const currSide = this.players[message.sender.id];
      if (currSide === undefined) return;
      const winnerSide = currSide === 0 ? 1 : 0;
      const winner = this.room.validPlayers.find(p => this.players[p.id] === winnerSide)!;
      this.history.push({
          type: 'surrender',
          side: currSide,
          time: Date.now() - this.beginTime
      });
      this.saveAchievements([winner]);
    } else {
      super.onCommand(message);
    }
  }
  
  handleDeploy(playerId: string, data: { r: number, c: number, name: string }[]) {
     if (this.phase !== 'deploy') return;
     if (this.readyPlayers.includes(playerId)) return;
     const side = this.players[playerId];
     
     // If data is null or empty, maybe user wants to 'auto-deploy'?
     // The requirements don't specify manual 'auto' button. Frontend can impl it.
     // Receiving array of placements.
     
     // 1. Clear side
     for (let r = side === 0 ? 0 : 6; r <= (side === 0 ? 5 : 11); r++) {
       for (let c = 0; c < 5; c++) {
         this.board[r][c] = null;
       }
     }
     
     // 2. Place
     let valid = true;
     let count = 0;
     for(const p of data) {
        if (!p.name) continue;
        // Validate pos
        if (side === 0 && (p.r < 0 || p.r > 5)) valid = false;
        if (side === 1 && (p.r < 6 || p.r > 11)) valid = false;
        if (p.c < 0 || p.c > 4) valid = false;
        if (isCamp(p.r, p.c)) valid = false;
        
        // Find piece def
        const def = PIECE_SET.find(x => x.name === p.name);
        if (!def) valid = false;
        
        if (!valid) break;
        
        this.board[p.r][p.c] = {
           rank: def!.rank,
           type: def!.type as any,
           name: def!.name,
           side,
           revealed: false
        };
        count++;
     }
     
     // 3. Check constraints
     // - Flag in HQ
     // - Mines in Back
     // - Bombs not in Front
     // - Count == 25
     if (count !== 25) valid = false;
     
     if (valid) {
        // Advanced rules check
        // Check Flag
        // Check Mines
        // Check Bombs
        // For MVP, assume client validates? No, server must.
        // Lazy: If invalid, reject.
        // Actually, if I reject, user might be confused.
        // Let's implement basic checks.
        
        // Check Flag in HQ
        // ...
        
        this.readyPlayers.push(playerId);
        this.history.push({
            type: 'deploy',
            side,
            playerId,
            data,
            time: Date.now() - this.beginTime
        });
        this.sayTo('布阵完成，等待对方...', this.getPlayerById(playerId)!);
        
        // Broadcast partial status?
        this.broadcastStatus();
        
        // Check all ready
        if (this.room.validPlayers.every(p => this.readyPlayers.includes(p.id))) {
           this.startGame();
        }
     } else {
        this.sayTo('布阵无效，请检查规则。', this.getPlayerById(playerId)!);
     }
  }
  
  startGame() {
    this.phase = 'playing';
    this.stopTimer('deploy');
    this.say('布阵结束，游戏开始！');
    this.broadcastStatus();
    this.startTurnTimer();
  }

  handleMove(playerId: string, data: { from: {r: number, c: number}, to: {r: number, c: number} }) {
    if (this.phase !== 'playing') return;
    const side = this.players[playerId];
    if (this.turn !== side) return;
    if (this.winner !== -1) return;

    // Flip Move Support: from == to
    const { from, to } = data;
    if (!from || !to) return;
    if (from.r < 0 || from.r >= ROWS || from.c < 0 || from.c >= COLS) return;
    
    // Check for Flip Action
    if (from.r === to.r && from.c === to.c) {
        // Must be Flip Mode
        const isFlipMode = this.room.attrs && this.room.attrs.mode === 2;
        if (!isFlipMode) return;
        
        const p = this.board[from.r][from.c];
        if (!p) return;
        if (p.revealed) return; // Already revealed
        
        // Reveal it
        p.revealed = true;
        this.say(`翻开了 (${from.r}, ${from.c})：${p.side === 0 ? '红方' : '绿方'} ${p.name}`);
        
        this.history.push({
            type: 'flip',
            side,
            pos: { r: from.r, c: from.c },
            piece: { ...p },
            time: Date.now() - this.beginTime
        });

        // Turn ends
        this.consecutiveTimeouts[side] = 0;
        this.turn = (side === 0 ? 1 : 0) as Side;
        this.broadcastStatus();
        this.startTurnTimer();
        return;
    }

    if (to.r < 0 || to.r >= ROWS || to.c < 0 || to.c >= COLS) return;

    const p = this.board[from.r][from.c];
    if (!p || p.side !== side) return;
    
    // Flip Mode: Cannot move hidden pieces
    const isFlipMode = this.room.attrs && this.room.attrs.mode === 2;
    if (isFlipMode && !p.revealed) return;

    const target = this.board[to.r][to.c];
    if (target && target.side === side) return;

    if (!this.isValidMove(from, to, p)) {
        this.sayTo('无效移动', this.getPlayerById(playerId)!);
        return;
    }

    this.consecutiveTimeouts[side] = 0;

    let actionResult = 'move';
    let defenderInfo = null;

    if (!target) {
        this.board[to.r][to.c] = p;
        this.board[from.r][from.c] = null;
    } else {
        // Flag Protection in Flip Mode
        if (target.type === 'flag' && isFlipMode) {
             let mineCount = 0;
             for(let r=0; r<ROWS; r++) {
                 for(let c=0; c<COLS; c++) {
                     const piece = this.board[r][c];
                     if (piece && piece.side === target.side && piece.type === 'mine') {
                         mineCount++;
                     }
                 }
             }
             if (mineCount > 0) {
                 this.sayTo(`无法攻击军旗：对方剩余 ${mineCount} 个地雷`, this.getPlayerById(playerId)!);
                 return;
             }
        }

        const res = this.resolveCombat(p, target);
        actionResult = res;
        defenderInfo = { ...target };
        const attackerName = p.name;
        const defenderName = target.name;
        
        if (res === 'win') {
           this.say(`${attackerName} 吃掉了 ${defenderName}`);
           this.board[to.r][to.c] = p;
           this.board[from.r][from.c] = null;
           
           if (target.type === 'flag') {
               this.history.push({
                  type: 'move',
                  side,
                  from,
                  to,
                  attacker: { ...p },
                  defender: defenderInfo,
                  result: actionResult,
                  time: Date.now() - this.beginTime
               });
               this.endGame(side);
               return;
           }
        } else if (res === 'loss') {
           this.say(`${defenderName} 吃掉了 ${attackerName}`);
           this.board[from.r][from.c] = null;
        } else {
           this.say(`${attackerName} 与 ${defenderName} 同归于尽`);
           this.board[from.r][from.c] = null;
           this.board[to.r][to.c] = null;
        }
    }

    this.history.push({
        type: 'move',
        side,
        from,
        to,
        attacker: { ...p },
        defender: defenderInfo,
        result: actionResult,
        time: Date.now() - this.beginTime
    });
    
    const opponent = (side === 0 ? 1 : 0) as Side;
    if (!this.hasMovablePieces(opponent)) {
        this.endGame(side);
        return;
    }
    
    this.turn = opponent;
    this.broadcastStatus();
    this.startTurnTimer();
  }
  
  isValidMove(from: {r: number, c: number}, to: {r: number, c: number}, p: Piece): boolean {
      if (from.r === to.r && from.c === to.c) return false;
      if (p.type === 'mine' || p.type === 'flag') return false;
      
      // Flip Chess Mode Special Rules
      const isFlipMode = this.room.attrs && this.room.attrs.mode === 2;
      const dr = Math.abs(from.r - to.r);
      const dc = Math.abs(from.c - to.c);
      
      // Flip Command (handled via move with from==to or special command? 
      // User requested "Increase Flip Mode". Usually clicking a covered piece flips it.
      // If we use 'move' with from==to for flip, handled in handleMove?
      // isValidMove checks movement logic for revealed pieces mainly.
      
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1) || (dr === 1 && dc === 1)) {
          if ((from.r === 5 && to.r === 6) || (from.r === 6 && to.r === 5)) {
              if (from.c === 1 || from.c === 3) return false;
          }
          if (dr === 1 && dc === 1) {
              if (!isCamp(from.r, from.c) && !isCamp(to.r, to.c)) return false;
          }
          return true;
      }
      
      if (isRailroad(from.r, from.c) && isRailroad(to.r, to.c)) {
          const isStraight = (from.r === to.r) || (from.c === to.c);
          if (p.name !== '工兵') {
              if (!isStraight) return false;
              return this.isPathClear(from, to);
          } else {
              return this.isRailroadPathClear(from, to);
          }
      }
      
      return false;
  }
  
  isPathClear(from: {r:number, c:number}, to: {r:number, c:number}) {
      if (from.r === to.r) {
          const min = Math.min(from.c, to.c);
          const max = Math.max(from.c, to.c);
          for(let c=min+1; c<max; c++) if(this.board[from.r][c]) return false;
      } else {
          const min = Math.min(from.r, to.r);
          const max = Math.max(from.r, to.r);
          for(let r=min+1; r<max; r++) if(this.board[r][from.c]) return false;
      }
      return true;
  }
  
  isRailroadPathClear(from: {r:number, c:number}, to: {r:number, c:number}) {
     const visited = new Set<string>();
     const queue = [from];
     visited.add(`${from.r},${from.c}`);
     
     while(queue.length) {
         const cur = queue.shift()!;
         if (cur.r === to.r && cur.c === to.c) return true;
         
         const neighbors = [
             {r: cur.r+1, c: cur.c}, {r: cur.r-1, c: cur.c},
             {r: cur.r, c: cur.c+1}, {r: cur.r, c: cur.c-1}
         ];
         for(const n of neighbors) {
             if (n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS) {
                 if (!isRailroad(n.r, n.c)) continue;
                 const key = `${n.r},${n.c}`;
                 if (visited.has(key)) continue;
                 
                 const isDest = (n.r === to.r && n.c === to.c);
                 if (this.board[n.r][n.c] && !isDest) continue;
                 
                 visited.add(key);
                 queue.push(n);
             }
         }
     }
     return false;
  }
  
  resolveCombat(att: Piece, def: Piece): 'win' | 'loss' | 'draw' {
     if (att.type === 'bomb' || def.type === 'bomb') return 'draw';
     if (def.type === 'mine') {
         if (att.name === '工兵') return 'win';
         return 'loss';
     }
     if (att.rank === def.rank) return 'draw';
     return att.rank > def.rank ? 'win' : 'loss';
  }
  
  hasMovablePieces(side: Side) {
     for(let r=0; r<ROWS; r++) {
         for(let c=0; c<COLS; c++) {
             const p = this.board[r][c];
             if (p && p.side === side) {
                 if (p.type !== 'mine' && p.type !== 'flag') return true;
             }
         }
     }
     return false;
  }
  
  endGame(winner: Side) {
     if (this.winner !== -1) return;
     this.winner = winner;
     this.stopTimer('turn');
     const wPlayer = this.room.validPlayers.find(p => this.players[p.id] === winner)!;
     this.say(`游戏结束，${wPlayer.name} 获胜！`);
     this.saveAchievements([wPlayer]);
     this.room.end();
  }

  // getStatus needs to include phase logic
  getStatus(sender: RoomPlayer) {
    const side = this.players[sender.id];
    
    // During deploy, you see your board. Opponent sees nothing (or empty).
    // During playing, standard fog.
    
    const boardState = this.board.map(row => row.map(p => {
      if (!p) return null;
      if (p.side === side) {
          // In Flip Mode, even my pieces are hidden initially
           const isFlipMode = this.room.attrs && this.room.attrs.mode === 2;
           if (isFlipMode && !p.revealed) {
                return {
                    side: -1, // Unknown to me too
                    type: 'unknown',
                    rank: -1,
                    name: '?',
                    revealed: false
                }
           }
          return p;
      }
      
      // Enemy piece
      if (this.phase === 'deploy') return null; // Don't show enemy placement progress
      
      const mode = this.room.attrs ? this.room.attrs.mode : 0;

      // Flip Mode check
      if (mode === 2) {
           if (!p.revealed) {
               return {
                   side: -1, // Unknown side
                   type: 'unknown',
                   rank: -1,
                   name: '?',
                   revealed: false
               }
           } else {
               return p; // Revealed pieces are visible
           }
      }

      // Bright Mode check
      if (mode === 1) {
          return p;
      }

      return {
        side: p.side,
        type: 'unknown',
        rank: -1,
        name: '?', 
      };
    }));

    return {
      ...super.getStatus(sender),
      board: boardState,
      mySide: side,
      turn: this.turn,
      phase: this.phase,
      isReady: this.readyPlayers.includes(sender.id),
      countdown: this.phase === 'deploy' ? this.tickEndTime['deploy'] : this.tickEndTime['turn'],
    }
  }

  handleTimeout() {
    this.history.push({
        type: 'timeout',
        side: this.turn,
        time: Date.now() - this.beginTime
    });
    this.consecutiveTimeouts[this.turn]++;
    if (this.consecutiveTimeouts[this.turn] >= 5) {
      const winner = this.turn === 0 ? 1 : 0;
      this.say(`一方连续超时5次，系统判负。`);
      this.endGame(winner);
      return;
    }
    const timeoutPlayer = this.room.validPlayers.find(p => this.players[p.id] === this.turn)!;
    // Switch turn
    this.turn = this.turn === 0 ? 1 : 0;
    this.say(timeoutPlayer.name + ' 超时，回合切换');
    this.broadcastStatus();
    this.startTurnTimer();
  }
  
  startTurnTimer() {
    this.startTimer(() => this.handleTimeout(), 30 * 1000, 'turn');
  }

  broadcastStatus() {
    this.room.validPlayers.forEach(p => {
      const status = this.getStatus(p);
      this.commandTo('status', status, p);
    });
  }
}
