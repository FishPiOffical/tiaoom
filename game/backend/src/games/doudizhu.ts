import { Room, PlayerStatus, PlayerRole } from "tiaoom";
import { IGameMethod } from "./index";

export const name = "斗地主";
export const minSize = 3;
export const maxSize = 3;
export const description = "经典三人斗地主，抢地主、出牌、先出完者获胜";

// 牌的花色
export type CardSuit = 'spade' | 'heart' | 'diamond' | 'club' | 'joker';

// 单张牌
export interface DoudizhuCard {
  id: string;
  suit: CardSuit;
  value: number; // 3-15 (3-10, J=11, Q=12, K=13, A=14, 2=15), 小王=16, 大王=17
  display: string; // 显示用的文字
}

// 牌型
export type CardPattern =
  | 'single'      // 单张
  | 'pair'        // 对子
  | 'triple'      // 三张
  | 'triple_one'  // 三带一
  | 'triple_two'  // 三带二
  | 'straight'    // 顺子
  | 'pair_straight' // 连对
  | 'plane'       // 飞机（不带）
  | 'plane_wings' // 飞机带翅膀(带牌)
  | 'four_two'    // 四带二
  | 'bomb'        // 炸弹
  | 'rocket';     // 王炸

// 出牌结果
export interface PlayResult {
  pattern: CardPattern;
  mainValue: number; // 主要比较值
  cards: DoudizhuCard[];
}

// 游戏状态
export interface DoudizhuGameState {
  deck: DoudizhuCard[];
  players: { [playerId: string]: DoudizhuCard[] }; // 玩家手牌
  landlordCards: DoudizhuCard[]; // 底牌
  landlord: string | null; // 地主ID
  currentPlayer: string; // 当前出牌玩家
  lastPlay: PlayResult | null; // 上一手牌
  lastPlayer: string | null; // 上一个出牌的玩家
  passCount: number; // 连续pass次数
  phase: 'calling' | 'grabbing' | 'counter-grabbing' | 'playing' | 'ended'; // 游戏阶段：叫地主/抢地主/反抢/出牌/结束
  currentBidder: string | null; // 当前叫/抢地主的玩家
  calledPlayers: string[]; // 叫地主阶段已操作的玩家列表
  grabbedPlayers: string[]; // 抢地主阶段已操作的玩家列表
  caller: string | null; // 叫地主的玩家（原叫地主者）
  lastGrabber: string | null; // 最后一个抢地主的玩家（候选地主）
  winner: string | null;
  winnerRole: 'landlord' | 'farmer' | null;
  turnStartTime?: number;
  turnTimeout?: number;
  turnTimeLeft?: number;
  bombCount: number; // 炸弹数量（用于计算倍数）
  // 托管状态：playerId -> true 表示该玩家被托管
  hosted?: { [playerId: string]: boolean };
}

// 创建一副牌
const createDeck = (): DoudizhuCard[] => {
  const deck: DoudizhuCard[] = [];
  const suits: CardSuit[] = ['spade', 'heart', 'diamond', 'club'];
  const valueNames: { [key: number]: string } = {
    3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2'
  };

  // 普通牌
  suits.forEach(suit => {
    for (let value = 3; value <= 15; value++) {
      deck.push({
        id: `${suit}-${value}`,
        suit,
        value,
        display: valueNames[value]
      });
    }
  });

  // 大小王
  deck.push({ id: 'joker-small', suit: 'joker', value: 16, display: '小王' });
  deck.push({ id: 'joker-big', suit: 'joker', value: 17, display: '大王' });

  return deck;
};

