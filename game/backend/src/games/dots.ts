import { GameRoom, IGameCommand } from '.';
import { RoomPlayer } from 'tiaoom';

export const name = '点格棋';
export const minSize = 2;
export const maxSize = 2;
export const description = '在点阵上画线围成方块，谁围的方块多谁赢。';

export default class DotsRoom extends GameRoom {
  // 棋盘尺寸：4x4方块，需要5x5点阵
  readonly BOARD_SIZE = 4;

  // 水平线：hLines[row][col]，row 0-3, col 0-3
  hLines: boolean[][] = [];

  // 垂直线：vLines[row][col]，row 0-3, col 0-4
  vLines: boolean[][] = [];

  // 方块所有者：boxes[row][col]，0=未占领，1=玩家1，2=玩家2
  boxes: number[][] = [];

  currentPlayer: RoomPlayer | undefined;
  player1: RoomPlayer;
  player2: RoomPlayer;

  // 玩家分数
  scores: number[] = [0, 0];

  // 操作历史
  history: any[] = [];

  init() {
    // 注册倒计时恢复回调
    this.restoreTimer({
      turn: () => this.handleTurnTimeout(),
    });
    return super.init();
  }

  onStart() {
    // 初始化棋盘
    this.initializeBoard();

    // 设置玩家
    this.player1 = this.room.validPlayers[0];
    this.player2 = this.room.validPlayers[1];
    this.currentPlayer = this.player1;
    this.setPlayerAttributes(this.player1.id, { symbol: 1 });
    this.setPlayerAttributes(this.player2.id, { symbol: 2 });

    // 重置分数
    this.scores = [0, 0];

    // 初始化历史记录
    this.history = [];

    // 广播初始状态
    this.command('update', {
      hLines: this.hLines,
      vLines: this.vLines,
      boxes: this.boxes,
      currentPlayer: this.currentPlayer,
      scores: this.scores,
      players: [this.player1.id, this.player2.id]
    });

    // 启动倒计时
    this.startTurnTimer();
  }

  initializeBoard() {
    // 初始化水平线：5行，每行4条线
    this.hLines = Array(this.BOARD_SIZE + 1).fill(null).map(() =>
      Array(this.BOARD_SIZE).fill(false)
    );

    // 初始化垂直线：4行，每行5条线
    this.vLines = Array(this.BOARD_SIZE).fill(null).map(() =>
      Array(this.BOARD_SIZE + 1).fill(false)
    );

    // 初始化方块：4x4
    this.boxes = Array(this.BOARD_SIZE).fill(null).map(() =>
      Array(this.BOARD_SIZE).fill(0)
    );
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);

