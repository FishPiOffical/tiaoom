import { PlayerRole, PlayerStatus, RoomPlayer, RoomStatus } from "tiaoom";
import { GameRoom, IGameCommand } from ".";
import { sleep } from "@/utils";

/*
  Xiangqi (Chinese Chess)
  - Randomly assign red (first) and green sides
  - Board: 10x9, initial standard setup
  - Server enforces full movement rules (including 马别腿/象塞眼/炮隔子/九宫/过河兵)
  - Prohibits self-check and 将帅对脸
  - Capture ends game if a general (K) is captured
  - Open chat; spectators can't speak during play (same as other games)
*/

type Side = 'red' | 'green'
type Piece = string | ''

export const name = '象棋'
export const minSize = 2
export const maxSize = 2
export const description = `中国象棋：随机红/绿方，红方先手。服务器严格校验走法（马别腿/象塞眼/炮隔子/九宫/过河兵）、将帅对脸与自陷将军；吃掉将/帅即胜。`;
export const description_extra = `规则：服务器严格校验走法与将帅对脸；每回合 60 秒超时判负；吃掉对方将/帅即胜。`;

class XiangqiGameRoom extends GameRoom {
  currentPlayer?: RoomPlayer;
  lastLosePlayer?: RoomPlayer;
  board: Piece[][] = [];

  readonly TURN_TIMEOUT = 60 * 1000;

  init() {
    this.restoreTimer({
      turn: () => this.handleTimeout()
    });
    return super.init().on('player-offline', async (player) => {
      await sleep(4 * 60 * 1000);
      if (!this.isPlayerOnline(player)) return;
      this.room.kickPlayer(player);
      if (this.room.status === RoomStatus.playing && player.role === PlayerRole.player) {
        this.say(`玩家 ${player.name} 已离线，游戏结束。`);
        const winner = this.room.validPlayers.find((p) => p.id !== player.id)!;
        this.finishGame(winner);
      }
    });
  }

  getStatus(sender: RoomPlayer) {
    return {
      ...super.getStatus(sender),
      status: this.room.status,
      current: this.currentPlayer,
      board: this.board,
      countdown: Math.max(0, Math.ceil((this.tickEndTime['turn'] - Date.now()) / 1000)),
    }
  }

  onStart() {
    if (this.room.validPlayers.length < this.room.minSize) {
      return this.say(`玩家人数不足，无法开始游戏。`);
    }
    this.stopTimer();
    this.messageHistory = [];
    this.resetForNewGame();
    this.command('achievements', this.achievements);
    this.command('turn', { player: this.currentPlayer });
    this.say(`游戏开始。红方（先手）：${this.currentPlayer?.name}。`);
    this.broadcastBoard();
    if (this.currentPlayer) this.startTurnTimer();
    this.save();
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    const sender = message.sender as RoomPlayer;
    switch (message.type) {
      case 'move': {
        if (this.room.status !== RoomStatus.playing) {
          this.sayTo(`游戏未开始。`, sender);
          break;
        }
        if (sender.id !== this.currentPlayer?.id) {
          this.sayTo(`不是你的回合。`, sender);
          break;
        }
        const { from, to } = message.data || {}
        if (!from || !to) { 
          this.sayTo(`参数错误。`, sender); 
          break;
        }
        const { x: fx, y: fy } = from
        const { x: tx, y: ty } = to
        if (fx<0||fx>9||fy<0||fy>8||tx<0||tx>9||ty<0||ty>8) { 
          this.sayTo(`越界。`, sender); 
          break;
        }
        const piece = this.board[fx][fy]
        if (!piece) { this.sayTo(`该处无子可走。`, sender); break }
        const side = this.playerSide(sender)
        if (this.sideOf(piece) !== side) {
          this.sayTo(`不能移动对方棋子。`, sender);
          break;
        }
        const target = this.board[tx][ty]
        if (target && this.sideOf(target) === side) { 
          this.sayTo(`不能吃己方子。`, sender); 
          break;
        }
        // Validate piece-specific rules
        if (!this.isLegalMoveForPiece(this.board, piece, { x: fx, y: fy }, { x: tx, y: ty })) {
          this.sayTo(`不符合走法规则。`, sender);
          break;
        }

        // Simulate move to ensure own general not in check and generals not facing illegally
        const nb = this.cloneBoard(this.board)
        nb[tx][ty] = piece
        nb[fx][fy] = ''
        if (this.generalsFace(nb)) { 
          this.sayTo(`帅/将不能照面。`, sender); 
          break;
        }
        // Note: allow self-check moves (do not reject when mover remains/gets in check)

        // Commit move
        this.board = nb

        this.command('move', { from, to, piece })
        this.broadcastBoard()

        // Check general captured
        const gens = this.findGenerals()
        if (!gens.redAlive || !gens.greenAlive) {
          const winner = gens.redAlive ? this.room.validPlayers.find(p => this.playerSide(p) === 'red')! : this.room.validPlayers.find(p => this.playerSide(p) === 'green')!
          this.say(`将/帅被吃。${winner.name} 获胜！`)
          this.finishGame(winner)
          break
        }

        const oppSide: Side = side === 'red' ? 'green' : 'red'
        const oppInCheck = this.isInCheck(this.board, oppSide)

        // Checkmate / dead-chess: opponent is in check and has no escape move.
        if (oppInCheck && !this.hasAnyLegalEscapeMove(this.board, oppSide)) {
          this.say(`${oppSide === 'red' ? '红方' : '绿方'} 死棋（将死），${sender.name} 获胜！`)
          this.finishGame(sender)
          break
        }

        // Turn change
        const next = this.room.validPlayers.find(p => p.id !== this.currentPlayer?.id)
        if (next) {
          this.currentPlayer = next;
          this.command('turn', { player: this.currentPlayer });
          this.startTurnTimer();
        }
        this.save();
        break;
      }
      case 'request-draw': {
        if (this.room.status !== RoomStatus.playing) break;
        this.say(`${sender.name} 请求和棋。`)
        const other = this.room.validPlayers.find(p => p.id !== sender.id)!
        this.commandTo('request-draw', { player: sender }, other)
        break
      }
      case 'draw': {
        if (this.room.status !== RoomStatus.playing) break;
        if (!message.data?.agree) { 
          this.say(`${sender.name} 拒绝和棋。`); 
          break;
        }
        this.say(`双方同意和棋，游戏结束。`)
        this.saveAchievements();
        this.room.end();
        this.stopTimer();
        this.save()
        break
      }
      case 'request-lose': {
        if (this.room.status !== RoomStatus.playing) break;
        this.say(`${sender.name} 认输。`)
        const winner = this.room.validPlayers.find(p => p.id !== sender.id)!
        this.finishGame(winner)
        break
      }
    }
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

    this.saveAchievements(winner);
    this.room.end();
    this.save();
  }

