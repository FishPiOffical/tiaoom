import { PlayerRole, PlayerStatus, RoomPlayer, RoomStatus } from "tiaoom";
import { GameRoom, IGameCommand } from ".";
import { sleep } from "@/utils";

type Capsule = 'left' | 'right'
type Phase = 'pick' | 'swap' | 'end'

export const name = '药丸博弈';
export const minSize = 2;
export const maxSize = 2;
export const description = `出租车司机知晓毒胶囊位置，选择交给夏洛克一个；夏洛克可选择是否交换。60秒倒计时，明牌聊天。`;

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
      this.room.kickPlayer(player);
      if (this.gameStatus === 'playing' && player.role === PlayerRole.player) {
        this.room.emit('message', { content: `玩家 ${player.name} 已离线，游戏结束。` });
        const winner = this.room.validPlayers.find((p) => p.id !== player.id)!;
        this.finishGame(winner);
      }
    }).on('join', (player) => {
      this.room.validPlayers.find((p) => p.id === player.id)?.emit('command', {
        type: 'achievements',
        data: this.achievements
      });
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
          sender.emit('command', { type: 'poison', data: { capsule: this.poison } });
       }
    }

    switch (message.type) {
        case 'give': {
          if (this.gameStatus !== 'playing' || this.phase !== 'pick') {
            sender.emit('message', { content: `当前不在选择阶段。` });
            break;
          }
          if (sender.id !== this.activePlayer?.id) {
            sender.emit('message', { content: `不是你的回合。` });
            break;
          }
          const cap: Capsule = message.data?.capsule;
          if (!['left', 'right'].includes(cap)) {
            sender.emit('message', { content: `请选择左或右胶囊。` });
            break;
          }
          this.given = cap;
          this.room.emit('message', { content: `出租车司机 ${sender.name} 选择将${cap === 'left' ? '左侧' : '右侧'}胶囊交给夏洛克。` });
          this.beginSwapPhase();
          break;
        }
        case 'swap': {
          if (this.gameStatus !== 'playing' || this.phase !== 'swap') {
            sender.emit('message', { content: `当前不在交换阶段。` });
            break;
          }
          if (sender.id !== this.passivePlayer?.id) {
            sender.emit('message', { content: `不是你的回合。` });
            break;
          }
          this.swapped = !!message.data?.swap;
          this.room.emit('message', { content: `夏洛克 ${sender.name}${this.swapped ? '选择交换' : '选择不交换'}。` });
          this.finishRound();
          break;
        }
        case 'request-draw': {
          if (this.room.status !== RoomStatus.playing) break;
          const other = this.room.validPlayers.find((p) => p.id !== sender.id)!;
          other.emit('command', { type: 'request-draw', data: { player: sender } });
          this.room.emit('message', { content: `玩家 ${sender.name} 请求和棋。` });
          break;
        }
        case 'draw': {
          if (this.room.status !== RoomStatus.playing) break;
          if (!message.data?.agree) {
            this.room.emit('message', { content: `玩家 ${sender.name} 拒绝和棋，游戏继续。` });
            break;
          }
          this.room.emit('message', { content: `双方同意和棋，游戏结束。` });
          this.gameStatus = 'waiting';
          this.room.validPlayers.forEach((p) => {
            if (!this.achievements[p.name]) this.achievements[p.name] = { win: 0, lost: 0, draw: 0 };
            this.achievements[p.name].draw += 1;
          });
          this.room.emit('command', { type: 'achievements', data: this.achievements });
          this.room.end();
          this.save();
          break;
        }
        case 'request-lose': {
          if (this.room.status !== RoomStatus.playing) break;
          this.room.emit('message', { content: `玩家 ${sender.name} 认输。` });
          const winner = this.room.validPlayers.find((p) => p.id !== sender.id)!;
          this.finishGame(winner);
          break;
        }
    }
  }

  onStart() {
      if (this.room.validPlayers.length < this.room.minSize) {
        return this.room.emit('message', { content: `玩家人数不足，无法开始游戏。` });
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

      this.room.emit('command', { type: 'achievements', data: this.achievements });
      this.room.emit('message', { content: `游戏开始。随机选择：出租车司机 ${this.activePlayer.name}，夏洛克 ${this.passivePlayer.name}。出租车司机知晓毒胶囊。` });

      this.beginPickPhase();
      this.save();
  }

  beginPickPhase() {
    this.phase = 'pick';
    this.given = null;
    this.swapped = null;
    this.activePlayer?.emit('command', { type: 'poison', data: { capsule: this.poison } });
    this.room.emit('message', { content: `出租车司机 ${this.activePlayer?.name} 进行选择（60秒）。` });
    this.room.emit('command', { type: 'give-turn', data: { player: this.activePlayer } });
    this.startTimer(() => this.handleTimeout(), this.TURN_TIMEOUT, 'turn');
    this.save();
  }

  beginSwapPhase() {
    this.phase = 'swap';
    this.room.emit('message', { content: `夏洛克 ${this.passivePlayer?.name} 决定是否交换（60秒）。` });
    this.room.emit('command', { type: 'swap-turn', data: { player: this.passivePlayer } });
    this.startTimer(() => this.handleTimeout(), this.TURN_TIMEOUT, 'turn');
    this.save();
  }

  handleTimeout() {
    if (this.phase === 'pick' && this.activePlayer) {
      this.room.emit('message', { content: `出租车司机 ${this.activePlayer.name} 超时未选择，判负。` });
      this.finishGame(this.room.validPlayers.find(p => p.id !== this.activePlayer!.id)!);
    } else if (this.phase === 'swap' && this.passivePlayer) {
      this.room.emit('message', { content: `夏洛克 ${this.passivePlayer.name} 超时未决定是否交换，判负。` });
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

    this.room.emit('message', { content: `最终分配：出租车司机持有${activeFinal === 'left' ? '左' : '右'}，夏洛克持有${passiveFinal === 'left' ? '左' : '右'}。` });
    this.room.emit('command', {
      type: 'result',
      data: {
        poison: this.poison,
        given: this.given,
        swapped: this.swapped,
        activeFinal,
        passiveFinal,
        winner,
        loser: poisonedPlayer,
      }
    });

    if (poisonedPlayer) {
      const winnerRole = winner.id === this.activePlayer?.id ? '出租车司机' : '夏洛克';
      this.room.emit('message', { content: `结果：${poisonedPlayer.name} 中毒身亡。${winnerRole} ${winner.name} 获胜！` });
      this.finishGame(winner);
    } else {
      this.room.emit('message', { content: `结果：无人中毒（异常）。判定平局。` });
      this.gameStatus = 'waiting';
      this.room.validPlayers.forEach((p) => {
        if (!this.achievements[p.name]) this.achievements[p.name] = { win: 0, lost: 0, draw: 0 };
        this.achievements[p.name].draw += 1;
      });
      this.room.emit('command', { type: 'achievements', data: this.achievements });
      this.room.end();
      this.save();
    }
  }

  finishGame(winner: RoomPlayer) {
    this.gameStatus = 'waiting';
    this.lastLosePlayer = this.room.validPlayers.find((p) => p.id !== winner.id)!;

    this.room.validPlayers.forEach((p) => {
      if (!this.achievements[p.name]) this.achievements[p.name] = { win: 0, lost: 0, draw: 0 };
      if (p.id === winner.id) this.achievements[p.name].win += 1; else this.achievements[p.name].lost += 1;
    });
    this.room.emit('command', { type: 'achievements', data: this.achievements });
    this.room.end();
    this.save();
  }
}

export default PackbattleGameRoom;
