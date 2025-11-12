var Connect4Room = {
  template: connect4Template,
  props: {
    roomPlayer: Object,
    game: Object,
  },
  setup(props) {
    const { ref, computed } = Vue;
    const gameStatus = ref('waiting'); // waiting, playing
    const currentPlayer = ref();
    const board = ref(Array(8).fill(0).map(() => Array(8).fill(-1)));
    const achivents = ref({});
    const currentPlace = ref(null);

    board.value[board.value.length - 1] = board.value[board.value.length - 1].map(() => 0);

    const msg = ref('');
    function sendMessage() {
      props.game.command(props.roomPlayer.room.id, { type: 'say', data: msg.value });
      msg.value = '';
    }

    const roomMessages = ref([]);
    props.game.onRoomStart(() => {
      roomMessages.value = [];
      gameStatus.value = 'playing';
      currentPlace.value = null;
    }).onRoomEnd(() => {
      gameStatus.value = 'waiting';
      currentPlayer.value = null;
    }).onCommand(onCommand).onMessage((msg) => {
      roomMessages.value.unshift(`${msg}`);
    });

    /**
     * # room command
     * - status: props.game status update
     * - board: board update
     * - request-draw: request draw
     * - place: current player to place piece
     * - achivents: achivements update
     */
    function onCommand(cmd) {
      if (props.roomPlayer.room.attrs.type !== 'connect4') return;
      switch (cmd.type) {
        case 'status':
          gameStatus.value = cmd.data.status;
          currentPlayer.value = cmd.data.current;
          roomMessages.value = cmd.data.messageHistory || [];
          board.value = cmd.data.board;
          achivents.value = cmd.data.achivents || {};
          break;
        case 'board':
          board.value = cmd.data;
          break;
        case 'request-draw':
          confirm(`玩家 ${cmd.data.player.name} 请求和棋。是否同意？`) && props.game.command(props.roomPlayer.room.id, { type: 'draw' });
          break;
        case 'place-turn':
          currentPlayer.value = cmd.data.player;
          gameStatus.value = 'playing';
          break;
        case 'achivements':
          achivents.value = cmd.data;
          break;
        case 'place':
          const { x, y } = cmd.data;
          currentPlace.value = { x, y };
          break;
        default:
          break;
      }
    }

    function getPlayerStatus(p) {
      if (!p.isReady) return '未准备';
      if (gameStatus.value === 'waiting') return '准备好了';
      if (p.id == currentPlayer.value?.id) return '思考中';
      if (gameStatus.value === 'playing') return '等待中';
      return '准备好了';
    }

    function placePiece(row, col) {
      if (gameStatus.value !== 'playing') return;
      if (currentPlayer.value.id !== props.roomPlayer.id) return;
      if (board.value[row][col] !== 0) return;
      props.game.command(props.roomPlayer.room.id, { type: 'place', data: { x: row, y: col } });
      board.value[row][col] = currentPlayer.value.attributes?.color;
    }

    function requestDraw() {
      if (gameStatus.value !== 'playing') return;
      props.game.command(props.roomPlayer.room.id, { type: 'request-draw' });
    }

    function requestLose() {
      if (gameStatus.value !== 'playing') return;
      props.game.command(props.roomPlayer.room.id, { type: 'request-lose' });
    }

    const isAllReady = computed(() => {
      if (!props.roomPlayer) return false;
      return props.roomPlayer.room.players.filter(p => p.role == 'player').length >= props.roomPlayer.room.minSize &&
        props.roomPlayer.room.players.every(p => p.isReady || p.role == 'watcher');
    });

    return {
      currentPlace,
      achivents,
      isAllReady,
      board,
      placePiece,
      requestDraw,
      requestLose,
      msg,
      gameStatus,
      currentPlayer,
      roomMessages,
      getPlayerStatus,
      sendMessage,
    }
  }
}
