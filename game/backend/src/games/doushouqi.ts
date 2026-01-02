import { GameRoom, IGameCommand } from '.';
import { RoomPlayer } from 'tiaoom';

export const name = '斗兽棋';
export const minSize = 2;
export const maxSize = 2;
export const description = '双方各执八子，按象、狮、虎、豹、狼、狗、猫、鼠的大小顺序互相克制。最终以占领对方兽穴或吃光对方棋子为胜。';
export const points = {
  '我就玩玩': 1,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
}

type PieceType = 'rat' | 'cat' | 'dog' | 'wolf' | 'leopard' | 'tiger' | 'lion' | 'elephant';

const RANKS: Record<PieceType, number> = {
  rat: 1,
  cat: 2,
  dog: 3,
  wolf: 4,
  leopard: 5,
  tiger: 6,
  lion: 7,
  elephant: 8,
};

interface Piece {
  player: number; // 0 (Blue/Top) or 1 (Red/Bottom)
  type: PieceType;
}

interface Position {
  x: number;
  y: number;
}

const WIDTH = 7;
const HEIGHT = 9;

// Terrain definitions
const RIVERS = [
  { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
  { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 },
  { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 },
];

const TRAPS = [
  { x: 2, y: 0 }, { x: 4, y: 0 }, { x: 3, y: 1 }, // Blue traps
  { x: 2, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 7 }, // Red traps
];

const DENS = [
  { x: 3, y: 0, player: 0 }, // Blue den
  { x: 3, y: 8, player: 1 }, // Red den
];

function isRiver(x: number, y: number) {
  return RIVERS.some(p => p.x === x && p.y === y);
}

function isTrap(x: number, y: number, player?: number) {
  if (player === undefined) {
    return TRAPS.some(p => p.x === x && p.y === y);
  }
  // Check if it's a specific player's trap
  if (player === 0) {
    return (x === 2 && y === 0) || (x === 4 && y === 0) || (x === 3 && y === 1);
  } else {
    return (x === 2 && y === 8) || (x === 4 && y === 8) || (x === 3 && y === 7);
  }
}

function isDen(x: number, y: number, player?: number) {
  if (player === undefined) {
    return DENS.some(p => p.x === x && p.y === y);
  }
  return DENS.some(p => p.x === x && p.y === y && p.player === player);
}

export default class DoushouqiRoom extends GameRoom {
  board: (Piece | null)[][] = [];
  turn = 0; // 0 (Blue) or 1 (Red)
  players: string[] = []; // player IDs
  winner: number = -1;
  history: { from: Position; to: Position; piece: Piece; captured?: Piece; turn: number, time: number }[] = [];

  onStart() {
    this.board = Array(HEIGHT).fill(null).map(() => Array(WIDTH).fill(null));
    this.players = this.room.validPlayers.map(p => p.id);

    // Initialize player colors
    this.room.validPlayers.forEach((p, index) => {
      this.setPlayerAttributes(p.id, { color: index });
    });

    this.turn = 0; // Blue starts first usually? Or Red? Let's say Blue (0) starts.
    // Actually in many implementations Blue starts.
    
    this.winner = -1;
    this.history = [];

    // Initialize pieces
    // Blue (Player 0, Top)
    this.placePiece(0, 'lion', 0, 0);
    this.placePiece(0, 'tiger', 6, 0);
    this.placePiece(0, 'dog', 1, 1);
    this.placePiece(0, 'cat', 5, 1);
    this.placePiece(0, 'rat', 0, 2);
    this.placePiece(0, 'leopard', 2, 2);
    this.placePiece(0, 'wolf', 4, 2);
    this.placePiece(0, 'elephant', 6, 2);

    // Red (Player 1, Bottom)
    this.placePiece(1, 'lion', 6, 8);
    this.placePiece(1, 'tiger', 0, 8);
    this.placePiece(1, 'dog', 5, 7);
    this.placePiece(1, 'cat', 1, 7);
    this.placePiece(1, 'rat', 6, 6);
    this.placePiece(1, 'leopard', 4, 6);
    this.placePiece(1, 'wolf', 2, 6);
    this.placePiece(1, 'elephant', 0, 6);

    this.broadcastState();
  }

  placePiece(player: number, type: PieceType, x: number, y: number) {
    this.board[y][x] = { player, type };
  }

  broadcastState() {
    this.room.emit('command', {
      type: 'update',
      data: {
        board: this.board,
        turn: this.turn,
        winner: this.winner,
        players: this.players,
      }
    });
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    if (message.type === 'move') {
      const { from, to } = message.data;
      const playerIndex = this.players.indexOf(message.sender.id);

      if (playerIndex === -1) return; // Not a player
      if (this.winner !== -1) return; // Game over
      if (playerIndex !== this.turn) return; // Not your turn

      if (this.isValidMove(playerIndex, from, to)) {
        this.executeMove(playerIndex, from, to);
      }
    } else if (message.type === 'surrender') {
       const playerIndex = this.players.indexOf(message.sender.id);
       if (playerIndex !== -1 && this.winner === -1) {
         this.endGame(1 - playerIndex);
       }
    }
  }

  isValidMove(player: number, from: Position, to: Position): boolean {
    // Basic bounds check
    if (from.x < 0 || from.x >= WIDTH || from.y < 0 || from.y >= HEIGHT) return false;
    if (to.x < 0 || to.x >= WIDTH || to.y < 0 || to.y >= HEIGHT) return false;

    const piece = this.board[from.y][from.x];
    if (!piece || piece.player !== player) return false;

    // Cannot move to own den
    if (isDen(to.x, to.y, player)) return false;

    const target = this.board[to.y][to.x];
    // Cannot capture own piece
    if (target && target.player === player) return false;

    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);

    // Basic movement: 1 step orthogonal
    if (dx + dy === 1) {
      // Rat entering river
      if (isRiver(to.x, to.y)) {
        if (piece.type !== 'rat') return false;
        // Rat can enter river, but cannot capture Elephant from river?
        // Actually Rat in river cannot capture piece on land.
        if (target) {
           // Rat in river capturing piece in river is OK.
           // Rat in river capturing piece on land is NOT OK.
           // But here target is in river (since to is river), so it must be a Rat in river.
           // So this is fine.
        }
      } else {
        // Moving to land
        if (isRiver(from.x, from.y)) {
          // Rat moving from river to land
          // Cannot capture piece on land directly from river?
          // Rules say: Rat in river cannot capture piece on land.
          if (target) return false;
        }
      }
      
      return this.canCapture(piece, target, to.x, to.y);
    }

    // Lion and Tiger jump
    if ((piece.type === 'lion' || piece.type === 'tiger') && (dx > 1 || dy > 1)) {
      // Must be straight line
      if (from.x !== to.x && from.y !== to.y) return false;

      // Must jump over river
      // Check if all intermediate squares are river
      if (from.x === to.x) { // Vertical jump
        const minY = Math.min(from.y, to.y);
        const maxY = Math.max(from.y, to.y);
        for (let y = minY + 1; y < maxY; y++) {
          if (!isRiver(from.x, y)) return false; // Not a river in between
          if (this.board[y][from.x]) return false; // Blocked by a piece (Rat)
        }
      } else { // Horizontal jump
        const minX = Math.min(from.x, to.x);
        const maxX = Math.max(from.x, to.x);
        for (let x = minX + 1; x < maxX; x++) {
          if (!isRiver(x, from.y)) return false;
          if (this.board[from.y][x]) return false;
        }
      }
      
      return this.canCapture(piece, target, to.x, to.y);
    }

    return false;
  }

  canCapture(attacker: Piece, defender: Piece | null, toX: number, toY: number): boolean {
    if (!defender) return true;

    // Traps: if defender is in attacker's trap, it can be captured by any piece.
    // Wait, traps belong to a player.
    // If defender is in a trap belonging to attacker's side (enemy trap for defender), defender rank is effectively 0.
    if (isTrap(toX, toY, attacker.player)) {
      return true;
    }

    const attRank = RANKS[attacker.type];
    const defRank = RANKS[defender.type];

    // Rat vs Elephant
    if (attacker.type === 'rat' && defender.type === 'elephant') return true;
    if (attacker.type === 'elephant' && defender.type === 'rat') return false;

    return attRank >= defRank;
  }

  executeMove(player: number, from: Position, to: Position) {
    const piece = this.board[from.y][from.x]!;
    const target = this.board[to.y][to.x];

    this.board[to.y][to.x] = piece;
    this.board[from.y][from.x] = null;

    this.history.push({
      from, to, piece, captured: target || undefined, turn: this.turn, time: Date.now() - this.beginTime
    });

    // Check win condition
    // 1. Entered enemy den
    if (isDen(to.x, to.y, 1 - player)) {
      this.endGame(player);
      return;
    }

    // 2. No pieces left for opponent
    const opponentPieces = this.board.flat().filter(p => p && p.player !== player);
    if (opponentPieces.length === 0) {
      this.endGame(player);
      return;
    }

    // Switch turn
    this.turn = 1 - this.turn;
    this.broadcastState();
    this.save();
  }

  endGame(winner: number) {
    this.winner = winner;
    this.broadcastState();
    
    const winnerId = this.players[winner];
    const loserId = this.players[1 - winner];
    
    // Save achievements
    // Assuming validPlayers order matches this.players order is risky if players left.
    // But this.players stores IDs.
    
    const winnerPlayer = this.room.validPlayers.find(p => p.id === winnerId);
    const loserPlayer = this.room.validPlayers.find(p => p.id === loserId);

    if (winnerPlayer) this.saveAchievements([winnerPlayer]);
    
    this.say(`游戏结束，${winnerPlayer?.name || '玩家'} 获胜！`);
    this.room.end();
  }

  getStatus(sender: any) {
    return {
      ...super.getStatus(sender),
      board: this.board,
      turn: this.turn,
      winner: this.winner,
      players: this.players,
    };
  }

  getData() {
    return {
      ...super.getData(),
      board: this.board,
      turn: this.turn,
      winner: this.winner,
      players: this.room.validPlayers.map(p => ({ id: p.id, name: p.name, color: p.attributes.color })),
      history: this.history,
    };
  }
}
