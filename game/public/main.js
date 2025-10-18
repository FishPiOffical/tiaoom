Vue.createApp({
  setup() {
    const { ref, computed, reactive } = Vue;

    const player = reactive(currentPlayer);
    const players = ref([]);
    const rooms = ref([]);
    const playerStatus = computed(() => roomPlayer.value?.status || players.value.find(p => p.id === player.id)?.status || 'offline');

    const game = new GameCore("./");

    game.run()
      .onReady(() => {
        game.login(player);
      })
      .onPlayerStatus((data) => {
        const player = players.value.find(p => p.id === data.id);
        if (player) {
          player.status = data.status;
        }
      })
      .onPlayerList(data => {
        console.log('Player List:', data);
        players.value = [...data];
      })
      .onRoomList(data => {
        console.log('Room List:', data);
        rooms.value = [...data];
        gameInit();
      })
      .onPlayerReady(onPlayerReady)
      .onPlayerUnready(onPlayerReady)

    let isInit = false;
    function gameInit() {
      if (isInit) return;
      isInit = true;
      if (roomPlayer.value) {
        game.init(roomPlayer.value.room.id, currentPlayer);
      }
    }

    function getRooms() {
      api.getRooms().then(data => rooms.value = data);
    }

    const room = ref({
      name: '',
      size: 4,
      minSize: 4,
      attrs: { type: 'spy' },
    })
    function createRoom() {
      const r = { ...room.value };
      if (room.value.attrs.type != 'spy') r.minSize = r.size = 2;
      game.createRoom(r);
    }

    function onPlayerReady(data) {
      const roomId = data.roomId;
      const room = rooms.value.find(r => r.id === roomId)
      if (room) {
        const player = room.players.find(p => p.id === data.id)
        if (player) {
          player.isReady = data.isReady;
        }
      } else {
        getRooms();
      }
    }

    const roomPlayer = computed(() => {
      for (const room of rooms.value) {
        const rp = room.players.find(p => p.id === player.id);
        if (rp) return { ...rp, room };
      }
      return null;
    });

    const isAllReady = computed(() => {
      if (!roomPlayer.value) return false;
      return roomPlayer.value.room.players.filter(p => p.role == 'player').length >= roomPlayer.value.room.minSize &&
        roomPlayer.value.room.players.every(p => p.isReady || p.role == 'watcher');
    });

    return {
      playerStatus,
      players,
      rooms,
      room,
      game,
      player,
      roomPlayer,
      isAllReady,
      createRoom,
    }
  }
}).component('spy-room', SpyRoom).component('gobang-room', GobangRoom).mount('#app')