import { IRoomPlayer, Room, RoomPlayer } from "tiaoom";

/**
 * 四子棋落子与胜负检查
 * @param {number[][]} board - 当前棋盘二维数组
 * @param {number} y - 当前落子列
 * @param {number} player - 当前落子的棋子（1 黑棋，2 白棋）
 * @returns {false|true|number[][]} 不合法返回 false，胜利返回 true，否则返回最新棋盘
 */
function checkFourConnect(board: number[][], y: number, player: number): false | true | number[][] {
  const N = board.length;    // 行数
  const M = board[0].length; // 列数

  // 检查列是否合法
  if (y < 0 || y >= M) return false;

  // 找到该列最底部可落子的位置
  let x = -1;
  for (let i = N - 1; i >= 0; i--) {
    if (board[i][y] === 0) {
      x = i;
      break;
    }
  }
  // 如果该列已满或最底部不可落子
  if (x === -1 || board[x][y] === -1) return false;

  // 落子
  const newBoard = board.map(row => row.slice());
  newBoard[x][y] = player;

  // 激活上方格子
  if (x - 1 >= 0 && newBoard[x - 1][y] === -1) {
    newBoard[x - 1][y] = 0;
  }

  // 检查四连
  const directions = [
    { dx: 0, dy: 1 },  // 横向
    { dx: 1, dy: 0 },  // 纵向
    { dx: 1, dy: 1 },  // 主对角
    { dx: 1, dy: -1 }, // 副对角
  ];
  function count(dx: number, dy: number) {
    let cnt = 1; // 当前落子的这一颗计入

    // 正方向
    for (let step = 1; step < 4; step++) {
      let nx = x + dx * step;
      let ny = y + dy * step;
      if (
        nx >= 0 && nx < N &&
        ny >= 0 && ny < M &&
        newBoard[nx][ny] === player
      ) {
        cnt++;
      } else {
        break;
      }
    }

    // 反方向
    for (let step = 1; step < 4; step++) {
      let nx = x - dx * step;
      let ny = y - dy * step;
      if (
        nx >= 0 && nx < N &&
        ny >= 0 && ny < M &&
        newBoard[nx][ny] === player
      ) {
        cnt++;
      } else {
        break;
      }
    }

    return cnt;
  }
  for (const { dx, dy } of directions) {
    if (count(dx, dy) >= 4) {
      board[x][y] = player;
      return true;
    }
  }

  return newBoard;
}

export default function onRoom(room: Room) {
  let messageHistory: { content: string, sender?: IRoomPlayer }[] = [];
  let currentPlayer: RoomPlayer;
  let lastLosePlayer: RoomPlayer | undefined;
  let gameStatus: 'waiting' | 'playing' = 'waiting';
  let board: number[][] = Array.from({ length: 8 }, () => Array(8).fill(-1));
  let achivents: Record<string, { win: number; lost: number; draw: number }> = {};

  room.on('join', (player) => {
    room.validPlayers.find((p) => p.id === player.id)?.emit('command', {
      type: 'achivents',
      data: achivents
    });
  }).on('leave', (player) => {
    if (gameStatus === 'playing' && player.role === 'player') {
      room.emit('message', { content: `玩家 ${player.name} 离开游戏，游戏结束。` });
      lastLosePlayer = room.validPlayers.find((p) => p.id != player.id)!;
      gameStatus = 'waiting';
      room.validPlayers.forEach((p) => {
        if (!achivents[p.name]) {
          achivents[p.name] = { win: 0, lost: 0, draw: 0 };
        }
        if (p.id == player.id) {
          achivents[p.name].lost += 1;
        } else {
          achivents[p.name].win += 1;
        }
      });
      room.emit('command', { type: 'achivements', data: achivents });
      room.end();
    }
  }).on('player-command', (message: any) => {
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
        room.emit('message', { content: `${message.data}`, sender });
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
          sender.emit('message', { content: `游戏未开始，无法落子。` });
          break;
        }
        if (sender.id !== currentPlayer.id) {
          sender.emit('message', { content: `轮到玩家 ${currentPlayer.name} 落子。` });
          break;
        }

        const { x, y } = message.data;

        const color = currentPlayer.attributes?.color;
        const result = checkFourConnect(board, y, color);

        if (!result) {
          sender.emit('command', { type: 'board', data: board });
          sender.emit('message', { content: `无效落子！` });
          return;
        }

        if (result == true) {
          room.emit('command', { type: 'board', data: board });
          room.emit('message', { content: `玩家 ${sender.name} 获胜！` });
          lastLosePlayer = room.validPlayers.find((p) => p.id != sender.id)!;
          gameStatus = 'waiting';
          room.validPlayers.forEach((player) => {
            if (!achivents[player.name]) {
              achivents[player.name] = { win: 0, lost: 0, draw: 0 };
            }
            if (player.id == sender.id) {
              achivents[player.name].win += 1;
            } else {
              achivents[player.name].lost += 1;
            }
          });
          room.emit('command', { type: 'achivements', data: achivents });
          room.end();
          return;
        }
        
        board = result;
        room.emit('command', { type: 'board', data: board });
        room.emit('command', { type: 'place', data: { x, y } });

        // 切换当前玩家
        const current = room.validPlayers.find((p) => p.id != currentPlayer.id);
        if (current) {
          currentPlayer = current;
          room.emit('command', { type: 'place-turn', data: { player: currentPlayer } });
        }
        break;
      }
      case 'request-draw': {
        room.emit('message', { content: `玩家 ${sender.name} 请求和棋。` });
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
        room.emit('message', { content: `玩家 ${sender.name} 认输。` });
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
        room.emit('message', { content: `玩家 ${sender.name} 同意和棋，游戏结束。` });
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
    if (room.validPlayers.length < room.minSize) {
      return room.emit('message', { content: `玩家人数不足，无法开始游戏。` });
    }
    if (!room.validPlayers.some((p) => p.id == lastLosePlayer?.id)) {
      lastLosePlayer = undefined;
    }
    currentPlayer = lastLosePlayer || room.validPlayers[0];
    board = Array.from({ length: 8 }, () => Array(8).fill(-1));
    board[board.length - 1] = board[board.length - 1].map(() => 0);
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
    room.emit('message', { content: `游戏开始。玩家 ${currentPlayer.name} 执黑先行。` });
    room.emit('command', { type: 'place-turn', data: { player: currentPlayer } });
    room.emit('command', { type: 'board', data: board });
  }).on('end', () => {
    room.emit('command', { type: 'end' });
  }).on('message', (message: { content: string; sender?: IRoomPlayer }) => {
    messageHistory.unshift(message);
    if (messageHistory.length > 100) messageHistory.splice(messageHistory.length - 100);
  });
}

export const name = '四子棋';
export const minSize = 2;
export const maxSize = 2;
export const description = `两个玩家轮流在棋盘上放置自己的棋子，率先将四个棋子连成一线（横、竖、斜均可）的一方获胜。
棋子只能放置在底部或已有棋子之上。`;