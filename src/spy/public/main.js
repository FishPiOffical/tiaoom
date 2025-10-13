Vue.createApp({
  setup() {
    const { ref } = Vue;

    const players = ref([]);
    const rooms = ref([]);

    const game = new SpyGame("./");

    const playerId = document.getElementById("playerId").value;
    const playerName = document.getElementById("playerName").value;

    game.run()
      .onReady(() => {
        game.login({ id: playerId, name: playerName, attributes: {} });
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
      });

    function getRooms() {
      api.getRooms().then(data => rooms.value = data);
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
      player: { id: playerId, name: playerName },
      createRoom,
    }
  }
}).mount('#app')