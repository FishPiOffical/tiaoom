import { Room, PlayerStatus, PlayerRole, RoomPlayer } from "tiaoom";
import { GameRoom, IGameCommand } from "./index";
import { setPoints, updatePlayerStats } from "@/utils";
import { RecordRepo } from "@/entities";

export const name = "斗地主";
export const minSize = 3;
export const maxSize = 3;
export const description = "经典三人斗地主，抢地主、出牌、先出完者获胜";
export const points = {
  '我就玩玩': 1,
  '小赌怡情': 100,
  '大赢家': 1000,
}
export const rewardDescription = `
**积分规则：**
- 底分：创建房间时选择的积分档位
- 倍率计算：基础倍率 × 2^炸弹数
  - 叫地主：基础倍率 1 倍
  - 抢地主：基础倍率 2 倍
  - 反抢地主：基础倍率 4 倍
  - 每出一个炸弹/王炸，倍率翻倍

**结算方式：**
- 地主获胜：地主 +2×底分×倍率，农民各 -底分×倍率
- 农民获胜：地主 -2×底分×倍率，农民各 +底分×倍率
`

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
  phase: 'calling' | 'grabbing' | 'counter-grabbing' | 'playing' | 'ended'; // 游戏阶段
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
  baseMultiplier: number; // 基础倍率（叫地主=1，抢地主=2，反抢=4）
  hosted?: { [playerId: string]: boolean }; // 托管状态
}

// ============ 工具函数 ============

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

// 牌型名称映射
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

// ============ 游戏房间类 ============

class DoudizhuGameRoom extends GameRoom {
  // 游戏状态
  gameState: DoudizhuGameState | null = null;

  // 倒计时配置
  private readonly TURN_TIMEOUT = 30000; // 30秒出牌倒计时
  private readonly BID_TIMEOUT = 15000;  // 15秒叫地主倒计时
  private readonly HOSTED_TIMEOUT = 5000; // 5秒托管倒计时

  // 倒计时广播间隔ID
  private timerInterval: NodeJS.Timeout | null = null;
  // 计时器代数（防止旧回调执行）
  private timerGeneration = 0;

  // 忽略保存的属性
  saveIgnoreProps = ['timerInterval', 'timerGeneration'];

  // 允许观众使用的指令
  publicCommands = ['say', 'status', 'game:state', 'achievements'];

  constructor(room: Room) {
    super(room);
  }

