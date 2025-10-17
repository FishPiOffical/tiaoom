function useGobangGame(roomPlayer, game) {
  const { ref, computed } = Vue;
  const gameStatus = ref('waiting'); // waiting, playing
  const currentPlayer = ref();
  const board = ref(Array(19).fill(0).map(() => Array(19).fill(0)));

  const msg = ref('');
  function sendMessage() {
    game.command(roomPlayer.value.room.id, { type: 'say', data: msg.value });
    msg.value = '';
  }

  const roomMessages = ref([]);
  game.onRoomStart(() => {
    roomMessages.value = [];
    gameStatus.value = 'playing';
  }).onRoomEnd(() => {
    gameStatus.value = 'waiting';
    currentTalkPlayer.value = null;
  }).onCommand(onCommand).onMessage((msg) => {
    roomMessages.value.unshift(`${msg}`);
  });

  /**
   * # room command
   * - say: player say something
   * - status: game status update
   * - place: place piece
   * - request-draw: request draw
   * - draw: game draw
   * - end: game end
   */
  function onCommand(cmd) {
    switch (cmd.type) {
      case 'status':
        gameStatus.value = cmd.data.status;
        currentPlayer.value = cmd.data.current;
        roomMessages.value = cmd.data.messageHistory || [];
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

  let piece = true;
  function placePiece(row, col) {
    board.value[row][col] = piece ? 1 : 2;
    piece = !piece;
  }

  return {
    board,
    placePiece,
    msg,
    gameStatus,
    roomMessages,
    getPlayerStatus,
    sendMessage,
  }
}