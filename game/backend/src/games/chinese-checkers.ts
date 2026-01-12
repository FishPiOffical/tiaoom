import { GameRoom, IGameCommand } from '.';
import { RoomPlayer } from 'tiaoom';

export const name = '中国跳棋';
export const minSize = 2;
export const maxSize = 6;
export const description = '经典的中国跳棋游戏，支持2-6人对战。率先将所有棋子移动到对角即为胜利。';

export const points = {
  '我就玩玩': 0,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
};

// 坐标类
class Point {
  constructor(public x: number, public y: number) {}
  toString() { return `${this.x},${this.y}`; }
  static fromString(s: string) { const [x, y] = s.split(',').map(Number); return new Point(x, y); }
  equals(other: Point) { return this.x === other.x && this.y === other.y; }
}

// 预定义有效坐标 (使用 q, r)
const VALID_COORDS: string[] = [];
// 我们可以通过简单的 BFS 或硬编码来生成。
// 让我们在前端和后端都使用一种简单的坐标系：
// y: 行号 (0-16)
// x: 在该行中的偏移 (此行第几个洞) -> 不方便计算邻居
// 最好还是 Axial.
// 邻居：(q+1, r), (q-1, r), (q, r+1), (q, r-1), (q+1, r-1), (q-1, r+1)

// 下面的生成逻辑能够生成标准六角星棋盘
const ALL_POINTS: {q: number, r: number, zone?: number}[] = [];
for (let q = -8; q <= 8; q++) {
    for (let r = -8; r <= 8; r++) {
        const s = -q - r;
        if (Math.abs(s) > 8) continue; // Boundary
        
        // Star = Union of two large triangles
        // T1 (Inverted): q <= 4 && r <= 4 && s <= 4
        // T2 (Upright): q >= -4 && r >= -4 && s >= -4
        // Logic: valid if in S1 OR S2 (and within radius 8)
        
        const inInv = q <= 4 && r <= 4 && s <= 4;
        const inUpr = q >= -4 && r >= -4 && s >= -4;
        
        if (inInv || inUpr) {
             ALL_POINTS.push({q, r});
             VALID_COORDS.push(`${q},${r}`);
        }
    }
}

// 颜色/位置定义
// 0: Top (r maximal -> r > 4)
// 1: Top Right (s minimal -> s < -4)
// 2: Bottom Right (q maximal -> q > 4)
// 3: Bottom (r minimal -> r < -4)
// 4: Bottom Left (s maximal -> s > 4)
// 5: Top Left (q minimal -> q < -4)
const ZONES = {
    0: (q: number, r: number) => r > 4,
    1: (q: number, r: number) => (-q-r) < -4, // s < -4
    2: (q: number, r: number) => q > 4,
    3: (q: number, r: number) => r < -4,
    4: (q: number, r: number) => (-q-r) > 4, // s > 4
    5: (q: number, r: number) => q < -4,
};

// 目标区域 (每个位置的目标是其对面: 0->3, 1->4, 2->5, ...)
const TARGET_ZONES = {
    0: 3, 1: 4, 2: 5, 3: 0, 4: 1, 5: 2
};

type ZIndex = 0 | 1 | 2 | 3 | 4 | 5;

export default class ChineseCheckers extends GameRoom {
  // 棋盘状态: key="q,r", value=playerId
  board: Record<string, string> = {}; 
  // 玩家基础信息
  displayPlayers: { id: string, name: string, color: ZIndex, target: ZIndex }[] = [];
  // 当前回合玩家 index (在 displayPlayers 中的 index)
  turnIndex: number = 0;
  
  // 游戏配置
  static maxStepTime = 60 * 1000;

  get currentPlayer() {
      return this.displayPlayers[this.turnIndex];
  }

  isPieceInZone(q: number, r: number, zoneIdx: ZIndex) {
      if (!ZONES[zoneIdx]) return false;
      return ZONES[zoneIdx](q, r);
  }

  init() {
    return super.init();
  }

