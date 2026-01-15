import { GameRoom, IGameCommand } from '.';
import { RoomPlayer } from 'tiaoom';

export type AeroplaneColor = 'y' | 'b' | 'r' | 'g';
export type PieceArea = 'hangar' | 'main' | 'home' | 'finish';

export interface AeroplanePiece {
  index: 0 | 1 | 2 | 3;
  area: PieceArea;
  /**
   * ybrgh + 0-3
   * ybrg + 0-19
   */
  pos: string;
  posIndex: number;
}

export interface AeroplanePlayerState {
  playerId: string;
  color: AeroplaneColor;
  pieces: AeroplanePiece[];
}

export type AeroplanePhase = 'waiting-roll' | 'waiting-move';

export interface AeroplaneHistoryItem {
  playerId: string;
  action: 'roll' | 'move';
  roll?: number;
  pieceIndex?: number;
  to?: string;
  text: string;
  timestamp: number;
}

export interface AeroplaneGameState {
  phase: AeroplanePhase;
  turnPlayerId: string;
  lastRoll?: number;
  consecutiveSixes: number;
  players: Record<string, AeroplanePlayerState>;
  winnerPlayerId?: string;
  moveable?: Record<string, (0 | 1 | 2 | 3)[]>;
}

export const name = '飞行棋';
export const minSize = 2;
export const maxSize = 4;
export const description = '经典飞行棋：掷骰起飞、绕圈前进、吃子、回家。';
export const points = {
  '我就玩玩': 0,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
}
export const rates = {
  '我就玩玩': 1.0,
  '小博一下': 2,
  '大赢家': 5,
};


const COLORS: AeroplaneColor[] = ['y', 'r', 'b', 'g'];

function clampPieceIndex(n: any): 0 | 1 | 2 | 3 | null {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  const i = Math.floor(v);
  if (i < 0 || i > 3) return null;
  return i as 0 | 1 | 2 | 3;
}

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function nextTurnPlayerId(order: string[], current: string): string {
  const idx = order.indexOf(current);
  if (idx < 0) return order[0];
  return order[(idx + 1) % order.length];
}

/**
 * 不同颜色的起始位置
 */
const piecesBegin = {
  y: 'g4',
  b: 'y4',
  r: 'b4',
  g: 'r4',
};

/**
 * 获取某颜色的棋路径
 * @param color 
 * @returns 
 */
function getPieceList(color: 'y' | 'b' | 'r' | 'g'): string[] {
  const begin = piecesBegin[color];
  let colorList = ['y', 'b', 'r', 'g'];
  const beginIndex = colorList.indexOf(begin[0]);
  colorList = colorList.slice(beginIndex).concat(colorList.slice(0, beginIndex));
  let piece = begin;
  let index: { y: number, b: number, r: number, g: number } = colorList.reduce((acc, c, i) => {
    acc[c as keyof typeof index] = [4, 1, 11, 8][i];
    return acc;
  }, {} as { y: number, b: number, r: number, g: number });
  const offset = Number(begin[1]) - index[begin[0] as keyof typeof index];
  index.y = (index.y + offset + 13) % 13;
  index.b = (index.b + offset + 13) % 13;
  index.r = (index.r + offset + 13) % 13;
  index.g = (index.g + offset + 13) % 13;
  const ways: string[] = [color + 0];
  do {
    for (const c of colorList) {
      piece = c + String(index[c as keyof typeof index] == 0 ? 13 : index[c as keyof typeof index]);
      index[c as keyof typeof index] = (index[c as keyof typeof index] + 1) % 13;
      ways.push(piece);
      if (piece === color + 13) break;
    }
  } while (piece !== color + 13);
  for (let i = 0; i < 6; i++) {
    ways.push(color + String(14 + i));
  }
  return ways;
}

export default class AeroplaneChessRoom extends GameRoom {
  state: AeroplaneGameState | null = null;
  history: AeroplaneHistoryItem[] = [];
  pieceWays: Record<AeroplaneColor, string[]> = {
    y: getPieceList('y'),
    b: getPieceList('b'),
    r: getPieceList('r'),
    g: getPieceList('g'),
  };
  pieceNames: Record<AeroplaneColor, string> = {
    y: 'Y',
    b: 'B',
    r: 'R',
    g: 'G',
  };

  takeOffPieceIndex: number[] = [];

  getPlayerName(playerId: string): string {
    const player = this.room.players.find((p) => p.id === playerId);
    return player ? player.name : '未知玩家';
  }

