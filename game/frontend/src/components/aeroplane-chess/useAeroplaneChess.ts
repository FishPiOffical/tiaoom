import { computed, ref } from 'vue';
import type { GameCore } from '@/core/game';
import type { Room, RoomPlayer } from 'tiaoom/client';
import { AeroplaneColor } from './board';

export type PieceArea = 'hangar' | 'main' | 'home' | 'finish';

export type Piece = {
  index: 0 | 1 | 2 | 3;
  area: PieceArea;
  pos: string;
};

export type PlayerState = {
  playerId: string;
  color: AeroplaneColor;
  pieces: Piece[];
};

export interface AeroplanePiece {
  index: 0 | 1 | 2 | 3;
  area: PieceArea;
  pos: string;
}

export interface AeroplanePlayerState {
  playerId: string;
  color: AeroplaneColor;
  pieces: AeroplanePiece[];
}

export type AeroplanePhase = 'waiting-roll' | 'waiting-move';

export interface AeroplaneGameState {
  phase?: AeroplanePhase;
  turnPlayerId?: string;
  lastRoll?: number;
  consecutiveSixes?: number;
  players: Record<string, AeroplanePlayerState>;
  winnerPlayerId?: string;
  moveable?: Record<string, (0 | 1 | 2 | 3)[]>;
}

export function useAeroplaneChess(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  const state = ref<AeroplaneGameState | null>(null);
  const lastRoll = ref<number | null>(null);
  const movable = ref<(0 | 1 | 2 | 3)[]>([]);

  function onCommand(msg: any) {
    switch (msg.type) {
      case 'game:state':
        state.value = msg.data;
        movable.value = state.value?.moveable?.[roomPlayer.id] || [];
        break;
      case 'status':
        if (msg.data?.state) state.value = msg.data.state;
        break;
      case 'aeroplane:roll':
        lastRoll.value = msg.data?.roll ?? null;
        movable.value = (msg.data?.movable ?? []) as (0 | 1 | 2 | 3)[];
        break;
    }
  }

  const myId = computed(() => roomPlayer.id);

  const isPlaying = computed(() => {
    return roomPlayer.role === 'player' && roomPlayer.room.status === 'playing';
  });

  const isMyTurn = computed(() => {
    return isPlaying.value && state.value?.turnPlayerId === myId.value;
  });

  const myColor = computed<AeroplaneColor | null>(() => {
    const p = state.value?.players?.[myId.value];
    return p?.color ?? null;
  });

  const myPieces = computed(() => {
    const p = state.value?.players?.[myId.value];
    return p?.pieces ?? [];
  });

  const canRoll = computed(() => {
    return isMyTurn.value && state.value?.phase === 'waiting-roll' && !state.value?.winnerPlayerId;
  });

  const canMove = computed(() => {
    return isMyTurn.value && state.value?.phase === 'waiting-move' && !state.value?.winnerPlayerId;
  });

  function roll() {
    if (!state.value) return;
    game.command(roomPlayer.room.id, { type: 'aeroplane:roll' });
  }

  function move(pieceIndex: 0 | 1 | 2 | 3) {
    if (!state.value) return;
    game.command(roomPlayer.room.id, { type: 'aeroplane:move', data: { pieceIndex } });
  }

  return {
    state,
    onCommand,
    lastRoll,
    movable,
    isPlaying,
    isMyTurn,
    myColor,
    myPieces,
    canRoll,
    canMove,
    roll,
    move,
  };
}
