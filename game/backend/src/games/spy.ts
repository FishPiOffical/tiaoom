import { PlayerRole, PlayerStatus, RoomPlayer, RoomStatus } from "tiaoom";
import { GameRoom, IGameCommand } from ".";
import { sleep } from "@/utils";

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

export const name = '谁是卧底？';
export const minSize = 4;
export const maxSize = 12;
export const description = `玩家中有一名卧底，其他玩家获得相同的词语，卧底获得不同的词语。
通过轮流发言和投票找出卧底，卧底则需隐藏身份存活到最后。`;
export const points = {
  '我就玩玩': 1,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
}

class SpyGameRoom extends GameRoom {
  words: string[] = [];
  alivePlayers: RoomPlayer[] = [];
  currentTalkPlayer?: RoomPlayer;
  spyPlayer?: RoomPlayer;
  gameStatus: 'waiting' | 'talking' | 'voting' = 'waiting';
  vote: RoomPlayer[] = [];
  votePlayers: RoomPlayer[] = [];
  history: any[] = [];

  readonly TURN_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  readonly VOTE_TIMEOUT = 2 * 60 * 1000; // 2 minutes

  init() {
    this.restoreTimer({
      turn: () => {
        this.turnTimer();
      },
      vote: () => {
        this.voteTimer();
      },
      startTurn: () => {
        this.startTurnTimer();
      },
    })
    return super.init().on('end', () => {
      const players = [...this.room.validPlayers];
      players.forEach((player) => {
        if (this.isPlayerOnline(player)) return;
        setTimeout(() => {
          if (this.isPlayerOnline(player)) return;
          this.room.kickPlayer(player.id);
          this.say(`玩家 ${player.name} 已离线，已被移出房间。`);
        }, 5000);
      });
    });
  }

  turnTimer() {
    if (this.gameStatus === 'talking' && this.currentTalkPlayer) {
      this.handleTalkEnd(this.currentTalkPlayer);
    }
  }

  voteTimer() {
    this.say(`投票超时，未投票玩家视为弃权。`);
    const unvotedPlayers = this.alivePlayers.filter(p => !this.votePlayers.some(vp => vp.id === p.id));
    unvotedPlayers.forEach(p => {
      this.virtualCommand('voted', { id: null }, p);
    });
  }

  startTurnTimer() {
    if (this.gameStatus === 'talking' && this.currentTalkPlayer) {
      this.say(`玩家 ${this.currentTalkPlayer.name} 发言超时，判定死亡。`);
      this.handlePlayerDeath(this.currentTalkPlayer);
    }
  }

  getStatus(sender: RoomPlayer) {
    const playerIndex = this.room.validPlayers.findIndex((p) => p.id == sender.id);
    let countdown = 0;
    if (this.gameStatus === 'talking' && this.currentTalkPlayer?.id === sender.id) {
      countdown = Math.max(0, Math.ceil(((this.tickEndTime['turn'] || this.tickEndTime['startTurn']) - Date.now()) / 1000));
    } else if (this.gameStatus === 'voting') {
      countdown = Math.max(0, Math.ceil((this.tickEndTime['vote'] - Date.now()) / 1000));
    }
    return {
      ...super.getStatus(sender),
      word: playerIndex < 0 ? '' : this.words[playerIndex],
      status: this.gameStatus,
      talk: this.currentTalkPlayer,
      voted: this.votePlayers.some((p) => p.id == sender.id),
      deadPlayers: this.room.status == RoomStatus.playing ? this.room.validPlayers.filter((p) => !this.alivePlayers.some(a => p.id == a.id)) : [],
      canVotePlayers: this.alivePlayers,
      countdown,
    }
  }

  getData() {
    return {
      history: this.history,
      message: this.messageHistory,
      players: this.room.validPlayers.map((p, i) => ({
        name: p.name,
        word: this.words[i],
        isSpy: p.id === this.spyPlayer?.id,
        status: this.alivePlayers.some(a => p.id == a.id) ? 'alive' : 'dead',
        avatar: p.attributes?.avatar,
      })),
    };
  }

