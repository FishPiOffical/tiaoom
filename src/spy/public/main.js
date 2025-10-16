Vue.createApp({
  setup() {
    const { ref, computed, reactive } = Vue;

    const player = reactive(currentPlayer);
    const players = ref([]);
    const rooms = ref([]);

    const game = new SpyGame("./");

    game.run()
      .onReady(() => {
        game.login(player);
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
      minSize: 4
    })
    function createRoom() {
      game.createRoom(room.value);
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
      return roomPlayer.value.room.players.length >= roomPlayer.value.room.minSize &&
        roomPlayer.value.room.players.every(p => p.isReady);
    });
    const canVotePlayer = ref([]);
    const roomMessages = ref([]);
    const currentTalkPlayer = ref(null);
    const voting = computed(() => gameStatus.value === 'voting');
    const voted = ref(false);
    const gameStatus = ref('waiting'); // waiting, talking, voting
    /**
     * # room command
     * - say: player say something
     * - talk: cue next player talk
     * - talked: the player talk over
     * - vote: begin vote
     * - voted: the player voted
     * - end: game end
     * 
     * # player command
     * - word: send word to player
     * - dead: player dead
     */
    game.onRoomStart(() => {
      roomMessages.value = [];
      gameStatus.value = 'talking';
    }).onRoomEnd(() => {
      gameStatus.value = 'waiting';
      currentTalkPlayer.value = null;
    }).onCommand((cmd) => {
      switch (cmd.type) {
        case 'talk':
          currentTalkPlayer.value = cmd.data.player;
          gameStatus.value = 'talking';
          break;
        case 'vote':
          gameStatus.value = 'voting';
          voted.value = false;
          if (cmd.data) {
            canVotePlayer.value = cmd.data.map(p => p.id);
          } else {
            canVotePlayer.value = roomPlayer.value.room.players.filter(p => !p.isDead).map(p => p.id);
          }
          break;
        case 'word':
          word.value = cmd.data.word;
          break;
        case 'status':
          gameStatus.value = cmd.data.status;
          word.value = cmd.data.word;
          currentTalkPlayer.value = cmd.data.talk;
          voted.value = cmd.data.voted;
          canVotePlayer.value = cmd.data.canVotePlayers.map(p => p.id);
          if (cmd.data.deadPlayers) {
            for (const dp of cmd.data.deadPlayers) {
              const p = roomPlayer.value.room.players.find(p => p.id === dp.id);
              if (p) p.isDead = true;
            }
          }
          roomMessages.value = cmd.data.messageHistory || [];
          break;
        case 'voted':
          voted.value = true;
          break;
        case 'dead':
          alert('You are dead.');
          break;
      }
    }).onMessage((msg) => {
      roomMessages.value.unshift(`${msg}`);
    });

    const msg = ref('');
    const word = ref('');
    function sendMessage() {
      game.say(msg.value, roomPlayer.value.room.id);
      msg.value = '';
    }
    function sendTalked() {
      game.talked(roomPlayer.value.room.id);
    }
    function votePlayer(playerId) {
      if (voted.value) {
        return;
      }
      game.voted(roomPlayer.value.room.id, playerId);
    }

    const canSpeak = computed(() => {
      return gameStatus.value === 'talking' && currentTalkPlayer.value?.id === player.id || gameStatus.value === 'waiting';
    });

    return {
      players,
      rooms,
      room,
      game,
      player,
      roomPlayer,
      isAllReady,
      gameStatus,
      createRoom,
      canSpeak,
      voting,
      voted,
      word,
      msg,
      canVotePlayer,
      roomMessages,
      sendMessage,
      sendTalked,
      votePlayer,
    }
  }
}).mount('#app')