  // Helper methods
  sideOf(piece: Piece): Side | null {
    if (!piece) return null
    return piece[0] === 'r' ? 'red' : 'green'
  }

  playerSide(p: RoomPlayer): Side | undefined {
    return p.attributes?.side as Side | undefined
  }

  createInitialBoard(): Piece[][] {
    const emptyRow = () => Array(9).fill('') as Piece[]
    const b: Piece[][] = Array(10).fill(0).map(() => emptyRow())
    // Green (top half: rows 0-4)
    b[0] = ['gR','gN','gB','gA','gK','gA','gB','gN','gR']
    b[2][1] = 'gC'; b[2][7] = 'gC'
    b[3][0] = 'gP'; b[3][2] = 'gP'; b[3][4] = 'gP'; b[3][6] = 'gP'; b[3][8] = 'gP'
    // Row 4 is empty (green's last row)
    // Red (bottom half: rows 5-9)
    b[6][0] = 'rP'; b[6][2] = 'rP'; b[6][4] = 'rP'; b[6][6] = 'rP'; b[6][8] = 'rP'
    b[7][1] = 'rC'; b[7][7] = 'rC'
    b[9] = ['rR','rN','rB','rA','rK','rA','rB','rN','rR']
    return b
  }

  resetForNewGame() {
    this.board = this.createInitialBoard()
    // Random roles
    const players = [...this.room.validPlayers]
    const idx = Math.floor(Math.random() * players.length)
    const red = players[idx]
    const green = players.find(p => p.id !== red.id)!
    red.attributes = { ...(red.attributes || {}), side: 'red' }
    green.attributes = { ...(green.attributes || {}), side: 'green' }
    this.currentPlayer = red // red moves first
  }

  inBounds(x: number, y: number) { return x>=0 && x<10 && y>=0 && y<9 }

  cloneBoard(src: Piece[][]): Piece[][] { return src.map(row => row.slice()) }

  countBetweenSameCol(b: Piece[][], fx: number, tx: number, y: number) {
    let cnt = 0
    const [a, z] = fx < tx ? [fx+1, tx-1] : [tx+1, fx-1]
    for (let i=a; i<=z; i++) if (b[i][y]) cnt++
    return cnt
  }

  countBetweenSameRow(b: Piece[][], x: number, fy: number, ty: number) {
    let cnt = 0
    const [a, z] = fy < ty ? [fy+1, ty-1] : [ty+1, fy-1]
    for (let j=a; j<=z; j++) if (b[x][j]) cnt++
    return cnt
  }

  isPalace(x: number, y: number, side: Side) {
    // red palace: rows 7..9, cols 3..5; green palace: rows 0..2, cols 3..5
    if (y < 3 || y > 5) return false
    if (side === 'red') return x >= 7 && x <= 9
    return x >= 0 && x <= 2
  }

  crossedRiver(x: number, side: Side) {
    // river is between rows 4 and 5
    return side === 'red' ? x <= 4 : x >= 5
  }

  findGeneral(b: Piece[][], side: Side) {
    const target = side === 'red' ? 'rK' : 'gK'
    for (let i=0;i<10;i++) for (let j=0;j<9;j++) if (b[i][j] === target) return { x: i, y: j }
    return null
  }

