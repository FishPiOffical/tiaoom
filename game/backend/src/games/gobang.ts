import { IRoomPlayer, Room, RoomPlayer, RoomStatus } from "tiaoom";

/**
 * 判断五子棋胜负情况与禁手
 * @param {number[][]} board 19*19二维数组，0未落子，1黑子，2白子
 * @param {number} x 当前落子行索引
 * @param {number} y 当前落子列索引
 * @param {number} color 当前落子颜色，1黑子，2白子
 * @returns {number} 1黑胜，2白胜，0未分胜负，-1黑棋禁手
 */
function gomokuJudge(board: number[][], { x, y }: { x: number, y: number }, color: number): number {
  const SIZE = 19;
  const directions = [
    [1, 0],   // 横
    [0, 1],   // 竖
    [1, 1],   // 主对角线
    [1, -1]   // 副对角线
  ];

  // 判断direction方向上的连续同色棋子数、两端状态
  function countContinuous(dir: number[]) {
    let [dx, dy] = dir;
    let count = 1;
    let minX = x, minY = y, maxX = x, maxY = y;
    // 向正方向
    for (let step = 1; step < SIZE; step++) {
      let nx = x + dx * step, ny = y + dy * step;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE || board[nx][ny] !== color) break;
      count++;
      maxX = nx; maxY = ny;
    }
    // 向反方向
    for (let step = 1; step < SIZE; step++) {
      let nx = x - dx * step, ny = y - dy * step;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE || board[nx][ny] !== color) break;
      count++;
      minX = nx; minY = ny;
    }
    return { count, minX, minY, maxX, maxY, dx, dy };
  }

  // 检查是否有五连
  for (let dir of directions) {
    let res = countContinuous(dir);
    if (res.count === 5) {
      return color;
    }
  }

  // 黑棋禁手判断（仅对黑棋有效）
  if (color === 1) {
    // 长连禁手（>5）
    for (let dir of directions) {
      let res = countContinuous(dir);
      if (res.count > 5) {
        return -1; // 长连禁手
      }
    }

    // 活四/活三辅助：在direction方向连length个棋，且两端均为空
    function countAlive(length: number) {
      let aliveCount = 0;
      for (let dir of directions) {
        let { count, minX, minY, maxX, maxY, dx, dy } = countContinuous(dir);
        if (count === length) {
          // 判断两端是否为空（活）
          let beforeX = minX - dx, beforeY = minY - dy;
          let afterX = maxX + dx, afterY = maxY + dy;
          let beforeEmpty = beforeX >= 0 && beforeX < SIZE && beforeY >= 0 && beforeY < SIZE && board[beforeX][beforeY] === 0;
          let afterEmpty = afterX >= 0 && afterX < SIZE && afterY >= 0 && afterY < SIZE && board[afterX][afterY] === 0;
          if (beforeEmpty && afterEmpty) aliveCount++;
        }
      }
      return aliveCount;
    }

    // 双活四禁手
    if (countAlive(4) >= 2) return -1;
    // 双活三禁手
    if (countAlive(3) >= 2) return -1;
  }

  // 白子胜利判断（和黑子一样，只需五连，不判禁手）
  if (color === 2) {
    for (let dir of directions) {
      let res = countContinuous(dir);
      if (res.count === 5) {
        return 2;
      }
    }
  }

  // 未分胜负
  return 0;
}

export default function onRoom(room: Room) {
  console.log("room:", room);
  let messageHistory: { message: string, sender?: IRoomPlayer }[] = [];
  let currentPlayer: RoomPlayer;
  let lastLosePlayer: RoomPlayer | undefined;
  let gameStatus: 'waiting' | 'playing' = 'waiting';
  let board: number[][] = Array.from({ length: 19 }, () => Array(19).fill(0));
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
        const result = gomokuJudge(board, { x, y }, color);
        if (result === -1) {
          sender.emit('command', { type: 'board', data: board });
          sender.emit('message', `玩家 ${sender.name} 触发禁手，撤回落子！`);
          return;
        }

        board[x][y] = color;
        room.emit('command', { type: 'board', data: board });
        room.emit('command', { type: 'place', data: { x, y } });

        if (result === color) {
          room.emit('message', `玩家 ${sender.name} 获胜！`);
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
    board = Array.from({ length: 19 }, () => Array(19).fill(0));
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
  }).on('message', (message: string, sender?: IRoomPlayer) => {
    messageHistory.unshift({ message, sender });
    if (messageHistory.length > 100) messageHistory.splice(messageHistory.length - 100);
  });
}

export const name = '五子棋';
export const minSize = 2;
export const maxSize = 2;
export const description = `两个玩家轮流在19x19的棋盘上放置黑白棋子，率先将五个棋子连成一线（横、竖、斜均可）的一方获胜。
黑棋需注意禁手规则。`;