import { Room, PlayerStatus, PlayerRole, RoomStatus, RoomPlayer } from "tiaoom";
import { GameRoom, IGameCommand } from "./index";

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

class DoudizhuGameRoom extends GameRoom {
  gameState: DoudizhuGameState | null = null;
  
  readonly TURN_TIMEOUT = 30000; // 30秒倒计时
  readonly BID_TIMEOUT = 15000; // 叫地主15秒
  readonly HOSTED_TIMEOUT = 5000; // 托管玩家5秒倒计时

  init() {
    this.restoreTimer({
      turn: () => this.handleTimeout()
    });

    // 恢复游戏状态
    if (this.gameState && !this.gameState.winner) {
      const gamePlayerIds = Object.keys(this.gameState.players);
      this.room.players.forEach(player => {
        if (player.role === 'player' && gamePlayerIds.includes(player.id)) {
          player.status = PlayerStatus.playing;
        }
      });
    }

    return super.init().on('player-offline', async (player) => {
      try {
        await this.startHosting(player.id);
      } catch (err) {
        console.error('startHosting error', err);
      }
    }).on('join', (player) => {
      const playerSocket = this.room.players.find((p) => p.id === player.id);
      if (!playerSocket) return;
      
      playerSocket.emit('command', { type: 'achievements', data: this.achievements });
      playerSocket.emit('command', { type: 'message_history', data: this.messageHistory });
      
      if (this.gameState) {
        playerSocket.emit('command', { type: 'game:state', data: this.gameState });
        playerSocket.emit('command', {
          type: 'status',
          data: { status: this.room.status, messageHistory: this.messageHistory }
        });

        if (this.gameState.hosted && this.gameState.hosted[player.id]) {
          this.stopHosting(player.id);
        }
      }
    }).on('leave', async (player) => {
      if (this.gameState && this.gameState.phase !== 'ended' && player.role === 'player') {
        // 玩家中途离开，判负
        this.room.players.forEach(p => {
          if (p.role !== 'player') return;
          if (!this.achievements[p.name]) {
            this.achievements[p.name] = { win: 0, lost: 0, draw: 0 };
          }
          if (p.id === player.id) {
            this.achievements[p.name].lost++;
          } else {
            this.achievements[p.name].win++;
          }
        });
        this.save();
        this.room.emit('command', { type: 'achievements', data: this.achievements });
      }
    });
  }

  getStatus(sender: RoomPlayer) {
    return {
      ...super.getStatus(sender),
      status: this.room.status,
      gameState: this.gameState
    }
  }

  onStart() {
    if (this.room.validPlayers.length < this.room.minSize) return;
    this.startGame();
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    const sender = message.sender as RoomPlayer;
    const commandType = message.type || message.data?.type;

    if (!this.gameState && !['status', 'achievements', 'message_history'].includes(commandType)) {
      return;
    }

    switch (commandType) {
      case 'doudizhu:bid':
        this.handleBid(sender, message.data);
        break;
      case 'doudizhu:play':
        this.handlePlay(sender, message.data);
        break;
      case 'doudizhu:pass':
        this.handlePass(sender);
        break;
      case 'status':
        sender.emit('command', { 
          type: 'status', 
          data: { status: this.room.status, messageHistory: this.messageHistory } 
        });
        break;
      case 'game:state':
        if (this.gameState) sender.emit('command', { type: 'game:state', data: this.gameState });
        break;
      case 'achievements':
        sender.emit('command', { type: 'achievements', data: this.achievements });
        break;
      case 'message_history':
        sender.emit('command', { type: 'message_history', data: this.messageHistory });
        break;
    }
  }