  /**
   * 初始化游戏房间
   */
  init() {
    // 注册倒计时恢复回调（用于服务器重启后恢复）
    this.restoreTimer({
      turn: () => {
        if (this.gameState?.phase === 'playing') {
          this.handlePlayTimeout();
        } else if (['calling', 'grabbing', 'counter-grabbing'].includes(this.gameState?.phase || '')) {
          this.handleBidTimeout();
        }
      },
    });

    return super.init()
      .on('player-offline', async (player) => {
        // 玩家离线，启动托管
        await this.startHosting(player.id);
      })
      .on('join', (player) => {
        const playerSocket = this.room.players.find(p => p.id === player.id);
        if (!playerSocket) return;

        // 发送当前状态给新加入的玩家
        playerSocket.emit('command', { type: 'achievements', data: this.achievements });
        playerSocket.emit('command', { type: 'message_history', data: this.messageHistory });

        if (this.gameState) {
          playerSocket.emit('command', { type: 'game:state', data: this.gameState });
          playerSocket.emit('command', {
            type: 'status',
            data: {
              status: this.gameState.phase === 'ended' ? 'ended' : 'playing',
              messageHistory: this.messageHistory
            }
          });

          // 如果玩家重连并且之前被托管，则取消托管
          if (this.gameState.hosted && this.gameState.hosted[player.id]) {
            this.stopHosting(player.id);
          }
        }
      })
      .on('leave', async (player) => {
        if (this.gameState && this.gameState.phase !== 'ended' && player.role === PlayerRole.player) {
          // 玩家中途离开，判负
          this.room.validPlayers.forEach(p => {
            if (p.role !== PlayerRole.player) return;
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
          this.command('achievements', this.achievements);
        }
      });
  }

  /**
   * 游戏开始
   */
  onStart() {
    // 如果没有游戏状态，或者游戏已结束，则可以开始新游戏
    if ((!this.gameState || this.gameState.phase === 'ended') && this.room.validPlayers.length >= 3) {
      this.startGame();
    }
  }

  /**
   * 处理游戏指令
   */
  onCommand(message: IGameCommand) {
    super.onCommand(message);

    const sender = message.sender as RoomPlayer;
    const commandType = message.type;

    switch (commandType) {
      case 'doudizhu:bid': {
        if (!this.gameState || !['calling', 'grabbing', 'counter-grabbing'].includes(this.gameState.phase)) return;
        if (this.gameState.currentBidder !== sender.id) return;

        // 抢地主阶段，原叫地主者不能操作
        if (this.gameState.phase === 'grabbing' && sender.id === this.gameState.caller) {
          this.commandTo('doudizhu:invalid', { message: '你已经叫过地主，不能抢地主' }, sender);
          return;
        }
        // 反抢阶段，只有原叫地主者可以操作
        if (this.gameState.phase === 'counter-grabbing' && sender.id !== this.gameState.caller) {
          this.commandTo('doudizhu:invalid', { message: '只有原叫地主者可以反抢' }, sender);
          return;
        }

        this.clearTurnTimer();
        this.processBid(sender.id, message.data?.bid === true);
        break;
      }

      case 'doudizhu:play': {
        if (!this.gameState || this.gameState.phase !== 'playing') return;
        if (this.gameState.currentPlayer !== sender.id) return;
        this.clearTurnTimer();
        this.processPlay(sender.id, message.data?.cardIds || []);
        break;
      }

      case 'doudizhu:pass': {
        if (!this.gameState || this.gameState.phase !== 'playing') return;
        if (this.gameState.currentPlayer !== sender.id) return;
        // 不能在必须出牌时pass
        if (!this.gameState.lastPlayer || this.gameState.lastPlayer === sender.id) {
          this.commandTo('doudizhu:invalid', { message: '你必须出牌' }, sender);
          return;
        }
        this.clearTurnTimer();
        this.processPass(sender.id);
        break;
      }

      case 'game:state': {
        if (this.gameState) {
          this.commandTo('game:state', this.gameState, sender);
        }
        break;
      }

      case 'achievements': {
        this.commandTo('achievements', this.achievements, sender);
        break;
      }
    }
  }

  /**
   * 获取游戏状态（用于 status 命令）
   */
  getStatus(sender: any): any {
    const baseStatus = super.getStatus(sender);
    const roomStatus = this.gameState
      ? (this.gameState.phase === 'ended' ? 'ended' : 'playing')
      : 'waiting';

    return {
      ...baseStatus,
      status: roomStatus,
      gameState: this.gameState,
    };
  }

  /**
   * 获取游戏数据（用于游戏记录保存）
   */
  getData() {
    return {
      players: this.room.validPlayers.map(p => ({
        username: p.attributes?.username,
        name: p.name,
        role: p.id === this.gameState?.landlord ? 'landlord' : 'farmer',
      })),
      landlord: this.gameState?.landlord,
      bombCount: this.gameState?.bombCount,
      winner: this.gameState?.winner,
      winnerRole: this.gameState?.winnerRole,
    };
  }

  // ============ 托管系统 ============

  /**
   * 检查玩家是否被托管
   */
  private isHosted(playerId: string): boolean {
    return !!(this.gameState && this.gameState.hosted && this.gameState.hosted[playerId]);
  }

  /**
   * 启动托管
   */
  private async startHosting(playerId: string) {
    if (!this.gameState || this.gameState.phase === 'ended') return;

    this.gameState.hosted = this.gameState.hosted || {};
    if (this.gameState.hosted[playerId]) return; // 已托管

    this.gameState.hosted[playerId] = true;
    const player = this.room.players.find(p => p.id === playerId);
    this.say(`${player?.name || playerId} 离线，进入托管`);
    this.save();
    this.broadcastState();

    // 如果当前正在该玩家回合，缩短倒计时
    const isCurrentTurn =
      (['calling', 'grabbing', 'counter-grabbing'].includes(this.gameState.phase) && this.gameState.currentBidder === playerId) ||
      (this.gameState.phase === 'playing' && this.gameState.currentPlayer === playerId);

    if (isCurrentTurn) {
      this.clearTurnTimer();
      if (['calling', 'grabbing', 'counter-grabbing'].includes(this.gameState.phase)) {
        this.startTurnTimer(this.HOSTED_TIMEOUT, () => this.handleBidTimeout());
      } else {
        this.startTurnTimer(this.HOSTED_TIMEOUT, () => this.handlePlayTimeout());
      }
    }
  }

  /**
   * 停止托管（玩家重连）
   */
  private stopHosting(playerId: string) {
    if (!this.gameState || !this.gameState.hosted) return;
    if (!this.gameState.hosted[playerId]) return;

    delete this.gameState.hosted[playerId];
    const player = this.room.players.find(p => p.id === playerId);
    this.say(`${player?.name || playerId} 已重连，取消托管`);
    this.save();
    this.broadcastState();
  }

  /**
   * 托管自动叫/抢/反抢地主（不叫/不抢/不反抢）
   */
  private hostBid(playerId: string) {
    if (!this.gameState || !['calling', 'grabbing', 'counter-grabbing'].includes(this.gameState.phase)) return;

    const player = this.room.players.find(p => p.id === playerId);
    const actionName = this.gameState.phase === 'calling' ? '不叫' :
                       (this.gameState.phase === 'grabbing' ? '不抢' : '不反抢');
    this.say(`${player?.name || playerId} (托管) ${actionName}`);
    this.processBid(playerId, false);
  }

  /**
   * 托管自动出牌
   */
  private hostPlayTurn(playerId: string) {
    if (!this.gameState || this.gameState.phase !== 'playing') return;

    const hand = this.gameState.players[playerId];
    if (!hand || hand.length === 0) return;

    const player = this.room.players.find(p => p.id === playerId);

    // 如果可以 pass（上家有人出牌且不是自己）
    if (this.gameState.lastPlayer && this.gameState.lastPlayer !== playerId) {
      this.say(`${player?.name || playerId} (托管) 不出`);
      this.processPass(playerId);
      return;
    }

    // 必须出牌，出最小的单张
    const smallestCard = hand[hand.length - 1];
    this.say(`${player?.name || playerId} (托管) 出牌`);
    this.processPlay(playerId, [smallestCard.id]);
  }

  // ============ 游戏核心逻辑 ============

  /**
   * 开始游戏
   */
  private startGame() {
    this.clearTurnTimer();

    const deck = shuffleDeck(createDeck());

    // 获取所有已准备的玩家，只取前3个参与游戏
    const readyPlayers = this.room.validPlayers.filter(p => p.isReady);
    const gamePlayers = readyPlayers.slice(0, 3);
    const playerIds = gamePlayers.map(p => p.id);

    if (playerIds.length !== 3) {
      this.say('斗地主需要3名玩家！');
      return;
    }

    // 将未参与游戏的玩家设为围观者
    this.room.players.forEach(player => {
      if (player.role === PlayerRole.player && !playerIds.includes(player.id)) {
        player.role = PlayerRole.watcher;
        player.isReady = false;
        this.say(`${player.name} 成为围观者`);
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
      phase: 'calling',
      currentBidder: playerIds[0],
      calledPlayers: [],
      grabbedPlayers: [],
      caller: null,
      lastGrabber: null,
      winner: null,
      winnerRole: null,
      bombCount: 0,
      baseMultiplier: 1
    };

    // 只设置参与游戏的玩家状态为playing
    this.room.players.forEach(player => {
      if (player.role === PlayerRole.player && playerIds.includes(player.id)) {
        player.status = PlayerStatus.playing;
      }
    });

    this.save();
    this.broadcastState();
    this.command('achievements', this.achievements);

    const firstBidder = this.room.players.find(p => p.id === playerIds[0]);
    this.say(`游戏开始！请 ${firstBidder?.name} 选择是否叫地主`);

    // 开始叫地主倒计时
    this.startTurnTimer(this.BID_TIMEOUT, () => this.handleBidTimeout());
  }

  /**
   * 广播游戏状态
   */
  private broadcastState() {
    if (this.gameState) {
      this.command('game:state', this.gameState);
    }
  }

  /**
   * 获取下一个玩家
   */
  private getNextPlayer(currentId: string): string {
    if (!this.gameState) return currentId;
    const playerIds = Object.keys(this.gameState.players);
    const currentIndex = playerIds.indexOf(currentId);
    return playerIds[(currentIndex + 1) % playerIds.length];
  }

  /**
   * 获取抢地主阶段的下一个玩家（跳过原叫地主者）
   */
  private getNextGrabber(currentId: string): string | null {
    if (!this.gameState || !this.gameState.caller) return null;

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

  // ============ 倒计时系统 ============

  /**
   * 清除倒计时
   */
  private clearTurnTimer() {
    this.stopTimer('turn');
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * 启动倒计时（带广播）
   */
  private startTurnTimer(timeoutMs: number, onTimeout: () => void) {
    this.clearTurnTimer();
    this.timerGeneration++;
    const currentGeneration = this.timerGeneration;

    if (this.gameState) {
      this.gameState.turnStartTime = Date.now();
      this.gameState.turnTimeout = timeoutMs;
      this.gameState.turnTimeLeft = Math.ceil(timeoutMs / 1000);

      // 广播初始倒计时
      this.command('timer:update', { timeLeft: this.gameState.turnTimeLeft });
    }

    // 每秒更新倒计时并广播
    this.timerInterval = setInterval(() => {
      if (currentGeneration !== this.timerGeneration) return;
      if (this.gameState && this.gameState.turnTimeLeft !== undefined && this.gameState.turnTimeLeft > 0) {
        this.gameState.turnTimeLeft--;
        this.command('timer:update', { timeLeft: this.gameState.turnTimeLeft });
      }
    }, 1000);

    // 使用基类的计时器
    this.startTimer(() => {
      if (currentGeneration !== this.timerGeneration) return;
      this.clearTurnTimer();
      onTimeout();
    }, timeoutMs, 'turn');
  }

  // ============ 叫地主/抢地主逻辑 ============

  /**
   * 处理叫地主超时
   */
  private handleBidTimeout() {
    if (!this.gameState || !['calling', 'grabbing', 'counter-grabbing'].includes(this.gameState.phase) || !this.gameState.currentBidder) return;

    const currentBidder = this.gameState.currentBidder;

    // 如果玩家被托管，使用托管逻辑
    if (this.isHosted(currentBidder)) {
      this.hostBid(currentBidder);
      return;
    }

    // 普通超时处理
    const player = this.room.players.find(p => p.id === currentBidder);
    const actionName = this.gameState.phase === 'calling' ? '不叫' :
                       (this.gameState.phase === 'grabbing' ? '不抢' : '不反抢');
    this.say(`${player?.name} 超时，自动${actionName}`);
    this.processBid(currentBidder, false);
  }

  /**
   * 处理叫/抢/反抢地主
   */
  private processBid(playerId: string, bid: boolean) {
    if (!this.gameState || !['calling', 'grabbing', 'counter-grabbing'].includes(this.gameState.phase)) return;

    const player = this.room.players.find(p => p.id === playerId);

    // ===== 叫地主阶段 =====
    if (this.gameState.phase === 'calling') {
      this.gameState.calledPlayers.push(playerId);

      if (bid) {
        this.say(`${player?.name} 叫地主！`);
        this.gameState.caller = playerId;
        this.gameState.phase = 'grabbing';

        const nextGrabberId = this.getNextGrabber(playerId);
        if (!nextGrabberId) {
          this.finalizeLandlord(playerId);
          return;
        }

        this.gameState.currentBidder = nextGrabberId;
        this.save();
        this.broadcastState();

        const nextBidder = this.room.players.find(p => p.id === nextGrabberId);
        this.say(`请 ${nextBidder?.name} 选择是否抢地主`);

        const nextTimeout = this.isHosted(nextGrabberId) ? this.HOSTED_TIMEOUT : this.BID_TIMEOUT;
        this.startTurnTimer(nextTimeout, () => this.handleBidTimeout());
      } else {
        this.say(`${player?.name} 不叫`);

        if (this.gameState.calledPlayers.length >= 3) {
          this.say('没有人叫地主，重新发牌');
          this.startGame();
          return;
        }

        this.gameState.currentBidder = this.getNextPlayer(playerId);
        this.save();
        this.broadcastState();

        const nextBidder = this.room.players.find(p => p.id === this.gameState!.currentBidder);
        this.say(`请 ${nextBidder?.name} 选择是否叫地主`);

        const nextTimeout = this.isHosted(this.gameState.currentBidder!) ? this.HOSTED_TIMEOUT : this.BID_TIMEOUT;
        this.startTurnTimer(nextTimeout, () => this.handleBidTimeout());
      }
      return;
    }

    // ===== 抢地主阶段 =====
    if (this.gameState.phase === 'grabbing') {
      if (playerId === this.gameState.caller) return;

      this.gameState.grabbedPlayers.push(playerId);

      if (bid) {
        this.say(`${player?.name} 抢地主！`);
        this.gameState.lastGrabber = playerId;
      } else {
        this.say(`${player?.name} 不抢`);
      }

      if (this.gameState.grabbedPlayers.length >= 2) {
        if (this.gameState.lastGrabber) {
          this.gameState.phase = 'counter-grabbing';
          this.gameState.currentBidder = this.gameState.caller;
          this.save();
          this.broadcastState();

          const callerPlayer = this.room.players.find(p => p.id === this.gameState!.caller);
          this.say(`请 ${callerPlayer?.name} 选择是否反抢`);

          const nextTimeout = this.isHosted(this.gameState.caller!) ? this.HOSTED_TIMEOUT : this.BID_TIMEOUT;
          this.startTurnTimer(nextTimeout, () => this.handleBidTimeout());
        } else {
          this.finalizeLandlord(this.gameState.caller!);
        }
        return;
      }

      const nextGrabberId = this.getNextGrabber(playerId);
      if (!nextGrabberId) {
        if (this.gameState.lastGrabber) {
          this.gameState.phase = 'counter-grabbing';
          this.gameState.currentBidder = this.gameState.caller;
          this.save();
          this.broadcastState();

          const callerPlayer = this.room.players.find(p => p.id === this.gameState!.caller);
          this.say(`请 ${callerPlayer?.name} 选择是否反抢`);

          const nextTimeout = this.isHosted(this.gameState.caller!) ? this.HOSTED_TIMEOUT : this.BID_TIMEOUT;
          this.startTurnTimer(nextTimeout, () => this.handleBidTimeout());
        } else {
          this.finalizeLandlord(this.gameState.caller!);
        }
        return;
      }

      this.gameState.currentBidder = nextGrabberId;
      this.save();
      this.broadcastState();

      const nextBidder = this.room.players.find(p => p.id === nextGrabberId);
      this.say(`请 ${nextBidder?.name} 选择是否抢地主`);

      const nextTimeout = this.isHosted(nextGrabberId) ? this.HOSTED_TIMEOUT : this.BID_TIMEOUT;
      this.startTurnTimer(nextTimeout, () => this.handleBidTimeout());
      return;
    }

    // ===== 反抢地主阶段 =====
    if (this.gameState.phase === 'counter-grabbing') {
      if (playerId !== this.gameState.caller) return;

      if (bid) {
        this.say(`${player?.name} 反抢地主！`);
        this.gameState.baseMultiplier = 4; // 反抢倍率为4
        this.finalizeLandlord(this.gameState.caller!);
      } else {
        this.say(`${player?.name} 不反抢`);
        this.gameState.baseMultiplier = 2; // 被抢倍率为2
        this.finalizeLandlord(this.gameState.lastGrabber!);
      }
    }
  }

  /**
   * 确定地主
   */
  private finalizeLandlord(landlordId: string) {
    if (!this.gameState) return;

    this.clearTurnTimer();

    this.gameState.landlord = landlordId;
    this.gameState.phase = 'playing';
    this.gameState.currentPlayer = landlordId;
    this.gameState.currentBidder = null;
    this.gameState.passCount = 0;

    // 地主获得底牌
    this.gameState.players[landlordId] = sortCards([
      ...this.gameState.players[landlordId],
      ...this.gameState.landlordCards
    ]);

    const player = this.room.players.find(p => p.id === landlordId);
    const multiplierText = this.gameState.baseMultiplier > 1 ? `（${this.gameState.baseMultiplier}倍）` : '';
    this.say(`${player?.name} 成为地主！获得底牌${multiplierText}`);
    this.command('doudizhu:landlord', {
      landlord: landlordId,
      landlordCards: this.gameState.landlordCards,
      baseMultiplier: this.gameState.baseMultiplier
    });

    this.save();
    this.broadcastState();

    // 开始出牌倒计时
    const timeout = this.isHosted(landlordId) ? this.HOSTED_TIMEOUT : this.TURN_TIMEOUT;
    this.startTurnTimer(timeout, () => this.handlePlayTimeout());
  }

  // ============ 出牌逻辑 ============

  /**
   * 处理出牌超时
   */
  private handlePlayTimeout() {
    if (!this.gameState || this.gameState.phase !== 'playing') return;

    const currentPlayerId = this.gameState.currentPlayer;

    // 如果玩家被托管，使用托管逻辑
    if (this.isHosted(currentPlayerId)) {
      this.hostPlayTurn(currentPlayerId);
      return;
    }

    // 普通超时处理
    const currentPlayer = this.room.players.find(p => p.id === currentPlayerId);

    // 超时自动pass或出最小的牌
    if (this.gameState.lastPlayer && this.gameState.lastPlayer !== currentPlayerId) {
      this.say(`${currentPlayer?.name} 超时，自动不出`);
      this.processPass(currentPlayerId);
    } else {
      const hand = this.gameState.players[currentPlayerId];
      if (hand.length > 0) {
        const smallestCard = hand[hand.length - 1];
        this.say(`${currentPlayer?.name} 超时，自动出牌`);
        this.processPlay(currentPlayerId, [smallestCard.id]);
      }
    }
  }

  /**
   * 处理不出
   */
  private processPass(playerId: string) {
    if (!this.gameState || this.gameState.phase !== 'playing') return;

    this.gameState.passCount++;
    const player = this.room.players.find(p => p.id === playerId);
    this.say(`${player?.name} 不出`);

    // 如果两个人都pass了，轮到上一个出牌的人重新出
    if (this.gameState.passCount >= 2 && this.gameState.lastPlayer) {
      this.gameState.currentPlayer = this.gameState.lastPlayer;
      this.gameState.lastPlay = null;
      this.gameState.lastPlayer = null;
      this.gameState.passCount = 0;

      const nextPlayer = this.room.players.find(p => p.id === this.gameState!.currentPlayer);
      this.say(`轮到 ${nextPlayer?.name} 出牌（新一轮）`);
    } else {
      this.gameState.currentPlayer = this.getNextPlayer(playerId);
      const nextPlayer = this.room.players.find(p => p.id === this.gameState!.currentPlayer);
      this.say(`轮到 ${nextPlayer?.name} 出牌`);
    }

    this.save();
    this.broadcastState();
    const nextTimeout = this.isHosted(this.gameState.currentPlayer) ? this.HOSTED_TIMEOUT : this.TURN_TIMEOUT;
    this.startTurnTimer(nextTimeout, () => this.handlePlayTimeout());
  }

  /**
   * 处理出牌
   */
  private processPlay(playerId: string, cardIds: string[]) {
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
      if (player) this.commandTo('doudizhu:invalid', { message: '无效的牌型' }, player);
      return;
    }

    if (!canBeat(pattern, this.gameState.lastPlay)) {
      const player = this.room.players.find(p => p.id === playerId);
      if (player) this.commandTo('doudizhu:invalid', { message: '出的牌压不过上家' }, player);
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

    const cardDisplay = cards.map(c => c.display).join(' ');
    this.say(`${player?.name} 出了 ${patternNames[pattern.pattern]}: ${cardDisplay}`);

    // 检查是否获胜
    if (hand.length === 0) {
      this.handleGameOver(playerId);
      return;
    }

    // 下一个玩家
    this.gameState.currentPlayer = this.getNextPlayer(playerId);
    const nextPlayer = this.room.players.find(p => p.id === this.gameState!.currentPlayer);
    this.say(`轮到 ${nextPlayer?.name} 出牌`);

    this.save();
    this.broadcastState();
    const nextTimeout = this.isHosted(this.gameState.currentPlayer) ? this.HOSTED_TIMEOUT : this.TURN_TIMEOUT;
    this.startTurnTimer(nextTimeout, () => this.handlePlayTimeout());
  }

  /**
   * 处理游戏结束
   */
  private handleGameOver(winnerId: string) {
    if (!this.gameState) return;

    this.gameState.winner = winnerId;
    this.gameState.winnerRole = winnerId === this.gameState.landlord ? 'landlord' : 'farmer';
    this.gameState.phase = 'ended';
    this.clearTurnTimer();

    // 计算最终倍率: 基础倍率 * (2 ^ 炸弹数量)
    const finalMultiplier = this.gameState.baseMultiplier * Math.pow(2, this.gameState.bombCount);
    const isLandlordWin = winnerId === this.gameState.landlord;

    // 更新成就并保存积分
    const winners: RoomPlayer[] = [];
    const losers: RoomPlayer[] = [];

    this.room.validPlayers.forEach(p => {
      if (p.role !== PlayerRole.player) return;
      if (!this.achievements[p.name]) {
        this.achievements[p.name] = { win: 0, lost: 0, draw: 0 };
      }
      const isWinner = isLandlordWin ? (p.id === winnerId) : (p.id !== this.gameState!.landlord);
      if (isWinner) {
        this.achievements[p.name].win++;
        winners.push(p);
      } else {
        this.achievements[p.name].lost++;
        losers.push(p);
      }
    });

    // 清除托管状态
    if (this.gameState.hosted) {
      this.gameState.hosted = {};
    }

    const player = this.room.players.find(p => p.id === winnerId);
    const roleName = isLandlordWin ? '地主' : '农民';
    const multiplierInfo = finalMultiplier > 1 ? `（${finalMultiplier}倍）` : '';
    this.say(`🎉 ${player?.name} (${roleName}) 获胜！${multiplierInfo}`);

    // 斗地主积分结算（自定义逻辑，不调用基类 saveAchievements）
    this.settleDoudizhuPoints(winners, losers, isLandlordWin, finalMultiplier);

    this.save();
    this.broadcastState();
    this.command('game:over', {
      winner: winnerId,
      winnerRole: this.gameState.winnerRole,
      finalMultiplier,
      bombCount: this.gameState.bombCount,
      baseMultiplier: this.gameState.baseMultiplier
    });
    this.command('achievements', this.achievements);

    // 设置所有玩家状态为未准备
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
    this.command('status', { status: 'waiting' });

    // 结束房间状态
    this.room.end();
  }

  /**
   * 斗地主积分结算
   * 地主赢：地主获得 2 * 底分 * 倍率，两个农民各扣 底分 * 倍率
   * 农民赢：地主扣 2 * 底分 * 倍率，两个农民各获得 底分 * 倍率
   */
  private async settleDoudizhuPoints(
    winners: RoomPlayer[],
    losers: RoomPlayer[],
    isLandlordWin: boolean,
    finalMultiplier: number
  ) {
    const basePoint = this.room.attrs?.point;
    if (!basePoint || isNaN(basePoint) || basePoint <= 0) {
      // 无积分房间，只保存记录
      this.saveRecord(winners);
      return;
    }

    // 更新玩家统计数据
    this.room.validPlayers.forEach(p => {
      if (p.attributes?.username) {
        const result = winners.some(w => w.id === p.id) ? 'win' : 'loss';
        updatePlayerStats(p.attributes.username, this.room.attrs!.type, result).catch(console.error);
      }
    });

    // 计算积分（扣除10%平台抽成）
    const pointPerFarmer = Math.floor(basePoint * finalMultiplier);
    const landlordPoint = Math.floor(pointPerFarmer * 2 * 0.9); // 地主赢取的总积分（扣抽成）
    const farmerWinPoint = Math.floor(pointPerFarmer * 0.9);    // 农民赢取的积分（扣抽成）

    if (isLandlordWin) {
      // 地主获胜
      const landlord = winners[0];
      if (landlord?.attributes?.username) {
        setPoints(landlordPoint, landlord.attributes.username, `游戏房间【${this.room.name}】地主获胜（${finalMultiplier}倍）`);
      }
      losers.forEach(farmer => {
        if (farmer?.attributes?.username) {
          setPoints(-pointPerFarmer, farmer.attributes.username, `游戏房间【${this.room.name}】农民失败（${finalMultiplier}倍）`);
        }
      });
    } else {
      // 农民获胜
      const landlord = losers[0];
      if (landlord?.attributes?.username) {
        setPoints(-pointPerFarmer * 2, landlord.attributes.username, `游戏房间【${this.room.name}】地主失败（${finalMultiplier}倍）`);
      }
      winners.forEach(farmer => {
        if (farmer?.attributes?.username) {
          setPoints(farmerWinPoint, farmer.attributes.username, `游戏房间【${this.room.name}】农民获胜（${finalMultiplier}倍）`);
        }
      });
    }

    // 保存游戏记录
    this.saveRecord(winners);
  }
}

export default DoudizhuGameRoom;
