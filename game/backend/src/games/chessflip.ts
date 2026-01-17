import { PlayerRole, RoomPlayer, RoomStatus } from "tiaoom";
import { GameRoom, IGameCommand } from ".";
import { sleep } from "@/utils";

/*
  象棋翻棋（暗棋）
  - 4x8 半棋盘，32枚棋子随机暗置
  - 首翻确定阵营（红/黑）
  - 按等级吃子：帅/将>士>相>车>马>炮>兵
  - 特殊规则：兵克帅/将，炮隔子吃（明/暗均可）
  - 走子规则：除车可直线走多格（路径无子）外，其余棋子仅横/竖走1格
  - 吃光对方所有棋子获胜
*/

// 棋子类型
type PieceType = 'K' | 'A' | 'B' | 'R' | 'N' | 'C' | 'P'; // 帅/将、士、相、车、马、炮、兵
type Side = 'red' | 'black';

interface ChessPiece {
  id: number;
  type: PieceType;
  side: Side;
  level: number;
  isOpen: boolean;
}

type Cell = ChessPiece | null;

// 棋子等级映射（用于吃子判断）
// 帅/将(7) > 士(6) > 相(5) > 车(4) > 马(3) > 炮(2) > 兵(1)
const PIECE_LEVELS: Record<PieceType, number> = {
  'K': 7, // 帅/将
  'A': 6, // 士/仕
  'B': 5, // 相/象
  'R': 4, // 车
  'N': 3, // 马
  'C': 2, // 炮/砲
  'P': 1, // 兵/卒
};

// 棋子名称
const PIECE_NAMES: Record<Side, Record<PieceType, string>> = {
  red: { K: '帅', A: '仕', B: '相', R: '车', N: '马', C: '炮', P: '兵' },
  black: { K: '将', A: '士', B: '象', R: '車', N: '馬', C: '砲', P: '卒' },
};

export const name = '象棋翻棋';
export const minSize = 2;
export const maxSize = 2;
export const description = `象棋翻棋（暗棋）：32枚棋子随机暗置于4×8棋盘，首翻确定阵营。按等级吃子（帅/将最大），兵克帅/将，炮需隔子吃；车可直线走多格（路径无子）。吃光对方所有棋子获胜。`;
export const points = {
  '我就玩玩': 1,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
};

class ChessflipGameRoom extends GameRoom {
  currentPlayer?: RoomPlayer;
  lastLosePlayer?: RoomPlayer;
  board: Cell[][] = [];
  selectedPiece: { x: number; y: number } | null = null;
  // 首翻标记
  isFirstFlip: boolean = true;
  // 玩家阵营映射
  playerCamps: Map<string, Side> = new Map();
  // 无吃子/翻棋回合计数（用于和局判定）
  noActionCount: number = 0;
  // 历史记录
  history: { action: string; from?: string; to?: string; piece?: string; result?: 'win' | 'trade'; time: number }[] = [];
  // 初始棋盘布局（用于复盘）
  initialBoard: (ChessPiece | null)[][] = [];

  readonly TURN_TIMEOUT = 60 * 1000;
  readonly MAX_NO_ACTION = 50; // 连续50步无翻棋/吃子判和

  init() {
    this.restoreTimer({
      turn: () => this.handleTimeout()
    });
    return super.init().on('player-offline', async (player) => {
      await sleep(4 * 60 * 1000);
      if (!this.isPlayerOnline(player)) return;
      if (this.room.status === RoomStatus.playing && player.role === PlayerRole.player) {
        this.say(`玩家 ${player.name} 已离线，游戏结束。`);
        const winner = this.room.validPlayers.find((p) => p.id !== player.id)!;
        this.finishGame(winner);
      }
      this.room.kickPlayer(player);
    });
  }