  onStart() {
    const players = this.room.validPlayers;
    const order = players.map((p) => p.id);
    const assigned = COLORS.slice(0, Math.min(players.length, 4));

    const gamePlayers: Record<string, AeroplanePlayerState> = {};
    players.forEach((p, idx) => {
      const color = assigned[idx] || COLORS[idx % COLORS.length];
      this.setPlayerAttributes(p.id, { aeroplaneColor: color });
      gamePlayers[p.id] = {
        playerId: p.id,
        color,
        pieces: [0, 1, 2, 3].map((n) => ({ index: n as 0 | 1 | 2 | 3, area: 'hangar', pos: color + 'h' + n, posIndex: -1 })) ,
      };
    });

    this.state = {
      phase: 'waiting-roll',
      turnPlayerId: order[0],
      lastRoll: undefined,
      consecutiveSixes: 0,
      players: gamePlayers,
      winnerPlayerId: undefined,
    };
    this.history = [];

    this.room.emit('command', { type: 'game:state', data: this.state });
  }

  getStatus(sender: any) {
    return {
      ...super.getStatus(sender),
      state: this.state,
    };
  }

  getData() {
    return {
      ...super.getData(),
      state: this.state,
      history: this.history,
      players: this.room.validPlayers.map((p) => ({ id: p.id, name: p.name, color: p.attributes.aeroplaneColor })),
    };
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    if (!this.state) return;

    switch (message.type) {
      case 'aeroplane:roll':
        this.handleRoll(message.sender as RoomPlayer);
        break;
      case 'aeroplane:move':
        this.handleMove(message.sender as RoomPlayer, message.data);
        break;
    }
  }

  private broadcastState() {
    this.room.emit('command', { type: 'game:state', data: this.state });
    this.save();
  }

  private currentOrder(): string[] {
    return this.room.validPlayers.map((p) => p.id);
  }

  private isMyTurn(sender: RoomPlayer): boolean {
    return !!this.state && this.state.turnPlayerId === sender.id;
  }

  private movablePiecesFor(playerId: string, roll: number): (0 | 1 | 2 | 3)[] {
    if (!this.state) return [];
    const p = this.state.players[playerId];
    if (!p) return [];

    const movable: (0 | 1 | 2 | 3)[] = [];

    for (const piece of p.pieces) {
      if (piece.area === 'finish') continue;
      if (piece.area === 'hangar') {
        if (roll === 6) movable.push(piece.index);
        continue;
      }
      if (piece.area === 'home') {
        if (piece.posIndex + roll < this.pieceWays[p.color].length) {
          movable.push(piece.index);
        }
        continue;
      }
      // main or home always movable
      movable.push(piece.index);
    }

    return movable;
  }

  private handleRoll(sender: RoomPlayer) {
    if (!this.state) return;
    if (!this.isMyTurn(sender)) return;
    if (this.state.phase !== 'waiting-roll') return;
    if (this.state.winnerPlayerId) return;

    const roll = rollDie();
    this.state.lastRoll = roll;

    const movable = this.movablePiecesFor(sender.id, roll);
    if (movable.length === 0) {
      this.say(`${sender.name} 掷出 ${roll}，无棋可走，轮到下一位。`);
      this.history.push({
        playerId: sender.id,
        action: 'roll',
        roll,
        text: `${sender.name} 掷出 ${roll}，无棋可走`,
        timestamp: Date.now(),
      });
      this.advanceTurn(false);
      this.broadcastState();
      return;
    }

    this.say(`${sender.name} 掷出 ${roll}。`);
    this.history.push({
      playerId: sender.id,
      action: 'roll',
      roll,
      text: `${sender.name} 掷出 ${roll}`,
      timestamp: Date.now(),
    });
    this.state.phase = 'waiting-move';
    this.state.moveable = { [sender.id]: movable };
    this.room.emit('command', { type: 'aeroplane:roll', data: { playerId: sender.id, roll, movable } });
    this.broadcastState();
  }

  private handleMove(sender: RoomPlayer, data: any) {
    if (!this.state) return;
    if (!this.isMyTurn(sender)) return;
    if (this.state.phase !== 'waiting-move') return;
    if (!this.state.lastRoll) return;
    if (this.state.winnerPlayerId) return;

    const pieceIndex = clampPieceIndex(data?.pieceIndex);
    if (pieceIndex === null) return;

    const player = this.state.players[sender.id];
    if (!player) return;

    const piece = player.pieces.find((pc) => pc.index === pieceIndex);
    if (!piece) return;

    const roll = this.state.lastRoll;
    const movable = this.movablePiecesFor(sender.id, roll);
    if (!movable.includes(pieceIndex)) return;

    const before = { ...piece };
    const events = this.applyMove(player, piece, roll);
    const captureEvents = this.applyCaptures(player, piece);
    const allEvents = [...(events || []), ...(captureEvents || [])];

    let moveText = `${sender.name} 移动了 ${this.pieceNames[player.color]}${pieceIndex + 1}`;
    if (allEvents.length > 0) {
      moveText += ` (${allEvents.join('，')})`;
    }

    this.history.push({
      playerId: sender.id,
      action: 'move',
      roll,
      pieceIndex,
      to: piece.pos,
      text: moveText,
      timestamp: Date.now(),
    });

    this.room.emit('command', {
      type: 'aeroplane:move',
      data: {
        playerId: sender.id,
        pieceIndex,
        roll,
        from: before,
        to: { ...piece },
      },
    });

    const finished = player.pieces.filter((pc) => pc.area === 'finish').length;
    if (finished >= 4) {
      this.state.winnerPlayerId = sender.id;
      this.saveAchievements(this.room.validPlayers.filter((p) => p.id === sender.id));
      this.say(`${sender.name} 率先将四架飞机全部到达终点，获胜！`);
      this.broadcastState();
      this.room.end();
      return;
    }

    const extra = roll === 6;
    this.advanceTurn(extra);
    this.broadcastState();
  }

