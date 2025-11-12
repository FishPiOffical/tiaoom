function bootstrap() {
  const app = Vue.createApp({
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
        attrs: { type: 'othello' },
      })
      function createRoom() {
        const r = { ...room.value };
        if (!r.name) {
          alert('请填写房间名称');
          return;
        }
        game.createRoom(r);
      }
      function onTypeChange() {
        const game = games[room.value.attrs.type];
        if (room.value.size < game.minSize) {
          room.value.size = game.minSize;
        }
        if (room.value.size > game.maxSize) {
          room.value.size = game.maxSize;
        }
        if (room.value.minSize < game.minSize) {
          room.value.minSize = game.minSize;
        }
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

      const msg = ref('');
      const globalMessages = ref([]);
      game.on('global.command', (cmd) => {
        if (cmd.type === 'say') {
          globalMessages.value.push(`[${cmd.sender.name}]: ${cmd.data}`);
        }
      });
      function sendMessage() {
        game.command({ type: 'say', data: msg.value });
        msg.value = '';
      }


      return {
        msg,
        globalMessages,
        sendMessage,
        playerStatus,
        players,
        rooms,
        room,
        game,
        games: window.games,
        player,
        roomPlayer,
        isAllReady,
        createRoom,
        onTypeChange,
      }
    }
  })

  for (const game in games) {
    if (!window[`${game.slice(0, 1).toUpperCase()}${game.slice(1)}Room`]) {
      window[`${game.slice(0, 1).toUpperCase()}${game.slice(1)}Room`] = {
        template: window[`${game}Template`],
      }
    }
    app.component(`${game}-room`, window[`${game.slice(0, 1).toUpperCase()}${game.slice(1)}Room`]);
  }
  app.mount('#app');
}

bootstrap();