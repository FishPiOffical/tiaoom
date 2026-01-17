import { Room, PlayerStatus, PlayerRole, RoomPlayer, IRoomPlayer, RoomStatus } from "tiaoom";
import { GameRoom, IGameCommand } from "./index";

/**
 * 广东麻将
 * - 4人游戏
 * - 使用136张牌（万、筒、条各36张 + 东南西北中发白各4张）
 * - 可吃可碰可杠
 * - 推倒即胡（无番数限制）
 */

export const name = "广东麻将";
export const minSize = 4;
export const maxSize = 4;
export const description = "经典简单四人广东推倒胡麻将，可吃可碰可杠，推倒即胡";
export const points = {
  '我就玩玩': 0,
  '小赌怡情': 100,
  '大赢家': 500,
};
export const rewardDescription = `
**广东推倒胡规则：**
- 4人游戏，每人13张牌
- 可吃可碰可杠
- 推倒即胡（无需特定番种）
- 支持明杠、暗杠、补杠
-基本胡牌形式：4组面子+1对将、七对

**计分规则：**
- 自摸：其他三家各付基础分
- 点炮：放炮者支付全部
- 杠牌：明杠1分，暗杠1分，补杠1分
`;

// ============ 牌型定义 ============

// 花色类型
export type TileSuit = 'wan' | 'tong' | 'tiao' | 'feng' | 'jian';

// 单张牌
export interface MahjongTile {
  id: string;           // 唯一ID
  suit: TileSuit;       // 花色
  value: number;        // 点数（万筒条1-9，风1-4，箭1-3）
  display: string;      // 显示名称
}

// 副露类型
export type MeldType = 'chi' | 'peng' | 'gang_ming' | 'gang_an' | 'gang_bu';

// 副露（吃碰杠）
export interface Meld {
  type: MeldType;
  tiles: MahjongTile[];
  fromPlayer?: string;  // 来自谁（吃碰杠时）
}

// 玩家手牌状态
export interface PlayerHand {
  tiles: MahjongTile[];   // 手牌
  melds: Meld[];          // 副露
  discards: MahjongTile[]; // 已打出的牌
}

// 操作类型
export type ActionType = 'chi' | 'peng' | 'gang' | 'hu' | 'pass';

// 单个赢家信息
export interface WinnerInfo {
  playerId: string;
  playerName: string;
  winType: 'zimo' | 'dianpao';
  winningTile: MahjongTile | null;
}

// 可用操作
export interface AvailableAction {
  type: ActionType;
  tiles?: MahjongTile[];  // 吃牌时可选的组合
  targetTile?: MahjongTile; // 目标牌
}

// 游戏阶段
export type GamePhase =
  | 'waiting'       // 等待开始
  | 'dealing'       // 发牌中
  | 'playing'       // 游戏中（正常摸打）
  | 'action'        // 等待操作（吃碰杠胡）
  | 'ended';        // 游戏结束

// 游戏状态
export interface MahjongGameState {
  phase: GamePhase;
  wall: MahjongTile[];           // 牌墙
  players: { [playerId: string]: PlayerHand };  // 玩家手牌
  playerOrder: string[];         // 玩家顺序
  dealerIndex: number;           // 庄家索引
  currentPlayerIndex: number;    // 当前玩家索引
  lastDiscard: MahjongTile | null;  // 最后打出的牌
  lastDiscardPlayer: string | null; // 最后打牌的玩家
  pendingActions: { [playerId: string]: AvailableAction[] }; // 待选操作
  actionPriority: string[];      // 操作优先级队列
  currentAction?: { playerId: string; action: ActionType; tiles?: MahjongTile[] };
  winner: string | null;         // 胜者
  winType: 'zimo' | 'dianpao' | null;  // 胡牌类型
  winners?: WinnerInfo[];        // 多赢家信息（一炮多响）
  turnStartTime?: number;        // 回合开始时间
  turnTimeLeft?: number;         // 回合剩余时间
  drawTile?: MahjongTile | null; // 当前玩家摸的牌
  canGangAfterDraw: boolean;     // 摸牌后能否杠
  hosted?: { [playerId: string]: boolean }; // 托管状态
  finalHands?: { [playerId: string]: PlayerHand }; // 游戏结束时所有玩家的手牌
  dianpaoPlayer?: string | null; // 点炮的玩家
  winningTile?: MahjongTile | null; // 胡牌的那张牌
}

// ============ 常量定义 ============

// 万字牌
const WAN_TILES = ['一万', '二万', '三万', '四万', '五万', '六万', '七万', '八万', '九万'];
// 筒子牌
const TONG_TILES = ['一筒', '二筒', '三筒', '四筒', '五筒', '六筒', '七筒', '八筒', '九筒'];
// 条子牌
const TIAO_TILES = ['一条', '二条', '三条', '四条', '五条', '六条', '七条', '八条', '九条'];
// 风牌
const FENG_TILES = ['东', '南', '西', '北'];
// 箭牌
const JIAN_TILES = ['中', '发', '白'];

// ============ 工具函数 ============

/**
 * 创建一副麻将牌（136张）
 */
const createMahjongDeck = (): MahjongTile[] => {
  const tiles: MahjongTile[] = [];
  let id = 0;

  // 万字牌 - 每种4张
  for (let i = 0; i < 4; i++) {
    for (let v = 1; v <= 9; v++) {
      tiles.push({
        id: `wan_${v}_${i}`,
        suit: 'wan',
        value: v,
        display: WAN_TILES[v - 1],
      });
      id++;
    }
  }

  // 筒子牌
  for (let i = 0; i < 4; i++) {
    for (let v = 1; v <= 9; v++) {
      tiles.push({
        id: `tong_${v}_${i}`,
        suit: 'tong',
        value: v,
        display: TONG_TILES[v - 1],
      });
      id++;
    }
  }

  // 条子牌
  for (let i = 0; i < 4; i++) {
    for (let v = 1; v <= 9; v++) {
      tiles.push({
        id: `tiao_${v}_${i}`,
        suit: 'tiao',
        value: v,
        display: TIAO_TILES[v - 1],
      });
      id++;
    }
  }

  // 风牌
  for (let i = 0; i < 4; i++) {
    for (let v = 1; v <= 4; v++) {
      tiles.push({
        id: `feng_${v}_${i}`,
        suit: 'feng',
        value: v,
        display: FENG_TILES[v - 1],
      });
      id++;
    }
  }

  // 箭牌
  for (let i = 0; i < 4; i++) {
    for (let v = 1; v <= 3; v++) {
      tiles.push({
        id: `jian_${v}_${i}`,
        suit: 'jian',
        value: v,
        display: JIAN_TILES[v - 1],
      });
      id++;
    }
  }

  return tiles;
};

