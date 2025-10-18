var SpyRoom = {
  template: spyTemplate,
  props: {
    roomPlayer: Object,
    game: Object,
  },
  setup(props) {
    const { ref, computed } = Vue;
    const canVotePlayer = ref([]);
    const currentTalkPlayer = ref(null);
    const voting = computed(() => gameStatus.value === 'voting');
    const voted = ref(false);
    const gameStatus = ref('waiting'); // waiting, talking, voting

    const msg = ref('');
    const word = ref('');
    function sendMessage() {
      props.game.command(props.roomPlayer.room.id, { type: 'say', data: msg.value });
      msg.value = '';
    }
    function sendTalked() {
      props.game.command(props.roomPlayer.room.id, { type: 'talked' });
    }
    function votePlayer(playerId) {
      if (voted.value) {
        return;
      }
      props.game.command(props.roomPlayer.room.id, { type: 'voted', data: { id: playerId } });
    }

    const canSpeak = computed(() => {
      return gameStatus.value === 'talking' && currentTalkPlayer.value?.id === currentPlayer.id || gameStatus.value === 'waiting';
    });

    const roomMessages = ref([]);
    props.game.onRoomStart(() => {
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
     * - end: props.game end
     * - dead: player dead
     * 
     * # player command
     * - word: send word to player
     */
    function onCommand(cmd) {
      if (props.roomPlayer.room.attrs.type !== 'spy') return;
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
            canVotePlayer.value = props.roomPlayer.room.players.filter(p => !p.isDead).map(p => p.id);
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
              const p = props.roomPlayer.room.players.find(p => p.id === dp.id);
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
            props.roomPlayer.isDead = true;
          }
          const deadPlayer = props.roomPlayer.room.players.find(p => p.id === cmd.data.player.id);
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

    const isAllReady = computed(() => {
      if (!props.roomPlayer) return false;
      return props.roomPlayer.room.players.filter(p => p.role == 'player').length >= props.roomPlayer.room.minSize &&
        props.roomPlayer.room.players.every(p => p.isReady || p.role == 'watcher');
    });

    return {
      isAllReady,
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
    }
  }
}