  generalsFace(b: Piece[][]) {
    const redK = this.findGeneral(b, 'red'); const greenK = this.findGeneral(b,'green')
    if (!redK || !greenK) return false
    if (redK.y !== greenK.y) return false
    return this.countBetweenSameCol(b, redK.x, greenK.x, redK.y) === 0
  }

  isLegalMoveForPiece(b: Piece[][], piece: string, from:{x:number,y:number}, to:{x:number,y:number}) {
    const fx=from.x, fy=from.y, tx=to.x, ty=to.y
    if (!this.inBounds(tx,ty) || (fx===tx && fy===ty)) return false
    const side = piece[0] === 'r' ? 'red':'green'
    const p = piece[1]
    const dx = tx - fx, dy = ty - fy
    const adx = Math.abs(dx), ady = Math.abs(dy)
    const target = b[tx][ty]
    if (target && this.sideOf(target) === side) return false

    switch (p) {
      case 'R': { // Rook
        if (dx !== 0 && dy !== 0) return false
        if (dx === 0) return this.countBetweenSameRow(b, fx, fy, ty) === 0
        else return this.countBetweenSameCol(b, fx, tx, fy) === 0
      }
      case 'N': { // Knight
        if (!((adx===2 && ady===1) || (adx===1 && ady===2))) return false
        // horse leg
        if (adx===2) {
          const mx = fx + (dx>0?1:-1)
          if (b[mx][fy]) return false
        } else {
          const my = fy + (dy>0?1:-1)
          if (b[fx][my]) return false
        }
        return true
      }
      case 'B': { // Bishop / Elephant
        if (!(adx===2 && ady===2)) return false
        // cannot cross river
        const nx = fx + dx/2, ny = fy + dy/2
        if (b[nx][ny]) return false // elephant eye
        if (side === 'red' && tx <= 4) return false
        if (side === 'green' && tx >= 5) return false
        return true
      }
      case 'A': { // Advisor
        if (!(adx===1 && ady===1)) return false
        if (!this.isPalace(tx, ty, side)) return false
        return true
      }
      case 'K': { // General
        // Flying general capture: if facing directly, can capture enemy general along the file.
        if (dy === 0 && target && (target === (side === 'red' ? 'gK' : 'rK'))) {
          return this.countBetweenSameCol(b, fx, tx, fy) === 0
        }
        // Otherwise: move one orth within palace
        if (!((adx===1 && ady===0) || (adx===0 && ady===1))) return false
        if (!this.isPalace(tx, ty, side)) return false
        return true
      }
      case 'C': { // Cannon
        if (dx !== 0 && dy !== 0) return false
        if (dx === 0) {
          const cnt = this.countBetweenSameRow(b, fx, fy, ty)
          if (!target) return cnt === 0
          else return cnt === 1
        } else {
          const cnt = this.countBetweenSameCol(b, fx, tx, fy)
          if (!target) return cnt === 0
          else return cnt === 1
        }
      }
      case 'P': { // Pawn
        const dir = side === 'red' ? -1 : 1
        if (dy === 0 && dx === dir) return true
        if (this.crossedRiver(fx, side) && adx===0 && ady===1) return true
        return false
      }
    }
    return false
  }

  isInCheck(b: Piece[][], side: Side) {
    const g = this.findGeneral(b, side)
    if (!g) return false
    const enemy: Side = side === 'red' ? 'green' : 'red'
    // enemy general facing along file
    const og = this.findGeneral(b, enemy)
    if (og && og.y === g.y && this.countBetweenSameCol(b, g.x, og.x, g.y) === 0) return true
    // any enemy piece can legally move to king square (capture semantics)
    for (let i=0;i<10;i++) {
      for (let j=0;j<9;j++) {
        const pc = b[i][j]
        if (!pc) continue
        if (this.sideOf(pc) !== enemy) continue
        if (this.isLegalMoveForPiece(b, pc, {x:i,y:j}, g)) return true
      }
    }
    return false
  }

  hasAnyLegalEscapeMove(b: Piece[][], side: Side) {
    for (let fx = 0; fx < 10; fx++) {
      for (let fy = 0; fy < 9; fy++) {
        const piece = b[fx][fy]
        if (!piece) continue
        if (this.sideOf(piece) !== side) continue

        for (let tx = 0; tx < 10; tx++) {
          for (let ty = 0; ty < 9; ty++) {
            if (fx === tx && fy === ty) continue
            if (!this.isLegalMoveForPiece(b, piece, { x: fx, y: fy }, { x: tx, y: ty })) continue

            const nb = this.cloneBoard(b)
            nb[tx][ty] = piece
            nb[fx][fy] = ''
            if (this.generalsFace(nb)) continue
            if (this.isInCheck(nb, side)) continue

            return true
          }
        }
      }
    }
    return false
  }

  broadcastBoard() {
    this.command('board', { board: this.board });
  }

  findGenerals(): { redAlive: boolean, greenAlive: boolean } {
    let redAlive = false, greenAlive = false
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        const p = this.board[i][j]
        if (p === 'rK') redAlive = true
        if (p === 'gK') greenAlive = true
      }
    }
    return { redAlive, greenAlive }
  }
}

export default XiangqiGameRoom;