/**
 * 洗牌
 */
const shuffleTiles = (tiles: MahjongTile[]): MahjongTile[] => {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * 手牌排序
 */
const sortTiles = (tiles: MahjongTile[]): MahjongTile[] => {
  const suitOrder: Record<TileSuit, number> = { wan: 0, tong: 1, tiao: 2, feng: 3, jian: 4 };
  return [...tiles].sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.value - b.value;
  });
};

/**
 * 检查是否可以吃牌
 * @param hand 手牌
 * @param tile 目标牌
 * @returns 可以吃的组合列表
 */
const checkCanChi = (hand: MahjongTile[], tile: MahjongTile): MahjongTile[][] => {
  // 风牌和箭牌不能吃
  if (tile.suit === 'feng' || tile.suit === 'jian') return [];

  const results: MahjongTile[][] = [];
  const sameSuit = hand.filter(t => t.suit === tile.suit);
  const value = tile.value;

  // 检查 tile-2, tile-1, tile 的组合
  if (value >= 3) {
    const t1 = sameSuit.find(t => t.value === value - 2);
    const t2 = sameSuit.find(t => t.value === value - 1 && t.id !== t1?.id);
    if (t1 && t2) results.push([t1, t2]);
  }

  // 检查 tile-1, tile, tile+1 的组合
  if (value >= 2 && value <= 8) {
    const t1 = sameSuit.find(t => t.value === value - 1);
    const t2 = sameSuit.find(t => t.value === value + 1 && t.id !== t1?.id);
    if (t1 && t2) results.push([t1, t2]);
  }

  // 检查 tile, tile+1, tile+2 的组合
  if (value <= 7) {
    const t1 = sameSuit.find(t => t.value === value + 1);
    const t2 = sameSuit.find(t => t.value === value + 2 && t.id !== t1?.id);
    if (t1 && t2) results.push([t1, t2]);
  }

  return results;
};

/**
 * 检查是否可以碰牌
 */
const checkCanPeng = (hand: MahjongTile[], tile: MahjongTile): boolean => {
  const count = hand.filter(t => t.suit === tile.suit && t.value === tile.value).length;
  return count >= 2;
};

/**
 * 检查是否可以明杠（别人打出的牌）
 */
const checkCanGangMing = (hand: MahjongTile[], tile: MahjongTile): boolean => {
  const count = hand.filter(t => t.suit === tile.suit && t.value === tile.value).length;
  return count >= 3;
};

/**
 * 检查是否可以暗杠（自己摸的牌）
 */
const checkCanGangAn = (hand: MahjongTile[]): MahjongTile[][] => {
  const results: MahjongTile[][] = [];
  const tileCount: Record<string, MahjongTile[]> = {};

  hand.forEach(t => {
    const key = `${t.suit}_${t.value}`;
    if (!tileCount[key]) tileCount[key] = [];
    tileCount[key].push(t);
  });

  for (const key in tileCount) {
    if (tileCount[key].length >= 4) {
      results.push(tileCount[key].slice(0, 4));
    }
  }

  return results;
};

/**
 * 检查是否可以补杠（已碰的牌再摸到第四张）
 */
const checkCanGangBu = (hand: MahjongTile[], melds: Meld[]): MahjongTile[][] => {
  const results: MahjongTile[][] = [];

  melds.forEach(meld => {
    if (meld.type === 'peng') {
      const tile = meld.tiles[0];
      const matchingTile = hand.find(t => t.suit === tile.suit && t.value === tile.value);
      if (matchingTile) {
        results.push([...meld.tiles, matchingTile]);
      }
    }
  });

  return results;
};

/**
 * 胡牌判断 - 推倒胡（基本胡牌形式：4组面子+1对将）
 * @param tiles 手牌（不含副露）
 * @param melds 副露数量
 * @returns 是否胡牌
 */
