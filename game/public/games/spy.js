function useSpyGame(roomPlayer, game) {
  const { ref, computed } = Vue;
  const canVotePlayer = ref([]);
  const currentTalkPlayer = ref(null);
  const voting = computed(() => gameStatus.value === 'voting');
  const voted = ref(false);
  const gameStatus = ref('waiting'); // waiting, talking, voting

  const msg = ref('');
  const word = ref('');
  function sendMessage() {
    game.command(roomPlayer.value.room.id, { type: 'say', data: msg.value });
    msg.value = '';
  }
  function sendTalked() {
    game.command(roomPlayer.value.room.id, { type: 'talked' });
  }
  function votePlayer(playerId) {
    if (voted.value) {
      return;
    }
    game.command(roomPlayer.value.room.id, { type: 'voted', data: { id: playerId } });
  }

  const canSpeak = computed(() => {
    return gameStatus.value === 'talking' && currentTalkPlayer.value?.id === currentPlayer.id || gameStatus.value === 'waiting';
  });

  const roomMessages = ref([]);
  game.onRoomStart(() => {
    roomMessages.value = [];
    gameStatus.value = 'talking';
  }).onRoomEnd(() => {
    gameStatus.value = 'waiting';
    currentTalkPlayer.value = null;
  }).onCommand(onCommand).onMessage((msg) => {
    roomMessages.value.unshift(`${msg}`);
  });

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
  function onCommand(cmd) {
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
        if (cmd.data.player.id === currentPlayer.id) {
          alert('You are dead.');
          roomPlayer.value.isDead = true;
        }
        const deadPlayer = roomPlayer.value.room.players.find(p => p.id === cmd.data.player.id);
        if (deadPlayer) deadPlayer.isDead = true;
        break;
    }
  }

  function getPlayerStatus(p) {
    if (!p.isReady) return '未准备';
    if (gameStatus.value === 'waiting') return '准备好了';
    if (p.isDead) return '已死亡';
    if (gameStatus.value === 'voting') return '投票中';
    if (p.id == currentTalkPlayer.value?.id) return '发言中';
    if (gameStatus.value === 'talking') return '等待发言';
    return '准备好了';
  }

  return {
    canSpeak,
    voting,
    voted,
    word,
    msg,
    gameStatus,
    canVotePlayer,
    roomMessages,
    getPlayerStatus,
    sendMessage,
    sendTalked,
    votePlayer,
    onCommand,
  }
}