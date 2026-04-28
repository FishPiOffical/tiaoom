import { PlayerRole, RoomPlayer, RoomStatus } from 'tiaoom';
import { GameRoom, IGameCommand } from '.';

// ─── 常量 ────────────────────────────────────────────────────────────────────
const ROWS = 6;
const COLS = 8;
const TOTAL = ROWS * COLS; // 48 格
const TILE_TYPES = TOTAL / 2; // 24 种，每种 2 张

// ─── 类型 ────────────────────────────────────────────────────────────────────
interface Pos {
  r: number;
  c: number;
}

interface PlayerState {
  board: number[][]; // ROWS×COLS，0 = 空位，>0 = 牌面 ID
  selected: Pos | null; // 当前选中的格子
  leftTiles: number; // 剩余非空格子数
  pairsDone: number; // 已消除对数
  shuffleCount: number; // 重排次数
  finishedAt: number; // 完成时间戳，0 表示未完成
}

// 回放操作记录
interface GameMove {
  playerId: string;
  type: 'pair-cleared' | 'shuffle';
  a?: Pos;          // pair-cleared：第一张牌坐标
  b?: Pos;          // pair-cleared：第二张牌坐标
  board?: number[][]; // shuffle：重排后的棋盘快照（因随机化，必须保存）
  time: number;       // 相对游戏开始的毫秒数
}

// ─── 辅助：生成并打乱初始棋盘 ────────────────────────────────────────────────
function buildInitialBoard(): number[][] {
  const tiles: number[] = [];
  for (let i = 1; i <= TILE_TYPES; i++) {
    tiles.push(i, i); // 每种牌 2 张
  }
  // Fisher-Yates 打乱
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  const board: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    board.push(tiles.slice(r * COLS, r * COLS + COLS));
  }
  return board;
}

// ─── 辅助：仅重排剩余非空牌（保持空位位置不变）────────────────────────────
function reshuffleBoard(board: number[][]): number[][] {
  // 收集所有非空牌值
  const remaining: number[] = [];
  const positions: Pos[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== 0) {
        remaining.push(board[r][c]);
        positions.push({ r, c });
      }
    }
  }
  // Fisher-Yates 打乱牌值
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  // 拷贝棋盘后填入新顺序
  const newBoard = board.map(row => row.slice());
  positions.forEach((pos, idx) => {
    newBoard[pos.r][pos.c] = remaining[idx];
  });
  return newBoard;
}