const checkCanHu = (tiles: MahjongTile[], meldCount: number): boolean => {
  // 需要的面子数 = 4 - 已有副露数
  const needMelds = 4 - meldCount;

  // 按花色和点数统计
  const tileCount: Record<string, number> = {};
  tiles.forEach(t => {
    const key = `${t.suit}_${t.value}`;
    tileCount[key] = (tileCount[key] || 0) + 1;
  });

  // 检查所有可能的将牌
  const keys = Object.keys(tileCount);
  for (const key of keys) {
    if (tileCount[key] >= 2) {
      const tempCount = { ...tileCount };
      tempCount[key] -= 2;
      if (canFormMelds(tempCount, needMelds)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * 递归检查是否能组成指定数量的面子
 */
const canFormMelds = (tileCount: Record<string, number>, needMelds: number): boolean => {
  // 清理空的键
  const cleanCount: Record<string, number> = {};
  for (const key in tileCount) {
    if (tileCount[key] > 0) {
      cleanCount[key] = tileCount[key];
    }
  }

  // 如果没有剩余牌，检查是否满足面子数要求
  const remaining = Object.values(cleanCount).reduce((a, b) => a + b, 0);
  if (remaining === 0) return needMelds === 0;
  if (remaining < needMelds * 3) return false;

  // 找到第一个非空的牌
  const keys = Object.keys(cleanCount).sort();
  if (keys.length === 0) return needMelds === 0;

  const firstKey = keys[0];
  const [suit, valueStr] = firstKey.split('_');
  const value = parseInt(valueStr);

  // 尝试组成刻子（3张相同）
  if (cleanCount[firstKey] >= 3) {
    const newCount = { ...cleanCount };
    newCount[firstKey] -= 3;
    if (canFormMelds(newCount, needMelds - 1)) return true;
  }

  // 尝试组成顺子（仅限万筒条）
  if (suit === 'wan' || suit === 'tong' || suit === 'tiao') {
    if (value <= 7) {
      const key2 = `${suit}_${value + 1}`;
      const key3 = `${suit}_${value + 2}`;
      if (cleanCount[firstKey] >= 1 && (cleanCount[key2] || 0) >= 1 && (cleanCount[key3] || 0) >= 1) {
        const newCount = { ...cleanCount };
        newCount[firstKey] -= 1;
        newCount[key2] = (newCount[key2] || 0) - 1;
        newCount[key3] = (newCount[key3] || 0) - 1;
        if (canFormMelds(newCount, needMelds - 1)) return true;
      }
    }
  }

  return false;
};

/**
 * 检查七对子
 */
const checkQiDui = (tiles: MahjongTile[]): boolean => {
  if (tiles.length !== 14) return false;

  const tileCount: Record<string, number> = {};
  tiles.forEach(t => {
    const key = `${t.suit}_${t.value}`;
    tileCount[key] = (tileCount[key] || 0) + 1;
  });

  return Object.values(tileCount).every(count => count === 2 || count === 4);
};

/**
 * 综合胡牌检查
 */
const isWinningHand = (hand: PlayerHand, newTile?: MahjongTile): boolean => {
  let tiles = [...hand.tiles];
  if (newTile) tiles.push(newTile);
  tiles = sortTiles(tiles);

  // 检查基本胡牌
  if (checkCanHu(tiles, hand.melds.length)) return true;

  // 检查七对子（只有在没有副露的情况下）
  if (hand.melds.length === 0 && checkQiDui(tiles)) return true;

  return false;
};

// ============ 游戏房间类 ============

class MahjongGameRoom extends GameRoom {
  gameState: MahjongGameState | null = null;

  // 座位顺序（前4位是玩家，后面是观战）
  seatOrder: string[] = [];

  private readonly TURN_TIMEOUT = 30000;      // 30秒出牌倒计时
  private readonly ACTION_TIMEOUT = 15000;    // 15秒操作倒计时
  private readonly HOSTED_TIMEOUT = 3000;     // 3秒托管倒计时

  private timerInterval: NodeJS.Timeout | null = null;
  private timerGeneration = 0;

  saveIgnoreProps = ['timerInterval', 'timerGeneration'];
  publicCommands = ['say', 'status', 'game:state', 'achievements', 'mahjong:kick'];

  constructor(room: Room) {
    super(room);
  }

  /**
   * 初始化游戏房间
   */
  init() {
    this.restoreTimer({
      turn: () => this.handleTimeout(),
    });

    return super.init()
      .on('player-offline', async (player) => {
        await this.startHosting(player.id);
      })
      .on('join', (player) => {
        const playerSocket = this.room.players.find(p => p.id === player.id);
        if (!playerSocket) return;

        playerSocket.emit('command', { type: 'achievements', data: this.achievements });
        playerSocket.emit('command', { type: 'message_history', data: this.messageHistory });

        if (this.gameState) {
          this.sendGameStateToPlayer(playerSocket);
          if (this.gameState.hosted && this.gameState.hosted[player.id]) {
            this.stopHosting(player.id);
          }
        }
      })
      .on('leave', async (player) => {
        if (this.gameState && this.gameState.phase !== 'ended' && player.role === PlayerRole.player) {
          this.handlePlayerLeave(player);
        }
      });
  }

  /**
   * 游戏开始
   */
  onStart() {
    if ((!this.gameState || this.gameState.phase === 'ended') && this.room.validPlayers.length >= 4) {
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
      case 'mahjong:discard':
        this.handleDiscard(sender.id, message.data?.tileId);
        break;

      case 'mahjong:action':
        this.handleAction(sender.id, message.data?.action, message.data?.tiles);
        break;

      case 'mahjong:pass':
        this.handlePass(sender.id);
        break;

      case 'game:state':
        this.sendGameStateToPlayer(sender);
        break;

      case 'achievements':
        this.commandTo('achievements', this.achievements, sender);
        break;
    }
  }

  /**
   * 获取游戏状态
   */
  getStatus(sender: any): any {
    const baseStatus = super.getStatus(sender);
    let roomStatus = 'waiting';
    let endReason = null;

    if (this.gameState) {
      if (this.gameState.phase === 'ended') {
        roomStatus = 'ended';
        
        // 区分结束原因
        if (this.gameState.winners && this.gameState.winners.length > 1) {
          // 一炮多响
          endReason = 'multi_win';
        } else if (this.gameState.winners && this.gameState.winners.length === 1) {
          // 单一赢家（普通胡牌）
          endReason = 'single_win';
        } else if (this.gameState.winner) {
          // 单一赢家（普通胡牌）
          endReason = 'single_win';
        } else {
          // 流局
          endReason = 'liuju';
        }
      } else {
        roomStatus = 'playing';
      }
    }

    return {
      ...baseStatus,
      status: roomStatus,
      endReason, // 添加结束原因标识
    };
  }

  /**
   * 获取游戏数据
   */
  getData() {
    return {
      players: this.room.validPlayers.map(p => ({
        username: p.attributes?.username,
        name: p.name,
      })),
      winner: this.gameState?.winner,
      winType: this.gameState?.winType,
    };
  }

  // ============ 托管系统 ============

  private isHosted(playerId: string): boolean {
    return !!(this.gameState && this.gameState.hosted && this.gameState.hosted[playerId]);
  }

  private async startHosting(playerId: string) {
    if (!this.gameState || this.gameState.phase === 'ended') return;

    this.gameState.hosted = this.gameState.hosted || {};
    if (this.gameState.hosted[playerId]) return;

    this.gameState.hosted[playerId] = true;
    const player = this.room.players.find(p => p.id === playerId);
    this.say(`${player?.name || playerId} 离线，进入托管`);
    this.save();
    this.broadcastGameState();
  }

  private stopHosting(playerId: string) {
    if (!this.gameState || !this.gameState.hosted) return;
    if (!this.gameState.hosted[playerId]) return;

    delete this.gameState.hosted[playerId];
    const player = this.room.players.find(p => p.id === playerId);
    this.say(`${player?.name || playerId} 已重连，取消托管`);
    this.save();
    this.broadcastGameState();
  }

  // ============ 游戏核心逻辑 ============

  /**
   * 开始游戏
   */
  private startGame() {
    this.clearTurnTimer();

    // 使用 validPlayers 而不是筛选 readyPlayers，因为房间 isReady 检查已经确保所有玩家都准备好了
    // 这样可以避免围观玩家坐上座位后因 isReady 状态不一致而没有牌的问题
    const validPlayers = this.room.validPlayers;
    const gamePlayers = validPlayers.slice(0, 4);
    const playerIds = gamePlayers.map(p => p.id);

    if (playerIds.length !== 4) {
      this.say('麻将需要4名玩家！');
      return;
    }

    // 创建并洗牌
    const deck = shuffleTiles(createMahjongDeck());

    // 发牌：每人13张
    const hands: { [playerId: string]: PlayerHand } = {};
    playerIds.forEach(playerId => {
      hands[playerId] = {
        tiles: sortTiles(deck.splice(0, 13)),
        melds: [],
        discards: [],
      };
    });

    // 随机选择庄家
    const dealerIndex = Math.floor(Math.random() * 4);

    // 初始化游戏状态
    this.gameState = {
      phase: 'playing',
      wall: deck,
      players: hands,
      playerOrder: playerIds,
      dealerIndex,
      currentPlayerIndex: dealerIndex,
      lastDiscard: null,
      lastDiscardPlayer: null,
      pendingActions: {},
      actionPriority: [],
      winner: null,
      winType: null,
      drawTile: null,
      canGangAfterDraw: false,
    };

    // 设置玩家状态
    this.room.players.forEach(player => {
      if (player.role === PlayerRole.player && playerIds.includes(player.id)) {
        player.status = PlayerStatus.playing;
      }
    });

    this.save();
    this.broadcastGameState();
    this.command('achievements', this.achievements);

    const dealer = this.room.players.find(p => p.id === playerIds[dealerIndex]);
    this.say(`游戏开始！${dealer?.name} 为庄家`);

    // 庄家摸牌
    this.drawTile(playerIds[dealerIndex]);
  }

  /**
   * 广播游戏状态给所有玩家
   */
  private broadcastGameState() {
    if (!this.gameState) return;

    this.room.players.forEach(player => {
      this.sendGameStateToPlayer(player);
    });
  }

  /**
   * 发送游戏状态给指定玩家
   */
  private sendGameStateToPlayer(player: RoomPlayer) {
    if (!this.gameState) return;

    // 构建玩家可见的状态
    const visibleState: any = {
      phase: this.gameState.phase,
      wallRemaining: this.gameState.wall.length,
      playerOrder: this.gameState.playerOrder,
      dealerIndex: this.gameState.dealerIndex,
      currentPlayerIndex: this.gameState.currentPlayerIndex,
      lastDiscard: this.gameState.lastDiscard,
      lastDiscardPlayer: this.gameState.lastDiscardPlayer,
      winner: this.gameState.winner,
      winType: this.gameState.winType,
      turnTimeLeft: this.gameState.turnTimeLeft,
      hosted: this.gameState.hosted,
      dianpaoPlayer: this.gameState.dianpaoPlayer,
      winningTile: this.gameState.winningTile,
      players: {} as any,
    };

    // 游戏结束时显示额外信息
    const isGameEnded = this.gameState.phase === 'ended';
    if (isGameEnded) {
      // 添加赢家信息
      visibleState.winners = this.gameState.winners;
      // 添加结束原因
      if (this.gameState.winners && this.gameState.winners.length > 1) {
        visibleState.endReason = 'multi_win'; // 一炮多响
      } else if (this.gameState.winners && this.gameState.winners.length === 1) {
        visibleState.endReason = 'single_win'; // 单一赢家
      } else if (this.gameState.winner) {
        visibleState.endReason = 'single_win'; // 单一赢家
      } else {
        visibleState.endReason = 'liuju'; // 流局
      }
    }

    // 每个玩家的状态
    this.gameState.playerOrder.forEach(playerId => {
      const hand = this.gameState!.players[playerId];
      // 游戏结束时使用 finalHands，否则使用当前手牌
      const finalHand = isGameEnded && this.gameState!.finalHands
        ? this.gameState!.finalHands[playerId]
        : hand;

      if (playerId === player.id || isGameEnded) {
        // 自己可以看到完整手牌，或游戏结束时所有人都能看到
        visibleState.players[playerId] = {
          tiles: finalHand?.tiles || hand.tiles,
          melds: finalHand?.melds || hand.melds,
          discards: finalHand?.discards || hand.discards,
          tileCount: (finalHand?.tiles || hand.tiles).length,
        };
        // 包含摸到的牌
        if (!isGameEnded && this.gameState!.drawTile && this.gameState!.currentPlayerIndex === this.gameState!.playerOrder.indexOf(playerId)) {
          visibleState.drawTile = this.gameState!.drawTile;
        }
      } else {
        // 其他玩家只能看到副露和打出的牌
        visibleState.players[playerId] = {
          tiles: [], // 不显示手牌
          melds: hand.melds,
          discards: hand.discards,
          tileCount: hand.tiles.length,
        };
      }
    });

    // 可用操作
    if (this.gameState.pendingActions[player.id]) {
      visibleState.availableActions = this.gameState.pendingActions[player.id];
    }

    player.emit('command', { type: 'game:state', data: visibleState });
  }

  /**
   * 摸牌
   */
  private drawTile(playerId: string) {
    if (!this.gameState || this.gameState.phase !== 'playing') return;

    // 检查牌墙是否还有牌
    if (this.gameState.wall.length === 0) {
      this.handleDraw(); // 流局
      return;
    }

    const tile = this.gameState.wall.shift()!;
    const hand = this.gameState.players[playerId];

    this.gameState.drawTile = tile;
    this.gameState.lastDiscard = null;
    this.gameState.lastDiscardPlayer = null;

    // 检查自摸胡牌
    if (isWinningHand(hand, tile)) {
      this.gameState.pendingActions[playerId] = [{ type: 'hu', targetTile: tile }];
    }

    // 检查暗杠
    const anGangOptions = checkCanGangAn([...hand.tiles, tile]);
    if (anGangOptions.length > 0) {
      if (!this.gameState.pendingActions[playerId]) {
        this.gameState.pendingActions[playerId] = [];
      }
      anGangOptions.forEach(tiles => {
        this.gameState!.pendingActions[playerId].push({ type: 'gang', tiles });
      });
      this.gameState.canGangAfterDraw = true;
    }

    // 检查补杠
    const buGangOptions = checkCanGangBu([...hand.tiles, tile], hand.melds);
    if (buGangOptions.length > 0) {
      if (!this.gameState.pendingActions[playerId]) {
        this.gameState.pendingActions[playerId] = [];
      }
      buGangOptions.forEach(tiles => {
        this.gameState!.pendingActions[playerId].push({ type: 'gang', tiles });
      });
      this.gameState.canGangAfterDraw = true;
    }

    this.save();
    this.broadcastGameState();

    const player = this.room.players.find(p => p.id === playerId);
    this.say(`${player?.name} 摸牌`);

    // 开始倒计时
    const timeout = this.isHosted(playerId) ? this.HOSTED_TIMEOUT : this.TURN_TIMEOUT;
    this.startTurnTimer(timeout, () => this.handleTimeout());
  }

  /**
   * 处理打牌
   */
  private handleDiscard(playerId: string, tileId: string) {
    if (!this.gameState || this.gameState.phase !== 'playing') return;

    const currentPlayerId = this.gameState.playerOrder[this.gameState.currentPlayerIndex];
    if (playerId !== currentPlayerId) return;

    const hand = this.gameState.players[playerId];

    // 查找要打的牌（可能在手牌中或刚摸的牌）
    let tileIndex = hand.tiles.findIndex(t => t.id === tileId);
    let tile: MahjongTile | null = null;

    if (tileIndex >= 0) {
      tile = hand.tiles[tileIndex];
      hand.tiles.splice(tileIndex, 1);
    } else if (this.gameState.drawTile && this.gameState.drawTile.id === tileId) {
      tile = this.gameState.drawTile;
    } else {
      return; // 无效的牌
    }

    // 如果打的不是摸到的牌，需要把摸到的牌加入手牌
    if (this.gameState.drawTile && this.gameState.drawTile.id !== tileId) {
      hand.tiles.push(this.gameState.drawTile);
      hand.tiles = sortTiles(hand.tiles);
    }

    this.gameState.drawTile = null;
    this.gameState.canGangAfterDraw = false;
    this.gameState.lastDiscard = tile;
    this.gameState.lastDiscardPlayer = playerId;
    hand.discards.push(tile);

    // 清除当前玩家的待选操作
    delete this.gameState.pendingActions[playerId];

    this.clearTurnTimer();
    this.save();

    const player = this.room.players.find(p => p.id === playerId);
    this.say(`${player?.name} 打出 ${tile.display}`);

    // 检查其他玩家的可用操作
    this.checkOtherPlayersActions(playerId, tile);
  }

  /**
   * 检查其他玩家对打出的牌的可用操作
   */
  private checkOtherPlayersActions(discardPlayerId: string, tile: MahjongTile) {
    if (!this.gameState) return;

    const discardPlayerIndex = this.gameState.playerOrder.indexOf(discardPlayerId);
    let hasActions = false;

    this.gameState.pendingActions = {};
    this.gameState.actionPriority = [];

    // 按顺时针方向检查其他玩家（从出牌者的下家开始）
    for (let i = 1; i < 4; i++) {
      const currentIndex = (discardPlayerIndex + i) % 4;
      const playerId = this.gameState.playerOrder[currentIndex];
      
      const hand = this.gameState!.players[playerId];
      const actions: AvailableAction[] = [];

      // 检查胡
      if (isWinningHand(hand, tile)) {
        actions.push({ type: 'hu', targetTile: tile });
      }

      // 检查杠
      if (checkCanGangMing(hand.tiles, tile)) {
        actions.push({ type: 'gang', targetTile: tile });
      }

      // 检查碰
      if (checkCanPeng(hand.tiles, tile)) {
        actions.push({ type: 'peng', targetTile: tile });
      }

      // 检查吃（只有下家可以吃）
      if (i === 1) { // 只有下家可以吃
        const chiOptions = checkCanChi(hand.tiles, tile);
        chiOptions.forEach(tiles => {
          actions.push({ type: 'chi', tiles, targetTile: tile });
        });
      }

      if (actions.length > 0) {
        this.gameState!.pendingActions[playerId] = actions;
        this.gameState!.actionPriority.push(playerId);
        hasActions = true;
      }
    }

    this.broadcastGameState();

    if (hasActions) {
      // 有玩家可以操作，等待操作
      this.gameState.phase = 'action';
      const timeout = this.ACTION_TIMEOUT;
      this.startTurnTimer(timeout, () => this.handleActionTimeout());
    } else {
      // 没有人可以操作，轮到下一个玩家
      this.nextPlayer();
    }
  }

  /**
   * 处理玩家操作（吃碰杠胡）
   */
  private handleAction(playerId: string, action: ActionType, tiles?: MahjongTile[]) {
    if (!this.gameState) return;

    const pendingActions = this.gameState.pendingActions[playerId];
    if (!pendingActions || pendingActions.length === 0) return;

    // 验证操作是否有效
    const validAction = pendingActions.find(a => {
      if (a.type !== action) return false;
      if (action === 'chi' && tiles) {
        return a.tiles?.some(t => tiles.some(tt => tt.id === t.id));
      }
      return true;
    });

    if (!validAction) return;

    this.clearTurnTimer();

    // 记录当前操作
    this.gameState.currentAction = { playerId, action, tiles };

    // 检查是否需要等待其他更高优先级的操作
    const actionPriority: Record<ActionType, number> = { hu: 4, gang: 3, peng: 2, chi: 1, pass: 0 };
    const currentPriority = actionPriority[action];

    // 记录当前玩家的优先级索引（用于确定顺时针优先级）
    const currentPlayerPriorityIndex = this.gameState.actionPriority.indexOf(playerId);
    
    let shouldExecute = true;
    for (const otherId of this.gameState.actionPriority) {
      if (otherId === playerId) continue;
      
      const otherActions = this.gameState.pendingActions[otherId];
      if (otherActions) {
        // 检查是否有更高优先级的操作
        const higherPriorityAction = otherActions.find(a => actionPriority[a.type] > currentPriority);
        if (higherPriorityAction) {
          shouldExecute = false;
          break;
        }
        
        // 如果是相同优先级（如多个胡牌），则按顺时针方向决定优先级
        if (actionPriority[action] === actionPriority[otherActions[0].type]) {
          const otherPlayerPriorityIndex = this.gameState.actionPriority.indexOf(otherId);
          // 如果当前玩家在优先级队列中的位置更靠前，则执行当前操作
          if (currentPlayerPriorityIndex > otherPlayerPriorityIndex) {
            // 这里我们仍然会等待，因为我们要确保按顺时针顺序执行
            shouldExecute = false;
            break;
          }
        }
      }
    }

    // 清除当前玩家的待选操作
    delete this.gameState.pendingActions[playerId];
    this.gameState.actionPriority = this.gameState.actionPriority.filter(id => id !== playerId);

    if (shouldExecute) {
      this.executeAction(playerId, action, tiles, validAction.targetTile);
      
      // 如果是胡牌操作且是点炮，检查是否有多人同时胡牌（一炮多响）
      if (action === 'hu' && this.gameState.lastDiscardPlayer && this.gameState.lastDiscardPlayer !== playerId) {
        this.checkMultiWinners(playerId);
      }
    } else {
      this.save();
      this.broadcastGameState();
    }
  }

  /**
   * 处理玩家放弃操作
   */
  private handlePass(playerId: string) {
    if (!this.gameState) return;

    delete this.gameState.pendingActions[playerId];
    this.gameState.actionPriority = this.gameState.actionPriority.filter(id => id !== playerId);

    // 检查是否所有玩家都已操作
    if (this.gameState.actionPriority.length === 0) {
      this.clearTurnTimer();

      // 如果有待执行的操作，执行它
      if (this.gameState.currentAction) {
        const { playerId, action, tiles } = this.gameState.currentAction;
        const targetTile = this.gameState.lastDiscard;
        this.gameState.currentAction = undefined;
        this.executeAction(playerId, action, tiles, targetTile);
      } else {
        // 没有人操作，轮到下一个玩家
        this.nextPlayer();
      }
    } else {
      this.save();
      this.broadcastGameState();
    }
  }

  /**
   * 检查是否存在多个赢家（一炮多响）
   */
  private checkMultiWinners(firstWinnerId: string) {
    if (!this.gameState) return;

    // 检查还有哪些玩家可以胡这张牌
    const remainingHuPlayers: string[] = [];
    const targetTile = this.gameState.lastDiscard;
    
    for (const playerId in this.gameState.pendingActions) {
      const actions = this.gameState.pendingActions[playerId];
      const huAction = actions.find(action => action.type === 'hu');
      
      if (huAction && playerId !== firstWinnerId && targetTile) {
        const hand = this.gameState.players[playerId];
        if (isWinningHand(hand, targetTile)) {
          remainingHuPlayers.push(playerId);
        }
      }
    }

    // 如果存在多个赢家，执行一炮多响
    if (remainingHuPlayers.length > 0) {
      const discardPlayer = this.room.players.find(p => p.id === this.gameState!.lastDiscardPlayer);
      this.say(`一炮多响！${remainingHuPlayers.map(id => this.room.players.find(p => p.id === id)?.name).join('、')} 也胡牌！`);

      // 处理每个赢家
      for (const winnerId of remainingHuPlayers) {
        const winnerPlayer = this.room.players.find(p => p.id === winnerId);
        
        // 添加赢家到数组
        if (!this.gameState.winners) {
          this.gameState.winners = [];
        }
        this.gameState.winners.push({
          playerId: winnerId,
          playerName: winnerPlayer?.name || '',
          winType: 'dianpao',
          winningTile: this.gameState.lastDiscard
        });
      }

      // 一炮多响的结束处理
      this.endMultiWinGame();
    } else {
      // 没有一炮多响，正常结束游戏
      this.endGame();
    }
  }

  /**
   * 执行操作
   */
  private executeAction(playerId: string, action: ActionType, tiles?: MahjongTile[], targetTile?: MahjongTile | null) {
    if (!this.gameState) return;

    const hand = this.gameState.players[playerId];
    const player = this.room.players.find(p => p.id === playerId);

    switch (action) {
      case 'hu': {
        // 胡牌
        const isDianpao = this.gameState.lastDiscardPlayer && this.gameState.lastDiscardPlayer !== playerId;
        const huTile = isDianpao ? this.gameState.lastDiscard : this.gameState.drawTile;
        
        // 设置基础赢家信息
        this.gameState.winner = playerId;
        this.gameState.winType = isDianpao ? 'dianpao' : 'zimo';
        this.gameState.winningTile = huTile || null;
        
        // 如果是第一次胡牌，初始化赢家数组
        if (!this.gameState.winners) {
          this.gameState.winners = [];
        }
        
        // 添加当前赢家
        this.gameState.winners.push({
          playerId,
          playerName: player?.name || '',
          winType: isDianpao ? 'dianpao' : 'zimo',
          winningTile: huTile || null
        });

        if (isDianpao) {
          // 点炮胡
          const loser = this.room.players.find(p => p.id === this.gameState!.lastDiscardPlayer);
          this.say(`${player?.name} 胡牌！${loser?.name} 点炮 ${this.gameState.lastDiscard?.display || ''}`);
          // 记录点炮玩家
          this.gameState.dianpaoPlayer = this.gameState.lastDiscardPlayer;
          // 点炮情况下，不会立即结束游戏，而是让 checkMultiWinners 检查一炮多响
          return;
        } else {
          // 自摸胡
          this.say(`${player?.name} 自摸 ${this.gameState.drawTile?.display || ''} 胡牌！`);
          // 自摸则直接结束游戏
          this.endGame();
          return;
        }
      }

      case 'gang': {
        // 杠牌
        let gangType: MeldType;
        let gangTiles: MahjongTile[];

        if (targetTile && this.gameState.lastDiscardPlayer !== playerId) {
          // 明杠
          gangType = 'gang_ming';
          const sameTiles = hand.tiles.filter(t => t.suit === targetTile.suit && t.value === targetTile.value);
          
          // 验证手牌中确实有足够的3张相同的牌
          if (sameTiles.length < 3) {
            this.say(`明杠失败：手牌中没有足够的 ${targetTile.display}`);
            return;
          }
          
          gangTiles = [...sameTiles.slice(0, 3), targetTile];
          // 从手牌移除
          sameTiles.slice(0, 3).forEach(t => {
            const idx = hand.tiles.findIndex(ht => ht.id === t.id);
            if (idx >= 0) hand.tiles.splice(idx, 1);
          });
          this.say(`${player?.name} 明杠 ${targetTile.display}`);
        } else if (tiles && tiles.length === 4) {
          // 检查是暗杠还是补杠
          const existingPeng = hand.melds.find(m =>
            m.type === 'peng' &&
            m.tiles[0].suit === tiles[0].suit &&
            m.tiles[0].value === tiles[0].value
          );

          if (existingPeng) {
            // 补杠
            gangType = 'gang_bu';
            gangTiles = tiles;
            // 移除碰的副露
            const pengIndex = hand.melds.indexOf(existingPeng);
            hand.melds.splice(pengIndex, 1);
            // 从手牌移除第四张
            const fourthTile = tiles.find(t => !existingPeng.tiles.some(pt => pt.id === t.id));
            if (fourthTile) {
              const idx = hand.tiles.findIndex(ht => ht.id === fourthTile.id);
              if (idx >= 0) hand.tiles.splice(idx, 1);
              // 检查摸的牌
              if (this.gameState.drawTile?.id === fourthTile.id) {
                this.gameState.drawTile = null;
              }
            }
            this.say(`${player?.name} 补杠 ${tiles[0].display}`);
          } else {
            // 暗杠
            gangType = 'gang_an';
            gangTiles = tiles;
            // 从手牌移除
            tiles.forEach(t => {
              let idx = hand.tiles.findIndex(ht => ht.id === t.id);
              if (idx >= 0) {
                hand.tiles.splice(idx, 1);
              } else if (this.gameState!.drawTile?.id === t.id) {
                this.gameState!.drawTile = null;
              }
            });
            this.say(`${player?.name} 暗杠 ${tiles[0].display}`);
          }
        } else {
          return;
        }

        hand.melds.push({
          type: gangType,
          tiles: gangTiles,
          fromPlayer: this.gameState.lastDiscardPlayer || undefined,
        });

        // 杠后摸牌
        this.gameState.phase = 'playing';
        this.gameState.currentPlayerIndex = this.gameState.playerOrder.indexOf(playerId);
        this.gameState.pendingActions = {};
        this.gameState.actionPriority = [];
        this.save();
        this.broadcastGameState();
        this.drawTile(playerId);
        return;
      }

      case 'peng': {
        // 碰牌
        if (!targetTile) return;
        const sameTiles = hand.tiles.filter(t => t.suit === targetTile.suit && t.value === targetTile.value).slice(0, 2);

        // 验证手牌中确实有足够的2张相同的牌
        if (sameTiles.length < 2) {
          this.say(`碰牌失败：手牌中没有足够的 ${targetTile.display}`);
          return;
        }

        hand.melds.push({
          type: 'peng',
          tiles: [...sameTiles, targetTile],
          fromPlayer: this.gameState.lastDiscardPlayer || undefined,
        });

        // 从手牌移除
        sameTiles.forEach(t => {
          const idx = hand.tiles.findIndex(ht => ht.id === t.id);
          if (idx >= 0) hand.tiles.splice(idx, 1);
        });

        this.say(`${player?.name} 碰 ${targetTile.display}`);

        // 碰牌后轮到该玩家打牌
        this.gameState.phase = 'playing';
        this.gameState.currentPlayerIndex = this.gameState.playerOrder.indexOf(playerId);
        this.gameState.lastDiscard = null;
        this.gameState.lastDiscardPlayer = null;
        this.gameState.pendingActions = {};
        this.gameState.actionPriority = [];
        this.gameState.drawTile = null;

        this.save();
        this.broadcastGameState();

        const timeout = this.isHosted(playerId) ? this.HOSTED_TIMEOUT : this.TURN_TIMEOUT;
        this.startTurnTimer(timeout, () => this.handleTimeout());
        return;
      }

      case 'chi': {
        // 吃牌
        if (!targetTile || !tiles || tiles.length !== 2) return;

        const chiTiles = tiles.map(t => {
          const found = hand.tiles.find(ht => ht.id === t.id);
          return found!;
        }).filter(Boolean);

        if (chiTiles.length !== 2) return;

        hand.melds.push({
          type: 'chi',
          tiles: [...chiTiles, targetTile].sort((a, b) => a.value - b.value),
          fromPlayer: this.gameState.lastDiscardPlayer || undefined,
        });

        // 从手牌移除
        chiTiles.forEach(t => {
          const idx = hand.tiles.findIndex(ht => ht.id === t.id);
          if (idx >= 0) hand.tiles.splice(idx, 1);
        });

        this.say(`${player?.name} 吃 ${targetTile.display}`);

        // 吃牌后轮到该玩家打牌
        this.gameState.phase = 'playing';
        this.gameState.currentPlayerIndex = this.gameState.playerOrder.indexOf(playerId);
        this.gameState.lastDiscard = null;
        this.gameState.lastDiscardPlayer = null;
        this.gameState.pendingActions = {};
        this.gameState.actionPriority = [];
        this.gameState.drawTile = null;

        this.save();
        this.broadcastGameState();

        const timeout = this.isHosted(playerId) ? this.HOSTED_TIMEOUT : this.TURN_TIMEOUT;
        this.startTurnTimer(timeout, () => this.handleTimeout());
        return;
      }
    }
  }

  /**
   * 下一个玩家
   */
  private nextPlayer() {
    if (!this.gameState) return;

    this.gameState.phase = 'playing';
    this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % 4;
    this.gameState.pendingActions = {};
    this.gameState.actionPriority = [];
    this.gameState.currentAction = undefined;

    const playerId = this.gameState.playerOrder[this.gameState.currentPlayerIndex];
    this.save();
    this.broadcastGameState();
    this.drawTile(playerId);
  }

  /**
   * 处理超时
   */
  private handleTimeout() {
    if (!this.gameState) return;

    const currentPlayerId = this.gameState.playerOrder[this.gameState.currentPlayerIndex];

    if (this.gameState.phase === 'playing') {
      // 自动打牌（打最后一张或摸到的牌）
      const hand = this.gameState.players[currentPlayerId];
      const tileToDiscard = this.gameState.drawTile || hand.tiles[hand.tiles.length - 1];
      if (tileToDiscard) {
        const player = this.room.players.find(p => p.id === currentPlayerId);
        this.say(`${player?.name} 超时，自动打牌`);
        this.handleDiscard(currentPlayerId, tileToDiscard.id);
      }
    } else if (this.gameState.phase === 'action') {
      this.handleActionTimeout();
    }
  }

  /**
   * 处理操作超时
   */
  private handleActionTimeout() {
    if (!this.gameState) return;

    // 所有未操作的玩家自动放弃
    const pendingPlayers = [...this.gameState.actionPriority];
    pendingPlayers.forEach(playerId => {
      this.handlePass(playerId);
    });
  }

  /**
   * 处理流局
   */
  private handleDraw() {
    if (!this.gameState) return;

    this.say('牌墙已空，流局！');

    // 保存所有玩家的最终手牌
    this.gameState.finalHands = {};
    this.gameState.playerOrder.forEach(playerId => {
      this.gameState!.finalHands![playerId] = {
        tiles: [...this.gameState!.players[playerId].tiles],
        melds: [...this.gameState!.players[playerId].melds],
        discards: [...this.gameState!.players[playerId].discards],
      };
    });

    this.gameState.phase = 'ended';
    this.gameState.winner = null;
    this.gameState.winType = null;
    this.gameState.dianpaoPlayer = null;

    this.saveAchievements(null);
    this.clearTurnTimer();

    // 重置所有玩家的准备状态
    this.room.players.forEach(player => {
      if (player.role === PlayerRole.player) {
        player.isReady = false;
        player.status = PlayerStatus.online;
      }
    });
    this.save();
    this.room.end();
    this.broadcastGameState();
  }

  /**
   * 处理玩家离开
   */
  private handlePlayerLeave(player: IRoomPlayer) {
    if (!this.gameState) return;

    this.say(`${player.name} 离开游戏，游戏结束`);

    // 保存所有玩家的最终手牌
    this.gameState.finalHands = {};
    this.gameState.playerOrder.forEach(playerId => {
      if (this.gameState!.players[playerId]) {
        this.gameState!.finalHands![playerId] = {
          tiles: [...this.gameState!.players[playerId].tiles],
          melds: [...this.gameState!.players[playerId].melds],
          discards: [...this.gameState!.players[playerId].discards],
        };
      }
    });

    // 其他玩家获胜
    const winners = this.room.validPlayers.filter(p => p.id !== player.id && p.role === PlayerRole.player);
    this.saveAchievements(winners as RoomPlayer[]);

    this.gameState.phase = 'ended';
    this.gameState.dianpaoPlayer = null;
    this.clearTurnTimer();

    // 重置所有玩家的准备状态
    this.room.players.forEach(p => {
      if (p.role === PlayerRole.player) {
        p.isReady = false;
        p.status = PlayerStatus.online;
      }
    });
    this.room.end();
    this.save();
    this.broadcastGameState();
  }

  /**
   * 结束游戏
   */
  private endGame() {
    if (!this.gameState) return;

    // 保存所有玩家的最终手牌
    this.gameState.finalHands = {};
    this.gameState.playerOrder.forEach(playerId => {
      this.gameState!.finalHands![playerId] = {
        tiles: [...this.gameState!.players[playerId].tiles],
        melds: [...this.gameState!.players[playerId].melds],
        discards: [...this.gameState!.players[playerId].discards],
      };
    });

    // 如果是点炮，记录点炮玩家
    if (this.gameState.winType === 'dianpao' && this.gameState.lastDiscardPlayer) {
      this.gameState.dianpaoPlayer = this.gameState.lastDiscardPlayer;
    }

    this.gameState.phase = 'ended';
    
    // 处理赢家（单个赢家情况）
    let winners: RoomPlayer[] | null = null;
    if (this.gameState.winner) {
      const winner = this.room.validPlayers.find(p => p.id === this.gameState!.winner) as RoomPlayer;
      winners = winner ? [winner] : null;
    } else if (this.gameState.winners && this.gameState.winners.length > 0) {
      // 多赢家情况
      winners = this.gameState.winners.map(winnerInfo => 
        this.room.validPlayers.find(p => p.id === winnerInfo.playerId) as RoomPlayer
      ).filter(Boolean) as RoomPlayer[];
    }

    this.saveAchievements(winners || null);
    this.clearTurnTimer();

    // 重置所有玩家的准备状态
    this.room.players.forEach(player => {
      if (player.role === PlayerRole.player) {
        player.isReady = false;
        player.status = PlayerStatus.online;
      }
    });
    this.room.end();
    this.save();
    this.broadcastGameState();
  }

  /**
   * 处理一炮多响的游戏结束
   */
  private endMultiWinGame() {
    if (!this.gameState || !this.gameState.winners || this.gameState.winners.length === 0) return;

    // 保存所有玩家的最终手牌
    this.gameState.finalHands = {};
    this.gameState.playerOrder.forEach(playerId => {
      this.gameState!.finalHands![playerId] = {
        tiles: [...this.gameState!.players[playerId].tiles],
        melds: [...this.gameState!.players[playerId].melds],
        discards: [...this.gameState!.players[playerId].discards],
      };
    });

    // 如果是点炮，记录点炮玩家
    if (this.gameState.lastDiscardPlayer) {
      this.gameState.dianpaoPlayer = this.gameState.lastDiscardPlayer;
    }

    this.gameState.phase = 'ended';

    // 获取所有赢家对象
    const winners = this.gameState.winners.map(winnerInfo => 
      this.room.validPlayers.find(p => p.id === winnerInfo.playerId) as RoomPlayer
    ).filter(Boolean) as RoomPlayer[];

    this.saveAchievements(winners.length > 0 ? winners : null);
    this.clearTurnTimer();

    // 重置所有玩家的准备状态
    this.room.players.forEach(player => {
      if (player.role === PlayerRole.player) {
        player.isReady = false;
        player.status = PlayerStatus.online;
      }
    });
    this.room.end();
    this.save();
    this.broadcastGameState();
  }

  // ============ 计时器系统 ============

  // 清除倒计时
  private clearTurnTimer() {
    this.stopTimer('turn');
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // 启动倒计时 
  private startTurnTimer(timeoutMs: number, onTimeout: () => void) {
    this.clearTurnTimer();
    this.timerGeneration++;
    const currentGeneration = this.timerGeneration;

    if (this.gameState) {
      this.gameState.turnStartTime = Date.now();
      this.gameState.turnTimeLeft = Math.ceil(timeoutMs / 1000);
      this.command('timer:update', { timeLeft: this.gameState.turnTimeLeft });
    }

    this.timerInterval = setInterval(() => {
      if (currentGeneration !== this.timerGeneration) return;
      if (this.gameState && this.gameState.turnTimeLeft !== undefined && this.gameState.turnTimeLeft > 0) {
        this.gameState.turnTimeLeft--;
        this.command('timer:update', { timeLeft: this.gameState.turnTimeLeft });
      }
    }, 1000);

    this.startTimer(() => {
      if (currentGeneration !== this.timerGeneration) return;
      this.clearTurnTimer();
      onTimeout();
    }, timeoutMs, 'turn');
  }
}

export default MahjongGameRoom;