  startGame() {
    this.stopTimer();
    const deck = shuffleDeck(createDeck());

    // 获取所有已准备的玩家，只取前3个参与游戏
    const readyPlayers = this.room.validPlayers.filter(p => p.isReady);
    const gamePlayers = readyPlayers.slice(0, 3);
    const playerIds = gamePlayers.map(p => p.id);

    if (playerIds.length !== 3) {
      this.room.emit('message', { content: '斗地主需要3名玩家！' });
      return;
    }

    // 将未参与游戏的玩家设为围观者
    this.room.players.forEach(player => {
      if (player.role === PlayerRole.player && !playerIds.includes(player.id)) {
        player.role = PlayerRole.watcher;
        player.isReady = false;
        this.room.emit('message', { content: `${player.name} 成为围观者` });
      }
    });

    // 发牌：每人17张，3张底牌
    const hands: { [playerId: string]: DoudizhuCard[] } = {};
    playerIds.forEach(playerId => {
      hands[playerId] = sortCards(deck.splice(0, 17));
    });

    const landlordCards = deck.splice(0, 3);

    this.gameState = {
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
    this.room.players.forEach(player => {
      if (player.role === PlayerRole.player && playerIds.includes(player.id)) {
        player.status = PlayerStatus.playing;
      }
    });

    this.save();
    this.room.emit('command', { type: 'game:state', data: this.gameState });
    this.room.emit('command', { type: 'achievements', data: this.achievements });

    const firstBidder = this.room.players.find(p => p.id === playerIds[0]);
    this.room.emit('message', { content: `游戏开始！请 ${firstBidder?.name} 选择是否叫地主` });

    // 开始叫地主倒计时
    this.startTurnTimer(this.BID_TIMEOUT);
  }

  startTurnTimer(timeoutMs: number) {
    if (this.gameState) {
      this.gameState.turnStartTime = Date.now();
      this.gameState.turnTimeout = timeoutMs;
      this.gameState.turnTimeLeft = Math.ceil(timeoutMs / 1000);
    }
    this.startTimer(() => this.handleTimeout(), timeoutMs, 'turn');
    
    // Emit initial state with timer info
    if (this.gameState) {
       this.room.emit('command', { type: 'game:state', data: this.gameState });
       // 兼容旧前端，发送 timer:update
       this.room.emit('command', { type: 'timer:update', data: { timeLeft: this.gameState.turnTimeLeft } });
    }
  }

  async handleTimeout() {
    if (!this.gameState) return;

    if (this.gameState.phase === 'calling' || this.gameState.phase === 'grabbing' || this.gameState.phase === 'counter-grabbing') {
      await this.handleBidTimeout();
    } else if (this.gameState.phase === 'playing') {
      await this.handlePlayTimeout();
    }
  }

  async handleBidTimeout() {
    if (!this.gameState || !this.gameState.currentBidder) return;

    const currentBidder = this.gameState.currentBidder;

    // 如果玩家被托管，使用托管逻辑
    if (this.isHosted(currentBidder)) {
      await this.hostBid(currentBidder);
      return;
    }

    // 普通超时处理
    const player = this.room.players.find(p => p.id === currentBidder);
    const actionName = this.gameState.phase === 'calling' ? '不叫' : (this.gameState.phase === 'grabbing' ? '不抢' : '不反抢');
    this.room.emit('message', { content: `${player?.name} 超时，自动${actionName}` });
    await this.processBid(currentBidder, false);
  }

  async handlePlayTimeout() {
    if (!this.gameState || this.gameState.phase !== 'playing') return;

    const currentPlayerId = this.gameState.currentPlayer;

    // 如果玩家被托管，使用托管逻辑
    if (this.isHosted(currentPlayerId)) {
      await this.hostPlayTurn(currentPlayerId);
      return;
    }

    // 普通超时处理
    const currentPlayer = this.room.players.find(p => p.id === currentPlayerId);

    // 超时自动pass或出最小的牌
    if (this.gameState.lastPlayer && this.gameState.lastPlayer !== currentPlayerId) {
      // 可以pass
      this.room.emit('message', { content: `${currentPlayer?.name} 超时，自动不出` });
      await this.processPass(currentPlayerId);
    } else {
      // 必须出牌，出最小的单张
      const hand = this.gameState.players[currentPlayerId];
      if (hand.length > 0) {
        const smallestCard = hand[hand.length - 1];
        this.room.emit('message', { content: `${currentPlayer?.name} 超时，自动出牌` });
        await this.processPlay(currentPlayerId, [smallestCard.id]);
      }
    }
  }

  handleBid(sender: RoomPlayer, data: any) {
    if (!this.gameState || (this.gameState.phase !== 'calling' && this.gameState.phase !== 'grabbing' && this.gameState.phase !== 'counter-grabbing')) return;
    if (this.gameState.currentBidder !== sender.id) return;
    
    // 抢地主阶段，原叫地主者不能操作
    if (this.gameState.phase === 'grabbing' && sender.id === this.gameState.caller) {
      sender.emit('command', { type: 'doudizhu:invalid', data: { message: '你已经叫过地主，不能抢地主' } });
      return;
    }
    // 反抢阶段，只有原叫地主者可以操作
    if (this.gameState.phase === 'counter-grabbing' && sender.id !== this.gameState.caller) {
      sender.emit('command', { type: 'doudizhu:invalid', data: { message: '只有原叫地主者可以反抢' } });
      return;
    }
    
    this.processBid(sender.id, data?.bid === true);
  }

  handlePlay(sender: RoomPlayer, data: any) {
    if (!this.gameState || this.gameState.phase !== 'playing') return;
    if (this.gameState.currentPlayer !== sender.id) return;
    
    this.processPlay(sender.id, data?.cardIds || []);
  }

  handlePass(sender: RoomPlayer) {
    if (!this.gameState || this.gameState.phase !== 'playing') return;
    if (this.gameState.currentPlayer !== sender.id) return;
    // 不能在必须出牌时pass
    if (!this.gameState.lastPlayer || this.gameState.lastPlayer === sender.id) {
      sender.emit('command', { type: 'doudizhu:invalid', data: { message: '你必须出牌' } });
      return;
    }
    
    this.processPass(sender.id);
  }

  async processBid(playerId: string, bid: boolean) {
    if (!this.gameState) return;

    const player = this.room.players.find(p => p.id === playerId);

    // ===== 叫地主阶段 =====
    if (this.gameState.phase === 'calling') {
      // 记录该玩家已操作
      this.gameState.calledPlayers.push(playerId);

      if (bid) {
        // 玩家叫地主
        this.room.emit('message', { content: `${player?.name} 叫地主！` });

        // 记录叫地主的人，进入抢地主阶段
        this.gameState.caller = playerId;
        this.gameState.phase = 'grabbing';

        // 找到下一个非叫地主者开始抢
        const nextGrabberId = this.getNextGrabber(playerId);
        if (!nextGrabberId) {
          // 没有人可以抢（理论上不会发生，因为有3个玩家）
          this.finalizeLandlord(playerId);
          return;
        }

        this.gameState.currentBidder = nextGrabberId;
        this.save();
        this.room.emit('command', { type: 'game:state', data: this.gameState });

        const nextBidder = this.room.players.find(p => p.id === nextGrabberId);
        this.room.emit('message', { content: `请 ${nextBidder?.name} 选择是否抢地主` });

        const nextTimeout = this.isHosted(nextGrabberId) ? this.HOSTED_TIMEOUT : this.BID_TIMEOUT;
        this.startTurnTimer(nextTimeout);
      } else {
        // 玩家不叫
        this.room.emit('message', { content: `${player?.name} 不叫` });

        // 检查是否所有人都已操作
        if (this.gameState.calledPlayers.length >= 3) {
          // 所有人都不叫，流局重新发牌
          this.room.emit('message', { content: '没有人叫地主，重新发牌' });
          await this.startGame();
          return;
        }

        // 下一个人继续叫
        this.gameState.currentBidder = this.getNextPlayer(playerId);
        this.save();
        this.room.emit('command', { type: 'game:state', data: this.gameState });

        const nextBidder = this.room.players.find(p => p.id === this.gameState!.currentBidder);
        this.room.emit('message', { content: `请 ${nextBidder?.name} 选择是否叫地主` });

        const nextTimeout = this.isHosted(this.gameState.currentBidder!) ? this.HOSTED_TIMEOUT : this.BID_TIMEOUT;
        this.startTurnTimer(nextTimeout);
      }
      return;
    }

    // ===== 抢地主阶段 =====
    if (this.gameState.phase === 'grabbing') {
      // 原叫地主者不能参与抢地主
      if (playerId === this.gameState.caller) {
        return;
      }

      // 记录该玩家已操作
      this.gameState.grabbedPlayers.push(playerId);

      if (bid) {
        // 玩家抢地主
        this.room.emit('message', { content: `${player?.name} 抢地主！` });

        // 更新候选地主为最后抢地主的人
        this.gameState.lastGrabber = playerId;
      } else {
        // 玩家不抢
        this.room.emit('message', { content: `${player?.name} 不抢` });
      }

      // 检查是否所有非叫地主者都已操作（共2人）
      if (this.gameState.grabbedPlayers.length >= 2) {
        // 所有人都已操作
        if (this.gameState.lastGrabber) {
          // 有人抢地主，进入反抢阶段
          this.gameState.phase = 'counter-grabbing';
          this.gameState.currentBidder = this.gameState.caller;
          this.save();
          this.room.emit('command', { type: 'game:state', data: this.gameState });

          const callerPlayer = this.room.players.find(p => p.id === this.gameState!.caller);
          this.room.emit('message', { content: `请 ${callerPlayer?.name} 选择是否反抢` });

          const nextTimeout = this.isHosted(this.gameState.caller!) ? this.HOSTED_TIMEOUT : this.BID_TIMEOUT;
          this.startTurnTimer(nextTimeout);
        } else {
          // 没人抢，原叫者直接成为地主（跳过反抢阶段）
          this.finalizeLandlord(this.gameState.caller!);
        }
        return;
      }

      // 还有人没操作，继续
      const nextGrabberId = this.getNextGrabber(playerId);
      if (!nextGrabberId) {
        // 所有人都已操作
        if (this.gameState.lastGrabber) {
          // 有人抢地主，进入反抢阶段
          this.gameState.phase = 'counter-grabbing';
          this.gameState.currentBidder = this.gameState.caller;
          this.save();
          this.room.emit('command', { type: 'game:state', data: this.gameState });

          const callerPlayer = this.room.players.find(p => p.id === this.gameState!.caller);
          this.room.emit('message', { content: `请 ${callerPlayer?.name} 选择是否反抢` });

          const nextTimeout = this.isHosted(this.gameState.caller!) ? this.HOSTED_TIMEOUT : this.BID_TIMEOUT;
          this.startTurnTimer(nextTimeout);
        } else {
          // 没人抢，原叫者直接成为地主
          this.finalizeLandlord(this.gameState.caller!);
        }
        return;
      }

      this.gameState.currentBidder = nextGrabberId;
      this.save();
      this.room.emit('command', { type: 'game:state', data: this.gameState });

      const nextBidder = this.room.players.find(p => p.id === nextGrabberId);
      this.room.emit('message', { content: `请 ${nextBidder?.name} 选择是否抢地主` });

      const nextTimeout = this.isHosted(nextGrabberId) ? this.HOSTED_TIMEOUT : this.BID_TIMEOUT;
      this.startTurnTimer(nextTimeout);
      return;
    }

    // ===== 反抢地主阶段 =====
    if (this.gameState.phase === 'counter-grabbing') {
      // 只有原叫地主者可以反抢
      if (playerId !== this.gameState.caller) {
        return;
      }

      if (bid) {
        // 原叫者反抢成功，成为地主
        this.room.emit('message', { content: `${player?.name} 反抢地主！` });
        this.finalizeLandlord(this.gameState.caller!);
      } else {
        // 原叫者不反抢，候选地主成为地主
        this.room.emit('message', { content: `${player?.name} 不反抢` });
        this.finalizeLandlord(this.gameState.lastGrabber!);
      }
    }
  }

  async finalizeLandlord(landlordId: string) {
    if (!this.gameState) return;

    this.gameState.landlord = landlordId;
    this.gameState.phase = 'playing';
    this.gameState.currentPlayer = landlordId;
    this.gameState.currentBidder = null; // 清除叫地主状态
    this.gameState.passCount = 0;

    // 地主获得底牌
    this.gameState.players[landlordId] = sortCards([
      ...this.gameState.players[landlordId],
      ...this.gameState.landlordCards
    ]);

    const player = this.room.players.find(p => p.id === landlordId);
    this.room.emit('message', { content: `${player?.name} 成为地主！获得底牌` });
    this.room.emit('command', { type: 'doudizhu:landlord', data: { landlord: landlordId, landlordCards: this.gameState.landlordCards } });

    this.save();
    this.room.emit('command', { type: 'game:state', data: this.gameState });

    // 开始出牌倒计时（如果地主被托管则缩短时间）
    const timeout = this.isHosted(landlordId) ? this.HOSTED_TIMEOUT : this.TURN_TIMEOUT;
    this.startTurnTimer(timeout);
  }

  async processPass(playerId: string) {
    if (!this.gameState || this.gameState.phase !== 'playing') return;

    this.gameState.passCount++;
    const player = this.room.players.find(p => p.id === playerId);
    this.room.emit('message', { content: `${player?.name} 不出` });

    // 如果两个人都pass了，轮到上一个出牌的人重新出
    if (this.gameState.passCount >= 2 && this.gameState.lastPlayer) {
      this.gameState.currentPlayer = this.gameState.lastPlayer;
      this.gameState.lastPlay = null;
      this.gameState.lastPlayer = null;
      this.gameState.passCount = 0;

      const nextPlayer = this.room.players.find(p => p.id === this.gameState!.currentPlayer);
      this.room.emit('message', { content: `轮到 ${nextPlayer?.name} 出牌（新一轮）` });
    } else {
      this.gameState.currentPlayer = this.getNextPlayer(playerId);
      const nextPlayer = this.room.players.find(p => p.id === this.gameState!.currentPlayer);
      this.room.emit('message', { content: `轮到 ${nextPlayer?.name} 出牌` });
    }

    this.save();
    this.room.emit('command', { type: 'game:state', data: this.gameState });
    const nextTimeout = this.isHosted(this.gameState.currentPlayer) ? this.HOSTED_TIMEOUT : this.TURN_TIMEOUT;
    this.startTurnTimer(nextTimeout);
  }

  async processPlay(playerId: string, cardIds: string[]) {
    if (!this.gameState || this.gameState.phase !== 'playing') return;
    if (this.gameState.currentPlayer !== playerId) return;

    const hand = this.gameState.players[playerId];
    const cards = cardIds.map(id => hand.find(c => c.id === id)).filter((c): c is DoudizhuCard => !!c);

    if (cards.length !== cardIds.length) {
      return; // 无效的牌
    }

    const pattern = getCardPattern(cards);
    if (!pattern) {
      const player = this.room.players.find(p => p.id === playerId);
      player && player.emit('command', { type: 'doudizhu:invalid', data: { message: '无效的牌型' } });
      return;
    }

    if (!canBeat(pattern, this.gameState.lastPlay)) {
      const player = this.room.players.find(p => p.id === playerId);
      player && player.emit('command', { type: 'doudizhu:invalid', data: { message: '出的牌压不过上家' } });
      return;
    }

    // 出牌
    const player = this.room.players.find(p => p.id === playerId);
    cards.forEach(card => {
      const idx = hand.findIndex(c => c.id === card.id);
      if (idx > -1) hand.splice(idx, 1);
    });

    this.gameState.lastPlay = pattern;
    this.gameState.lastPlayer = playerId;
    this.gameState.passCount = 0;

    // 统计炸弹
    if (pattern.pattern === 'bomb' || pattern.pattern === 'rocket') {
      this.gameState.bombCount++;
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
    this.room.emit('message', { content: `${player?.name} 出了 ${patternNames[pattern.pattern]}: ${cardDisplay}` });

    // 检查是否获胜
    if (hand.length === 0) {
      this.finishGame(playerId);
      return;
    }

    // 下一个玩家
    this.gameState.currentPlayer = this.getNextPlayer(playerId);
    const nextPlayer = this.room.players.find(p => p.id === this.gameState!.currentPlayer);
    this.room.emit('message', { content: `轮到 ${nextPlayer?.name} 出牌` });

    this.save();
    this.room.emit('command', { type: 'game:state', data: this.gameState });
    const nextTimeout = this.isHosted(this.gameState.currentPlayer) ? this.HOSTED_TIMEOUT : this.TURN_TIMEOUT;
    this.startTurnTimer(nextTimeout);
  }

  finishGame(winnerId: string) {
    if (!this.gameState) return;
    
    this.gameState.winner = winnerId;
    this.gameState.winnerRole = winnerId === this.gameState.landlord ? 'landlord' : 'farmer';
    this.gameState.phase = 'ended';
    this.stopTimer();

    // 更新成就
    const isLandlord = winnerId === this.gameState.landlord;
    this.room.players.forEach(p => {
      if (p.role !== PlayerRole.player) return;
      if (!this.achievements[p.name]) {
        this.achievements[p.name] = { win: 0, lost: 0, draw: 0 };
      }
      const isWinner = isLandlord ? (p.id === winnerId) : (p.id !== this.gameState!.landlord);
      if (isWinner) {
        this.achievements[p.name].win++;
      } else {
        this.achievements[p.name].lost++;
      }
    });

    // 清除托管状态
    if (this.gameState.hosted) {
      this.gameState.hosted = {};
    }

    const player = this.room.players.find(p => p.id === winnerId);
    const winnerName = player?.name;
    const roleName = isLandlord ? '地主' : '农民';
    this.room.emit('message', { content: `🎉 ${winnerName} (${roleName}) 获胜！` });

    this.save();
    this.room.emit('command', { type: 'game:state', data: this.gameState });
    this.room.emit('command', { type: 'game:over', data: { winner: winnerId, winnerRole: this.gameState.winnerRole } });
    this.room.emit('command', { type: 'achievements', data: this.achievements });

    // 设置所有玩家状态为未准备，并通知客户端
    this.room.players.forEach(p => {
      if (p.role === PlayerRole.player) {
        try {
          p.isReady = false;
          p.status = PlayerStatus.unready;
          p.emit('status', PlayerStatus.unready);
          this.room.emit('player-unready', { ...p, roomId: this.room.id, isReady: false });
        } catch (e) {
          console.warn('无法将玩家设为未准备', p.id, e);
        }
      }
    });

    // 通知客户端房间状态变为等待
    this.room.emit('command', { type: 'status', data: { status: 'waiting' } });
  }

  // Helpers
  getNextPlayer(currentId: string): string {
    if (!this.gameState) return currentId;
    const playerIds = Object.keys(this.gameState.players);
    const currentIndex = playerIds.indexOf(currentId);
    return playerIds[(currentIndex + 1) % playerIds.length];
  }

  getNextGrabber(currentId: string): string | null {
    if (!this.gameState || !this.gameState.caller) return null;
    const playerIds = Object.keys(this.gameState.players);
    let nextId = this.getNextPlayer(currentId);

    // 如果下一个是原叫地主者，再跳一个
    if (nextId === this.gameState.caller) {
      nextId = this.getNextPlayer(nextId);
    }

    // 如果已经操作过，返回null
    if (this.gameState.grabbedPlayers.includes(nextId)) {
      return null;
    }

    return nextId;
  }

  isHosted(playerId: string) {
    return !!(this.gameState && this.gameState.hosted && this.gameState.hosted[playerId]);
  }

  async startHosting(playerId: string) {
    if (!this.gameState || this.gameState.phase === 'ended') return;
    this.gameState.hosted = this.gameState.hosted || {};
    if (this.gameState.hosted[playerId]) return; // 已托管
    this.gameState.hosted[playerId] = true;
    const player = this.room.players.find(p => p.id === playerId);
    this.room.emit('message', { content: `${player?.name || playerId} 离线，进入托管` });
    this.save();
    this.room.emit('command', { type: 'game:state', data: this.gameState });

    // 如果当前正在该玩家回合，缩短倒计时
    const isCurrentTurn = ((this.gameState.phase === 'calling' || this.gameState.phase === 'grabbing' || this.gameState.phase === 'counter-grabbing') && this.gameState.currentBidder === playerId) ||
                          (this.gameState.phase === 'playing' && this.gameState.currentPlayer === playerId);
    if (isCurrentTurn) {
      if (this.gameState.phase === 'calling' || this.gameState.phase === 'grabbing' || this.gameState.phase === 'counter-grabbing') {
        this.startTurnTimer(this.HOSTED_TIMEOUT);
      } else {
        this.startTurnTimer(this.HOSTED_TIMEOUT);
      }
    }
  }

  async stopHosting(playerId: string) {
    if (!this.gameState || !this.gameState.hosted) return;
    if (!this.gameState.hosted[playerId]) return;
    delete this.gameState.hosted[playerId];
    const player = this.room.players.find(p => p.id === playerId);
    this.room.emit('message', { content: `${player?.name || playerId} 已重连，取消托管` });
    this.save();
    this.room.emit('command', { type: 'game:state', data: this.gameState });
  }

  async hostBid(playerId: string) {
    if (!this.gameState || (this.gameState.phase !== 'calling' && this.gameState.phase !== 'grabbing' && this.gameState.phase !== 'counter-grabbing')) return;
    const player = this.room.players.find(p => p.id === playerId);
    const actionName = this.gameState.phase === 'calling' ? '不叫' : (this.gameState.phase === 'grabbing' ? '不抢' : '不反抢');
    this.room.emit('message', { content: `${player?.name || playerId} (托管) ${actionName}` });
    await this.processBid(playerId, false);
  }

  async hostPlayTurn(playerId: string) {
    if (!this.gameState || this.gameState.phase !== 'playing') return;
    const hand = this.gameState.players[playerId];
    if (!hand || hand.length === 0) return;

    const player = this.room.players.find(p => p.id === playerId);

    // 如果可以 pass（上家有人出牌且不是自己）
    if (this.gameState.lastPlayer && this.gameState.lastPlayer !== playerId) {
      this.room.emit('message', { content: `${player?.name || playerId} (托管) 不出` });
      await this.processPass(playerId);
      return;
    }

    // 必须出牌，出最小的单张
    const smallestCard = hand[hand.length - 1];
    this.room.emit('message', { content: `${player?.name || playerId} (托管) 出牌` });
    await this.processPlay(playerId, [smallestCard.id]);
  }
}

export default DoudizhuGameRoom;
