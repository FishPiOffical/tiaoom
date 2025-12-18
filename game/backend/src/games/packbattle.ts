import { IRoomPlayer, PlayerRole, Room, RoomPlayer, RoomStatus } from "tiaoom";
import { IGameMethod } from ".";
import { sleep } from "@/utils";

export default async function onRoom(room: Room, { save, restore }: IGameMethod) {
  const gameData = await restore();

  type Capsule = 'left' | 'right'
  type Phase = 'pick' | 'swap' | 'end'

  let messageHistory: { content: string, sender?: IRoomPlayer }[] = gameData?.messageHistory || [];
  let achivents: Record<string, { win: number; lost: number; draw: number }> = gameData?.achivents || {};

  let activePlayer: RoomPlayer | undefined = room.players.find((p) => p.id === gameData?.activePlayerId);
  let passivePlayer: RoomPlayer | undefined = room.players.find((p) => p.id === gameData?.passivePlayerId);

  let gameStatus: 'waiting' | 'playing' = gameData?.gameStatus ?? 'waiting';
  let phase: Phase = gameData?.phase ?? 'pick';
  let poison: Capsule = gameData?.poison ?? (Math.random() < 0.5 ? 'left' : 'right');
  let given: Capsule | null = gameData?.given ?? null;
  let swapped: boolean | null = gameData?.swapped ?? null;

  let lastLosePlayer: RoomPlayer | undefined = room.players.find((p) => p.id === gameData?.lastLosePlayerId);

  const TURN_TIMEOUT = 60 * 1000;
  let decisionTimeout: NodeJS.Timeout | null = null;
  let timerEndTime: number = gameData?.timerEndTime ?? 0;

  function saveGameData() {
    return save({
      messageHistory,
      achivents,
      activePlayerId: activePlayer?.id,
      passivePlayerId: passivePlayer?.id,
      gameStatus,
      phase,
      poison,
      given,
      swapped,
      lastLosePlayerId: lastLosePlayer?.id,
      timerEndTime,
    });
  }

  function clearTimeoutIfExists() {
    if (decisionTimeout) {
      clearTimeout(decisionTimeout);
      decisionTimeout = null;
    }
  }

  function startCountdown(ms: number) {
    clearTimeoutIfExists();
    timerEndTime = Date.now() + ms;
    room.emit('command', { type: 'countdown', data: { seconds: Math.ceil(ms / 1000) } });
    decisionTimeout = setTimeout(() => {
      handleTimeout();
    }, ms);
  }

  function handleTimeout() {
    if (phase === 'pick' && activePlayer) {
      room.emit('message', { content: `出租车司机 ${activePlayer.name} 超时未选择，判负。` });
      finishGame(room.validPlayers.find(p => p.id !== activePlayer!.id)!);
    } else if (phase === 'swap' && passivePlayer) {
      room.emit('message', { content: `夏洛克 ${passivePlayer.name} 超时未决定是否交换，判负。` });
      finishGame(room.validPlayers.find(p => p.id !== passivePlayer!.id)!);
    }
  }

  function beginPickPhase() {
    phase = 'pick';
    given = null;
    swapped = null;
    activePlayer?.emit('command', { type: 'poison', data: { capsule: poison } });
    room.emit('message', { content: `出租车司机 ${activePlayer?.name} 进行选择（60秒）。` });
    room.emit('command', { type: 'give-turn', data: { player: activePlayer } });
    startCountdown(TURN_TIMEOUT);
    saveGameData();
  }

  function beginSwapPhase() {
    phase = 'swap';
    room.emit('message', { content: `夏洛克 ${passivePlayer?.name} 决定是否交换（60秒）。` });
    room.emit('command', { type: 'swap-turn', data: { player: passivePlayer } });
    startCountdown(TURN_TIMEOUT);
    saveGameData();
  }

  function finishRound() {
    phase = 'end';
    clearTimeoutIfExists();

    const passiveCapsuleAfterGive: Capsule = given!;
    const activeCapsuleAfterGive: Capsule = given === 'left' ? 'right' : 'left';

    const activeFinal: Capsule = swapped ? passiveCapsuleAfterGive : activeCapsuleAfterGive;
    const passiveFinal: Capsule = swapped ? activeCapsuleAfterGive : passiveCapsuleAfterGive;

    const poisonedPlayer = poison === activeFinal ? activePlayer! : poison === passiveFinal ? passivePlayer! : undefined;
    const winner = poisonedPlayer?.id === activePlayer?.id ? passivePlayer! : activePlayer!;

    room.emit('message', { content: `最终分配：出租车司机持有${activeFinal === 'left' ? '左' : '右'}，夏洛克持有${passiveFinal === 'left' ? '左' : '右'}。` });
    room.emit('command', {
      type: 'result',
      data: {
        poison,
        given,
        swapped,
        activeFinal,
        passiveFinal,
        winner,
        loser: poisonedPlayer,
      }
    });

    if (poisonedPlayer) {
      const winnerRole = winner.id === activePlayer?.id ? '出租车司机' : '夏洛克';
      room.emit('message', { content: `结果：${poisonedPlayer.name} 中毒身亡。${winnerRole} ${winner.name} 获胜！` });
      finishGame(winner);
    } else {
      room.emit('message', { content: `结果：无人中毒（异常）。判定平局。` });
      gameStatus = 'waiting';
      room.validPlayers.forEach((p) => {
        if (!achivents[p.name]) achivents[p.name] = { win: 0, lost: 0, draw: 0 };
        achivents[p.name].draw += 1;
      });
      room.emit('command', { type: 'achivements', data: achivents });
      room.end();
      saveGameData();
    }
  }

  function finishGame(winner: RoomPlayer) {
    gameStatus = 'waiting';
    lastLosePlayer = room.validPlayers.find((p) => p.id !== winner.id)!;

    room.validPlayers.forEach((p) => {
      if (!achivents[p.name]) achivents[p.name] = { win: 0, lost: 0, draw: 0 };
      if (p.id === winner.id) achivents[p.name].win += 1; else achivents[p.name].lost += 1;
    });
    room.emit('command', { type: 'achivements', data: achivents });
    room.end();
    saveGameData();
  }

  room
    .on('join', (player) => {
      room.validPlayers.find((p) => p.id === player.id)?.emit('command', {
        type: 'achivents',
        data: achivents
      });
    })
    .on('player-offline', async (player) => {
      await sleep(2 * 60 * 1000);
      room.kickPlayer(player);
      if (gameStatus === 'playing' && player.role === 'player') {
        room.emit('message', { content: `玩家 ${player.name} 已离线，游戏结束。` });
        const winner = room.validPlayers.find((p) => p.id !== player.id)!;
        finishGame(winner);
      }
    })
    .on('player-command', (message: any) => {
      const publicCommands = ['say', 'status'];
      const players = publicCommands.includes(message.type) ? room.players : room.validPlayers;
      const sender = players.find((p) => p.id == message.sender?.id)!;
      if (!sender) return;
      switch (message.type) {
        case 'say':
          room.emit('message', { content: `${message.data}`, sender });
          break;
        case 'status': {
          const player = room.players.find((p) => p.id == message.data.id);
          if (!player) break;
          player.emit('command', {
            type: 'status',
            data: {
              status: gameStatus,
              phase,
              active: activePlayer,
              passive: passivePlayer,
              given,
              swapped,
              countdown: Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000)),
              messageHistory,
            }
          });
          if (gameStatus === 'playing' && (phase === 'pick' || phase === 'swap') && player.id === activePlayer?.id) {
            player.emit('command', { type: 'poison', data: { capsule: poison } });
          }
          break;
        }
        case 'give': {
          if (gameStatus !== 'playing' || phase !== 'pick') {
            sender.emit('message', { content: `当前不在选择阶段。` });
            break;
          }
          if (sender.id !== activePlayer?.id) {
            sender.emit('message', { content: `不是你的回合。` });
            break;
          }
          const cap: Capsule = message.data?.capsule;
          if (!['left', 'right'].includes(cap)) {
            sender.emit('message', { content: `请选择左或右胶囊。` });
            break;
          }
          given = cap;
          room.emit('message', { content: `出租车司机 ${sender.name} 选择将${cap === 'left' ? '左侧' : '右侧'}胶囊交给夏洛克。` });
          clearTimeoutIfExists();
          beginSwapPhase();
          break;
        }
        case 'swap': {
          if (gameStatus !== 'playing' || phase !== 'swap') {
            sender.emit('message', { content: `当前不在交换阶段。` });
            break;
          }
          if (sender.id !== passivePlayer?.id) {
            sender.emit('message', { content: `不是你的回合。` });
            break;
          }
          swapped = !!message.data?.swap;
          room.emit('message', { content: `夏洛克 ${sender.name}${swapped ? '选择交换' : '选择不交换'}。` });
          clearTimeoutIfExists();
          finishRound();
          break;
        }
        case 'request-draw': {
          if (room.status !== RoomStatus.playing) break;
          const other = room.validPlayers.find((p) => p.id !== sender.id)!;
          other.emit('command', { type: 'request-draw', data: { player: sender } });
          room.emit('message', { content: `玩家 ${sender.name} 请求和棋。` });
          break;
        }
        case 'draw': {
          if (room.status !== RoomStatus.playing) break;
          if (!message.data?.agree) {
            room.emit('message', { content: `玩家 ${sender.name} 拒绝和棋，游戏继续。` });
            break;
          }
          room.emit('message', { content: `双方同意和棋，游戏结束。` });
          gameStatus = 'waiting';
          room.validPlayers.forEach((p) => {
            if (!achivents[p.name]) achivents[p.name] = { win: 0, lost: 0, draw: 0 };
            achivents[p.name].draw += 1;
          });
          room.emit('command', { type: 'achivements', data: achivents });
          room.end();
          saveGameData();
          break;
        }
        case 'request-lose': {
          if (room.status !== RoomStatus.playing) break;
          room.emit('message', { content: `玩家 ${sender.name} 认输。` });
          const winner = room.validPlayers.find((p) => p.id !== sender.id)!;
          finishGame(winner);
          break;
        }
        default:
          break;
      }
    })
    .on('start', () => {
      if (room.validPlayers.length < room.minSize) {
        return room.emit('message', { content: `玩家人数不足，无法开始游戏。` });
      }
      clearTimeoutIfExists();
      messageHistory = [];
      gameStatus = 'playing';
      phase = 'pick';
      given = null;
      swapped = null;
      poison = Math.random() < 0.5 ? 'left' : 'right';

      const players = [...room.validPlayers];
      const idx = Math.floor(Math.random() * players.length);
      activePlayer = players[idx];
      passivePlayer = players.find((p) => p.id !== activePlayer!.id)!;

      room.emit('command', { type: 'achivements', data: achivents });
      room.emit('message', { content: `游戏开始。随机选择：出租车司机 ${activePlayer.name}，夏洛克 ${passivePlayer.name}。出租车司机知晓毒胶囊。` });

      beginPickPhase();
      saveGameData();
    })
    .on('end', () => {
      clearTimeoutIfExists();
      gameStatus = 'waiting';
      room.emit('command', { type: 'end' });
      saveGameData();
    })
    .on('message', (message) => {
      messageHistory.unshift(message);
      if (messageHistory.length > 100) messageHistory.splice(messageHistory.length - 100);
      saveGameData();
    });
}

export const name = '药丸博弈';
export const minSize = 2;
export const maxSize = 2;
export const description = `出租车司机知晓毒胶囊位置，选择交给夏洛克一个；夏洛克可选择是否交换。60秒倒计时，明牌聊天。`;
