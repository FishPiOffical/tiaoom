import { MessagePackage, Room, RoomPlayer, RoomStatus } from "tiaoom";

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
  console.log("room:", room);
  let words: string[] = [];
  let messageHistory: string[] = [];
  const alivePlayers: RoomPlayer[] = [];
  let currentTalkPlayer: RoomPlayer;
  let spyPlayer: RoomPlayer;
  let gameStatus: 'waiting' | 'talking' | 'voting' = 'waiting';
  let talkTimeout: NodeJS.Timeout | null = null;

  const vote: RoomPlayer[] = [];
  const votePlayers: RoomPlayer[] = [];
  const TURN_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  function startTurn(player: RoomPlayer) {
    currentTalkPlayer = player;
    room.emit('command', { type: 'talk', data: { player } });
    room.emit('command', { type: 'talk-countdown', data: { seconds: TURN_TIMEOUT / 1000 } });
    
    if (talkTimeout) clearTimeout(talkTimeout);
    talkTimeout = setTimeout(() => {
      room.emit('message', `[系统消息]: 玩家 ${player.name} 发言超时，判定死亡。`);
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
      room.emit('message', `[系统消息]: 玩家 ${deadPlayer.name} 死亡。间谍死亡。玩家胜利。`);
      room.validPlayers.forEach((player) => {
        if (!alivePlayers.some(p => p.id === player.id)) alivePlayers.push(player);
      });
      room.end();
    } else if (alivePlayers.length == 2) {
      room.emit('message', `[系统消息]: 玩家 ${deadPlayer.name} 死亡。间谍 ${spyPlayer.name} 胜利。`);
      room.validPlayers.forEach((player) => {
        if (!alivePlayers.some(p => p.id === player.id)) alivePlayers.push(player);
      });
      room.end();
    } else {
      // If game continues
      if (gameStatus === 'voting') {
        // If death happened during voting (e.g. voted out), we need to start next round
        gameStatus = 'talking';
        startTurn(alivePlayers[0]);
        room.emit('message', `[系统消息]: 玩家 ${deadPlayer.name} 死亡。游戏继续。玩家 ${alivePlayers[0].name} 发言。`);
      } else {
        // If death happened during talking (timeout), move to next player
        // We need to find who is next. Since deadPlayer is removed, we need to be careful.
        // If deadPlayer was currentTalkPlayer, we need the next one in list.
        // But alivePlayers is already updated.
        // If deadPlayer was at index i, the new player at index i is the next one.
        // Unless deadPlayer was last, then index i is out of bounds?
        // Actually, handleTalkEnd logic was: find index, take index+1.
        // Here we removed the player. So the player at `deadIndex` is the next player.
        
        let nextPlayer = alivePlayers[deadIndex];
        if (!nextPlayer) {
           // If we reached end of list, start voting
           room.emit('message', `[系统消息]: 所有玩家都已发言，投票开始。`);
           room.emit('command', { type: 'vote' });
           gameStatus = 'voting';
        } else {
           startTurn(nextPlayer);
           room.emit('message', `[系统消息]: 玩家 ${deadPlayer.name} 死亡。游戏继续。玩家 ${nextPlayer.name} 发言。`);
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
      room.emit('message', `[系统消息]: 所有玩家都已发言，投票开始。`);
      room.emit('command', { type: 'vote' });
      gameStatus = 'voting';
      return;
    }
    
    room.emit('message', `[系统消息]: 玩家 ${sender.name} 发言结束。玩家 ${nextPlayer.name} 开始发言。`);
    startTurn(nextPlayer);
  }

  room.on('player-command', (message: MessagePackage) => {
    console.log("room message:", message);
    const sender = room.validPlayers.find((p) => p.id == message.sender?.id)!;
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
        if (gameStatus == 'voting') {
          sender.emit('message', `[系统消息]: 现在是投票时间，你不能说话。`);
          return;
        }
        if (gameStatus == 'talking' && sender.id != currentTalkPlayer.id) {
          sender.emit('message', `[系统消息]: 现在不是你的发言时间。`);
          return;
        }
        if (room.status == RoomStatus.playing) {
          words.forEach((word) => {
            message.data = message.data.replace(new RegExp(word, 'ig'), ''.padStart(word.length, '*'));
          });
        }
        room.emit('message', `[${sender.name}]: ${message.data}`);

        // 倒计时逻辑
        if (gameStatus == 'talking' && sender.id == currentTalkPlayer.id) {
          if (talkTimeout) clearTimeout(talkTimeout);
          talkTimeout = setTimeout(() => {
            handleTalkEnd(sender);
          }, 30000);
          sender.emit('command', { type: 'talk-countdown', data: { seconds: 30 } });
        }
        break;
      case 'talked':
        if (gameStatus != 'talking') {
          sender.emit('message', `[系统消息]: 现在不是发言时间。`);
          return;
        }
        if (sender.id != currentTalkPlayer.id) {
          sender.emit('message', `[系统消息]: 现在不是你的发言时间。`);
          return;
        }
        handleTalkEnd(sender);
        break;
      case 'voted':
        if (gameStatus != 'voting') {
          sender.emit('message', `[系统消息]: 现在不是投票时间。`);
          return;
        }
        if (votePlayers.includes(sender)) {
          sender.emit('message', `[系统消息]: 你已经投票过了。`);
          return;
        }
        if (!alivePlayers.some((p) => p.id == sender.id)) {
          sender.emit('message', `[系统消息]: 你不是房间内的玩家，不能投票。`);
          return;
        }

        const votePlayer = room.validPlayers.find((p) => p.id == message.data.id)
        if (votePlayer && alivePlayers.includes(votePlayer)) {
          vote.push(votePlayer);
        } else if (votePlayer) {
          return sender.emit('message', `[系统消息]: 玩家 ${votePlayer?.name} 不能被投票。`);
        } else return sender.emit('message', `[系统消息]: 你投票的玩家不在房间内。`);

        votePlayers.push(sender);
        sender.emit('command', { type: 'voted' });
        room.emit('message', `[系统消息]: 玩家 ${sender.name} 已投票。`);
        if (votePlayers.length != alivePlayers.length) return;

        const voteResult: { [key: string]: number } = vote.reduce((result, player) => {
          result[player.id] = (result[player.id] || 0) + 1;
          return result;
        }, {} as { [key: string]: number });
        const maxVote = Math.max(...Object.values(voteResult));
        const maxVotePlayer = Object.keys(voteResult).filter((id) => voteResult[id] == maxVote).map((id) => room.validPlayers.find((p) => p.id == id)!);
        if (maxVotePlayer.length > 1) {
          room.emit('message', `[系统消息]: 玩家 ${maxVotePlayer.map(p => p!.name).join(',')} 投票相同。无人死亡。`);
          vote.splice(0, vote.length);
          votePlayers.splice(0, votePlayers.length);
          gameStatus = 'talking';
          room.emit('message', `[系统消息]: 游戏继续。玩家 ${alivePlayers[0].name} 发言。`);
          startTurn(alivePlayers[0]);
          return;
        }

        vote.splice(0, vote.length);
        votePlayers.splice(0, votePlayers.length);
        gameStatus = 'waiting';

        const deadPlayer = maxVotePlayer[0]!;
        handlePlayerDeath(deadPlayer);
        break;
      case 'status': {
        const playerIndex = room.validPlayers.findIndex((p) => p.id == message.data.id);
        const player = room.validPlayers[playerIndex];
        if (!player) break;
        player.emit('command', {
          type: 'status',
          data: {
            word: words[playerIndex],
            status: gameStatus,
            talk: currentTalkPlayer,
            voted: votePlayers.some((p) => p.id == player.id),
            deadPlayers: room.status == RoomStatus.playing ? room.validPlayers.filter((p) => !alivePlayers.some(a => p.id == a.id)) : [],
            canVotePlayers: alivePlayers,
            messageHistory,
          }
        });
        break;
      }
      default:
        break;
    }
  }).on('start', () => {
    console.log("room start");

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

    if (room.validPlayers.length < room.minSize) {
      return room.emit('message', `[系统消息]: 玩家人数不足，无法开始游戏。`);
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
    room.emit('message', `[系统消息]: 游戏开始。玩家 ${room.validPlayers[0].name} 首先发言。`);
    gameStatus = 'talking';
    startTurn(room.validPlayers[0]);
  }).on('end', () => {
    console.log("room end");
    if (talkTimeout) {
      clearTimeout(talkTimeout);
      talkTimeout = null;
    }
    room.emit('command', { type: 'end' });
  }).on('message', (message: string) => {
    messageHistory.unshift(message);
    if (messageHistory.length > 100) messageHistory.splice(messageHistory.length - 100);
  });
}

export const name = '谁是卧底？';
export const minSize = 4;
export const maxSize = 12;
export const description = `玩家中有一名卧底，其他玩家获得相同的词语，卧底获得不同的词语。
通过轮流发言和投票找出卧底，卧底则需隐藏身份存活到最后。`;