  onStart() {
    this.board = {};
    const players = this.room.validPlayers;
    const count = players.length;
    
    // 分配位置 (0-5)
    // 2人: 0, 3 (对角)
    // 3人: 0, 2, 4 (间隔)
    // 4人: 0, 1, 3, 4 (两对对角? 0vs3, 1vs4. leaving 2,5 empty) -> standard 4 player setup
    // 6人: 0, 1, 2, 3, 4, 5
    let seats: ZIndex[] = [];
    if (count === 2) seats = [0, 3];
    else if (count === 3) seats = [0, 2, 4]; // 3人局目标是到对面空角
    else if (count === 4) seats = [0, 1, 3, 4]; // 0->3, 3->0, 1->4, 4->1. 
    else if (count === 6) seats = [0, 1, 2, 3, 4, 5];
    else {
        // Fallback for weird numbers (e.g. 5)
        seats = [0, 1, 2, 3, 4].slice(0, count) as ZIndex[];
    }
    
    this.displayPlayers = players.map((p, i) => ({
        id: p.id,
        name: p.name,
        color: seats[i],
        target: (seats[i] + 3) % 6 as ZIndex // Simple opposite logic works for standard stars
    }));

    // 初始化棋子
    this.displayPlayers.forEach(p => {
        // Find all cells in p.color zone
        ALL_POINTS.forEach(pt => {
            if (this.isPieceInZone(pt.q, pt.r, p.color)) {
                this.board[`${pt.q},${pt.r}`] = p.id;
            }
        });
    });

    this.turnIndex = 0;
    this.startTurn();
    this.broadcastState();
  }

  startTurn() {
    this.command('turn', { playerIndex: this.turnIndex, playerId: this.currentPlayer.id });
  }

  handleTurnTimeout() {
    // Timeout disabled
  }

  nextTurn() {
    const nextIndex = (this.turnIndex + 1) % this.displayPlayers.length;

    // 一轮结束（即将回到第一个玩家），进行结算检查
    if (nextIndex === 0) {
        // 检查所有完成了游戏的玩家
        const winners = this.displayPlayers.filter(p => this.checkWin(p));
        
        if (winners.length > 0) {
           if (winners.length === this.displayPlayers.length) {
               this.say('平局！所有人都到达终点。');
               this.room.end();
           } else {
               const names = winners.map(p => p.name).join('、');
               this.say(`${names} 获胜！`);
               const winningPlayers = this.room.validPlayers.filter(vp => winners.some(w => w.id === vp.id));
               this.saveAchievements(winningPlayers);
               this.room.end();
           }
           return;
        }
    }

    this.turnIndex = nextIndex;
    this.startTurn();
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    if (message.type === 'move') {
        const { path } = message.data; // Array of {q, r}
        if (!Array.isArray(path) || path.length < 2) return;
        
        if (message.sender.id !== this.currentPlayer.id) return;
        
        // 验证移动
        if (this.validateMove(path, message.sender.id)) {
            // 检查落点是否合法（不能停留在非己方且非目标的营地）
            let end = path[path.length - 1];
            const player = this.displayPlayers.find(p => p.id === message.sender.id)!;
            
            for (let z = 0; z < 6; z++) {
                if (this.isPieceInZone(end.q, end.r, z as any)) {
                    if (z !== player.color && z !== player.target) {
                        this.say('不能停留在非目的地的敌方营地');
                        return;
                    }
                }
            }

            // 执行移动
            const start = path[0];
            end = path[path.length - 1];
            delete this.board[`${start.q},${start.r}`];
            this.board[`${end.q},${end.r}`] = message.sender.id;
            
            this.save(); // 保存状态
            
            this.command('moved', { playerId: message.sender.id, from: start, to: end, path });

            // 此时不立即检查胜利，而是进入下一回合
            // 在 nextTurn 中会判断是否一轮结束并进行结算
            this.nextTurn();
        }
    }
  }

  validateMove(path: {q: number, r: number}[], playerId: string): boolean {
      // 1. Start must be own piece
      const start = path[0];
      if (this.board[`${start.q},${start.r}`] !== playerId) return false;
      
      // 2. End must be empty
      const end = path[path.length - 1];
      if (this.board[`${end.q},${end.r}`]) return false;
      
      // 3. Validate steps
      // If length is 2, can be step or jump
      // If length > 2, must be all jumps
      
      const isStep = (a: any, b: any) => {
          const dq = b.q - a.q;
          const dr = b.r - a.r;
          const ds = -dq-dr;
          // Distance 1
          return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) === 2;
      };
      