// 洗牌
const shuffleDeck = (deck: DoudizhuCard[]): DoudizhuCard[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// 对手牌排序（从大到小）
const sortCards = (cards: DoudizhuCard[]): DoudizhuCard[] => {
  return [...cards].sort((a, b) => b.value - a.value);
};

// 判断牌型
const getCardPattern = (cards: DoudizhuCard[]): PlayResult | null => {
  if (cards.length === 0) return null;

  const sorted = sortCards(cards);
  const values = sorted.map(c => c.value);
  const valueCount: { [key: number]: number } = {};
  values.forEach(v => { valueCount[v] = (valueCount[v] || 0) + 1; });
  const counts = Object.values(valueCount).sort((a, b) => b - a);
  const uniqueValues = Object.keys(valueCount).map(Number).sort((a, b) => b - a);

  // 王炸
  if (cards.length === 2 && values.includes(16) && values.includes(17)) {
    return { pattern: 'rocket', mainValue: 17, cards: sorted };
  }

  // 单张
  if (cards.length === 1) {
    return { pattern: 'single', mainValue: values[0], cards: sorted };
  }

  // 对子
  if (cards.length === 2 && counts[0] === 2) {
    return { pattern: 'pair', mainValue: uniqueValues[0], cards: sorted };
  }

  // 三张
  if (cards.length === 3 && counts[0] === 3) {
    return { pattern: 'triple', mainValue: uniqueValues[0], cards: sorted };
  }

  // 炸弹
  if (cards.length === 4 && counts[0] === 4) {
    return { pattern: 'bomb', mainValue: uniqueValues[0], cards: sorted };
  }

  // 三带一
  if (cards.length === 4 && counts[0] === 3 && counts[1] === 1) {
    const mainValue = Number(Object.entries(valueCount).find(([_, count]) => count === 3)?.[0]);
    return { pattern: 'triple_one', mainValue, cards: sorted };
  }

  // 三带二
  if (cards.length === 5 && counts[0] === 3 && counts[1] === 2) {
    const mainValue = Number(Object.entries(valueCount).find(([_, count]) => count === 3)?.[0]);
    return { pattern: 'triple_two', mainValue, cards: sorted };
  }

  // 四带二（单张）
  if (cards.length === 6 && counts[0] === 4 && counts.length >= 2) {
    const mainValue = Number(Object.entries(valueCount).find(([_, count]) => count === 4)?.[0]);
    return { pattern: 'four_two', mainValue, cards: sorted };
  }

  // 四带二（对子）
  if (cards.length === 8 && counts[0] === 4 && counts[1] === 2 && counts[2] === 2) {
    const mainValue = Number(Object.entries(valueCount).find(([_, count]) => count === 4)?.[0]);
    return { pattern: 'four_two', mainValue, cards: sorted };
  }

  // 顺子 (5张以上，连续，不能包含2和王)
  if (cards.length >= 5 && counts.every(c => c === 1) && !values.includes(15) && !values.includes(16) && !values.includes(17)) {
    const sortedValues = [...uniqueValues].sort((a, b) => a - b);
    let isSequential = true;
    for (let i = 1; i < sortedValues.length; i++) {
      if (sortedValues[i] - sortedValues[i - 1] !== 1) {
        isSequential = false;
        break;
      }
    }
    if (isSequential) {
      return { pattern: 'straight', mainValue: Math.max(...sortedValues), cards: sorted };
    }
  }

  // 连对 (3对以上，连续，不能包含2和王)
  if (cards.length >= 6 && cards.length % 2 === 0 && counts.every(c => c === 2) && !values.includes(15) && !values.includes(16) && !values.includes(17)) {
    const sortedValues = [...uniqueValues].sort((a, b) => a - b);
    let isSequential = true;
    for (let i = 1; i < sortedValues.length; i++) {
      if (sortedValues[i] - sortedValues[i - 1] !== 1) {
        isSequential = false;
        break;
      }
    }
    if (isSequential) {
      return { pattern: 'pair_straight', mainValue: Math.max(...sortedValues), cards: sorted };
    }
  }

  // 飞机（不带）- 2个或以上连续三张
  if (cards.length >= 6 && cards.length % 3 === 0 && counts.every(c => c === 3)) {
    const tripleValues = uniqueValues.filter(v => valueCount[v] === 3 && v < 15).sort((a, b) => a - b);
    if (tripleValues.length >= 2) {
      let isSequential = true;
      for (let i = 1; i < tripleValues.length; i++) {
        if (tripleValues[i] - tripleValues[i - 1] !== 1) {
          isSequential = false;
          break;
        }
      }
      if (isSequential) {
        return { pattern: 'plane', mainValue: Math.max(...tripleValues), cards: sorted };
      }
    }
  }

  // 飞机带翅膀（单张）
  if (cards.length >= 8) {
    const tripleValues = Object.entries(valueCount)
      .filter(([v, count]) => count === 3 && Number(v) < 15)
      .map(([v]) => Number(v))
      .sort((a, b) => a - b);

    if (tripleValues.length >= 2 && cards.length === tripleValues.length * 4) {
      let isSequential = true;
      for (let i = 1; i < tripleValues.length; i++) {
        if (tripleValues[i] - tripleValues[i - 1] !== 1) {
          isSequential = false;
          break;
        }
      }
      if (isSequential) {
        return { pattern: 'plane_wings', mainValue: Math.max(...tripleValues), cards: sorted };
      }
    }
  }

  // 飞机带翅膀（对子）
  if (cards.length >= 10) {
    const tripleValues = Object.entries(valueCount)
      .filter(([v, count]) => count === 3 && Number(v) < 15)
      .map(([v]) => Number(v))
      .sort((a, b) => a - b);

    const pairCount = Object.values(valueCount).filter(c => c === 2).length;

    if (tripleValues.length >= 2 && cards.length === tripleValues.length * 5 && pairCount === tripleValues.length) {
      let isSequential = true;
      for (let i = 1; i < tripleValues.length; i++) {
        if (tripleValues[i] - tripleValues[i - 1] !== 1) {
          isSequential = false;
          break;
        }
      }
      if (isSequential) {
        return { pattern: 'plane_wings', mainValue: Math.max(...tripleValues), cards: sorted };
      }
    }
  }

  return null;
};

// 判断是否可以压过上家
const canBeat = (current: PlayResult, last: PlayResult | null): boolean => {
  if (!last) return true;

  // 王炸最大
  if (current.pattern === 'rocket') return true;
  if (last.pattern === 'rocket') return false;

  // 炸弹可以压非炸弹
  if (current.pattern === 'bomb' && last.pattern !== 'bomb') return true;
  if (last.pattern === 'bomb' && current.pattern !== 'bomb') return false;

  // 同类型比较
  if (current.pattern === last.pattern && current.cards.length === last.cards.length) {
    return current.mainValue > last.mainValue;
  }

  return false;
};

export default async function onRoom(room: Room, { save, restore }: IGameMethod) {
  // 尝试恢复游戏状态
  const gameData = await restore();
  let gameState: DoudizhuGameState | null = gameData?.gameState || null;
  let achievements: Record<string, { win: number; lost: number }> = gameData?.achievements || {};
  let messageHistory: { content: string, sender?: any }[] = gameData?.messageHistory || [];

  // 倒计时配置
  const TURN_TIMEOUT = 30000; // 30秒倒计时
  const BID_TIMEOUT = 15000; // 叫地主15秒
  let currentTimeout: NodeJS.Timeout | null = null;
  let timerInterval: NodeJS.Timeout | null = null;
  let timerGeneration = 0; // 用于标识当前倒计时的代数，防止旧回调执行

  const saveGameData = async () => {
    try {
      await save({
        gameState,
        achievements,
        messageHistory,
        lastSaved: Date.now()
      });
    } catch (error) {
      console.error('Failed to save doudizhu game data:', error);
    }
  };

  const clearTurnTimer = () => {
    if (currentTimeout) {
      clearTimeout(currentTimeout);
      currentTimeout = null;
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  };

  const startTurnTimer = (timeoutMs: number, onTimeout: () => void) => {
    clearTurnTimer();
    timerGeneration++; // 增加代数，使旧的回调失效
    const currentGeneration = timerGeneration;

    if (gameState) {
      gameState.turnStartTime = Date.now();
      gameState.turnTimeout = timeoutMs;
      gameState.turnTimeLeft = Math.ceil(timeoutMs / 1000);

      // 广播初始倒计时
      room.emit('command', { type: 'timer:update', data: { timeLeft: gameState.turnTimeLeft } });
    }

    // 每秒更新倒计时并广播
    timerInterval = setInterval(() => {
      // 检查是否是当前代的计时器
      if (currentGeneration !== timerGeneration) {
        return;
      }
      if (gameState && gameState.turnTimeLeft !== undefined && gameState.turnTimeLeft > 0) {
        gameState.turnTimeLeft--;
        room.emit('command', { type: 'timer:update', data: { timeLeft: gameState.turnTimeLeft } });
      }
    }, 1000);

    currentTimeout = setTimeout(() => {
      // 检查是否是当前代的计时器，防止旧回调执行
      if (currentGeneration !== timerGeneration) {
        return;
      }
      clearTurnTimer();
      onTimeout();
    }, timeoutMs);
  };

  const getNextPlayer = (currentId: string): string => {
    if (!gameState) return currentId;
    const playerIds = Object.keys(gameState.players);
    const currentIndex = playerIds.indexOf(currentId);
    return playerIds[(currentIndex + 1) % playerIds.length];
  };

  const broadcastState = () => {
    if (gameState) {
      room.emit('command', { type: 'game:state', data: gameState });
    }
  };

  // 托管相关常量
  const HOSTED_TIMEOUT = 5000; // 托管玩家5秒倒计时

  // 是否被托管
  const isHosted = (playerId: string) => {
    return !!(gameState && gameState.hosted && gameState.hosted[playerId]);
  };

  // 启动托管
  const startHosting = async (playerId: string) => {
    if (!gameState || gameState.phase === 'ended') return;
    gameState.hosted = gameState.hosted || {};
    if (gameState.hosted[playerId]) return; // 已托管
    gameState.hosted[playerId] = true;
    const player = room.players.find(p => p.id === playerId);
    room.emit('message', { content: `${player?.name || playerId} 离线，进入托管` });
    await saveGameData();
    broadcastState();

    // 如果当前正在该玩家回合，缩短倒计时
    const isCurrentTurn = ((gameState.phase === 'calling' || gameState.phase === 'grabbing' || gameState.phase === 'counter-grabbing') && gameState.currentBidder === playerId) ||
                          (gameState.phase === 'playing' && gameState.currentPlayer === playerId);
    if (isCurrentTurn) {
      clearTurnTimer();
      if (gameState.phase === 'calling' || gameState.phase === 'grabbing' || gameState.phase === 'counter-grabbing') {
        startTurnTimer(HOSTED_TIMEOUT, () => handleBidTimeout());
      } else {
        startTurnTimer(HOSTED_TIMEOUT, () => handlePlayTimeout());
      }
    }
  };

  // 停止托管（玩家重连）
  const stopHosting = async (playerId: string) => {
    if (!gameState || !gameState.hosted) return;
    if (!gameState.hosted[playerId]) return;
    delete gameState.hosted[playerId];
    const player = room.players.find(p => p.id === playerId);
    room.emit('message', { content: `${player?.name || playerId} 已重连，取消托管` });
    await saveGameData();
    broadcastState();
  };

  // 托管自动叫/抢/反抢地主（不叫/不抢/不反抢）
  const hostBid = async (playerId: string) => {
    if (!gameState || (gameState.phase !== 'calling' && gameState.phase !== 'grabbing' && gameState.phase !== 'counter-grabbing')) return;
    const player = room.players.find(p => p.id === playerId);
    const actionName = gameState.phase === 'calling' ? '不叫' : (gameState.phase === 'grabbing' ? '不抢' : '不反抢');
    room.emit('message', { content: `${player?.name || playerId} (托管) ${actionName}` });
    await processBid(playerId, false);
  };

  // 托管自动出牌
  const hostPlayTurn = async (playerId: string) => {
    if (!gameState || gameState.phase !== 'playing') return;
    const hand = gameState.players[playerId];
    if (!hand || hand.length === 0) return;

    const player = room.players.find(p => p.id === playerId);

    // 如果可以 pass（上家有人出牌且不是自己）
    if (gameState.lastPlayer && gameState.lastPlayer !== playerId) {
      room.emit('message', { content: `${player?.name || playerId} (托管) 不出` });
      await processPass(playerId);
      return;
    }

    // 必须出牌，出最小的单张
    const smallestCard = hand[hand.length - 1];
    room.emit('message', { content: `${player?.name || playerId} (托管) 出牌` });
    await processPlay(playerId, [smallestCard.id]);
  };

  const startGame = async () => {
    clearTurnTimer();

    const deck = shuffleDeck(createDeck());

    // 获取所有已准备的玩家，只取前3个参与游戏
    const readyPlayers = room.validPlayers.filter(p => p.isReady);
    const gamePlayers = readyPlayers.slice(0, 3);
    const playerIds = gamePlayers.map(p => p.id);

    if (playerIds.length !== 3) {
      room.emit('message', { content: '斗地主需要3名玩家！' });
      return;
    }

    // 将未参与游戏的玩家设为围观者
    room.players.forEach(player => {
      if (player.role === PlayerRole.player && !playerIds.includes(player.id)) {
        player.role = PlayerRole.watcher;
        player.isReady = false;
        room.emit('message', { content: `${player.name} 成为围观者` });
      }
    });

    // 发牌：每人17张，3张底牌
    const hands: { [playerId: string]: DoudizhuCard[] } = {};
    playerIds.forEach(playerId => {
      hands[playerId] = sortCards(deck.splice(0, 17));
    });

    const landlordCards = deck.splice(0, 3);

    gameState = {
      deck: [],
      players: hands,
      landlordCards,
      landlord: null,
      currentPlayer: playerIds[0],
      lastPlay: null,
      lastPlayer: null,
      passCount: 0,
      phase: 'calling', // 叫地主阶段
      currentBidder: playerIds[0],
      calledPlayers: [], // 叫地主阶段已操作玩家
      grabbedPlayers: [], // 抢地主阶段已操作玩家
      caller: null, // 叫地主的人
      lastGrabber: null, // 最后抢地主的人
      winner: null,
      winnerRole: null,
      bombCount: 0
    };

    // 只设置参与游戏的玩家状态为playing
    room.players.forEach(player => {
      if (player.role === PlayerRole.player && playerIds.includes(player.id)) {
        player.status = PlayerStatus.playing;
      }
    });

    await saveGameData();
    broadcastState();
    room.emit('command', { type: 'achievements', data: achievements });

    const firstBidder = room.players.find(p => p.id === playerIds[0]);
    room.emit('message', { content: `游戏开始！请 ${firstBidder?.name} 选择是否叫地主` });

    // 开始叫地主倒计时
    startTurnTimer(BID_TIMEOUT, () => handleBidTimeout());
  };

  const handleBidTimeout = async () => {
    if (!gameState || (gameState.phase !== 'calling' && gameState.phase !== 'grabbing' && gameState.phase !== 'counter-grabbing') || !gameState.currentBidder) return;

    const currentBidder = gameState.currentBidder;

    // 如果玩家被托管，使用托管逻辑
    if (isHosted(currentBidder)) {
      await hostBid(currentBidder);
      return;
    }

    // 普通超时处理
    const player = room.players.find(p => p.id === currentBidder);
    const actionName = gameState.phase === 'calling' ? '不叫' : (gameState.phase === 'grabbing' ? '不抢' : '不反抢');
    room.emit('message', { content: `${player?.name} 超时，自动${actionName}` });
    await processBid(currentBidder, false);
  };

  // 获取抢地主阶段的下一个玩家（跳过原叫地主者）
  const getNextGrabber = (currentId: string): string | null => {
    if (!gameState || !gameState.caller) return null;
    const playerIds = Object.keys(gameState.players);
    let nextId = getNextPlayer(currentId);

    // 如果下一个是原叫地主者，再跳一个
    if (nextId === gameState.caller) {
      nextId = getNextPlayer(nextId);
    }

    // 如果已经操作过，返回null
    if (gameState.grabbedPlayers.includes(nextId)) {
      return null;
    }

    return nextId;
  };

  const processBid = async (playerId: string, bid: boolean) => {
    if (!gameState || (gameState.phase !== 'calling' && gameState.phase !== 'grabbing' && gameState.phase !== 'counter-grabbing')) return;

    const player = room.players.find(p => p.id === playerId);

    // ===== 叫地主阶段 =====
    if (gameState.phase === 'calling') {
      // 记录该玩家已操作
      gameState.calledPlayers.push(playerId);

      if (bid) {
        // 玩家叫地主
        room.emit('message', { content: `${player?.name} 叫地主！` });

        // 记录叫地主的人，进入抢地主阶段
        gameState.caller = playerId;
        gameState.phase = 'grabbing';

        // 找到下一个非叫地主者开始抢
        const nextGrabberId = getNextGrabber(playerId);
        if (!nextGrabberId) {
          // 没有人可以抢（理论上不会发生，因为有3个玩家）
          finalizeLandlord(playerId);
          return;
        }

        gameState.currentBidder = nextGrabberId;
        await saveGameData();
        broadcastState();

        const nextBidder = room.players.find(p => p.id === nextGrabberId);
        room.emit('message', { content: `请 ${nextBidder?.name} 选择是否抢地主` });

        const nextTimeout = isHosted(nextGrabberId) ? HOSTED_TIMEOUT : BID_TIMEOUT;
        startTurnTimer(nextTimeout, () => handleBidTimeout());
      } else {
        // 玩家不叫
        room.emit('message', { content: `${player?.name} 不叫` });

        // 检查是否所有人都已操作
        if (gameState.calledPlayers.length >= 3) {
          // 所有人都不叫，流局重新发牌
          room.emit('message', { content: '没有人叫地主，重新发牌' });
          await startGame();
          return;
        }

        // 下一个人继续叫
        gameState.currentBidder = getNextPlayer(playerId);
        await saveGameData();
        broadcastState();

        const nextBidder = room.players.find(p => p.id === gameState!.currentBidder);
        room.emit('message', { content: `请 ${nextBidder?.name} 选择是否叫地主` });

        const nextTimeout = isHosted(gameState.currentBidder!) ? HOSTED_TIMEOUT : BID_TIMEOUT;
        startTurnTimer(nextTimeout, () => handleBidTimeout());
      }
      return;
    }

    // ===== 抢地主阶段 =====
    if (gameState.phase === 'grabbing') {
      // 原叫地主者不能参与抢地主
      if (playerId === gameState.caller) {
        return;
      }

      // 记录该玩家已操作
      gameState.grabbedPlayers.push(playerId);

      if (bid) {
        // 玩家抢地主
        room.emit('message', { content: `${player?.name} 抢地主！` });

        // 更新候选地主为最后抢地主的人
        gameState.lastGrabber = playerId;
      } else {
        // 玩家不抢
        room.emit('message', { content: `${player?.name} 不抢` });
      }

      // 检查是否所有非叫地主者都已操作（共2人）
      if (gameState.grabbedPlayers.length >= 2) {
        // 所有人都已操作
        if (gameState.lastGrabber) {
          // 有人抢地主，进入反抢阶段
          gameState.phase = 'counter-grabbing';
          gameState.currentBidder = gameState.caller;
          await saveGameData();
          broadcastState();

          const callerPlayer = room.players.find(p => p.id === gameState!.caller);
          room.emit('message', { content: `请 ${callerPlayer?.name} 选择是否反抢` });

          const nextTimeout = isHosted(gameState.caller!) ? HOSTED_TIMEOUT : BID_TIMEOUT;
          startTurnTimer(nextTimeout, () => handleBidTimeout());
        } else {
          // 没人抢，原叫者直接成为地主（跳过反抢阶段）
          finalizeLandlord(gameState.caller!);
        }
        return;
      }

      // 还有人没操作，继续
      const nextGrabberId = getNextGrabber(playerId);
      if (!nextGrabberId) {
        // 所有人都已操作
        if (gameState.lastGrabber) {
          // 有人抢地主，进入反抢阶段
          gameState.phase = 'counter-grabbing';
          gameState.currentBidder = gameState.caller;
          await saveGameData();
          broadcastState();

          const callerPlayer = room.players.find(p => p.id === gameState!.caller);
          room.emit('message', { content: `请 ${callerPlayer?.name} 选择是否反抢` });

          const nextTimeout = isHosted(gameState.caller!) ? HOSTED_TIMEOUT : BID_TIMEOUT;
          startTurnTimer(nextTimeout, () => handleBidTimeout());
        } else {
          // 没人抢，原叫者直接成为地主
          finalizeLandlord(gameState.caller!);
        }
        return;
      }

      gameState.currentBidder = nextGrabberId;
      await saveGameData();
      broadcastState();

      const nextBidder = room.players.find(p => p.id === nextGrabberId);
      room.emit('message', { content: `请 ${nextBidder?.name} 选择是否抢地主` });

      const nextTimeout = isHosted(nextGrabberId) ? HOSTED_TIMEOUT : BID_TIMEOUT;
      startTurnTimer(nextTimeout, () => handleBidTimeout());
      return;
    }

    // ===== 反抢地主阶段 =====
    if (gameState.phase === 'counter-grabbing') {
      // 只有原叫地主者可以反抢
      if (playerId !== gameState.caller) {
        return;
      }

      if (bid) {
        // 原叫者反抢成功，成为地主
        room.emit('message', { content: `${player?.name} 反抢地主！` });
        finalizeLandlord(gameState.caller!);
      } else {
        // 原叫者不反抢，候选地主成为地主
        room.emit('message', { content: `${player?.name} 不反抢` });
        finalizeLandlord(gameState.lastGrabber!);
      }
    }
  };

  const finalizeLandlord = async (landlordId: string) => {
    if (!gameState) return;

    // 先清除叫地主阶段的倒计时，防止双重倒计时
    clearTurnTimer();

    gameState.landlord = landlordId;
    gameState.phase = 'playing';
    gameState.currentPlayer = landlordId;
    gameState.currentBidder = null; // 清除叫地主状态，防止前端显示双重倒计时
    gameState.passCount = 0;

    // 地主获得底牌
    gameState.players[landlordId] = sortCards([
      ...gameState.players[landlordId],
      ...gameState.landlordCards
    ]);

    const player = room.players.find(p => p.id === landlordId);
    room.emit('message', { content: `${player?.name} 成为地主！获得底牌` });
    room.emit('command', { type: 'doudizhu:landlord', data: { landlord: landlordId, landlordCards: gameState.landlordCards } });

    await saveGameData();
    broadcastState();

    // 开始出牌倒计时（如果地主被托管则缩短时间）
    const timeout = isHosted(landlordId) ? HOSTED_TIMEOUT : TURN_TIMEOUT;
    startTurnTimer(timeout, () => handlePlayTimeout());
  };

  const handlePlayTimeout = async () => {
    if (!gameState || gameState.phase !== 'playing') return;

    const currentPlayerId = gameState.currentPlayer;

    // 如果玩家被托管，使用托管逻辑
    if (isHosted(currentPlayerId)) {
      await hostPlayTurn(currentPlayerId);
      return;
    }

    // 普通超时处理
    const currentPlayer = room.players.find(p => p.id === currentPlayerId);

    // 超时自动pass或出最小的牌
    if (gameState.lastPlayer && gameState.lastPlayer !== currentPlayerId) {
      // 可以pass
      room.emit('message', { content: `${currentPlayer?.name} 超时，自动不出` });
      await processPass(currentPlayerId);
    } else {
      // 必须出牌，出最小的单张
      const hand = gameState.players[currentPlayerId];
      if (hand.length > 0) {
        const smallestCard = hand[hand.length - 1];
        room.emit('message', { content: `${currentPlayer?.name} 超时，自动出牌` });
        await processPlay(currentPlayerId, [smallestCard.id]);
      }
    }
  };

  const processPass = async (playerId: string) => {
    if (!gameState || gameState.phase !== 'playing') return;

    gameState.passCount++;
    const player = room.players.find(p => p.id === playerId);
    room.emit('message', { content: `${player?.name} 不出` });

    // 如果两个人都pass了，轮到上一个出牌的人重新出
    if (gameState.passCount >= 2 && gameState.lastPlayer) {
      gameState.currentPlayer = gameState.lastPlayer;
      gameState.lastPlay = null;
      gameState.lastPlayer = null;
      gameState.passCount = 0;

      const nextPlayer = room.players.find(p => p.id === gameState!.currentPlayer);
      room.emit('message', { content: `轮到 ${nextPlayer?.name} 出牌（新一轮）` });
    } else {
      gameState.currentPlayer = getNextPlayer(playerId);
      const nextPlayer = room.players.find(p => p.id === gameState!.currentPlayer);
      room.emit('message', { content: `轮到 ${nextPlayer?.name} 出牌` });
    }

    await saveGameData();
    broadcastState();
    const nextTimeout = isHosted(gameState.currentPlayer) ? HOSTED_TIMEOUT : TURN_TIMEOUT;
    startTurnTimer(nextTimeout, () => handlePlayTimeout());
  };

  const processPlay = async (playerId: string, cardIds: string[]) => {
    if (!gameState || gameState.phase !== 'playing') return;
    if (gameState.currentPlayer !== playerId) return;

    const hand = gameState.players[playerId];
    const cards = cardIds.map(id => hand.find(c => c.id === id)).filter((c): c is DoudizhuCard => !!c);

    if (cards.length !== cardIds.length) {
      return; // 无效的牌
    }

    const pattern = getCardPattern(cards);
    if (!pattern) {
      const player = room.players.find(p => p.id === playerId);
      player && room.emit('command', { type: 'doudizhu:invalid', data: { message: '无效的牌型' } });
      return;
    }

    if (!canBeat(pattern, gameState.lastPlay)) {
      const player = room.players.find(p => p.id === playerId);
      player && room.emit('command', { type: 'doudizhu:invalid', data: { message: '出的牌压不过上家' } });
      return;
    }

    // 出牌
    const player = room.players.find(p => p.id === playerId);
    cards.forEach(card => {
      const idx = hand.findIndex(c => c.id === card.id);
      if (idx > -1) hand.splice(idx, 1);
    });

    gameState.lastPlay = pattern;
    gameState.lastPlayer = playerId;
    gameState.passCount = 0;

    // 统计炸弹
    if (pattern.pattern === 'bomb' || pattern.pattern === 'rocket') {
      gameState.bombCount++;
    }

    const patternNames: { [key in CardPattern]: string } = {
      single: '单张',
      pair: '对子',
      triple: '三张',
      triple_one: '三带一',
      triple_two: '三带二',
      straight: '顺子',
      pair_straight: '连对',
      plane: '飞机',
      plane_wings: '飞机带翅膀',
      four_two: '四带二',
      bomb: '炸弹',
      rocket: '王炸'
    };

    const cardDisplay = cards.map(c => c.display).join(' ');
    room.emit('message', { content: `${player?.name} 出了 ${patternNames[pattern.pattern]}: ${cardDisplay}` });

    // 检查是否获胜
    if (hand.length === 0) {
      gameState.winner = playerId;
      gameState.winnerRole = playerId === gameState.landlord ? 'landlord' : 'farmer';
      gameState.phase = 'ended';
      clearTurnTimer();

      // 更新成就
      const isLandlord = playerId === gameState.landlord;
      room.players.forEach(p => {
        if (p.role !== PlayerRole.player) return;
        if (!achievements[p.name]) {
          achievements[p.name] = { win: 0, lost: 0 };
        }
        const isWinner = isLandlord ? (p.id === playerId) : (p.id !== gameState!.landlord);
        if (isWinner) {
          achievements[p.name].win++;
        } else {
          achievements[p.name].lost++;
        }
      });

      // 清除托管状态
      if (gameState.hosted) {
        gameState.hosted = {};
      }

      const winnerName = player?.name;
      const roleName = isLandlord ? '地主' : '农民';
      room.emit('message', { content: `🎉 ${winnerName} (${roleName}) 获胜！` });

      await saveGameData();
      broadcastState();
      room.emit('command', { type: 'game:over', data: { winner: playerId, winnerRole: gameState.winnerRole } });
      room.emit('command', { type: 'achievements', data: achievements });

      // 设置所有玩家状态为未准备，并通知客户端
      room.players.forEach(p => {
        if (p.role === PlayerRole.player) {
          try {
            p.isReady = false;
            p.status = PlayerStatus.unready;
            p.emit('status', PlayerStatus.unready);
            room.emit('player-unready', { ...p, roomId: room.id, isReady: false });
          } catch (e) {
            console.warn('无法将玩家设为未准备', p.id, e);
          }
        }
      });

      // 通知客户端房间状态变为等待
      room.emit('command', { type: 'status', data: { status: 'waiting' } });

      // 不立即调用 room.end()，让玩家可以查看结果
      // 下一局开始时会重置 gameState
      return;
    }

    // 下一个玩家
    gameState.currentPlayer = getNextPlayer(playerId);
    const nextPlayer = room.players.find(p => p.id === gameState!.currentPlayer);
    room.emit('message', { content: `轮到 ${nextPlayer?.name} 出牌` });

    await saveGameData();
    broadcastState();
    const nextTimeout = isHosted(gameState.currentPlayer) ? HOSTED_TIMEOUT : TURN_TIMEOUT;
    startTurnTimer(nextTimeout, () => handlePlayTimeout());
  };

  // 恢复游戏状态
  if (gameState && gameState.phase !== 'ended') {
    // 只设置参与游戏的玩家为playing状态
    const gamePlayerIds = Object.keys(gameState.players);
    room.players.forEach(player => {
      if (player.role === PlayerRole.player && gamePlayerIds.includes(player.id)) {
        player.status = PlayerStatus.playing;
      }
    });

    // 延迟恢复倒计时，确保函数已定义
    setTimeout(() => {
      if (!gameState || gameState.phase === 'ended') return;

      // 计算剩余时间
      if (gameState.turnStartTime && gameState.turnTimeout) {
        const elapsed = Date.now() - gameState.turnStartTime;
        const remaining = gameState.turnTimeout - elapsed;

        if (remaining > 0) {
          // 还有剩余时间，继续倒计时
          if (gameState.phase === 'calling' || gameState.phase === 'grabbing' || gameState.phase === 'counter-grabbing') {
            startTurnTimer(remaining, () => handleBidTimeout());
          } else if (gameState.phase === 'playing') {
            startTurnTimer(remaining, () => handlePlayTimeout());
          }
        } else {
          // 倒计时已过期，立即处理超时
          if (gameState.phase === 'calling' || gameState.phase === 'grabbing' || gameState.phase === 'counter-grabbing') {
            handleBidTimeout();
          } else if (gameState.phase === 'playing') {
            handlePlayTimeout();
          }
        }
      } else {
        // 没有倒计时状态，开始新的倒计时
        if (gameState.phase === 'calling' || gameState.phase === 'grabbing' || gameState.phase === 'counter-grabbing') {
          startTurnTimer(BID_TIMEOUT, () => handleBidTimeout());
        } else if (gameState.phase === 'playing') {
          startTurnTimer(TURN_TIMEOUT, () => handlePlayTimeout());
        }
      }
    }, 0);
  }

  // 监听玩家加入
  room.on('join', (player) => {
    const playerSocket = room.players.find(p => p.id === player.id);
    if (!playerSocket) return;

    playerSocket.emit('command', { type: 'achievements', data: achievements });
    playerSocket.emit('command', { type: 'message_history', data: messageHistory });

    if (gameState) {
      playerSocket.emit('command', { type: 'game:state', data: gameState });
      playerSocket.emit('command', {
        type: 'status',
        data: {
          status: gameState.phase === 'ended' ? 'ended' : 'playing',
          messageHistory
        }
      });

      // 如果玩家重连并且之前被托管，则取消托管
      if (gameState.hosted && gameState.hosted[player.id]) {
        stopHosting(player.id);
      }
    }
  }).on('leave', async (player) => {
    if (gameState && gameState.phase !== 'ended' && player.role === 'player') {
      // 玩家中途离开，判负
      room.players.forEach(p => {
        if (p.role !== 'player') return;
        if (!achievements[p.name]) {
          achievements[p.name] = { win: 0, lost: 0 };
        }
        if (p.id === player.id) {
          achievements[p.name].lost++;
        } else {
          achievements[p.name].win++;
        }
      });
      await saveGameData();
      room.emit('command', { type: 'achievements', data: achievements });
    }
  }).on('message', async (message: { content: string, sender?: any }) => {
    messageHistory.unshift(message);
    if (messageHistory.length > 100) {
      messageHistory = messageHistory.slice(0, 100);
    }
    await saveGameData();
  });

  room.on('start', () => {
    // 如果没有游戏状态，或者游戏已结束，则可以开始新游戏
    if ((!gameState || gameState.phase === 'ended') && room.validPlayers.length >= 3) {
      startGame();
    }
  });

  room.on('end', () => {
    gameState = null;
    clearTurnTimer();
    room.emit('command', { type: 'end' }); // 通知前端游戏结束，允许玩家离开
  });

  // 玩家离线事件：启动托管
  room.on('player-offline', async (player) => {
    try {
      await startHosting(player.id);
    } catch (err) {
      console.error('startHosting error', err);
    }
  });

  return room.on('player-command', async (message: any) => {
    const sender = room.players.find(p => p.id === message.sender?.id);
    if (!sender) return;

    const commandType = message.type || message.data?.type;

    // 处理聊天消息
    if (message.type === 'say') {
      if (sender.role === 'watcher') {
        if (room.status === 'playing') {
          room.watchers.forEach(watcher => {
            watcher.emit('message', { content: message.data, sender });
          });
          return;
        }
      }
      room.emit('message', { content: message.data, sender });
      return;
    }

    switch (commandType) {
      case 'doudizhu:bid': {
        if (!gameState || (gameState.phase !== 'calling' && gameState.phase !== 'grabbing' && gameState.phase !== 'counter-grabbing')) return;
        if (gameState.currentBidder !== sender.id) return;
        // 抢地主阶段，原叫地主者不能操作
        if (gameState.phase === 'grabbing' && sender.id === gameState.caller) {
          sender.emit('command', { type: 'doudizhu:invalid', data: { message: '你已经叫过地主，不能抢地主' } });
          return;
        }
        // 反抢阶段，只有原叫地主者可以操作
        if (gameState.phase === 'counter-grabbing' && sender.id !== gameState.caller) {
          sender.emit('command', { type: 'doudizhu:invalid', data: { message: '只有原叫地主者可以反抢' } });
          return;
        }
        clearTurnTimer();
        await processBid(sender.id, message.data?.bid === true);
        break;
      }

      case 'doudizhu:play': {
        if (!gameState || gameState.phase !== 'playing') return;
        if (gameState.currentPlayer !== sender.id) return;
        clearTurnTimer();
        await processPlay(sender.id, message.data?.cardIds || []);
        break;
      }

      case 'doudizhu:pass': {
        if (!gameState || gameState.phase !== 'playing') return;
        if (gameState.currentPlayer !== sender.id) return;
        // 不能在必须出牌时pass
        if (!gameState.lastPlayer || gameState.lastPlayer === sender.id) {
          sender.emit('command', { type: 'doudizhu:invalid', data: { message: '你必须出牌' } });
          return;
        }
        clearTurnTimer();
        await processPass(sender.id);
        break;
      }

      case 'status': {
        const roomStatus = gameState ? (gameState.phase === 'ended' ? 'ended' : 'playing') : 'waiting';
        sender.emit('command', {
          type: 'status',
          data: { status: roomStatus, messageHistory }
        });
        break;
      }

      case 'game:state': {
        if (gameState) {
          sender.emit('command', { type: 'game:state', data: gameState });
        }
        break;
      }

      case 'achievements': {
        sender.emit('command', { type: 'achievements', data: achievements });
        break;
      }

      case 'message_history': {
        sender.emit('command', { type: 'message_history', data: messageHistory });
        break;
      }
    }
  });
}
