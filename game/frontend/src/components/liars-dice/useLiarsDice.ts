import { GameCore } from "@/core/game";
import { Room, RoomPlayer } from "tiaoom/client";
import { computed, ref } from "vue";
import msgbox from "../msgbox";
import { useGameEvents } from "@/hook/useGameEvents";

export function useLiarsDice(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  const myDice = ref<number[]>([]);
  const diceCounts = ref<Record<string, number>>({});
  const currentPlayer = ref<RoomPlayer | null>(null);
  const lastBid = ref<{ playerId: string; count: number; face: number; zhai: boolean } | null>(null);
  const revealedDice = ref<Record<string, number[]> | null>(null);
  const isZhai = ref(false);

  function bid(count: number, face: number, zhai: boolean) {
    game.command(roomPlayer.room.id, { type: "bid", data: { count, face, zhai } });
  }

  function open() {
    msgbox.confirm('确定要开骰子吗？').then((value) => {
      if(value) game.command(roomPlayer.room.id, { type: "open" });
    });
  }

  function onCommand(msg: any) {
    switch(msg.type) {
      case "dice":
        myDice.value = msg.data.dice;
        revealedDice.value = null;
        break;
      case "update":
        if (msg.data.currentPlayer) currentPlayer.value = msg.data.currentPlayer;
        if (msg.data.lastBid !== undefined) lastBid.value = msg.data.lastBid;
        if (msg.data.diceCounts) diceCounts.value = msg.data.diceCounts;
        if (msg.data.isZhai !== undefined) isZhai.value = msg.data.isZhai;
        break;
      case "reveal":
        revealedDice.value = msg.data.dice;
        break;
      case "status":
        if (msg.data.currentPlayer) currentPlayer.value = msg.data.currentPlayer;
        if (msg.data.lastBid !== undefined) lastBid.value = msg.data.lastBid;
        if (msg.data.diceCounts) diceCounts.value = msg.data.diceCounts;
        if (msg.data.myDice) myDice.value = msg.data.myDice;
        if (msg.data.isZhai !== undefined) isZhai.value = msg.data.isZhai;
        break;
    }
  }

  useGameEvents(game, {
    'room.start': () => {
      revealedDice.value = null;
    },
  });

  const isMyTurn = computed(() => {
    return (
      roomPlayer.role === "player" &&
      roomPlayer.room.status === "playing" &&
      currentPlayer.value?.id === roomPlayer.id
    );
  });

  return {
    myDice,
    diceCounts,
    currentPlayer,
    lastBid,
    revealedDice,
    isMyTurn,
    isZhai,
    bid,
    open,
    onCommand
  };
}