      const isJump = (a: any, b: any) => {
           // Implement Super Jump (Symmetrical over a pivot)
           const dq = b.q - a.q;
           const dr = b.r - a.r;
           
           // 1. Must be in a line (one of 6 directions)
           // Directions: dq=0, dr=0, or dq=-dr
           if (!(dq === 0 || dr === 0 || dq === -dr)) return false;
           
           // 2. Distance check
           // In Hex grid, if in line, distance is simply max(|dq|, |dr|).
           // Let's iterate from A to B to find the pivot.
           
           // We need a pivot P.
           // B = A + 2 * (P - A). => 2P = A + B. => P = (A + B) / 2.
           const midQ = (a.q + b.q) / 2;
           const midR = (a.r + b.r) / 2;
           
           // Pivot must be integer coordinate
           if (!Number.isInteger(midQ) || !Number.isInteger(midR)) return false;
           
           // Pivot must be occupied
           if (!this.board[`${midQ},${midR}`]) return false;
           
           // Line segment check: A to P must be empty, P to B must be empty.
           // Since it is symmetric, checking A to P is enough? (Except for P itself)
           // Actually, the rule "A的行进路线中没有B以外的棋子阻挡" means:
           // From A to B, ONLY P is occupied.
           
           const steps = Math.max(Math.abs(dq), Math.abs(dr));
           const stepQ = dq / steps;
           const stepR = dr / steps;
           
           // Iterate all points between A and B
           for (let k = 1; k < steps; k++) {
               const currQ = a.q + k * stepQ;
               const currR = a.r + k * stepR;
               
               // If this is the midpoint P?
               if (currQ === midQ && currR === midR) {
                   // Must be occupied (Already checked above, but valid here)
                   continue;
               }
               
               // Any other point must be empty
               if (this.board[`${currQ},${currR}`]) return false;
           }
           
           return true;
      };

      if (path.length === 2) {
          if (isStep(path[0], path[1])) return true;
          if (isJump(path[0], path[1])) return true;
          return false;
      }
      
      // Multi-jump
      for (let i = 0; i < path.length - 1; i++) {
          if (!isJump(path[i], path[i+1])) return false;
          // Also check if landing spots (except last) are empty?
          // path[i+1] must be empty (except it is the start of next jump).
          // In our model path includes all landing spots. 
          // Intermediate spots must be empty.
          // Since we checked start and end occupancy, and we assumed 'board' is static during validation:
          const mid = path[i+1];
          if (i < path.length - 2) { // Intermediate node
             // The intermediate node in path list is the landing spot of previous jump
             // It must be EMPTY to land there.
             // Wait, do we allow hopping over occupied spots as landing? NO.
             // Landing spot must be empty.
             // The loop logic:
             // Path: [Start, Land1, Land2, End]
             // Jump 1: Start -> Land1. Land1 must be empty (checked within isJump? No, isJump checks line. Land1 occupancy check?)
             
             // isJump checks line internal emptiness. It doesn't check endpoint B (Land1) emptyness explicitly?
             // Actually, `this.board` is state.
             // Start is occupied by Player.
             // Land1 is currently empty? Yes.
             // BUT, if we have multiple jumps...
             // We can assume intermediate steps land on empty spots.
             if (this.board[`${mid.q},${mid.r}`]) return false;
          }
      }
      return true;
  }

  checkWin(player: { id: string, color: number, target: ZIndex }) {
      // Check if all pieces of this player are in the target zone
      let pieceCount = 0;
      let inTargetCount = 0;
      
      for (const key in this.board) {
          if (this.board[key] === player.id) {
              pieceCount++;
              const [q, r] = key.split(',').map(Number);
              if (this.isPieceInZone(q, r, player.target)) {
                  inTargetCount++;
              }
          }
      }
      // Victory if all pieces (10) are in target zone.
      // What if target zone has a piece from another player?
      // Standard rule: Cannot win if target is blocked? 
      // Or usually "All my pieces are in target triangle".
      // If some holes are occupied by others, can I still win?
      // Lenient rule: fill all *available* spots? 
      // Strict rule: Must fill the triangle. 
      // If opponent refuses to leave, they can block win.
      // Tiaoom specific: casual. Let's say if all your pieces are in target zone, you win.
      // Even if target zone has restricted spots.
      // But standard is 10 pieces.
      return pieceCount > 0 && pieceCount === inTargetCount;
  }

  getStatus(sender: any) {
    return {
      ...super.getStatus(sender),
      board: this.board,
      players: this.displayPlayers,
      turnIndex: this.turnIndex,
    };
  }
  
  broadcastState() {
      this.command('state', {
          board: this.board,
          players: this.displayPlayers,
          turn: this.turnIndex
      });
  }
}