    if (message.type === 'draw') {
      const { type: lineType, row, col } = message.data;

      // 找到实际的 RoomPlayer
      const sender = this.room.validPlayers.find(p => p.id === message.sender.id);
      if (!sender) return;

      // 验证操作合法性
      if (!this.isValidMove(sender, lineType, row, col)) {
        this.sayTo('无效操作！', sender);
        return;
      }

      // 记录操作历史
      this.history.push({
        type: 'draw',
        lineType,
        row,
        col,
        player: sender.id,
        time: Date.now() - this.beginTime
      });

      // 执行画线
      this.drawLine(lineType, row, col);

      // 检查是否围成方块
      const completedBoxes = this.checkCompletedBoxes();

      if (completedBoxes.length > 0) {
        // 当前玩家获得方块，继续回合
        const playerIndex = sender.id === this.player1.id ? 0 : 1;
        this.scores[playerIndex] += completedBoxes.length;

        this.say(`${sender.name} 围成了 ${completedBoxes.length} 个方块！`);

        // 检查游戏是否结束
        if (this.isGameFinished()) {
          this.command('update', {
            hLines: this.hLines,
            vLines: this.vLines,
            boxes: this.boxes,
            currentPlayer: this.currentPlayer,
            scores: this.scores,
            players: [this.player1.id, this.player2.id]
          });

          this.endGame();
          return;
        }
      } else {
        // 切换玩家
        this.switchPlayer();
      }

      // 广播更新
      this.command('update', {
        hLines: this.hLines,
        vLines: this.vLines,
        boxes: this.boxes,
        currentPlayer: this.currentPlayer,
        scores: this.scores,
        players: [this.player1.id, this.player2.id]
      });

      this.save();

      // 重新启动倒计时
      this.startTurnTimer();
    }
  }

  isValidMove(sender: RoomPlayer, lineType: string, row: number, col: number): boolean {
    // 检查是否是当前玩家
    if (sender.id !== this.currentPlayer?.id) {
      return false;
    }

    // 检查坐标范围和是否已被画过
    if (lineType === 'horizontal') {
      return row >= 0 && row < this.BOARD_SIZE + 1 &&
             col >= 0 && col < this.BOARD_SIZE &&
             !this.hLines[row][col];
    } else if (lineType === 'vertical') {
      return row >= 0 && row < this.BOARD_SIZE &&
             col >= 0 && col < this.BOARD_SIZE + 1 &&
             !this.vLines[row][col];
    }

    return false;
  }

  drawLine(lineType: string, row: number, col: number) {
    if (lineType === 'horizontal') {
      this.hLines[row][col] = true;
    } else if (lineType === 'vertical') {
      this.vLines[row][col] = true;
    }
  }

  checkCompletedBoxes(): {row: number, col: number}[] {
    const completed = [];
    const playerIndex = this.currentPlayer?.id === this.player1.id ? 1 : 2;

    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        if (this.boxes[row][col] === 0) {
          // 检查四个边是否都画完
          const top = this.hLines[row][col];
          const bottom = this.hLines[row + 1]?.[col] || false;
          const left = this.vLines[row][col];
          const right = this.vLines[row][col + 1];

          if (top && bottom && left && right) {
            this.boxes[row][col] = playerIndex;
            completed.push({ row, col });
          }
        }
      }
    }

    return completed;
  }

  switchPlayer() {
    this.currentPlayer = this.currentPlayer?.id === this.player1.id ? this.player2 : this.player1;
  }

  isGameFinished(): boolean {
    // 检查是否所有方块都被占领
    return this.boxes.every(row => row.every(box => box !== 0));
  }

  endGame() {
    const winner = this.scores[0] > this.scores[1] ? [this.player1] :
                   this.scores[1] > this.scores[0] ? [this.player2] : null;

    if (winner) {
      this.saveAchievements(winner);
      this.say(`${winner[0].name} 获胜！(${this.scores[0]}:${this.scores[1]})`);
    } else {
      this.saveAchievements();
      this.say(`平局！(${this.scores[0]}:${this.scores[1]})`);
    }

    this.room.end();
  }

  startTurnTimer() {
    this.startTimer(() => {
      this.handleTurnTimeout();
    }, 60 * 1000, 'turn');
  }

  handleTurnTimeout() {
    this.say('时间到！自动切换玩家。');
    this.switchPlayer();
    this.command('update', {
      hLines: this.hLines,
      vLines: this.vLines,
      boxes: this.boxes,
      currentPlayer: this.currentPlayer,
      scores: this.scores,
      players: [this.player1.id, this.player2.id]
    });
    this.startTurnTimer();
  }

  getStatus(sender: any) {
    return {
      ...super.getStatus(sender),
      hLines: this.hLines,
      vLines: this.vLines,
      boxes: this.boxes,
      currentPlayer: this.currentPlayer,
      scores: this.scores,
      players: [this.player1.id, this.player2.id]
    };
  }

  getData() {
    return {
      ...super.getData(),
      hLines: this.hLines,
      vLines: this.vLines,
      boxes: this.boxes,
      scores: this.scores,
      players: this.room.validPlayers.map(p => ({ id: p.id, name: p.name, color: p.attributes.color })),
      history: this.history,
      winner: this.isGameFinished() ?
        (this.scores[0] > this.scores[1] ? this.player1.id :
         this.scores[1] > this.scores[0] ? this.player2.id : null) :
        null
    };
  }
}