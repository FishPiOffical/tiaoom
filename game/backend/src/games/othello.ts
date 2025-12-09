import { Room, RoomPlayer, RoomStatus } from "tiaoom";

/**
 * 检查黑白棋（Othello/Reversi）落子有效性，并返回落子后的棋盘状态
 * @param {number[][]} board - 当前棋盘二维数组（1黑棋，2白棋，0空格）
 * @param {number} x - 当前落子位置 行索引
 * @param {number} y - 当前落子位置 列索引
 * @param {number} player - 当前玩家（1黑棋，2白棋）
 * @returns {false|number[][]} 如果不能落子返回false，否则返回新棋盘（1黑，2白，0空，-1不可落子）
 */
function checkOthelloMove(board: number[][], { x, y }: { x: number, y: number }, player: number): false | number[][] {
  const size = board.length;
  if (board[x][y] !== 0) return false; // 已有子不能落子
  const directions = [
    [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]
  ];
  const opponent = player === 1 ? 2 : 1;
  let valid = false;
  const toFlip = [];

  for (const [dx, dy] of directions) {
    let nx = x + dx, ny = y + dy;
    let pieces = [];
    let foundOpponent = false;
    while (nx >= 0 && nx < size && ny >= 0 && ny < size) {
      if (board[nx][ny] === opponent) {
        pieces.push([nx, ny]);
        foundOpponent = true;
      } else if (board[nx][ny] === player && foundOpponent) {
        toFlip.push(...pieces);
        valid = true;
        break;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
    }
  }

  if (!valid) return false;

  // 生成新的棋盘状态
  const newBoard = board.map(row => row.slice());
  newBoard[x][y] = player;
  for (const [fx, fy] of toFlip) {
    newBoard[fx][fy] = player;
  }

  return markValidPlaces(newBoard, 3 - player);
}

function isValidPlace(board: number[][], { x, y }: { x: number; y: number }, player: number) {
  const piece = board[x][y];
  const size = board.length;
  if ([1, 2].includes(piece)) return false;

  const piecesValid: {x: number, y: number}[] = [];
  const pieces: {x: number, y: number}[] = [];

  function checkPieces(x: number, y: number) {
    const piece = board[x][y];
    if (![1, 2].includes(piece)) {
      return false;
    }
    if ((piece ^ player) === 3) {
      pieces.push({x, y});
    }
    if (piece === player) {
      piecesValid.push(...pieces);
      return false;
    }
  }

  for(let i = x - 1; i >= 0; i--) {
    if(checkPieces(i, y) === false) break;
  }

  pieces.length = 0;
  for(let i = x + 1; i < size; i++) {
    if(checkPieces(i, y) === false) break;
  }

  pieces.length = 0;
  for(let i = y - 1; i >= 0; i--) {
    if(checkPieces(x, i) === false) break;
  }

  pieces.length = 0;
  for(let i = y + 1; i < size; i++) {
    if(checkPieces(x, i) === false) break;
  }

  pieces.length = 0;
  for(let i = x - 1, j = y - 1; i >= 0 && j >= 0; i--, j--) {
    if(checkPieces(i, j) === false) break;
  }

  pieces.length = 0;
  for(let i = x + 1, j = y - 1; i < size && j >= 0; i++, j--) {
    if(checkPieces(i, j) === false) break;
  }

  pieces.length = 0;
  for(let i = x + 1, j = y + 1; i < size && j < size; i++, j++) {
    if(checkPieces(i, j) === false) break;
  }

  pieces.length = 0;
  for(let i = x - 1, j = y + 1; i >= 0 && j < size; i--, j++) {
    if(checkPieces(i, j) === false) break;
  }

  return piecesValid.length > 0;
}

function markValidPlaces(board: number[][], player: number) {
  const size = board.length;
  // 标记所有不可落子的位置
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if ([1, 2].includes(board[i][j])) continue;
      if (!isValidPlace(board, {x: i, y: j}, player))
        board[i][j] = -1;
      else
        board[i][j] = 0; 
    }
  }
  return board;

}

