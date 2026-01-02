import { GameCore } from "@/core/game";
import { Room, RoomPlayer } from "tiaoom/client";
import { computed, ref } from "vue";

export function useClick(game: GameCore, roomPlayer: RoomPlayer & { room: Room }) {
  const count = ref(0);
  const target = ref(0);

  function handleClick(n: number) {
    game.command(roomPlayer.room.id, { type: "click", data: n });
  }

  const currentPlayer = ref<RoomPlayer | null>(null);

  function onCommand(msg: any) {
    switch(msg.type) {
      case "click":
        if (msg.data.player) {
          currentPlayer.value = msg.data.player;
        }
        break;
      case "update":
        count.value = msg.data.count;
        if (msg.data.target) {
          target.value = msg.data.target;
        }
        break;
      case "status":
        if (msg.data.currentPlayer) {
          currentPlayer.value = msg.data.currentPlayer;
        }
        if (msg.data.target) {
          target.value = msg.data.target;
        }
        if (msg.data.count !== undefined) {
          count.value = msg.data.count;
        }
        break;
    }
  }

  const isPlaying = computed(() => {
    return (
      roomPlayer.role === "player" &&
      roomPlayer.room.status === "playing" &&
      currentPlayer.value?.id === roomPlayer.id
    );
  });

  return {
    onCommand,
    handleClick,
    isPlaying,
    count,
    target,
    currentPlayer,
  }
}