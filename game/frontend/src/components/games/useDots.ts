import { GameCore } from "@/core/game";
import { Room, RoomPlayer } from "tiaoom/client";
import { computed, ref } from "vue";

export const BOARD_SIZE = 4;

export function useDots(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  const hLines = ref<boolean[][]>([]);
  const vLines = ref<boolean[][]>([]);
  const boxes = ref<number[][]>([]);
  const currentPlayer = ref<RoomPlayer | null>(null);
  const scores = ref<number[]>([0, 0]);
  const players = ref<string[]>([]);

  function drawLine(lineType: string, row: number, col: number) {
    game.command(roomPlayer.room.id, {
      type: 'draw',
      data: { type: lineType, row, col }
    });
  }

  function onCommand(msg: any) {
    if (msg.type === 'update' || msg.type === 'status') {
      if (msg.data.hLines) hLines.value = msg.data.hLines;
      if (msg.data.vLines) vLines.value = msg.data.vLines;
      if (msg.data.boxes) boxes.value = msg.data.boxes;
      if (msg.data.currentPlayer) currentPlayer.value = msg.data.currentPlayer;
      if (msg.data.scores) scores.value = msg.data.scores;
      if (msg.data.players) players.value = msg.data.players;
    }
  }

  const myPlayerIndex = computed(() => {
    return players.value.indexOf(roomPlayer.id);
  });

  const isMyTurn = computed(() => {
    return (
      roomPlayer.room.status === "playing" &&
      myPlayerIndex.value !== -1 &&
      currentPlayer.value?.id === roomPlayer.id
    );
  });

  const winner = computed(() => {
    if (scores.value[0] > scores.value[1]) return 0;
    if (scores.value[1] > scores.value[0]) return 1;
    return -1;
  });

  return {
    hLines,
    vLines,
    boxes,
    currentPlayer,
    scores,
    players,
    drawLine,
    onCommand,
    isMyTurn,
    myPlayerIndex,
    winner,
  };
}