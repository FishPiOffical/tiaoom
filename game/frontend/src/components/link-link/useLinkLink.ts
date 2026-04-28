import { ref, computed, onMounted } from 'vue';
import { Room, RoomPlayer } from 'tiaoom/client';
import { GameCore } from '@/core/game';
import { useGameEvents } from '@/hook/useGameEvents';

// ─── 常量（与后端保持一致）──────────────────────────────────────────────────
export const ROWS = 6;
export const COLS = 8;
export const ANIM_DURATION = 480; // 消除连线动画时长 ms

export interface Pos { r: number; c: number }

export interface ClearAnimation {
  path: Pos[];   // 路径关键节点（含端点，可含边界坐标）
  a: Pos;
  b: Pos;
  startTime: number;
}

// 非响应式 Map，避免深层 reactivity 拖慢动画帧
export const clearAnimations = new Map<string, ClearAnimation>();

// ─── 前端路径搜索（镜像后端逻辑，返回关键节点列表）────────────────────────
function findPath(board: number[][], a: Pos, b: Pos): Pos[] | null {
  function isEmpty(r: number, c: number): boolean {
    if (r === -1 || r === ROWS || c === -1 || c === COLS) return true;
    if (r < -1 || r > ROWS || c < -1 || c > COLS) return false;
    return board[r][c] === 0;
  }
  function lineOk(r1: number, c1: number, r2: number, c2: number): boolean {
    if (r1 !== r2 && c1 !== c2) return false;
    if (r1 === r2) {
      const [lo, hi] = c1 < c2 ? [c1, c2] : [c2, c1];
      for (let c = lo + 1; c < hi; c++) if (!isEmpty(r1, c)) return false;
      return true;
    } else {
      const [lo, hi] = r1 < r2 ? [r1, r2] : [r2, r1];
      for (let r = lo + 1; r < hi; r++) if (!isEmpty(r, c1)) return false;
      return true;
    }
  }
  // 0 拐
  if ((a.r === b.r || a.c === b.c) && lineOk(a.r, a.c, b.r, b.c)) return [a, b];
  // 1 拐
  for (const p of [{ r: a.r, c: b.c }, { r: b.r, c: a.c }]) {
    if (isEmpty(p.r, p.c) && lineOk(a.r, a.c, p.r, p.c) && lineOk(p.r, p.c, b.r, b.c))
      return [a, p, b];
  }
  // 2 拐 — 沿 a 行方向
  for (let c = -1; c <= COLS; c++) {
    const p1 = { r: a.r, c };
    if (!isEmpty(p1.r, p1.c) || !lineOk(a.r, a.c, p1.r, p1.c)) continue;
    for (const p2 of [{ r: b.r, c: p1.c }, { r: p1.r, c: b.c }]) {
      if (isEmpty(p2.r, p2.c) && lineOk(p1.r, p1.c, p2.r, p2.c) && lineOk(p2.r, p2.c, b.r, b.c))
        return [a, p1, p2, b];
    }
  }
  // 2 拐 — 沿 a 列方向
  for (let r = -1; r <= ROWS; r++) {
    const p1 = { r, c: a.c };
    if (!isEmpty(p1.r, p1.c) || !lineOk(a.r, a.c, p1.r, p1.c)) continue;
    for (const p2 of [{ r: b.r, c: p1.c }, { r: p1.r, c: b.c }]) {
      if (isEmpty(p2.r, p2.c) && lineOk(p1.r, p1.c, p2.r, p2.c) && lineOk(p2.r, p2.c, b.r, b.c))
        return [a, p1, p2, b];
    }
  }
  return null;
}

export interface PlayerInfo {
  id: string;
  name: string;
  leftTiles: number;
  pairsDone: number;
  shuffleCount: number;
  finishedAt: number;
  board: number[][];  // 玩家视角仅自己的棋盘；观众视角为双方棋盘
}