function isWin(board: number[][]): number | null {
  const placeCount = board.flat().filter(cell => cell === 0).length;
  const blackCount = board.flat().filter(cell => cell === 1).length;
  const whiteCount = board.flat().filter(cell => cell === 2).length;
  if (placeCount === 0 || blackCount === 0 || whiteCount === 0) {
    if (blackCount > whiteCount) return 1;
    else if (whiteCount > blackCount) return 2;
    else return 0; // 平局
  }
  return null; // 游戏未结束
}

export default function onRoom(room: Room) {
  const size = 8;
  let messageHistory: string[] = [];
  let currentPlayer: RoomPlayer;
  let lastLosePlayer: RoomPlayer | undefined;
  let gameStatus: 'waiting' | 'playing' = 'waiting';
  let board: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));

  let achivents: Record<string, { win: number; lost: number; draw: number }> = {};

  room.on('join', (player) => {
    room.validPlayers.find((p) => p.id === player.id)?.emit('command', {
      type: 'achivents',
      data: achivents
    });
  }).on('player-command', (message: any) => {
    console.log("room message:", message);
    const sender = room.validPlayers.find((p) => p.id == message.sender?.id)!;
    /**
     * # room command
     * - say: player say something
     * - status: game status update
     * - place: place piece
     * - request-draw: request draw
     * - request-lose: request lose
     * - draw: game draw
     * 
     * # player command
     * - color: send color to player
     * - request-draw: player request draw
     */
    switch (message.type) {
      case 'say':
        room.emit('message', `${message.data}`, sender);
        break;
      case 'status': {
        const playerIndex = room.validPlayers.findIndex((p) => p.id == message.data.id);
        const player = room.validPlayers[playerIndex];
        if (!player) break;
        player.emit('command', {
          type: 'status',
          data: {
            status: gameStatus,
            current: currentPlayer,
            messageHistory,
            board,
            color: player.attributes?.color,
            achivents: achivents
          }
        });
        break;
      }
      case 'place': {
        if (gameStatus !== 'playing') {
          sender.emit('message', `游戏未开始，无法落子。`);
          break;
        }
        if (sender.id !== currentPlayer.id) {
          sender.emit('message', `轮到玩家 ${currentPlayer.name} 落子。`);
          break;
        }
        const { x, y } = message.data;
        if (board[x][y] !== 0) {
          sender.emit('message', `该位置已有棋子，请重新落子。`);
          break;
        }
        const color = sender.attributes?.color;
        let result = checkOthelloMove(board, { x, y }, color);
        if (!result) {
          sender.emit('command', { type: 'board', data: board });
          sender.emit('message', `无效落子！`);
          return;
        }

        if (!result.flat().some(cell => cell === 0)) {
          room.emit('message', `${3 - color ? '黑' : '白'}方无法落子，跳过！`);
          currentPlayer = room.validPlayers.find((p) => p.id != currentPlayer.id)!;
          result = markValidPlaces(result, color);
          if (!result.flat().some(cell => cell === 0)) {
            room.emit('message', `双方均无法落子，结算！`);
          }
        }

        board = result;
        room.emit('command', { type: 'board', data: board });
        room.emit('command', { type: 'place', data: { x, y } });

        const winnerPlayer = isWin(board);
        if (winnerPlayer !== null) {
          // 棋盘已满，游戏结束
          let winner: RoomPlayer | null = null;
          if (winnerPlayer === 1) {
            room.emit('message', `玩家 ${room.validPlayers.find(p => p.attributes?.color === 1)?.name} 获胜！`);
            winner = room.validPlayers.find(p => p.attributes?.color === 1)!;
            lastLosePlayer = room.validPlayers.find(p => p.attributes?.color === 2)!;
          } else if (winnerPlayer === 2) {
            room.emit('message', `玩家 ${room.validPlayers.find(p => p.attributes?.color === 2)?.name} 获胜！`);
            winner = room.validPlayers.find(p => p.attributes?.color === 2)!;
            lastLosePlayer = room.validPlayers.find(p => p.attributes?.color === 1)!;
          } else {
            room.emit('message', `游戏以平局结束！`);
          }
          gameStatus = 'waiting';
          room.validPlayers.forEach((player) => {
            if (!achivents[player.name]) {
              achivents[player.name] = { win: 0, lost: 0, draw: 0 };
            }
            if (winner) {
              if (player.id == winner.id) {
                achivents[player.name].win += 1;
              } else {
                achivents[player.name].lost += 1;
              }
            } else {
              achivents[player.name].draw += 1;
            }
          });
          room.emit('command', { type: 'achivements', data: achivents });
          room.end();
          return;
        }
        // 切换当前玩家
        const current = room.validPlayers.find((p) => p.id != currentPlayer.id);
        if (current) {
          currentPlayer = current;
          room.emit('command', { type: 'place-turn', data: { player: currentPlayer } });
        }
        break;
      }
      case 'request-draw': {
        room.emit('message', `玩家 ${sender.name} 请求和棋。`);
        lastLosePlayer = sender;
        const otherPlayer = room.validPlayers.find((p) => p.id != sender.id)!;
        otherPlayer.emit('command', {
          type: 'request-draw',
          data: { player: sender }
        });
        room.emit('command', { type: 'achivements', data: achivents });
        break;
      }
      case 'request-lose': {
        room.emit('message', `玩家 ${sender.name} 认输。`);
        gameStatus = 'waiting';
        room.validPlayers.forEach((player) => {
          if (!achivents[player.name]) {
            achivents[player.name] = { win: 0, lost: 0, draw: 0 };
          }
          if (player.id == sender.id) {
            achivents[player.name].lost += 1;
          } else {
            achivents[player.name].win += 1;
          }
        });
        room.emit('command', { type: 'achivements', data: achivents });
        room.end();
        break;
      }
      case 'draw': {
        room.emit('message', `玩家 ${sender.name} 同意和棋，游戏结束。`);
        lastLosePlayer = room.validPlayers.find((p) => p.id != sender.id)!;
        gameStatus = 'waiting';
        room.validPlayers.forEach((player) => {
          if (!achivents[player.name]) {
            achivents[player.name] = { win: 0, lost: 0, draw: 0 };
          }
          achivents[player.name].draw += 1;
        });
        room.end();
        break;
      }
      default:
        break;
    }
  }).on('start', () => {
    console.log("room start");

    if (room.validPlayers.length < room.minSize) {
      return room.emit('message', `玩家人数不足，无法开始游戏。`);
    }
    if (!room.validPlayers.some((p) => p.id == lastLosePlayer?.id)) {
      lastLosePlayer = undefined;
    }
    currentPlayer = lastLosePlayer || room.validPlayers[0];
    board = Array.from({ length: size }, () => Array(size).fill(-1));
    // 初始化黑白棋起始位置
    board[size / 2 - 1][size / 2 - 1] = 2; // 白
    board[size / 2][size / 2] = 2;         // 白
    board[size / 2 - 1][size / 2] = 1;     // 黑
    board[size / 2][size / 2 - 1] = 1;     // 黑

    // 标记所有可落子的位置
    board[size / 2 - 2][size / 2 - 1] = 0;
    board[size / 2 - 1][size / 2 - 2] = 0;
    board[size / 2][size / 2 + 1] = 0;
    board[size / 2 + 1][size / 2] = 0;
    gameStatus = 'playing';
    messageHistory = [];

    gameStatus = 'playing';
    messageHistory = [];
    currentPlayer.attributes = { color: 1 }; // 黑子先行
    room.validPlayers.forEach((player) => {
      if (player.id !== currentPlayer.id) {
        player.attributes = { color: 2 }; // 白子
        player.emit('command', {
          type: 'color',
          data: { color: 2 }
        });
      } else {
        player.emit('command', {
          type: 'color',
          data: { color: 1 }
        });
      }
    });
    room.emit('command', { type: 'achivements', data: achivents });
    room.emit('message', `游戏开始。玩家 ${room.validPlayers[0].name} 执黑先行。`);
    room.emit('command', { type: 'place-turn', data: { player: currentPlayer } });
    room.emit('command', { type: 'board', data: board });
  }).on('end', () => {
    console.log("room end");
    room.emit('command', { type: 'end' });
  }).on('message', (message: string) => {
    messageHistory.unshift(message);
    if (messageHistory.length > 100) messageHistory.splice(messageHistory.length - 100);
  });
}

export const name = '黑白棋';
export const minSize = 2;
export const maxSize = 2;
export const description = `两个玩家轮流在8x8的棋盘上放置黑白棋子，通过夹击对方棋子将其翻转为己方颜色。
游戏结束时，棋盘上棋子数量多的一方获胜。`;