// ─── 辅助：经典两拐点连通判定 ────────────────────────────────────────────────
// 在逻辑棋盘外扩一圈边界（r:-1..ROWS, c:-1..COLS），边界格视为空位。
// 路径段：每段必须是同一行或同一列的连续空位（或端点）的直线。
// 最多允许 2 次拐弯，即最多 3 段直线。
function canConnect(board: number[][], a: Pos, b: Pos): boolean {
  if (a.r === b.r && a.c === b.c) return false;

  // isEmpty 允许 -1 号行/列（边界）以及棋盘内的空位（值为 0）
  function isEmpty(r: number, c: number): boolean {
    if (r < -1 || r > ROWS || c < -1 || c > COLS) return false;
    if (r === -1 || r === ROWS || c === -1 || c === COLS) return true; // 边界
    return board[r][c] === 0;
  }

  // 检查两点是否在同一直线上且中间全为空
  function lineOk(r1: number, c1: number, r2: number, c2: number): boolean {
    if (r1 !== r2 && c1 !== c2) return false;
    if (r1 === r2) {
      const [minC, maxC] = c1 < c2 ? [c1, c2] : [c2, c1];
      for (let c = minC + 1; c < maxC; c++) {
        if (!isEmpty(r1, c)) return false;
      }
      return true;
    } else {
      const [minR, maxR] = r1 < r2 ? [r1, r2] : [r2, r1];
      for (let r = minR + 1; r < maxR; r++) {
        if (!isEmpty(r, c1)) return false;
      }
      return true;
    }
  }

  // 0 拐：同行同列直连
  if ((a.r === b.r || a.c === b.c) && lineOk(a.r, a.c, b.r, b.c)) return true;

  // 1 拐：经过一个转折点 P，P 在棋盘内（含边界一格扩展范围）
  // 转折点只有两个候选：(a.r, b.c) 和 (b.r, a.c)
  const corners: Pos[] = [
    { r: a.r, c: b.c },
    { r: b.r, c: a.c },
  ];
  for (const p of corners) {
    if (isEmpty(p.r, p.c) && lineOk(a.r, a.c, p.r, p.c) && lineOk(p.r, p.c, b.r, b.c)) {
      return true;
    }
  }

  // 2 拐：枚举通过边界的两个转折点
  // 第一段沿 a 的行或列延伸到边界，再直线到 b 的行或列，再到 b
  // 为避免全枚举，使用"沿一个方向扫描可能的中间行/列"策略：
  // 枚举第一折点 p1 在 a 所在行延伸（r=a.r, c=-1..COLS）或列延伸（c=a.c, r=-1..ROWS）；
  // 第二折点 p2 = (p1.r=b.r, p1.c) 或 (p1.r, p1.c=b.c)，即与 b 形成 1 折可达。
  const extendR: number[] = [-1, ROWS];
  const extendC: number[] = [-1, COLS];

  // 枚举 p1 沿 a 行方向（同行，c 从 -1 到 COLS）
  for (let c = -1; c <= COLS; c++) {
    const p1: Pos = { r: a.r, c };
    if (!isEmpty(p1.r, p1.c)) continue;
    // p1 必须从 a 直线可达（同行）
    if (!lineOk(a.r, a.c, p1.r, p1.c)) continue;
    // 第二折尝试两个角
    for (const p2 of [{ r: b.r, c: p1.c }, { r: p1.r, c: b.c }]) {
      if (!isEmpty(p2.r, p2.c)) continue;
      if (lineOk(p1.r, p1.c, p2.r, p2.c) && lineOk(p2.r, p2.c, b.r, b.c)) return true;
    }
  }

  // 枚举 p1 沿 a 列方向（同列，r 从 -1 到 ROWS）
  for (let r = -1; r <= ROWS; r++) {
    const p1: Pos = { r, c: a.c };
    if (!isEmpty(p1.r, p1.c)) continue;
    if (!lineOk(a.r, a.c, p1.r, p1.c)) continue;
    for (const p2 of [{ r: b.r, c: p1.c }, { r: p1.r, c: b.c }]) {
      if (!isEmpty(p2.r, p2.c)) continue;
      if (lineOk(p1.r, p1.c, p2.r, p2.c) && lineOk(p2.r, p2.c, b.r, b.c)) return true;
    }
  }

  return false;
}

// ─── 辅助：检测棋盘是否存在至少一对可消除的牌 ──────────────────────────────
function hasSolvablePair(board: number[][]): boolean {
  const cells: { pos: Pos; val: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== 0) cells.push({ pos: { r, c }, val: board[r][c] });
    }
  }
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (cells[i].val === cells[j].val && canConnect(board, cells[i].pos, cells[j].pos)) {
        return true;
      }
    }
  }
  return false;
}

// ─── 游戏元数据 ──────────────────────────────────────────────────────────────
export const name = '连连看';
export const minSize = 2;
export const maxSize = 2;
export const description = `两位玩家各自拥有独立的 6×8 棋盘，初始布局相同。
选择两张图案相同且路径最多拐弯两次（含绕棋盘边界）的牌进行消除。
当棋盘无解时自动重排剩余牌面。最先清空棋盘的玩家获胜！`;
export const points = {
  '我就玩玩': 0,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
};

// ─── 游戏主类 ─────────────────────────────────────────────────────────────────
export default class LinkLinkRoom extends GameRoom {
  playerStates: Record<string, PlayerState> = {};
  playerOrder: string[] = []; // 记录玩家 ID 顺序，保证状态广播一致
  winnerName: string | null = null;