  private applyMove(player: AeroplanePlayerState, piece: AeroplanePiece, roll: number): string[] {
    if (!this.state) return [];
    const events: string[] = [];

    if (piece.area === 'hangar') {
      if (roll !== 6) return [];
      piece.area = 'main';
      piece.pos = this.pieceWays[player.color][0];
      piece.posIndex = 0;
      events.push('起飞');
      this.takeOffPieceIndex.push(piece.index);
      const landingEvents = this.applyLandingEffects(player, piece);
      return [...events, ...landingEvents];
    }

    const nextOffset = piece.posIndex + roll;
    
    piece.pos = this.pieceWays[player.color][nextOffset];
    piece.posIndex = nextOffset;

    if (piece.posIndex >= this.pieceWays[player.color].length - 7) {
      piece.area = 'home';
    }

    if (piece.pos === player.color + '19') {
      piece.area = 'finish';
      events.push('到达终点');
    }

    const landingEvents = this.applyLandingEffects(player, piece);
    return [...events, ...landingEvents];
  }

  private applyLandingEffects(player: AeroplanePlayerState, piece: AeroplanePiece): string[] {
    if (!this.state) return [];
    if (piece.area !== 'main') return [];

    const color = player.color;
    const events: string[] = [];

    // 捷径飞行
    if (Number(piece.pos.slice(1)) === 5 && color === piece.pos[0]) {
      piece.posIndex += 12;
      piece.pos = this.pieceWays[color][piece.posIndex];
      events.push('捷径飞行');
    }

    // 跳跃
    if (piece.area === 'main' && piece.pos[0] === color && piece.posIndex > 0) {
      piece.posIndex += 4;
      piece.pos = this.pieceWays[color][piece.posIndex];
      events.push('跳跃');
    }

    // 跳跃后走到捷径
    if (Number(piece.pos.slice(1)) === 5 && color === piece.pos[0]) {
      piece.posIndex += 12;
      piece.pos = this.pieceWays[color][piece.posIndex];
      events.push('捷径飞行');
    }

    return events;
  }

  private applyCaptures(player: AeroplanePlayerState, moved: AeroplanePiece): string[] {
    if (!this.state) return [];
    if (moved.area !== 'main') return [];

    const myColor = player.color;
    const events: string[] = [];

    for (const other of Object.values(this.state.players)) {
      if (other.playerId === player.playerId) continue;
      for (const pc of other.pieces) {
        if (pc.area !== 'main') continue;
        if (pc.pos === moved.pos) {
          // capture!
          pc.area = 'hangar';
          pc.pos = other.color + 'h' + pc.index;
          pc.posIndex = -1;
          const msg = `${this.getPlayerName(player.playerId)} 的 ${this.pieceNames[player.color]}${moved.index + 1} 吃掉了 ${this.getPlayerName(other.playerId)} 的 ${this.pieceNames[other.color]}${pc.index + 1}！`;
          this.say(msg);
          events.push(`撞回 ${this.pieceNames[other.color]}${pc.index + 1}`);
        }
      }
    }
    return events;
  }

  private advanceTurn(extraRoll: boolean) {
    if (!this.state) return;

    if (extraRoll) {
      this.state.consecutiveSixes = (this.state.consecutiveSixes ?? 0) + 1;
      if (this.state.consecutiveSixes >= 3) {
        // 三个六返大陆
        this.state.consecutiveSixes = 0;
        const player = this.state.players[this.state.turnPlayerId];
        player.pieces.forEach(piece => {
          piece.area = 'hangar';
          piece.pos = player.color + 'h' + piece.index;
          piece.posIndex = -1;
        })
        this.say(`${this.getPlayerName(player.playerId)} 连续掷出三个六，所有起飞的飞机被迫返航！`);
        this.state.turnPlayerId = nextTurnPlayerId(this.currentOrder(), this.state.turnPlayerId);
      }
    } else {
      this.state.consecutiveSixes = 0;
      this.state.turnPlayerId = nextTurnPlayerId(this.currentOrder(), this.state.turnPlayerId);
    }

    this.takeOffPieceIndex = [];
    this.state.phase = 'waiting-roll';
    this.state.lastRoll = undefined;
  }
}
