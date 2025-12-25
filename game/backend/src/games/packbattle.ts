import { PlayerRole, PlayerStatus, RoomPlayer, RoomStatus } from "tiaoom";
import { GameRoom, IGameCommand } from ".";
import { sleep } from "@/utils";

type Capsule = 'left' | 'right'
type Phase = 'pick' | 'swap' | 'end'

export const name = '药丸博弈';
export const minSize = 2;
export const maxSize = 2;
export const description = `出租车司机知晓毒胶囊位置，选择交给夏洛克一个；夏洛克可选择是否交换。60秒倒计时，明牌聊天。`;
export const points = {
  '我就玩玩': 1,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
}

class PackbattleGameRoom extends GameRoom {
  activePlayer?: RoomPlayer;
  passivePlayer?: RoomPlayer;
  gameStatus: 'waiting' | 'playing' = 'waiting';
  phase: Phase = 'pick';
  poison: Capsule = 'left';
  given: Capsule | null = null;
  swapped: boolean | null = null;
  lastLosePlayer?: RoomPlayer;

  readonly TURN_TIMEOUT = 60 * 1000;

  init() {
    this.restoreTimer({
      turn: () => this.handleTimeout()
    });
    return super.init().on('player-offline', async (player) => {
      await sleep(2 * 60 * 1000);
      if (!this.isPlayerOnline(player)) return;
      if (this.gameStatus === 'playing' && player.role === PlayerRole.player) {
        this.say(`玩家 ${player.name} 已离线，游戏结束。`);
        const winner = this.room.validPlayers.find((p) => p.id !== player.id)!;
        this.finishGame(winner);
      }
      this.room.kickPlayer(player);
    });
  }

  getStatus(sender: RoomPlayer) {
    const status = {
      ...super.getStatus(sender),
      status: this.gameStatus,
      phase: this.phase,
      active: this.activePlayer,
      passive: this.passivePlayer,
      given: this.given,
      swapped: this.swapped,
      countdown: Math.max(0, Math.ceil((this.tickEndTime['turn'] - Date.now()) / 1000)),
    };
    return status;
  }

  onCommand(message: IGameCommand): void {
    super.onCommand(message);
    const sender = message.sender as RoomPlayer;
    
    // Handle the extra poison info for status command
    if (message.type === 'status') {
       if (this.gameStatus === 'playing' && (this.phase === 'pick' || this.phase === 'swap') && sender.id === this.activePlayer?.id) {
          this.commandTo('poison', { capsule: this.poison }, sender);
       }
    }

    switch (message.type) {
        case 'give': {
          if (this.gameStatus !== 'playing' || this.phase !== 'pick') {
            this.sayTo(`当前不在选择阶段。`, sender);
            break;
          }
          if (sender.id !== this.activePlayer?.id) {
            this.sayTo(`不是你的回合。`, sender);
            break;
          }
          const cap: Capsule = message.data?.capsule;
          if (!['left', 'right'].includes(cap)) {
            this.sayTo(`请选择左或右胶囊。`, sender);
            break;
          }
          this.given = cap;
          this.say(`出租车司机 ${sender.name} 选择将${cap === 'left' ? '左侧' : '右侧'}胶囊交给夏洛克。`);
          this.beginSwapPhase();
          break;
        }
        case 'swap': {
          if (this.gameStatus !== 'playing' || this.phase !== 'swap') {
            this.sayTo(`当前不在交换阶段。`, sender);
            break;
          }
          if (sender.id !== this.passivePlayer?.id) {
            this.sayTo(`不是你的回合。`, sender);
            break;
          }
          this.swapped = !!message.data?.swap;
          this.say(`夏洛克 ${sender.name}${this.swapped ? '选择交换' : '选择不交换'}。`);
          this.finishRound();
          break;
        }
        case 'request-draw': {
          if (this.room.status !== RoomStatus.playing) break;
          const other = this.room.validPlayers.find((p) => p.id !== sender.id)!;
          this.commandTo('request-draw', { player: sender }, other);
          this.say(`玩家 ${sender.name} 请求和棋。`);
          break;
        }
        case 'draw': {
          if (this.room.status !== RoomStatus.playing) break;
          if (!message.data?.agree) {
            this.sayTo(`玩家 ${sender.name} 拒绝和棋，游戏继续。`, sender);
            break;
          }
          this.say(`双方同意和棋，游戏结束。`);
          this.gameStatus = 'waiting';
          this.saveAchievements();
          this.room.end();
          this.save();
          break;
        }
        case 'request-lose': {
          if (this.room.status !== RoomStatus.playing) break;
          this.say(`玩家 ${sender.name} 认输。`);
          const winner = this.room.validPlayers.find((p) => p.id !== sender.id)!;
          this.finishGame(winner);
          break;
        }
    }
  }

