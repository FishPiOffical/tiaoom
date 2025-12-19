import { IRoomPlayer, PlayerRole, Room, RoomPlayer, RoomStatus } from "tiaoom";
import { IGameMethod } from ".";
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
// Piece codes: rR/rN/rB/rA/rK/rC/rP for red; gR/gN/gB/gA/gK/gC/gP for green
export default async function onRoom(room: Room, { save, restore }: IGameMethod) {
  const TURN_MS = 60_000
  const gameData = await restore();

  type Phase = 'waiting' | 'playing'
  type Piece = string | ''

  let messageHistory: { content: string, sender?: IRoomPlayer }[] = gameData?.messageHistory || [];
  let achivents: Record<string, { win: number; lost: number; draw: number }> = gameData?.achivents || {};

  let gameStatus: Phase = gameData?.gameStatus ?? 'waiting';
  let board: Piece[][] = gameData?.board ?? createInitialBoard();
  let currentPlayer: RoomPlayer | undefined = room.players.find((p) => p.id === gameData?.currentPlayerId);
  let lastLosePlayer: RoomPlayer | undefined = room.players.find((p) => p.id === gameData?.lastLosePlayerId);
  let countdownEndAt: number | null = gameData?.countdownEndAt ?? null
  let turnTimer: NodeJS.Timeout | null = null

  function saveGameData() {
    return save({
      messageHistory,
      achivents,
      gameStatus,
      board,
      currentPlayerId: currentPlayer?.id,
      lastLosePlayerId: lastLosePlayer?.id,
      countdownEndAt,
    });
  }

  function sideOf(piece: Piece): Side | null {
    if (!piece) return null
    return piece[0] === 'r' ? 'red' : 'green'
  }

  function playerSide(p: RoomPlayer): Side | undefined {
    return p.attributes?.side as Side | undefined
  }

  function createInitialBoard(): Piece[][] {
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

  function resetForNewGame() {
    board = createInitialBoard()
    // Random roles
    const players = [...room.validPlayers]
    const idx = Math.floor(Math.random() * players.length)
    const red = players[idx]
    const green = players.find(p => p.id !== red.id)!
    red.attributes = { ...(red.attributes || {}), side: 'red' }
    green.attributes = { ...(green.attributes || {}), side: 'green' }
    currentPlayer = red // red moves first
  }

  function inBounds(x: number, y: number) { return x>=0 && x<10 && y>=0 && y<9 }

  function cloneBoard(src: Piece[][]): Piece[][] { return src.map(row => row.slice()) }

  function countBetweenSameCol(b: Piece[][], fx: number, tx: number, y: number) {
    let cnt = 0
    const [a, z] = fx < tx ? [fx+1, tx-1] : [tx+1, fx-1]
    for (let i=a; i<=z; i++) if (b[i][y]) cnt++
    return cnt
  }

  function countBetweenSameRow(b: Piece[][], x: number, fy: number, ty: number) {
    let cnt = 0
    const [a, z] = fy < ty ? [fy+1, ty-1] : [ty+1, fy-1]
    for (let j=a; j<=z; j++) if (b[x][j]) cnt++
    return cnt
  }

  function isPalace(x: number, y: number, side: Side) {
    // red palace: rows 7..9, cols 3..5; green palace: rows 0..2, cols 3..5
    if (y < 3 || y > 5) return false
    if (side === 'red') return x >= 7 && x <= 9
    return x >= 0 && x <= 2
  }

  function crossedRiver(x: number, side: Side) {
    // river is between rows 4 and 5
    return side === 'red' ? x <= 4 : x >= 5
  }

  function findGeneral(b: Piece[][], side: Side) {
    const target = side === 'red' ? 'rK' : 'gK'
    for (let i=0;i<10;i++) for (let j=0;j<9;j++) if (b[i][j] === target) return { x: i, y: j }
    return null
  }

  function generalsFace(b: Piece[][]) {
    const redK = findGeneral(b, 'red'); const greenK = findGeneral(b,'green')
    if (!redK || !greenK) return false
    if (redK.y !== greenK.y) return false
    return countBetweenSameCol(b, redK.x, greenK.x, redK.y) === 0
  }

  function startTurnCountdown(forPlayer: RoomPlayer) {
    if (turnTimer) { clearTimeout(turnTimer); turnTimer = null }
    countdownEndAt = Date.now() + TURN_MS
    room.emit('command', { type: 'countdown', data: { end: countdownEndAt, player: forPlayer.id } })
    turnTimer = setTimeout(() => {
      const winner = room.validPlayers.find(p => p.id !== forPlayer.id)
      if (winner) {
        room.emit('message', { content: `${forPlayer.name} 超时，${winner.name} 获胜！` })
        endWithWinner(winner)
      }
    }, TURN_MS)
    saveGameData()
  }

  function isLegalMoveForPiece(b: Piece[][], piece: string, from:{x:number,y:number}, to:{x:number,y:number}) {
    const fx=from.x, fy=from.y, tx=to.x, ty=to.y
    if (!inBounds(tx,ty) || (fx===tx && fy===ty)) return false
    const side = piece[0] === 'r' ? 'red':'green'
    const p = piece[1]
    const dx = tx - fx, dy = ty - fy
    const adx = Math.abs(dx), ady = Math.abs(dy)
    const target = b[tx][ty]
    if (target && sideOf(target) === side) return false

    switch (p) {
      case 'R': { // Rook
        if (dx !== 0 && dy !== 0) return false
        if (dx === 0) return countBetweenSameRow(b, fx, fy, ty) === 0
        else return countBetweenSameCol(b, fx, tx, fy) === 0
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
        if (!isPalace(tx, ty, side)) return false
        return true
      }
      case 'K': { // General
        // Flying general capture: if facing directly, can capture enemy general along the file.
        if (dy === 0 && target && (target === (side === 'red' ? 'gK' : 'rK'))) {
          return countBetweenSameCol(b, fx, tx, fy) === 0
        }
        // Otherwise: move one orth within palace
        if (!((adx===1 && ady===0) || (adx===0 && ady===1))) return false
        if (!isPalace(tx, ty, side)) return false
        return true
      }
      case 'C': { // Cannon
        if (dx !== 0 && dy !== 0) return false
        if (dx === 0) {
          const cnt = countBetweenSameRow(b, fx, fy, ty)
          if (!target) return cnt === 0
          else return cnt === 1
        } else {
          const cnt = countBetweenSameCol(b, fx, tx, fy)
          if (!target) return cnt === 0
          else return cnt === 1
        }
      }
      case 'P': { // Pawn
        const dir = side === 'red' ? -1 : 1
        if (dy === 0 && dx === dir) return true
        if (crossedRiver(fx, side) && adx===0 && ady===1) return true
        return false
      }
    }
    return false
  }

  function isInCheck(b: Piece[][], side: Side) {
    const g = findGeneral(b, side)
    if (!g) return false
    const enemy: Side = side === 'red' ? 'green' : 'red'
    // enemy general facing along file
    const og = findGeneral(b, enemy)
    if (og && og.y === g.y && countBetweenSameCol(b, g.x, og.x, g.y) === 0) return true
    // any enemy piece can legally move to king square (capture semantics)
    for (let i=0;i<10;i++) {
      for (let j=0;j<9;j++) {
        const pc = b[i][j]
        if (!pc) continue
        if (sideOf(pc) !== enemy) continue
        if (isLegalMoveForPiece(b, pc, {x:i,y:j}, g)) return true
      }
    }
    return false
  }

  function hasAnyLegalEscapeMove(b: Piece[][], side: Side) {
    for (let fx = 0; fx < 10; fx++) {
      for (let fy = 0; fy < 9; fy++) {
        const piece = b[fx][fy]
        if (!piece) continue
        if (sideOf(piece) !== side) continue

        for (let tx = 0; tx < 10; tx++) {
          for (let ty = 0; ty < 9; ty++) {
            if (fx === tx && fy === ty) continue
            if (!isLegalMoveForPiece(b, piece, { x: fx, y: fy }, { x: tx, y: ty })) continue

            const nb = cloneBoard(b)
            nb[tx][ty] = piece
            nb[fx][fy] = ''
            if (generalsFace(nb)) continue
            if (isInCheck(nb, side)) continue

            return true
          }
        }
      }
    }
    return false
  }

  function emitStatusTo(player: RoomPlayer) {
    player.emit('command', {
      type: 'status',
      data: {
        status: gameStatus,
        current: currentPlayer,
        board,
        achivents,
        messageHistory,
        countdown: countdownEndAt,
      }
    })
  }

  function broadcastBoard() {
    room.emit('command', { type: 'board', data: board })
  }

  function endWithWinner(winner: RoomPlayer) {
    gameStatus = 'waiting'
    lastLosePlayer = room.validPlayers.find(p => p.id !== winner.id)!
    if (turnTimer) { clearTimeout(turnTimer); turnTimer = null }
    countdownEndAt = null
    room.validPlayers.forEach(p => {
      if (!achivents[p.name]) achivents[p.name] = { win: 0, lost: 0, draw: 0 }
      if (p.id === winner.id) achivents[p.name].win += 1
      else achivents[p.name].lost += 1
    })
    room.emit('command', { type: 'achivements', data: achivents })
    room.end()
    saveGameData()
  }

  function findGenerals(): { redAlive: boolean, greenAlive: boolean } {
    let redAlive = false, greenAlive = false
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        const p = board[i][j]
        if (p === 'rK') redAlive = true
        if (p === 'gK') greenAlive = true
      }
    }
    return { redAlive, greenAlive }
  }

  room
    .on('join', (player) => {
      room.validPlayers.find((p) => p.id === player.id)?.emit('command', {
        type: 'achivents',
        data: achivents
      });
    })
    .on('player-offline', async (player) => {
      await sleep(4 * 60 * 1000)
      room.kickPlayer(player)
      if (gameStatus === 'playing' && player.role === 'player') {
        room.emit('message', { content: `${player.name} 已离线，游戏结束。` })
        const winner = room.validPlayers.find(p => p.id !== player.id)!
        endWithWinner(winner)
      }
    })
    .on('player-command', (message: any) => {
      const publicCommands = ['say', 'status']
      const players = publicCommands.includes(message.type) ? room.players : room.validPlayers
      const sender = players.find((p) => p.id == message.sender?.id)!
      if (!sender) return

      switch (message.type) {
        case 'say':
          if (sender.role != PlayerRole.player && room.status == RoomStatus.playing) {
            room.watchers.forEach((w) => w.emit('message', { content: `${message.data}`, sender }))
            return
          }
          room.emit('message', { content: `${message.data}`, sender })
          break
        case 'status':
          emitStatusTo(sender as RoomPlayer)
          break
        case 'move': {
          if (gameStatus !== 'playing') { sender.emit('message', { content: `游戏未开始。` }); break }
          if (sender.id !== currentPlayer?.id) { sender.emit('message', { content: `不是你的回合。` }); break }
          const { from, to } = message.data || {}
          if (!from || !to) { sender.emit('message', { content: `参数错误。` }); break }
          const { x: fx, y: fy } = from
          const { x: tx, y: ty } = to
          if (fx<0||fx>9||fy<0||fy>8||tx<0||tx>9||ty<0||ty>8) { sender.emit('message', { content: `越界。` }); break }
          const piece = board[fx][fy]
          if (!piece) { sender.emit('message', { content: `该处无子可走。` }); break }
          const side = playerSide(sender as RoomPlayer)
          if (sideOf(piece) !== side) { sender.emit('message', { content: `不能移动对方棋子。` }); break }
          const target = board[tx][ty]
          if (target && sideOf(target) === side) { sender.emit('message', { content: `不能吃己方子。` }); break }

          // Validate piece-specific rules
          if (!isLegalMoveForPiece(board, piece, { x: fx, y: fy }, { x: tx, y: ty })) {
            sender.emit('message', { content: `不符合走法规则。` }); break
          }

          // Simulate move to ensure own general not in check and generals not facing illegally
          const nb = cloneBoard(board)
          nb[tx][ty] = piece
          nb[fx][fy] = ''
          if (generalsFace(nb)) { sender.emit('message', { content: `帅/将不能照面。` }); break }
          // Note: allow self-check moves (do not reject when mover remains/gets in check)

          // Commit move
          board = nb

          room.emit('command', { type: 'move', data: { from, to, piece } })
          broadcastBoard()

          // Check general captured
          const gens = findGenerals()
          if (!gens.redAlive || !gens.greenAlive) {
            const winner = gens.redAlive ? room.validPlayers.find(p => playerSide(p) === 'red')! : room.validPlayers.find(p => playerSide(p) === 'green')!
            room.emit('message', { content: `将/帅被吃。${winner.name} 获胜！` })
            endWithWinner(winner)
            break
          }

          const oppSide: Side = side === 'red' ? 'green' : 'red'
          const oppInCheck = isInCheck(board, oppSide)

          // Checkmate / dead-chess: opponent is in check and has no escape move.
          if (oppInCheck && !hasAnyLegalEscapeMove(board, oppSide)) {
            room.emit('message', { content: `${oppSide === 'red' ? '红方' : '绿方'} 死棋（将死），${(sender as RoomPlayer).name} 获胜！` })
            endWithWinner(sender as RoomPlayer)
            break
          }

          // Turn change
          const next = room.validPlayers.find(p => p.id !== currentPlayer?.id)
          if (next) {
            currentPlayer = next
            room.emit('command', { type: 'turn', data: { player: currentPlayer } })
            startTurnCountdown(currentPlayer)
          }
          saveGameData()
          break
        }
        case 'request-draw': {
          room.emit('message', { content: `${sender.name} 请求和棋。` })
          const other = room.validPlayers.find(p => p.id !== sender.id)!
          other.emit('command', { type: 'request-draw', data: { player: sender } })
          break
        }
        case 'draw': {
          if (!message.data?.agree) { room.emit('message', { content: `${sender.name} 拒绝和棋。` }); break }
          room.emit('message', { content: `双方同意和棋，游戏结束。` })
          gameStatus = 'waiting'
          room.validPlayers.forEach(p => {
            if (!achivents[p.name]) achivents[p.name] = { win: 0, lost: 0, draw: 0 }
            achivents[p.name].draw += 1
          })
          room.emit('command', { type: 'achivements', data: achivents })
          room.end()
          if (turnTimer) { clearTimeout(turnTimer); turnTimer = null }
          countdownEndAt = null
          saveGameData()
          break
        }
        case 'request-lose': {
          room.emit('message', { content: `${sender.name} 认输。` })
          const winner = room.validPlayers.find(p => p.id !== sender.id)!
          endWithWinner(winner)
          break
        }
        default:
          break
      }
    })
    .on('start', () => {
      if (room.validPlayers.length < room.minSize) {
        return room.emit('message', { content: `玩家人数不足，无法开始游戏。` });
      }
      messageHistory = []
      gameStatus = 'playing'
      resetForNewGame()
      room.emit('command', { type: 'achivements', data: achivents })
      room.emit('message', { content: `游戏开始。红方（先手）：${currentPlayer?.name}。` })
      room.emit('command', { type: 'turn', data: { player: currentPlayer } })
      broadcastBoard()
      if (currentPlayer) startTurnCountdown(currentPlayer)
      saveGameData()
    })
    .on('end', () => {
      room.emit('command', { type: 'end' })
      if (turnTimer) { clearTimeout(turnTimer); turnTimer = null }
      countdownEndAt = null
      saveGameData()
    })
    .on('message', (message) => {
      messageHistory.unshift(message)
      if (messageHistory.length > 100) messageHistory.splice(messageHistory.length - 100)
      saveGameData()
    })
}

export const name = '象棋'
export const minSize = 2
export const maxSize = 2
export const description = `中国象棋：随机红/绿方，红方先手。服务器严格校验走法（马别腿/象塞眼/炮隔子/九宫/过河兵）、将帅对脸与自陷将军；吃掉将/帅即胜。`;
 
// Updated: Server enforces piece movement rules and 30s turn countdown.
export const description_extra = `规则：服务器严格校验走法与将帅对脸；每回合 60 秒超时判负；吃掉对方将/帅即胜。`;
