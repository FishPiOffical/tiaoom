Vue.createApp({
  setup() {
    const { ref, computed, reactive } = Vue;

    const player = reactive(currentPlayer);
    const players = ref([]);
    const rooms = ref([]);

    const game = new SpyGame("./");

    const roomPlayer = computed(() => {
      for (const room of rooms.value) {
        const rp = room.players.find(p => p.id === player.id);
        if (rp) return { ...rp, room };
      }
      return null;
    });

    const isAllReady = computed(() => {
      if (!roomPlayer.value) return false;
      return roomPlayer.value.room.players.length >= roomPlayer.value.room.minSize &&
        roomPlayer.value.room.players.every(p => p.isReady);
    });

    game.run()
      .onReady(() => {
        game.login(player);
      })
      .onPlayerList(data => {
        console.log('Player List:', data);
        players.value = data
      })
      .onRoomList(data => {
        console.log('Room List:', data);
        rooms.value = data
      })
      .onPlayerJoin(data => {
        console.log('Player Join:', data);
        const roomId = data.roomId;
        const room = rooms.value.find(r => r.id === roomId);
        if (room) {
          room.players.push(data);
        } else {
          getRooms();
        }
      })
      .onPlayerLeave(data => {
        const roomId = data.roomId;
        const room = rooms.value.find(r => r.id === roomId);
        if (room) {
          room.players = room.players.filter(p => p.id !== data.id);
        } else {
          getRooms();
        }
      })
      .onPlayerReady(onPlayerReady)
      .onPlayerUnready(onPlayerReady)

    function getRooms() {
      api.getRooms().then(data => rooms.value = data);
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

    const room = ref({
      name: '',
      size: 3,
      minSize: 3
    })
    function createRoom() {
      game.createRoom(room.value).then(() => {
        alert('Room created');
      });
    }

    return {
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
}).mount('#app')