  onSay(message: IGameCommand) {
    const sender = message.sender as RoomPlayer;
    if (this.gameStatus == 'voting') {
      this.sayTo(`现在是投票时间，你不能说话。`, sender);
      return;
    }
    if (this.gameStatus == 'talking' && sender.id != this.currentTalkPlayer?.id) {
      this.sayTo(`现在不是你的发言时间。`, sender);
      return;
    }
    if (this.room.status == RoomStatus.playing) {
      this.words.forEach((word) => {
        message.data = message.data.replace(new RegExp(word, 'ig'), ''.padStart(word.length, '*'));
      });
    }
    this.say(`${message.data}`, sender);
    this.history.push({
      type: 'talk',
      player: sender.name,
      content: message.data,
      time: Date.now()
    });

    // 倒计时逻辑
    if (this.gameStatus == 'talking' && sender.id == this.currentTalkPlayer?.id) {
      this.startTimer(() => {
        this.turnTimer();
      }, 30000, 'turn');
    }
    this.save();
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    const sender = message.sender as RoomPlayer;
    switch (message.type) {
      case 'talked':
        if (this.gameStatus != 'talking') {
          this.sayTo(`现在不是发言时间。`, sender);
          return;
        }
        if (sender.id != this.currentTalkPlayer?.id) {
          this.sayTo(`现在不是你的发言时间。`, sender);
          return;
        }
        this.handleTalkEnd(sender);
        break;
      case 'voted':
        if (this.gameStatus != 'voting') {
          this.sayTo(`现在不是投票时间。`, sender);
          return;
        }
        if (this.votePlayers.some(p => p.id === sender.id)) {
          this.sayTo(`你已经投票过了。`, sender);
          return;
        }
        if (!this.alivePlayers.some((p) => p.id == sender.id)) {
          this.sayTo(`你不是房间内的玩家，不能投票。`, sender);
          return;
        }

        if (message.data?.id) {
          const votePlayer = this.room.validPlayers.find((p) => p.id == message.data.id)
          if (votePlayer && this.alivePlayers.some(p => p.id === votePlayer.id)) {
            this.vote.push(votePlayer);
          } else if (votePlayer) {
            return this.sayTo(`玩家 ${votePlayer?.name} 不能被投票。`, sender);
          } else return this.sayTo(`你投票的玩家不在房间内。`, sender);
        } else {
          this.say(`玩家 ${sender.name} 弃权。`);
        }

        this.votePlayers.push(sender);
        this.commandTo('voted', {}, sender);
        if (message.data?.id) {
          this.say(`玩家 ${sender.name} 已投票。`);
          const target = this.room.validPlayers.find(p => p.id === message.data.id);
          this.history.push({
            type: 'vote',
            player: sender.name,
            target: target?.name,
            time: Date.now()
          });
        } else {
          this.history.push({
            type: 'vote',
            player: sender.name,
            target: null,
            time: Date.now()
          });
        }
        if (this.votePlayers.length != this.alivePlayers.length) return;

        this.stopTimer('turn');

        const voteResult: { [key: string]: number } = this.vote.reduce((result, player) => {
          result[player.id] = (result[player.id] || 0) + 1;
          return result;
        }, {} as { [key: string]: number });

        if (Object.keys(voteResult).length === 0) {
          this.say(`无人投票。无人死亡。`);
          this.vote = [];
          this.votePlayers = [];
          this.gameStatus = 'talking';
          this.say(`游戏继续。玩家 ${this.alivePlayers[0].name} 发言。`);
          this.startTurn(this.alivePlayers[0]);
          return;
        }

        const maxVote = Math.max(...Object.values(voteResult));
        const maxVotePlayer = Object.keys(voteResult).filter((id) => voteResult[id] == maxVote).map((id) => this.room.validPlayers.find((p) => p.id == id)!);
        if (maxVotePlayer.length > 1) {
          this.say(`玩家 ${maxVotePlayer.map(p => p!.name).join(',')} 投票相同。无人死亡。`);
          this.vote = [];
          this.votePlayers = [];
          this.gameStatus = 'talking';
          this.say(`游戏继续。玩家 ${this.alivePlayers[0].name} 发言。`);
          this.startTurn(this.alivePlayers[0]);
          return;
        }

        this.vote = [];
        this.votePlayers = [];
        const deadPlayer = maxVotePlayer[0]!;
        this.handlePlayerDeath(deadPlayer);
        break;
    }
  }