export function useLinkLink(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  const players = ref<PlayerInfo[]>([]);
  const winnerName = ref<string | null>(null);
  const mySelected = ref<Pos | null>(null);
  const shuffleNotice = ref<{ playerId: string; count: number } | null>(null);
  const showShuffleNotice = ref(false);

  const isPlaying = computed(() => roomPlayer.room.status === 'playing');
  const isWatcher = computed(() => roomPlayer.role === 'watcher');

  // ─── 辅助：找我的 PlayerInfo ──────────────────────────────────────────────
  const myInfo = computed(() => players.value.find(p => p.id === roomPlayer.id) ?? null);
  const opponentInfo = computed(() => players.value.find(p => p.id !== roomPlayer.id) ?? null);

  // ─── 消息处理 ─────────────────────────────────────────────────────────────
  // ─── 辅助：应用状态（保留己方棋盘） ──────────────────────────────────────────────
  function applyFullStatus(data: any) {
    const oldBoards = Object.fromEntries(players.value.map(p => [p.id, p.board]));
    players.value = (data.players ?? []).map((p: any) => ({ ...p, board: [] }));

    if (isWatcher.value) {
      const watcherBoards = data.watcherBoards ?? {};
      players.value.forEach((p) => {
        p.board = watcherBoards[p.id] ?? oldBoards[p.id] ?? [];
      });
    } else {
      // 玩家仅应用自己的棋盘：优先 getStatus.myBoard，其次保留内存中已有棋盘
      const my = players.value.find(p => p.id === roomPlayer.id);
      if (my) my.board = data.myBoard ?? oldBoards[roomPlayer.id] ?? [];
    }

    winnerName.value = data.winnerName ?? null;
    if (data.mySelected !== undefined) {
      mySelected.value = data.mySelected;
    }
  }

  function onCommand(cmd: any) {
    switch (cmd.type) {
      case 'init':
      case 'status':
        applyFullStatus(cmd.data);
        break;

      case 'select-ack': {
        const { r, c, phase } = cmd.data;
        mySelected.value = phase === 0 ? null : { r, c };
        break;
      }

      case 'pair-cleared': {
        const { playerId, a, b, leftTiles, pairsDone } = cmd.data;
        const p = players.value.find(p => p.id === playerId);
        if (p) {
          // 在棋盘更新前计算消除路径（玩家仅自己可动画，观众可看双方动画）
          const canAnimate = (isWatcher.value || playerId === roomPlayer.id) && p.board?.length;
          if (canAnimate) {
            const path = findPath(p.board, a, b);
            if (path) clearAnimations.set(playerId, { path, a, b, startTime: Date.now() });
          }
          // 仅更新计数器，棋盘数据通过 board-update 私信到达
          p.leftTiles = leftTiles;
          p.pairsDone = pairsDone;
        }
        if (playerId === roomPlayer.id) mySelected.value = null;
        break;
      }

      case 'board-init':
      case 'board-update': {
        // 棋盘数据只发给玩家本人
        const my = players.value.find(p => p.id === roomPlayer.id);
        if (my) my.board = cmd.data.board;
        break;
      }

      case 'watcher-boards': {
        // 观众初始/全量棋盘
        const boards = cmd.data?.boards ?? {};
        players.value.forEach((p) => {
          p.board = boards[p.id] ?? p.board;
        });
        break;
      }

      case 'watcher-board-update': {
        // 观众单玩家棋盘增量更新
        const { playerId, board } = cmd.data ?? {};
        const p = players.value.find(p => p.id === playerId);
        if (p && board) p.board = board;
        break;
      }

      case 'shuffle': {
        const { playerId, shuffleCount } = cmd.data;
        const p = players.value.find(p => p.id === playerId);
        if (p) {
          // board 通过 board-update 私信到达，这里只更新计数器
          p.shuffleCount = shuffleCount;
        }
        shuffleNotice.value = { playerId, count: shuffleCount };
        showShuffleNotice.value = true;
        setTimeout(() => { showShuffleNotice.value = false; }, 2500);
        break;
      }

      case 'game-over': {
        winnerName.value = cmd.data.winner?.name ?? null;
        players.value = (cmd.data.players ?? players.value).map((p: any) => ({
          ...p,
          // game-over players 不含棋盘，保留己方已有棋盘
          board: p.id === roomPlayer.id ? (myInfo.value?.board ?? []) : [],
        }));
        mySelected.value = null;
        break;
      }
    }
  }

  // ─── 操作 ─────────────────────────────────────────────────────────────────
  function selectTile(r: number, c: number) {
    if (isWatcher.value) return;
    if (!isPlaying.value || winnerName.value) return;
    const my = myInfo.value;
    if (!my || my.finishedAt !== 0) return;
    if (my.board[r]?.[c] === 0) return;
    game.command(roomPlayer.room.id, { type: 'select', data: { r, c } });
  }

  // ─── 事件监听（直接订阅，兼容 Lite 刷新场景）─────────────────────────────
  useGameEvents(game, {
    'player.command': onCommand,
    'room.command':   onCommand,
    'room.end':       () => { mySelected.value = null; },
  });

  // 组件挂载后主动拉取一次最新状态（处理刷新 / 重连 / Lite 窗口场景）
  onMounted(() => {
    game.command(roomPlayer.room.id, { type: 'status', data: {} });
  });

  return {
    players, myInfo, opponentInfo,
    winnerName, mySelected,
    shuffleNotice, showShuffleNotice,
    isPlaying, isWatcher, selectTile, onCommand,
  };
}