  getStatus(sender: RoomPlayer) {
    const camp = this.playerCamps.get(sender.id);
    return {
      ...super.getStatus(sender),
      status: this.room.status,
      current: this.currentPlayer,
      board: this.getBoardForClient(),
      camp,
      isFirstFlip: this.isFirstFlip,
      countdown: Math.max(0, Math.ceil((this.tickEndTime['turn'] - Date.now()) / 1000)),
    };
  }

  getData() {
    return {
      history: this.history,
      initialBoard: this.initialBoard.map(row =>
        row.map(cell => cell ? {
          id: cell.id,
          type: cell.type,
          side: cell.side,
          level: cell.level,
          name: PIECE_NAMES[cell.side][cell.type],
        } : null)
      ),
      players: this.room.validPlayers.map((p) => ({
        username: p.attributes?.username,
        name: p.name,
        camp: this.playerCamps.get(p.id),
      })),
      message: this.messageHistory,
    };
  }

  // 创建初始棋子数组（32枚）
  createInitialPieces(): ChessPiece[] {
    const pieces: ChessPiece[] = [];
    let id = 0;

    // 红方棋子：帅1、仕2、相2、车2、马2、炮2、兵5
    const redConfig: [PieceType, number][] = [
      ['K', 1], ['A', 2], ['B', 2], ['R', 2], ['N', 2], ['C', 2], ['P', 5]
    ];
    for (const [type, count] of redConfig) {
      for (let i = 0; i < count; i++) {
        pieces.push({
          id: id++,
          type,
          side: 'red',
          level: PIECE_LEVELS[type],
          isOpen: false,
        });
      }
    }

    // 黑方棋子：将1、士2、象2、車2、馬2、砲2、卒5
    const blackConfig: [PieceType, number][] = [
      ['K', 1], ['A', 2], ['B', 2], ['R', 2], ['N', 2], ['C', 2], ['P', 5]
    ];
    for (const [type, count] of blackConfig) {
      for (let i = 0; i < count; i++) {
        pieces.push({
          id: id++,
          type,
          side: 'black',
          level: PIECE_LEVELS[type],
          isOpen: false,
        });
      }
    }

    return pieces;
  }

  // Fisher-Yates 洗牌算法
  shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // 初始化棋盘
  initBoard() {
    const pieces = this.createInitialPieces();
    const shuffled = this.shuffleArray(pieces);

    // 4行8列棋盘
    this.board = [];
    let pieceIndex = 0;
    for (let row = 0; row < 4; row++) {
      const rowCells: Cell[] = [];
      for (let col = 0; col < 8; col++) {
        rowCells.push(shuffled[pieceIndex++]);
      }
      this.board.push(rowCells);
    }

    // 保存初始棋盘布局用于复盘
    this.initialBoard = this.board.map(row =>
      row.map(cell => cell ? { ...cell } : null)
    );
  }

  // 获取客户端可见的棋盘状态
  getBoardForClient(): (Omit<ChessPiece, 'type' | 'side' | 'level'> & { type?: PieceType; side?: Side; level?: number; name?: string } | null)[][] {
    // 房间未开始时 this.board 可能为空数组：返回固定 4×8 的占位棋盘，避免客户端渲染为空棋盘
    if (!this.board || this.board.length === 0) {
      let id = 0;
      return Array.from({ length: 4 }, () =>
        Array.from({ length: 8 }, () => ({ id: id++, isOpen: false }))
      );
    }

    return this.board.map(row =>
      row.map(cell => {
        if (!cell) return null;
        if (!cell.isOpen) {
          // 未翻开的棋子只返回id和isOpen
          return { id: cell.id, isOpen: false };
        }
        // 已翻开的棋子返回完整信息
        return {
          ...cell,
          name: PIECE_NAMES[cell.side][cell.type],
        };
      })
    );
  }

  // 获取棋子名称
  getPieceName(piece: ChessPiece): string {
    return PIECE_NAMES[piece.side][piece.type];
  }