  // 回放数据
  beginTime: number = 0;
  initialBoard: number[][] = [];
  moves: GameMove[] = [];

  // 仅供观众查看的棋盘快照
  private buildWatcherBoards() {
    const boards: Record<string, number[][]> = {};
    for (const id of this.playerOrder) {
      boards[id] = this.playerStates[id]?.board?.map(row => row.slice()) ?? [];
    }
    return boards;
  }

  // 初始化：生成同一套初始棋盘，分配给两名玩家
  onStart() {
    const players = this.room.validPlayers;
    const initialBoard = buildInitialBoard();

    this.playerOrder = players.map(p => p.id);
    this.winnerName = null;
    this.beginTime = Date.now();
    this.initialBoard = initialBoard.map(row => row.slice());
    this.moves = [];

    players.forEach(p => {
      this.playerStates[p.id] = {
        board: initialBoard.map(row => row.slice()),
        selected: null,
        leftTiles: TOTAL,
        pairsDone: 0,
        shuffleCount: 0,
        finishedAt: 0,
      };
    });

    this.room.emit('command', { type: 'init', data: this.buildPublicStatus() });
    // 私发各自棋盘，不让对方客户端得到棋盘数据
    players.forEach(p => {
      p.emit('command', { type: 'board-init', data: { board: this.playerStates[p.id].board } });
    });
    // 观众可查看双方棋盘
    this.room.watchers.forEach(w => {
      w.emit('command', { type: 'watcher-boards', data: { boards: this.buildWatcherBoards() } });
    });
    this.say('游戏开始！选择两张相同的牌消除，最先清空棋盘者获胜！');
  }

  // 构造广播给所有玩家的公开状态（不含棋盘数据，防止客户端分析对手布局）
  private buildPublicStatus() {
    return {
      players: this.playerOrder.map(id => {
        const s = this.playerStates[id];
        const player = this.room.validPlayers.find(p => p.id === id);
        return {
          id,
          name: player?.name ?? id,
          leftTiles: s?.leftTiles ?? 0,
          pairsDone: s?.pairsDone ?? 0,
          shuffleCount: s?.shuffleCount ?? 0,
          finishedAt: s?.finishedAt ?? 0,
          // 不含 board：棋盘数据通过 board-init / board-update 私发给各自玩家
        };
      }),
      winnerName: this.winnerName,
    };
  }

  // getStatus：断线重连时调用，只向请求方返回自己的棋盘数据
  getStatus(sender: RoomPlayer) {
    const base = super.getStatus(sender);
    if (sender.role === PlayerRole.watcher) {
      return {
        ...base,
        ...this.buildPublicStatus(),
        watcherBoards: this.buildWatcherBoards(),
      };
    }
    const myState = this.playerStates[sender.id];
    return {
      ...base,
      ...this.buildPublicStatus(),
      myBoard: myState?.board ?? [],       // 只有自己能看到自己的棋盘
      mySelected: myState?.selected ?? null,
    };
  }

  getData() {
    // 添加玩家名字，供回放组件使用
    const playerStates: Record<string, any> = {};
    for (const [id, state] of Object.entries(this.playerStates)) {
      const player = this.room.validPlayers.find(p => p.id === id);
      playerStates[id] = { ...state, name: player?.name ?? id };
    }
    return {
      playerStates,
      playerOrder: this.playerOrder,
      winnerName: this.winnerName,
      // 回放专用：初始棋盘 + 完整操作日志
      initialBoard: this.initialBoard,
      moves: this.moves,
    };
  }

