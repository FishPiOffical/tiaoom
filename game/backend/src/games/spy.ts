import { IRoomPlayer, Player, PlayerRole, Room, RoomPlayer, RoomStatus } from "tiaoom";

const questions = [
  ['蝴蝶', '蜜蜂'],
  ['婚纱', '喜服'],
  ['小笼包', '灌汤包'],
  ['洗发露', '护发素'],
  ["苹果", "梨"],
  ["香蕉", "芒果"],
  ["咖啡", "拿铁"],
  ["茶", "奶茶"],
  ["汉堡", "热狗"],
  ["披萨", "意大利面"],
  ["衬衫", "T恤"],
  ["牛仔裤", "休闲裤"],
  ["自行车", "摩托车"],
  ["飞机", "火车"],
  ["牙刷", "牙线"],
  ["手表", "手链"],
  ["沙发", "扶手椅"],
  ["雨伞", "雨衣"],
  ["电脑", "平板"],
  ["太阳", "月亮"],
  ["春天", "秋天"],
  ["篮球", "足球"],
  ["玫瑰", "郁金香"],
  ["医生", "护士"],
];

export default function onRoom(room: Room) {
  let words: string[] = [];
  let messageHistory: { content: string, sender?: IRoomPlayer }[] = [];
  const alivePlayers: RoomPlayer[] = [];
  let currentTalkPlayer: RoomPlayer;
  let spyPlayer: RoomPlayer;
  let gameStatus: 'waiting' | 'talking' | 'voting' = 'waiting';
  let talkTimeout: NodeJS.Timeout | null = null;
  let voteTimeout: NodeJS.Timeout | null = null;
  let timerEndTime: number = 0;

  const vote: RoomPlayer[] = [];
  const votePlayers: RoomPlayer[] = [];
  const TURN_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  const VOTE_TIMEOUT = 2 * 60 * 1000; // 5 minutes

  function startVote() {
    gameStatus = 'voting';
    timerEndTime = Date.now() + VOTE_TIMEOUT;
    room.emit('message', { content: `所有玩家都已发言，投票开始。` });
    room.emit('command', { type: 'vote' });
    room.emit('command', { type: 'talk-countdown', data: { seconds: VOTE_TIMEOUT / 1000 } });

    if (voteTimeout) clearTimeout(voteTimeout);
    voteTimeout = setTimeout(() => {
      room.emit('message', { content: `投票超时，未投票玩家视为弃权。` });
      const unvotedPlayers = alivePlayers.filter(p => !votePlayers.some(vp => vp.id === p.id));
      unvotedPlayers.forEach(p => {
        room.emit('player-command', { type: 'voted', sender: { id: p.id }, data: { id: null } });
      });
    }, VOTE_TIMEOUT);
  }

  function startTurn(player: RoomPlayer) {
    currentTalkPlayer = player;
    timerEndTime = Date.now() + TURN_TIMEOUT;
    room.emit('command', { type: 'talk', data: { player } });
    room.emit('command', { type: 'talk-countdown', data: { seconds: TURN_TIMEOUT / 1000 } });

    if (talkTimeout) clearTimeout(talkTimeout);
    talkTimeout = setTimeout(() => {
      room.emit('message', { content: `玩家 ${player.name} 发言超时，判定死亡。` });
      handlePlayerDeath(player);
    }, TURN_TIMEOUT);
  }

  function handlePlayerDeath(deadPlayer: RoomPlayer) {
    if (talkTimeout) {
      clearTimeout(talkTimeout);
      talkTimeout = null;
    }

    room.emit('command', { type: 'dead', data: { player: deadPlayer } });
    const deadIndex = alivePlayers.findIndex((p) => p.id == deadPlayer.id);
    if (deadIndex > -1) alivePlayers.splice(deadIndex, 1);

    if (deadPlayer.name == spyPlayer.name) {
      room.emit('message', { content: `玩家 ${deadPlayer.name} 死亡。间谍死亡。玩家胜利。` });
      room.validPlayers.forEach((player) => {
        if (!alivePlayers.some(p => p.id === player.id)) alivePlayers.push(player);
      });
      room.end();
    } else if (alivePlayers.length == 2) {
      room.emit('message', { content: `玩家 ${deadPlayer.name} 死亡。间谍 ${spyPlayer.name} 胜利。` });
      room.validPlayers.forEach((player) => {
        if (!alivePlayers.some(p => p.id === player.id)) alivePlayers.push(player);
      });
      room.end();
    } else {
      if (gameStatus === 'voting') {
        // 若在投票环节死亡，则开始下一轮发言
        gameStatus = 'talking';
        startTurn(alivePlayers[0]);
        room.emit('message', { content: `玩家 ${deadPlayer.name} 死亡。游戏继续。玩家 ${alivePlayers[0].name} 发言。` });
      } else {
        // 若因发言超时导致该玩家死亡，则切换到下一位玩家
        // 因为当前玩家已经移除出 alivePlayers。所以“deadIndex”的玩家就是下一个玩家。

        let nextPlayer = alivePlayers[deadIndex];
        if (!nextPlayer) {
          // 若已经没有下一位玩家，则说明本轮发言结束，进入投票环节
          startVote();
        } else {
          startTurn(nextPlayer);
          gameStatus = 'talking';
          room.emit('message', { content: `玩家 ${deadPlayer.name} 死亡。游戏继续。玩家 ${nextPlayer.name} 发言。` });
        }
      }
    }
  }

  function handleTalkEnd(sender: RoomPlayer) {
    if (talkTimeout) {
      clearTimeout(talkTimeout);
      talkTimeout = null;
    }

    // Fix: Use alivePlayers to find next player
    const currentAliveIndex = alivePlayers.findIndex((p) => p.id == sender.id);
    const nextPlayer = alivePlayers[currentAliveIndex + 1];

    if (!nextPlayer) {
      startVote();
      return;
    }

    room.emit('message', { content: `玩家 ${sender.name} 发言结束。玩家 ${nextPlayer.name} 开始发言。` });
    startTurn(nextPlayer);
  }

  room.on('player-command', (message: any) => {
    // 允许观众使用的指令
    const publicCommands = ['say', 'status'];
    const players = publicCommands.includes(message.type)
      ? room.players
      : room.validPlayers;
    const sender = players.find((p) => p.id == message.sender?.id)!;
    if (!sender) return;
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
    switch (message.type) {
      case 'say':
        // 游玩时间观众发言仅广播给其他观众
        if (sender.role != PlayerRole.player && room.status == RoomStatus.playing) {
          room.watchers.forEach((watcher) => {
            watcher.emit('message', { content: `${message.data}`, sender });
          });
          return;
        }
        if (gameStatus == 'voting') {
          sender.emit('message', { content: `现在是投票时间，你不能说话。` });
          return;
        }
        if (gameStatus == 'talking' && sender.id != currentTalkPlayer.id) {
          sender.emit('message', { content: `现在不是你的发言时间。` });
          return;
        }
        if (room.status == RoomStatus.playing) {
          words.forEach((word) => {
            message.data = message.data.replace(new RegExp(word, 'ig'), ''.padStart(word.length, '*'));
          });
        }
        room.emit('message', { content: `${message.data}`, sender });

        // 倒计时逻辑
        if (gameStatus == 'talking' && sender.id == currentTalkPlayer.id) {
          if (talkTimeout) clearTimeout(talkTimeout);
          talkTimeout = setTimeout(() => {
            handleTalkEnd(sender);
          }, 30000);
          timerEndTime = Date.now() + 30000;
          sender.emit('command', { type: 'talk-countdown', data: { seconds: 30 } });
        }
        break;
      case 'talked':
        if (gameStatus != 'talking') {
          sender.emit('message', { content: `现在不是发言时间。` });
          return;
        }
        if (sender.id != currentTalkPlayer.id) {
          sender.emit('message', { content: `现在不是你的发言时间。` });
          return;
        }
        handleTalkEnd(sender);
        break;
      case 'voted':
        if (gameStatus != 'voting') {
          sender.emit('message', { content: `现在不是投票时间。` });
          return;
        }
        if (votePlayers.includes(sender)) {
          sender.emit('message', { content: `你已经投票过了。` });
          return;
        }
        if (!alivePlayers.some((p) => p.id == sender.id)) {
          sender.emit('message', { content: `你不是房间内的玩家，不能投票。` });
          return;
        }

        if (message.data?.id) {
          const votePlayer = room.validPlayers.find((p) => p.id == message.data.id)
          if (votePlayer && alivePlayers.includes(votePlayer)) {
            vote.push(votePlayer);
          } else if (votePlayer) {
            return sender.emit('message', { content: `玩家 ${votePlayer?.name} 不能被投票。` });
          } else return sender.emit('message', { content: `你投票的玩家不在房间内。` });
        } else {
          room.emit('message', { content: `玩家 ${sender.name} 弃权。` });
        }

        votePlayers.push(sender);
        sender.emit('command', { type: 'voted' });
        if (message.data?.id) {
          room.emit('message', { content: `玩家 ${sender.name} 已投票。` });
        }
        if (votePlayers.length != alivePlayers.length) return;

        if (voteTimeout) {
          clearTimeout(voteTimeout);
          voteTimeout = null;
        }

        const voteResult: { [key: string]: number } = vote.reduce((result, player) => {
          result[player.id] = (result[player.id] || 0) + 1;
          return result;
        }, {} as { [key: string]: number });

        if (Object.keys(voteResult).length === 0) {
          room.emit('message', { content: `无人投票。无人死亡。` });
          vote.splice(0, vote.length);
          votePlayers.splice(0, votePlayers.length);
          gameStatus = 'talking';
          room.emit('message', { content: `游戏继续。玩家 ${alivePlayers[0].name} 发言。` });
          startTurn(alivePlayers[0]);
          return;
        }

        const maxVote = Math.max(...Object.values(voteResult));
        const maxVotePlayer = Object.keys(voteResult).filter((id) => voteResult[id] == maxVote).map((id) => room.validPlayers.find((p) => p.id == id)!);
        if (maxVotePlayer.length > 1) {
          room.emit('message', { content: `玩家 ${maxVotePlayer.map(p => p!.name).join(',')} 投票相同。无人死亡。` });
          vote.splice(0, vote.length);
          votePlayers.splice(0, votePlayers.length);
          gameStatus = 'talking';
          room.emit('message', { content: `游戏继续。玩家 ${alivePlayers[0].name} 发言。` });
          startTurn(alivePlayers[0]);
          return;
        }

        vote.splice(0, vote.length);
        votePlayers.splice(0, votePlayers.length);
        const deadPlayer = maxVotePlayer[0]!;
        handlePlayerDeath(deadPlayer);
        break;
      case 'status': {
        const playerIndex = room.validPlayers.findIndex((p) => p.id == message.data.id);
        const player = room.players.find((p) => p.id == message.data.id);
        if (!player) break;
        player.emit('command', {
          type: 'status',
          data: {
            word: playerIndex < 0 ? '' : words[playerIndex],
            status: gameStatus,
            talk: currentTalkPlayer,
            voted: votePlayers.some((p) => p.id == player.id),
            deadPlayers: room.status == RoomStatus.playing ? room.validPlayers.filter((p) => !alivePlayers.some(a => p.id == a.id)) : [],
            canVotePlayers: alivePlayers,
            messageHistory,
            countdown: Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000)),
          }
        });
        break;
      }
      default:
        break;
    }
  }).on('start', () => {

    vote.splice(0, vote.length);
    votePlayers.splice(0, votePlayers.length);
    alivePlayers.splice(0, alivePlayers.length);
    currentTalkPlayer = undefined!;
    spyPlayer = undefined!;
    gameStatus = 'waiting';
    messageHistory = [];
    if (talkTimeout) {
      clearTimeout(talkTimeout);
      talkTimeout = null;
    }
    if (voteTimeout) {
      clearTimeout(voteTimeout);
      voteTimeout = null;
    }

    if (room.validPlayers.length < room.minSize) {
      return room.emit('message', { content: `玩家人数不足，无法开始游戏。` });
    }

    const mainWordIndex = Math.floor(Math.random() * 2);
    const spyWordIndex = mainWordIndex == 0 ? 1 : 0;
    const questWord = questions[Math.floor(Math.random() * questions.length)];
    words = Array(room.validPlayers.length).fill(questWord[mainWordIndex]);
    const spyIndex = Math.floor(Math.random() * room.validPlayers.length);
    words[spyIndex] = questWord[spyWordIndex];
    spyPlayer = room.validPlayers[spyIndex];
    room.validPlayers.forEach((player, index) => {
      player.emit('command', { type: 'word', data: { word: words[index] } });
      alivePlayers.push(player);
    })
    room.emit('message', { content: `游戏开始。玩家 ${room.validPlayers[0].name} 首先发言。` });
    gameStatus = 'talking';
    startTurn(room.validPlayers[0]);
  }).on('end', () => {
    if (talkTimeout) {
      clearTimeout(talkTimeout);
      talkTimeout = null;
    }
    if (voteTimeout) {
      clearTimeout(voteTimeout);
      voteTimeout = null;
    }
    room.emit('command', { type: 'end' });
  }).on('message', (message: { content: string, sender?: IRoomPlayer }) => {
    messageHistory.unshift(message);
    if (messageHistory.length > 100) messageHistory.splice(messageHistory.length - 100);
  });
}

export const name = '谁是卧底？';
export const minSize = 4;
export const maxSize = 12;
export const description = `玩家中有一名卧底，其他玩家获得相同的词语，卧底获得不同的词语。
通过轮流发言和投票找出卧底，卧底则需隐藏身份存活到最后。`;