  // 判断是否可以吃子
  canCapture(attacker: ChessPiece, defender: ChessPiece, from: { x: number; y: number }, to: { x: number; y: number }): boolean {
    // 不能吃己方棋子
    if (attacker.side === defender.side) return false;

    // 炮的特殊吃子逻辑
    if (attacker.type === 'C') {
      return this.canCannonCapture(from, to);
    }

    // 兵/卒特殊规则：可吃帅/将（不受等级限制）
    if (attacker.type === 'P' && defender.type === 'K') return true;

    // 帅/将不能吃兵/卒
    if (attacker.type === 'K' && defender.type === 'P') {
      return false;
    }

    // 通用等级判定：攻击方等级 >= 防守方等级
    return attacker.level >= defender.level;
  }

  // 炮的隔子吃判定
  canCannonCapture(from: { x: number; y: number }, to: { x: number; y: number }): boolean {
    const { x: fx, y: fy } = from;
    const { x: tx, y: ty } = to;

    // 炮必须走直线
    if (fx !== tx && fy !== ty) return false;

    // 计算中间棋子数量
    let count = 0;
    if (fx === tx) {
      // 同一行
      const [minY, maxY] = fy < ty ? [fy, ty] : [ty, fy];
      for (let y = minY + 1; y < maxY; y++) {
        if (this.board[fx][y]) count++;
      }
    } else {
      // 同一列
      const [minX, maxX] = fx < tx ? [fx, tx] : [tx, fx];
      for (let x = minX + 1; x < maxX; x++) {
        if (this.board[x][fy]) count++;
      }
    }

    // 炮吃子需要隔1子
    return count === 1;
  }

  // 车的直线走子判定（移动/吃子通用）：同一行或同一列，且路径上无任何棋子阻挡
  isValidRookMove(from: { x: number; y: number }, to: { x: number; y: number }): boolean {
    const { x: fx, y: fy } = from;
    const { x: tx, y: ty } = to;

    // 车必须走直线
    if (fx !== tx && fy !== ty) return false;

    // 检查路径是否被阻挡（目标点不计入“中间”）
    if (fx === tx) {
      const [minY, maxY] = fy < ty ? [fy, ty] : [ty, fy];
      for (let y = minY + 1; y < maxY; y++) {
        if (this.board[fx][y]) return false;
      }
    } else {
      const [minX, maxX] = fx < tx ? [fx, tx] : [tx, fx];
      for (let x = minX + 1; x < maxX; x++) {
        if (this.board[x][fy]) return false;
      }
    }

    return true;
  }

  // 判断移动/吃子路径是否合法（不包含“能否吃子”的等级/阵营规则）
  isValidMove(from: { x: number; y: number }, to: { x: number; y: number }, piece: ChessPiece): boolean {
    const { x: fx, y: fy } = from;
    const { x: tx, y: ty } = to;

    // 不能原地不动
    if (fx === tx && fy === ty) return false;

    // 边界检查
    if (tx < 0 || tx >= 4 || ty < 0 || ty >= 8) return false;

    // 车可直线走多格（路径无子）
    if (piece.type === 'R') {
      return this.isValidRookMove(from, to);
    }

    // 其他棋子：只能横/竖走1格（包括炮的普通移动）
    const dx = Math.abs(tx - fx);
    const dy = Math.abs(ty - fy);
    if (!((dx === 1 && dy === 0) || (dx === 0 && dy === 1))) return false;

    return true;
  }

  // 获取玩家阵营
  getPlayerCamp(player: RoomPlayer): Side | undefined {
    return this.playerCamps.get(player.id);
  }

