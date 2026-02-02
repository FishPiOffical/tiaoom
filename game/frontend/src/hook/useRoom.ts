import { md5 } from 'js-md5';
import msg from "@/components/msg";
import { useGameEvents } from "@/hook/useGameEvents";
import { useGameStore } from "@/stores/game";
import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import msgbox from '@/components/msgbox';

export function useRoom() {
  const gameStore = useGameStore();
  const route = useRoute();
  const router = useRouter();

  const roomId = computed(() => (route.params.id as string));

  async function init() {
    if (roomId.value) {
      if (
        gameStore.roomPlayer &&
        gameStore.roomPlayer.room.id !== roomId.value
      ) {
        if (gameStore.roomPlayer.role !== "player") {
          gameStore.game?.leaveRoom(gameStore.roomPlayer.room.id);
        } else {
          msg.warning("您正在游戏中，无法切换房间！");
          router.replace(route.name == 'lite-room' ? '/lite' : '/');
          return;
        }
      }
      const room = gameStore.rooms.find((r) => r.id === roomId.value);
      if (!room) {
        msg.error("房间不存在或已被解散！");
        router.replace(route.name == 'lite-room' ? '/lite' : '/');
        return;
      }
      let passwd: string | undefined;
      if (room.attrs?.passwd && !room.players.some(p => p.id == gameStore.player?.id)) {
        passwd = await msgbox.prompt("请输入房间密码：").catch(() => "") || "";
        if (!passwd) return router.back();
        if (room.attrs.passwd !== md5(passwd)) {
          msg.error("密码错误，无法加入房间。");
          return history.state.back ? router.back() : router.replace(route.name == 'lite-room' ? '/lite' : '/');
        }
      }
      gameStore.game?.joinRoom(room.id, { passwd });
    }
  }
  const room = computed(() => gameStore.roomPlayer?.room)

  function load() {
    gameStore.game?.getRoomOneTime(roomId.value).then(() => {
      init();
    });
  }

  if (gameStore.game) {
    useGameEvents(gameStore.game, {
      'onRoomList': () => {
        setTimeout(() => {
          if (!route.params.id) return;
          const room = gameStore.rooms.find((r) => r.id === roomId.value);
          if (!room) {
            msg.error("房间不存在或已被解散！");
            history.state.back ? router.back() : router.replace(route.name == 'lite-room' ? '/lite' : '/');
            return;
          }
        }, 100)
      }
    });
  }

  watch(
    () => route.params.id,
    (val, old) => {
      if (val && val !== old && old) init();
    },
    { immediate: true }
  );

  onMounted(() => {
    if (gameStore.rooms.find((r) => r.id === roomId.value)) {
      init();
    } else {
      load();
    }
  });

  return {
    room,
    gameStore,
    roomId,
  }
}