  onStart() {
      if (this.room.validPlayers.length < this.room.minSize) {
        return this.say(`玩家人数不足，无法开始游戏。`);
      }
      this.stopTimer();
      this.messageHistory = [];
      this.gameStatus = 'playing';
      this.phase = 'pick';
      this.given = null;
      this.swapped = null;
      this.poison = Math.random() < 0.5 ? 'left' : 'right';

      const players = [...this.room.validPlayers];
      const idx = Math.floor(Math.random() * players.length);
      this.activePlayer = players[idx];
      this.passivePlayer = players.find((p) => p.id !== this.activePlayer!.id)!;

      this.command('achievements', this.achievements);
      this.say(`游戏开始。随机选择：出租车司机 ${this.activePlayer.name}，夏洛克 ${this.passivePlayer.name}。出租车司机知晓毒胶囊。`);

      this.beginPickPhase();
      this.save();
  }

  beginPickPhase() {
    this.phase = 'pick';
    this.given = null;
    this.swapped = null;
    if (this.activePlayer) this.commandTo('poison', { capsule: this.poison }, this.activePlayer);
    this.say(`出租车司机 ${this.activePlayer?.name} 进行选择（60秒）。`);
    this.command('give-turn', { player: this.activePlayer });
    this.startTimer(() => this.handleTimeout(), this.TURN_TIMEOUT, 'turn');
    this.save();
  }

  beginSwapPhase() {
    this.phase = 'swap';
    this.say(`夏洛克 ${this.passivePlayer?.name} 决定是否交换（60秒）。`);
    this.command('swap-turn', { player: this.passivePlayer });
    this.startTimer(() => this.handleTimeout(), this.TURN_TIMEOUT, 'turn');
    this.save();
  }

  handleTimeout() {
    if (this.phase === 'pick' && this.activePlayer) {
      this.say(`出租车司机 ${this.activePlayer.name} 超时未选择，判负。`);
      this.finishGame(this.room.validPlayers.find(p => p.id !== this.activePlayer!.id)!);
    } else if (this.phase === 'swap' && this.passivePlayer) {
      this.say(`夏洛克 ${this.passivePlayer.name} 超时未决定是否交换，判负。`);
      this.finishGame(this.room.validPlayers.find(p => p.id !== this.passivePlayer!.id)!);
    }
  }

  finishRound() {
    this.phase = 'end';
    this.stopTimer();

    const passiveCapsuleAfterGive: Capsule = this.given!;
    const activeCapsuleAfterGive: Capsule = this.given === 'left' ? 'right' : 'left';

    const activeFinal: Capsule = this.swapped ? passiveCapsuleAfterGive : activeCapsuleAfterGive;
    const passiveFinal: Capsule = this.swapped ? activeCapsuleAfterGive : passiveCapsuleAfterGive;

    const poisonedPlayer = this.poison === activeFinal ? this.activePlayer! : this.poison === passiveFinal ? this.passivePlayer! : undefined;
    const winner = poisonedPlayer?.id === this.activePlayer?.id ? this.passivePlayer! : this.activePlayer!;

    this.say(`最终分配：出租车司机持有${activeFinal === 'left' ? '左' : '右'}，夏洛克持有${passiveFinal === 'left' ? '左' : '右'}。`);
    this.command('result', {
      poison: this.poison,
      given: this.given,
      swapped: this.swapped,
      activeFinal,
      passiveFinal,
      winner,
      loser: poisonedPlayer,
    });

    if (poisonedPlayer) {
      const winnerRole = winner.id === this.activePlayer?.id ? '出租车司机' : '夏洛克';
      this.say(`结果：${poisonedPlayer.name} 中毒身亡。${winnerRole} ${winner.name} 获胜！`);
      this.finishGame(winner);
    } else {
      this.say(`结果：无人中毒（异常）。判定平局。`);
      this.gameStatus = 'waiting';
      this.saveAchievements();
      this.room.end();
    }
  }

  finishGame(winner: RoomPlayer) {
    this.gameStatus = 'waiting';
    this.lastLosePlayer = this.room.validPlayers.find((p) => p.id !== winner.id)!;

    this.saveAchievements([winner]);
    this.room.end();
  }
}

export default PackbattleGameRoom;