  onStart() {
    if (this.room.validPlayers.length < this.room.minSize) {
      return this.say(`玩家人数不足，无法开始游戏。`);
    }
    this.vote = [];
    this.votePlayers = [];
    this.alivePlayers = [];
    this.currentTalkPlayer = undefined;
    this.spyPlayer = undefined;
    this.gameStatus = 'waiting';
    this.messageHistory = [];
    this.history = [];
    this.stopTimer();

    const mainWordIndex = Math.floor(Math.random() * 2);
    const spyWordIndex = mainWordIndex == 0 ? 1 : 0;
    const questWord = questions[Math.floor(Math.random() * questions.length)];
    this.words = Array(this.room.validPlayers.length).fill(questWord[mainWordIndex]);
    const spyIndex = Math.floor(Math.random() * this.room.validPlayers.length);
    this.words[spyIndex] = questWord[spyWordIndex];
    this.spyPlayer = this.room.validPlayers[spyIndex];
    this.room.validPlayers.forEach((player, index) => {
      this.commandTo('word', { word: this.words[index] }, player);
      this.alivePlayers.push(player);
    })
    this.history.push({
      type: 'start',
      time: Date.now(),
      players: this.room.validPlayers.map((p, i) => ({
        name: p.name,
        word: this.words[i],
        isSpy: p.id === this.spyPlayer?.id,
        avatar: p.attributes?.avatar,
      }))
    });
    this.say(`游戏开始。玩家 ${this.room.validPlayers[0].name} 首先发言。`);
    this.gameStatus = 'talking';
    this.startTurn(this.room.validPlayers[0]);
  }

  startVote() {
    this.gameStatus = 'voting';
    this.say(`所有玩家都已发言，投票开始。`);
    this.history.push({
      type: 'startVote',
      time: Date.now()
    });
    this.command('vote');

    this.startTimer(() => {
      this.voteTimer();
    }, this.VOTE_TIMEOUT, 'vote');
    this.save();
  }

  startTurn(player: RoomPlayer) {
    this.currentTalkPlayer = player;
    this.command('talk', { player });
    this.history.push({
      type: 'turn',
      player: player.name,
      time: Date.now()
    });

    this.startTimer(() => {
      this.startTurnTimer();
    }, this.TURN_TIMEOUT, 'startTurn');
    this.save();
  }

  handlePlayerDeath(deadPlayer: RoomPlayer) {
    this.stopTimer('turn');
    this.history.push({
      type: 'dead',
      player: deadPlayer.name,
      time: Date.now()
    });

    this.command('dead', { player: deadPlayer });
    const deadIndex = this.alivePlayers.findIndex((p) => p.id == deadPlayer.id);
    if (deadIndex > -1) this.alivePlayers.splice(deadIndex, 1);

    if (deadPlayer.name == this.spyPlayer?.name) {
      this.say(`玩家 ${deadPlayer.name} 死亡。间谍死亡。玩家胜利。`);
      this.saveAchievements(this.room.validPlayers.filter(p => p.id !== this.spyPlayer!.id))
      this.room.validPlayers.forEach((player) => {
        if (!this.alivePlayers.some(p => p.id === player.id)) this.alivePlayers.push(player);
      });
      this.room.end();
    } else if (this.alivePlayers.length == 2) {
      this.say(`玩家 ${deadPlayer.name} 死亡。间谍 ${this.spyPlayer?.name} 胜利。`);
      this.saveAchievements([this.spyPlayer!])
      this.room.validPlayers.forEach((player) => {
        if (!this.alivePlayers.some(p => p.id === player.id)) this.alivePlayers.push(player);
      });
      this.room.end();
    } else {
      if (this.gameStatus === 'voting') {
        // 若在投票环节死亡，则开始下一轮发言
        this.gameStatus = 'talking';
        this.startTurn(this.alivePlayers[0]);
        this.say(`玩家 ${deadPlayer.name} 死亡。游戏继续。玩家 ${this.alivePlayers[0].name} 发言。`);
      } else {
        // 若因发言超时导致该玩家死亡，则切换到下一位玩家
        // 因为当前玩家已经移除出 alivePlayers。所以“deadIndex”的玩家就是下一个玩家。

        let nextPlayer = this.alivePlayers[deadIndex];
        if (!nextPlayer) {
          // 若已经没有下一位玩家，则说明本轮发言结束，进入投票环节
          this.startVote();
        } else {
          this.startTurn(nextPlayer);
          this.gameStatus = 'talking';
          this.say(`玩家 ${deadPlayer.name} 死亡。游戏继续。玩家 ${nextPlayer.name} 发言。`);
        }
      }
    }
    this.save();
  }

  handleTalkEnd(sender: RoomPlayer) {
    this.stopTimer('turn');

    // Fix: Use alivePlayers to find next player
    const currentAliveIndex = this.alivePlayers.findIndex((p) => p.id == sender.id);
    const nextPlayer = this.alivePlayers[currentAliveIndex + 1];

    if (!nextPlayer) {
      this.startVote();
      return;
    }

    this.say(`玩家 ${sender.name} 发言结束。玩家 ${nextPlayer.name} 开始发言。`);
    this.startTurn(nextPlayer);
  }
}

export default SpyGameRoom;