  // 检查游戏是否结束
  checkGameEnd(): { ended: boolean; winner?: RoomPlayer; reason?: string } {
    // 统计双方剩余棋子
    let redCount = 0;
    let blackCount = 0;

    for (const row of this.board) {
      for (const cell of row) {
        if (cell) {
          if (cell.side === 'red') redCount++;
          else blackCount++;
        }
      }
    }

    // 一方棋子全部被吃光
    if (redCount === 0) {
      const winner = this.room.validPlayers.find(p => this.playerCamps.get(p.id) === 'black');
      return { ended: true, winner, reason: '红方棋子全部被吃光' };
    }
    if (blackCount === 0) {
      const winner = this.room.validPlayers.find(p => this.playerCamps.get(p.id) === 'red');
      return { ended: true, winner, reason: '黑方棋子全部被吃光' };
    }

    // 和局判定：连续50步无翻棋/吃子
    if (this.noActionCount >= this.MAX_NO_ACTION) {
      return { ended: true, reason: `连续${this.MAX_NO_ACTION}步无翻棋或吃子，判定和局` };
    }

    return { ended: false };
  }

  onStart() {
    if (this.room.validPlayers.length < this.room.minSize) {
      return this.say(`玩家人数不足，无法开始游戏。`);
    }

    this.stopTimer();
    this.messageHistory = [];
    this.history = [];
    this.isFirstFlip = true;
    this.playerCamps.clear();
    this.noActionCount = 0;
    this.selectedPiece = null;

    // 初始化棋盘
    this.initBoard();

    // 随机决定先手
    const players = [...this.room.validPlayers];
    const firstPlayerIndex = Math.floor(Math.random() * players.length);
    this.currentPlayer = players[firstPlayerIndex];

    this.command('achievements', this.achievements);
    this.say(`游戏开始。${this.currentPlayer.name} 先手，请翻开第一枚棋子确定阵营。`);
    this.broadcastBoard();
    this.command('turn', { player: this.currentPlayer, isFirstFlip: true });
    this.startTurnTimer();
    this.save();
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    const sender = message.sender as RoomPlayer;

    switch (message.type) {
      case 'flip': {
        // 翻棋
        if (this.room.status !== RoomStatus.playing) {
          this.sayTo(`游戏未开始。`, sender);
          break;
        }
        if (sender.id !== this.currentPlayer?.id) {
          this.sayTo(`不是你的回合。`, sender);
          break;
        }

        const { x, y } = message.data || {};
        if (x === undefined || y === undefined || x < 0 || x >= 4 || y < 0 || y >= 8) {
          this.sayTo(`位置无效。`, sender);
          break;
        }

        const cell = this.board[x][y];
        if (!cell) {
          this.sayTo(`该位置没有棋子。`, sender);
          break;
        }
        if (cell.isOpen) {
          this.sayTo(`该棋子已翻开。`, sender);
          break;
        }

        // 翻棋
        cell.isOpen = true;
        this.noActionCount = 0; // 重置无动作计数

        // 首翻确定阵营
        if (this.isFirstFlip) {
          this.isFirstFlip = false;
          const firstSide = cell.side;
          this.playerCamps.set(sender.id, firstSide);
          const otherPlayer = this.room.validPlayers.find(p => p.id !== sender.id)!;
          this.playerCamps.set(otherPlayer.id, firstSide === 'red' ? 'black' : 'red');

          this.setPlayerAttributes(sender.id, { camp: firstSide });
          this.setPlayerAttributes(otherPlayer.id, { camp: firstSide === 'red' ? 'black' : 'red' });

          const campName = firstSide === 'red' ? '红方' : '黑方';
          this.say(`${sender.name} 翻出 ${this.getPieceName(cell)}，执${campName}。`);
          this.command('camp-assigned', {
            [sender.id]: firstSide,
            [otherPlayer.id]: firstSide === 'red' ? 'black' : 'red',
          });
        } else {
          this.say(`${sender.name} 翻开了 ${this.getPieceName(cell)}。`);
        }

        this.history.push({
          action: 'flip',
          from: `${x},${y}`,
          piece: this.getPieceName(cell),
          time: Date.now(),
        });

        this.broadcastBoard();
        this.command('flip', { x, y, piece: this.getBoardForClient()[x][y] });

        // 切换回合
        this.switchTurn();
        break;
      }

      case 'move': {
        // 走棋/吃子
        if (this.room.status !== RoomStatus.playing) {
          this.sayTo(`游戏未开始。`, sender);
          break;
        }
        if (sender.id !== this.currentPlayer?.id) {
          this.sayTo(`不是你的回合。`, sender);
          break;
        }
        if (this.isFirstFlip) {
          this.sayTo(`请先翻棋确定阵营。`, sender);
          break;
        }

        const { from, to } = message.data || {};
        if (!from || !to) {
          this.sayTo(`参数错误。`, sender);
          break;
        }

        const { x: fx, y: fy } = from;
        const { x: tx, y: ty } = to;

        // 边界检查
        if (fx < 0 || fx >= 4 || fy < 0 || fy >= 8 || tx < 0 || tx >= 4 || ty < 0 || ty >= 8) {
          this.sayTo(`位置无效。`, sender);
          break;
        }

        const fromCell = this.board[fx][fy];
        const toCell = this.board[tx][ty];

        if (!fromCell) {
          this.sayTo(`该位置没有棋子。`, sender);
          break;
        }
        if (!fromCell.isOpen) {
          this.sayTo(`不能移动未翻开的棋子。`, sender);
          break;
        }

        const playerCamp = this.getPlayerCamp(sender);
        if (fromCell.side !== playerCamp) {
          this.sayTo(`不能移动对方棋子。`, sender);
          break;
        }

        // 目标位置判断
        if (toCell) {
          // 已翻开的己方棋子不能作为目标（不可叠子/不可吃己方）
          if (toCell.isOpen && toCell.side === fromCell.side) {
            this.sayTo(`不能吃己方棋子。`, sender);
            break;
          }
          // 目标有棋子 - 尝试吃子
          if (!toCell.isOpen) {
            // 暗棋只有炮可以吃
            if (fromCell.type !== 'C') {
              this.sayTo(`只有炮可以吃未翻开的棋子。`, sender);
              break;
            }
            // 未翻开的棋子如果是己方棋子，不能吃（服务端直接判定，避免误吃己方）
            if (toCell.side === fromCell.side) {
              // 目标为暗子时避免直接暴露阵营信息
              this.sayTo(`该位置无法吃子。`, sender);
              break;
            }
            // 炮隔子吃暗棋
            if (!this.canCannonCapture(from, to)) {
              this.sayTo(`炮需隔1子才能吃。`, sender);
              break;
            }
            // 暗棋被炮吃时先翻开
            toCell.isOpen = true;
          } else {
            // 明棋吃子
            // 非炮吃子需要满足对应走法（防作弊：不能跨格“飞吃”）
            if (fromCell.type !== 'C' && !this.isValidMove(from, to, fromCell)) {
              if (fromCell.type === 'R') {
                this.sayTo(`走棋无效，车只能直线移动且路径不能有子。`, sender);
              } else {
                this.sayTo(`走棋无效，只能横/竖走1格。`, sender);
              }
              break;
            }
            if (!this.canCapture(fromCell, toCell, from, to)) {
              if (fromCell.type === 'C') {
                this.sayTo(`炮需隔1子才能吃。`, sender);
              } else if (fromCell.type === 'K' && toCell.type === 'P') {
                this.sayTo(`帅/将不能吃兵/卒。`, sender);
              } else {
                this.sayTo(`等级不够，无法吃子。`, sender);
              }
              break;
            }
          }

          // 执行吃子（同级互拼：仅在“主动吃子”时触发）
          const attackerName = this.getPieceName(fromCell);
          const defenderName = this.getPieceName(toCell);
          const isTrade = fromCell.level === toCell.level;

          if (isTrade) {
            this.say(`${sender.name} 的 ${attackerName} 与 ${defenderName} 同归于尽。`);
            this.board[fx][fy] = null;
            this.board[tx][ty] = null;
            this.history.push({
              action: 'capture',
              result: 'trade',
              from: `${fx},${fy}`,
              to: `${tx},${ty}`,
              piece: `${attackerName}拼${defenderName}`,
              time: Date.now(),
            });
          } else {
            this.say(`${sender.name} 的 ${attackerName} 吃掉了 ${defenderName}。`);
            this.board[tx][ty] = fromCell;
            this.board[fx][fy] = null;
            this.history.push({
              action: 'capture',
              result: 'win',
              from: `${fx},${fy}`,
              to: `${tx},${ty}`,
              piece: `${attackerName}吃${defenderName}`,
              time: Date.now(),
            });
          }

          this.noActionCount = 0; // 重置无动作计数
        } else {
          // 目标无棋子 - 普通移动
          // 炮的普通移动仍走1格；车可直线走多格（路径无子）
          if (!this.isValidMove(from, to, fromCell)) {
            if (fromCell.type === 'R') {
              this.sayTo(`走棋无效，车只能直线移动且路径不能有子。`, sender);
            } else {
              this.sayTo(`走棋无效，只能横/竖走1格。`, sender);
            }
            break;
          }

          this.board[tx][ty] = fromCell;
          this.board[fx][fy] = null;
          this.noActionCount++; // 增加无动作计数

          this.history.push({
            action: 'move',
            from: `${fx},${fy}`,
            to: `${tx},${ty}`,
            piece: this.getPieceName(fromCell),
            time: Date.now(),
          });
        }

        this.broadcastBoard();
        this.command('move', { from, to });

        // 检查游戏结束
        const result = this.checkGameEnd();
        if (result.ended) {
          if (result.winner) {
            this.say(`${result.reason}，${result.winner.name} 获胜！`);
            this.finishGame(result.winner);
          } else {
            this.say(result.reason!);
            this.saveAchievements();
            this.room.end();
            this.stopTimer();
            this.save();
          }
          break;
        }

        // 切换回合
        this.switchTurn();
        break;
      }

      case 'request-draw': {
        if (this.room.status !== RoomStatus.playing) break;
        this.say(`${sender.name} 请求和棋。`);
        const other = this.room.validPlayers.find(p => p.id !== sender.id)!;
        this.commandTo('request-draw', { player: sender }, other);
        break;
      }

      case 'draw': {
        if (this.room.status !== RoomStatus.playing) break;
        if (!message.data?.agree) {
          this.say(`${sender.name} 拒绝和棋。`);
          break;
        }
        this.say(`双方同意和棋，游戏结束。`);
        this.saveAchievements();
        this.room.end();
        this.stopTimer();
        this.save();
        break;
      }

      case 'request-lose': {
        if (this.room.status !== RoomStatus.playing) break;
        this.say(`${sender.name} 认输。`);
        const winner = this.room.validPlayers.find(p => p.id !== sender.id)!;
        this.finishGame(winner);
        break;
      }
    }
  }

  switchTurn() {
    const next = this.room.validPlayers.find(p => p.id !== this.currentPlayer?.id);
    if (next) {
      this.currentPlayer = next;
      this.command('turn', { player: this.currentPlayer, isFirstFlip: this.isFirstFlip });
      this.startTurnTimer();
    }
    this.save();
  }

  startTurnTimer() {
    this.startTimer(() => this.handleTimeout(), this.TURN_TIMEOUT, 'turn');
  }

  handleTimeout() {
    if (this.room.status === RoomStatus.playing && this.currentPlayer) {
      const winner = this.room.validPlayers.find(p => p.id !== this.currentPlayer!.id)!;
      this.say(`${this.currentPlayer.name} 超时，${winner.name} 获胜！`);
      this.finishGame(winner);
    }
  }

  finishGame(winner: RoomPlayer) {
    this.lastLosePlayer = this.room.validPlayers.find((p) => p.id !== winner.id)!;
    this.stopTimer();
    this.saveAchievements([winner]);
    this.room.end();
    this.save();
  }

  broadcastBoard() {
    this.command('board', { board: this.getBoardForClient() });
  }
}

export default ChessflipGameRoom;
