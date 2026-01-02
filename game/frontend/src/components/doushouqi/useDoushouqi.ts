import { GameCore } from "@/core/game";
import { Room, RoomPlayer } from "tiaoom/client";
import { computed, ref } from "vue";

export function useDoushouqi(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  const board = ref<any[][]>(Array(9).fill(null).map(() => Array(7).fill(null)));
  const turn = ref(0);
  const winner = ref(-1);
  const players = ref<string[]>([]);

  function move(from: {x: number, y: number}, to: {x: number, y: number}) {
    game.command(roomPlayer.room.id, { type: "move", data: { from, to } });
  }

  function onCommand(msg: any) {
    if (msg.type === 'update' || msg.type === 'status') {
      if (msg.data.board) board.value = msg.data.board;
      if (msg.data.turn !== undefined) turn.value = msg.data.turn;
      if (msg.data.winner !== undefined) winner.value = msg.data.winner;
      if (msg.data.players) players.value = msg.data.players;
    }
  }

  const myPlayerIndex = computed(() => {
    return players.value.indexOf(roomPlayer.id);
  });

  const isMyTurn = computed(() => {
    return (
      roomPlayer.room.status === "playing" &&
      winner.value === -1 &&
      myPlayerIndex.value !== -1 &&
      turn.value === myPlayerIndex.value
    );
  });

  return {
    board,
    turn,
    winner,
    players,
    move,
    onCommand,
    isMyTurn,
    myPlayerIndex,
  };
}