  onCommand(message: IGameCommand): void {
    super.onCommand(message);
    const sender = message.sender as RoomPlayer;

    if (message.type !== 'select') return;
    if (this.room.status !== RoomStatus.playing) return;
    if (this.winnerName !== null) return; // 游戏已结束

    const myState = this.playerStates[sender.id];
    if (!myState || myState.finishedAt !== 0) return; // 该玩家已完成

    const { r, c } = message.data as { r: number; c: number };

    // 边界校验
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if (myState.board[r][c] === 0) return; // 空位不可选

    const clickedPos: Pos = { r, c };

    if (!myState.selected) {
      // 第一次选牌
      myState.selected = clickedPos;
      sender.emit('command', { type: 'select-ack', data: { r, c, phase: 1 } });
      return;
    }

    const first = myState.selected;

    // 点击同一格：取消选中
    if (first.r === r && first.c === c) {
      myState.selected = null;
      sender.emit('command', { type: 'select-ack', data: { r, c, phase: 0 } });
      return;
    }

    // 牌面不同：替换第一选
    if (myState.board[first.r][first.c] !== myState.board[r][c]) {
      myState.selected = clickedPos;
      sender.emit('command', { type: 'select-ack', data: { r, c, phase: 1, replaced: first } });
      return;
    }

    // 牌面相同：判断连通
    if (!canConnect(myState.board, first, clickedPos)) {
      // 无法连通：仍替换为新的第一选
      myState.selected = clickedPos;
      sender.emit('command', { type: 'select-ack', data: { r, c, phase: 1, replaced: first, invalid: true } });
      return;
    }

    // ✅ 消除成功
    myState.board[first.r][first.c] = 0;
    myState.board[r][c] = 0;
    myState.selected = null;
    myState.leftTiles -= 2;
    myState.pairsDone += 1;

    // 记录到回放日志
    this.moves.push({
      playerId: sender.id,
      type: 'pair-cleared',
      a: first,
      b: clickedPos,
      time: Date.now() - this.beginTime,
    });

    // 广播消除事件（不含棋盘数据）
    this.room.emit('command', { type: 'pair-cleared', data: {
      playerId: sender.id,
      a: first,
      b: clickedPos,
      leftTiles: myState.leftTiles,
      pairsDone: myState.pairsDone,
    } });
    // 仅私发更新后的棋盘给操作者本人
    sender.emit('command', { type: 'board-update', data: { board: myState.board } });
    // 私发更新后的棋盘给观众
    this.room.watchers.forEach(w => {
      w.emit('command', { type: 'watcher-board-update', data: {
        playerId: sender.id,
        board: myState.board,
      } });
    });

    // 判胜：该玩家已清空棋盘
    if (myState.leftTiles === 0) {
      myState.finishedAt = Date.now();
      this.winnerName = sender.name;
      this.room.emit('command', { type: 'game-over', data: {
        winner: { id: sender.id, name: sender.name },
        players: this.buildPublicStatus().players,
      } });
      this.say(`${sender.name} 率先清空棋盘，获胜！`);
      this.saveAchievements([sender]);
      this.room.end();
      return;
    }

    // 无解检测：若该玩家棋盘已无可消对，则重排
    if (!hasSolvablePair(myState.board)) {
      myState.board = reshuffleBoard(myState.board);
      myState.shuffleCount += 1;
      // 记录到回放日志（必须保存新棋盘快照，因为重排是随机的）
      this.moves.push({
        playerId: sender.id,
        type: 'shuffle',
        board: myState.board.map(row => row.slice()),
        time: Date.now() - this.beginTime,
      });
      // 广播重排通知（不含棋盘）
      this.room.emit('command', { type: 'shuffle', data: {
        playerId: sender.id,
        shuffleCount: myState.shuffleCount,
      } });
      // 仅私发新棋盘给操作者本人
      sender.emit('command', { type: 'board-update', data: { board: myState.board } });
      // 私发新棋盘给观众
      this.room.watchers.forEach(w => {
        w.emit('command', { type: 'watcher-board-update', data: {
          playerId: sender.id,
          board: myState.board,
        } });
      });
      this.say(`${sender.name} 的棋盘已无解，自动重排（第 ${myState.shuffleCount} 次）。`);
    }
  }

}
