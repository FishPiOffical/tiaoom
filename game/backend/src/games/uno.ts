import { Room, PlayerStatus } from "tiaoom";
import { IGameMethod } from "./index";

export const name = "UNO";
export const minSize = 2;
export const maxSize = 4;
export const description = "经典的UNO纸牌游戏，匹配颜色或数字，先出完牌的玩家获胜";

export interface UnoCard {
  id: string;
  color: 'red' | 'blue' | 'green' | 'yellow' | 'black';
  value: string;
  type: 'number' | 'action' | 'wild';
}

export interface UnoGameState {
  deck: UnoCard[];
  discardPile: UnoCard[];
  players: { [playerId: string]: UnoCard[] };
  currentPlayer: string;
  direction: 1 | -1;
  color: 'red' | 'blue' | 'green' | 'yellow';
  drawCount: number;
  winner?: string;
  turnStartTime?: number;
  turnTimeout?: number;
  turnTimeLeft?: number; // 剩余时间（秒）
}

const createDeck = (): UnoCard[] => {
  const newDeck: UnoCard[] = [];
  const colors: ('red' | 'blue' | 'green' | 'yellow')[] = ['red', 'blue', 'green', 'yellow'];
  
  // 数字牌 (0-9)
  colors.forEach(color => {
    // 0只有一张
    newDeck.push({ id: `${color}-0`, color, value: '0', type: 'number' });
    // 1-9各有两张
    for (let i = 1; i <= 9; i++) {
      newDeck.push({ id: `${color}-${i}-1`, color, value: i.toString(), type: 'number' });
      newDeck.push({ id: `${color}-${i}-2`, color, value: i.toString(), type: 'number' });
    }
  });
  
  // 功能牌
  colors.forEach(color => {
    // Skip (跳过)
    newDeck.push({ id: `${color}-skip-1`, color, value: 'skip', type: 'action' });
    newDeck.push({ id: `${color}-skip-2`, color, value: 'skip', type: 'action' });
    // Reverse (反转)
    newDeck.push({ id: `${color}-reverse-1`, color, value: 'reverse', type: 'action' });
    newDeck.push({ id: `${color}-reverse-2`, color, value: 'reverse', type: 'action' });
    // Draw Two (+2)
    newDeck.push({ id: `${color}-draw2-1`, color, value: 'draw2', type: 'action' });
    newDeck.push({ id: `${color}-draw2-2`, color, value: 'draw2', type: 'action' });
  });
  
  // 万能牌
  for (let i = 0; i < 4; i++) {
    // Wild (变色)
    newDeck.push({ id: `wild-${i}`, color: 'black', value: 'wild', type: 'wild' });
    // Wild Draw Four (+4)
    newDeck.push({ id: `wild-draw4-${i}`, color: 'black', value: 'wild_draw4', type: 'wild' });
  }
  
  return newDeck;
};

const shuffleDeck = (deck: UnoCard[]): UnoCard[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default async function onRoom(room: Room, { save, restore }: IGameMethod) {
  // 尝试恢复游戏状态
  const gameData = await restore();
  let gameState: UnoGameState | null = gameData?.gameState || null;
  let achievements: Record<string, { win: number; lost: number }> = gameData?.achievements || {};
  let messageHistory: { content: string, sender?: any }[] = gameData?.messageHistory || [];
  let moveHistory: Array<{player: string, action: any, timestamp: number}> = gameData?.moveHistory || [];
  
  // 倒计时配置
  const TURN_TIMEOUT = 15000; // 15秒倒计时
  let currentTimeout: NodeJS.Timeout | null = null;
  let countdownInterval: NodeJS.Timeout | null = null;
  
  // 如果有游戏状态且游戏未结束，设置所有玩家为playing状态
  if (gameState && !gameState.winner) {
    room.players.forEach(player => {
      if (player.role === 'player') {
        player.status = PlayerStatus.playing;
      }
    });
  }
  
  // 持久化函数
  const saveGameData = async () => {
    try {
      await save({
        gameState,
        achievements,
        messageHistory,
        moveHistory,
        lastSaved: Date.now(),
        gameVersion: '1.0'
      });
    } catch (error) {
      console.error('Failed to save game data:', error);
    }
  };
  
  const startGame = async () => {
    const deck = shuffleDeck(createDeck());
    const playerIds = room.validPlayers.map(p => p.id); // 只包含实际参与游戏的玩家
    
    // 每个玩家发7张牌
    const hands: { [playerId: string]: UnoCard[] } = {};
    playerIds.forEach(playerId => {
      hands[playerId] = [];
      for (let i = 0; i < 7; i++) {
        const card = deck.pop();
        if (card) hands[playerId].push(card);
      }
    });
    
    // 翻开第一张牌作为弃牌堆
    let firstCard = deck.pop()!;
    // 如果第一张是万能牌，重新洗牌
    while (firstCard.type === 'wild' && deck.length > 0) {
      deck.unshift(firstCard);
      const newDeck = [...deck];
      for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
      }
      firstCard = newDeck.pop()!;
      deck.length = 0;
      deck.push(...newDeck);
    }
    
    gameState = {
      deck,
      discardPile: [firstCard],
      players: hands,
      currentPlayer: playerIds[0],
      direction: 1,
      color: firstCard.color as 'red' | 'blue' | 'green' | 'yellow',
      drawCount: 0
    };
    
    // 设置所有玩家状态为playing（确保房间状态正确）
    room.players.forEach(player => {
      if (player.role === 'player') {
        player.status = PlayerStatus.playing;
      }
    });
    
    // 保存游戏状态
    await saveGameData();
    
    room.emit('command', { type: 'game:state', data: gameState });
    room.emit('command', { type: 'achievements', data: achievements });
    room.emit('message', { content: `UNO游戏开始！${room.validPlayers[0]?.name} 先出牌` });
    
    // 开始第一回合的倒计时
    startTurnTimer();
  };
  
  const canPlayCard = (card: UnoCard, topCard: UnoCard, currentColor: string): boolean => {
    if (card.type === 'wild') return true;
    if (card.color === currentColor) return true;
    if (card.value === topCard.value) return true;
    return false;
  };
  
  const getNextPlayer = (players: string[], currentPlayer: string, direction: 1 | -1): string => {
    const currentIndex = players.indexOf(currentPlayer);
    const nextIndex = (currentIndex + direction + players.length) % players.length;
    return players[nextIndex];
  };

  // 倒计时管理函数
  const startTurnTimer = () => {
    if (currentTimeout) {
      clearTimeout(currentTimeout);
    }
    
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    
    if (gameState && !gameState.winner) {
      gameState.turnStartTime = Date.now();
      gameState.turnTimeout = TURN_TIMEOUT;
      gameState.turnTimeLeft = TURN_TIMEOUT / 1000; // 转换为秒
      
      currentTimeout = setTimeout(() => {
        handleTimeout();
      }, TURN_TIMEOUT);
      
      // 每秒更新剩余时间
      countdownInterval = setInterval(() => {
        if (gameState && gameState.turnTimeLeft !== undefined) {
          gameState.turnTimeLeft = Math.max(0, gameState.turnTimeLeft - 1);
          
              // 发送倒计时更新（使用 command 事件以匹配 Room 事件类型）
              room.emit('command', { type: 'game:timer_update', data: { turnTimeLeft: gameState.turnTimeLeft } });
          
              // 当倒计时结束时清除定时器（先检查非 null）
              if (gameState.turnTimeLeft <= 0) {
                if (countdownInterval) {
                  clearInterval(countdownInterval);
                  countdownInterval = null;
                }
              }
        }
      }, 1000);
    }
  };

  const handleTimeout = async () => {
    if (!gameState || gameState.winner) return;
    
    const currentPlayerId = gameState.currentPlayer;
    const currentPlayerSocket = room.players.find(p => p.id === currentPlayerId);
    
    if (currentPlayerSocket) {
      // 自动抽一张牌
      if (gameState.deck.length > 0) {
        const drawnCard = gameState.deck.pop()!;
        gameState.players[currentPlayerId].push(drawnCard);
        room.emit('message', { content: `${currentPlayerSocket.name} 超时，自动抽了一张牌` });
      }
      
      // 切换到下一个玩家
      const nextPlayerId = getNextPlayer(Object.keys(gameState.players), gameState.currentPlayer, gameState.direction);
      const nextPlayer = room.players.find(p => p.id === nextPlayerId);
      if (nextPlayer) {
        room.emit('message', { content: `轮到 ${nextPlayer.name} 出牌` });
      }
      gameState.currentPlayer = nextPlayerId;
      
      // 处理累积抽牌
      if (gameState.drawCount > 0) {
        const nextHand = gameState.players[nextPlayerId];
        for (let i = 0; i < gameState.drawCount && gameState.deck.length > 0; i++) {
          const drawnCard = gameState.deck.pop();
          if (drawnCard) nextHand.push(drawnCard);
        }
        gameState.drawCount = 0;
      }
      
      // 保存状态并发送更新
      await saveGameData();
      room.emit('command', { type: 'game:state', data: gameState });
      
      // 开始下一回合的倒计时
      startTurnTimer();
    }
  };

  const clearTurnTimer = () => {
    if (currentTimeout) {
      clearTimeout(currentTimeout);
      currentTimeout = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  };

  // 监听玩家加入
  room.on('join', (player) => {
    const playerSocket = room.players.find((p) => p.id === player.id);
    if (!playerSocket) return;
    
    console.log(`玩家 ${player.name} (${player.id}) 以 ${player.role} 身份加入房间，游戏状态:`, gameState ? '存在' : '不存在');
    
    // 发送当前成就给新加入的玩家
    playerSocket.emit('command', {
      type: 'achievements',
      data: achievements
    });
    
    // 发送消息历史给新加入的玩家
    playerSocket.emit('command', {
      type: 'message_history',
      data: messageHistory
    });
    
    // 如果游戏正在进行，发送完整的游戏数据给新加入的玩家
    if (gameState) {
      console.log(`向玩家 ${player.name} 发送游戏状态`);
      // 先发送游戏状态
      playerSocket.emit('command', {
        type: 'game:state',
        data: gameState
      });
      
      // 然后发送完整的恢复数据（包括历史记录等）
      playerSocket.emit('command', {
        type: 'game:full_restore',
        data: {
          gameState,
          achievements,
          messageHistory,
          moveHistory,
          lastSaved: Date.now(),
          gameVersion: '1.0'
        }
      });
    }
    
    // 发送当前房间状态
    const roomStatus = gameState ? (gameState.winner ? 'ended' : 'playing') : 'waiting'
    console.log(`向玩家 ${player.name} 发送房间状态: ${roomStatus}`);
    playerSocket.emit('command', {
      type: 'status',
      data: {
        status: roomStatus,
        messageHistory
      }
    });
  }).on('leave', async (player) => {
    // 如果游戏进行中玩家离开，算作失败
    if (gameState && player.role === 'player') {
      room.players.forEach((p) => {
        if (p.role !== 'player') return; // 只为实际玩家处理成就
        if (!achievements[p.name]) {
          achievements[p.name] = { win: 0, lost: 0 };
        }
        if (p.id === player.id) {
          achievements[p.name].lost += 1;
        } else {
          achievements[p.name].win += 1;
        }
      });
      await saveGameData();
      room.emit('command', { type: 'achievements', data: achievements });
    }
  }).on('message', async (message: { content: string, sender?: any }) => {
    // 处理消息历史
    messageHistory.unshift(message);
    if (messageHistory.length > 100) {
      messageHistory = messageHistory.slice(0, 100);
    }
    await saveGameData();
  });

  // 监听房间的 start 事件
  room.on('start', () => {
    if (!gameState && room.validPlayers.length >= room.minSize) {
      startGame();
    }
  });

  // 监听房间的 end 事件
  room.on('end', () => {
    // 重置游戏状态，为下一局做准备
    gameState = null;
  });

  return room.on('player-command', async (message: any) => {
    console.log('收到完整的player-command消息:', JSON.stringify(message, null, 2));
    
    // 先打印所有玩家，用于调试
    console.log('当前房间所有玩家:', room.players.map(p => ({ id: p.id, name: p.name, role: p.role })));
    
    const sender = room.players.find((p) => p.id === message.sender?.id);
    if (!sender) {
      console.log('未找到发送者:', message.sender?.id);
      console.log('对比所有玩家ID:', room.players.map(p => p.id));
      return;
    }
    
    // 添加调试日志
    console.log(`收到命令 - 类型: ${message.type}, 发送者: ${sender.name} (${sender.role}), gameState存在: ${!!gameState}`);
    
    // 处理状态更新消息（包括准备状态）- 只处理来自游戏系统的状态更新，不处理玩家的状态请求
    if (message.type === 'status' && message.data && typeof message.data.status !== 'undefined' && !message.sender) {
      // 这是来自游戏系统的状态更新消息，不是玩家的状态请求
      // 不需要手动开始游戏，房间状态管理会自动处理
      return;
    }
    

    
    // 处理聊天消息
    if (message.type === 'say') {
      if (sender.role === 'watcher') {
        // 游戏进行中观众发言仅广播给其他观众
        if (room.status === 'playing') {
          room.watchers.forEach((watcher) => {
            watcher.emit('message', { content: message.data, sender });
          });
          return;
        } else {
          sender.emit('message', { content: '围观用户不能发言。' });
          return;
        }
      }
      room.emit('message', { content: message.data, sender });
      return;
    }
    
    // 处理游戏状态相关的命令（围观玩家需要这些命令来获取状态）
    const commandType = message.type || message.data?.type;
    if (commandType === 'status' || commandType === 'game:state' || commandType === 'game:full_restore' || commandType === 'achievements' || commandType === 'message_history') {
      // 这些命令可以在任何状态下处理
    } else if (!gameState) {
      // 其他游戏相关命令需要游戏已开始
      // 游戏未开始，只处理状态更新和开始命令
      return;
    }
    
    // 游戏已结束，只允许状态更新和状态查询命令
    if (gameState?.winner && !['status', 'game:state', 'game:full_restore', 'achievements', 'message_history'].includes(commandType)) {
      return;
    }
    
    switch (commandType) {
      case 'uno:play_card': {
        if (!gameState || gameState.currentPlayer !== sender.id) return;
        
        const { cardId, chosenColor } = message.data || message.data.data;
        const playerHand = gameState.players[sender.id];
        const cardIndex = playerHand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;
        
        const card = playerHand[cardIndex];
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        
        // 检查是否可以出牌
        if (!canPlayCard(card, topCard, gameState.color)) {
          return;
        }
        
        // 出牌
        playerHand.splice(cardIndex, 1);
        gameState.discardPile.push(card);
        
        // 发送出牌系统消息
        const cardName = card.type === 'wild' ? 
          (card.value === 'wild' ? '变色牌' : '变色+4') : 
          `${card.color === 'red' ? '红' : card.color === 'blue' ? '蓝' : card.color === 'green' ? '绿' : '黄'}${card.value}`;
        room.emit('message', { content: `${sender.name} 出了 ${cardName}` });
        
        // 处理特殊牌效果
        if (card.type === 'wild') {
          if (chosenColor && ['red', 'blue', 'green', 'yellow'].includes(chosenColor)) {
            gameState.color = chosenColor as 'red' | 'blue' | 'green' | 'yellow';
            room.emit('message', { content: `${sender.name} 将颜色改为${chosenColor === 'red' ? '红色' : chosenColor === 'blue' ? '蓝色' : chosenColor === 'green' ? '绿色' : '黄色'}` });
          } else {
            // 随机选择颜色
            const colors: ('red' | 'blue' | 'green' | 'yellow')[] = ['red', 'blue', 'green', 'yellow'];
            gameState.color = colors[Math.floor(Math.random() * colors.length)];
            room.emit('message', { content: `${sender.name} 随机选择了颜色` });
          }
          
          if (card.value === 'wild_draw4') {
            gameState.drawCount += 4;
            room.emit('message', { content: `下家需要抽4张牌！` });
          }
        } else {
          gameState.color = card.color as 'red' | 'blue' | 'green' | 'yellow';
          
          switch (card.value) {
            case 'skip':
              // 跳过下一个玩家
              const nextPlayer = getNextPlayer(Object.keys(gameState.players), gameState.currentPlayer, gameState.direction);
              const skippedPlayer = room.players.find(p => p.id === nextPlayer);
              room.emit('message', { content: `${skippedPlayer?.name} 被跳过了！` });
              gameState.currentPlayer = nextPlayer;
              break;
            case 'reverse':
              // 反转方向
              gameState.direction = (gameState.direction * -1) as 1 | -1;
              room.emit('message', { content: `方向反转！现在是${gameState.direction === 1 ? '顺时针' : '逆时针'}` });
              if (Object.keys(gameState.players).length === 2) {
                // 两人游戏中反转等于跳过
                const nextPlayer = getNextPlayer(Object.keys(gameState.players), gameState.currentPlayer, gameState.direction);
                const skippedPlayer = room.players.find(p => p.id === nextPlayer);
                room.emit('message', { content: `${skippedPlayer?.name} 被跳过了！` });
                gameState.currentPlayer = nextPlayer;
              }
              break;
            case 'draw2':
              gameState.drawCount += 2;
              room.emit('message', { content: `下家需要抽2张牌！` });
              break;
          }
        }
        
        // 检查是否获胜
        if (playerHand.length === 0) {
          gameState.winner = sender.id;
          room.emit('message', { content: `🎉 恭喜 ${sender.name} 获得胜利！` });
          
          // 更新成就
          room.players.forEach((p) => {
            if (p.role !== 'player') return; // 只为实际玩家更新成就
            if (!achievements[p.name]) {
              achievements[p.name] = { win: 0, lost: 0 };
            }
            if (p.id === sender.id) {
              achievements[p.name].win += 1;
            } else {
              achievements[p.name].lost += 1;
            }
          });
          
          // 保存成就和最终状态
          await saveGameData();
          
          room.emit('command', { type: 'game:over', data: { winner: sender.id } });
          room.emit('command', { type: 'achievements', data: achievements });
          
          // 设置所有玩家状态为unready（游戏结束）
          room.players.forEach(player => {
            if (player.role === 'player') {
              player.status = PlayerStatus.unready;
            }
          });
          
          // 不立即调用 room.end()，让玩家可以查看结果
          // 等待下一局游戏开始时再重置
          return;
        }
        
        // 下一个玩家
        const nextPlayerId = getNextPlayer(Object.keys(gameState.players), gameState.currentPlayer, gameState.direction);
        const nextPlayer = room.players.find(p => p.id === nextPlayerId);
        if (nextPlayer) {
          room.emit('message', { content: `轮到 ${nextPlayer.name} 出牌` });
        }
        gameState.currentPlayer = nextPlayerId;
        
        // 处理抽牌累积
        if (gameState.drawCount > 0) {
          const nextPlayerId = getNextPlayer(Object.keys(gameState.players), gameState.currentPlayer, gameState.direction);
          const nextHand = gameState.players[nextPlayerId];
          let canBlock = false;
          
          // 检查下一个玩家是否有+2或+4可以反击
          for (const card of nextHand) {
            if ((card.value === 'draw2' && gameState.drawCount >= 2) || 
                (card.value === 'wild_draw4' && gameState.drawCount >= 4)) {
              canBlock = true;
              break;
            }
          }
          
          if (!canBlock) {
            // 强制抽牌
            for (let i = 0; i < gameState.drawCount && gameState.deck.length > 0; i++) {
              const drawnCard = gameState.deck.pop();
              if (drawnCard) nextHand.push(drawnCard);
            }
            gameState.drawCount = 0;
          }
        }
        
        // 如果牌堆用完了，重新洗牌
        if (gameState.deck.length === 0 && gameState.discardPile.length > 1) {
          const topCard = gameState.discardPile.pop()!;
          gameState.deck = shuffleDeck(gameState.discardPile);
          gameState.discardPile = [topCard];
        }
        
        // 记录移动历史
        moveHistory.push({
          player: sender.id,
          action: { type: 'play_card', cardId, chosenColor },
          timestamp: Date.now()
        });
        
        // 保存游戏状态
        await saveGameData();
        
        room.emit('command', { type: 'game:state', data: gameState });
        
        // 重置倒计时开始下一回合
        if (!gameState.winner) {
          startTurnTimer();
        }
        break;
      }
      
      case 'uno:draw_card': {
        if (!gameState || gameState.currentPlayer !== sender.id) {
          return;
        }
        
        // 如果有累积抽牌，必须抽完
        if (gameState.drawCount > 0) {
          const playerHand = gameState.players[sender.id];
          for (let i = 0; i < gameState.drawCount && gameState.deck.length > 0; i++) {
            const drawnCard = gameState.deck.pop();
            if (drawnCard) playerHand.push(drawnCard);
          }
          room.emit('message', { content: `${sender.name} 强制抽了 ${gameState.drawCount} 张牌` });
          gameState.drawCount = 0;
        } else {
          // 正常抽一张牌
          if (gameState.deck.length === 0) return;
          
          const drawnCard = gameState.deck.pop()!;
          gameState.players[sender.id].push(drawnCard);
          room.emit('message', { content: `${sender.name} 抽了一张牌` });
        }
        
        // 下一个玩家
        const nextPlayerId = getNextPlayer(Object.keys(gameState.players), gameState.currentPlayer, gameState.direction);
        const nextPlayer = room.players.find(p => p.id === nextPlayerId);
        if (nextPlayer) {
          room.emit('message', { content: `轮到 ${nextPlayer.name} 出牌` });
        }
        gameState.currentPlayer = nextPlayerId;
        
        // 记录移动历史
        moveHistory.push({
          player: sender.id,
          action: { type: 'draw_card' },
          timestamp: Date.now()
        });
        
        // 保存游戏状态
        await saveGameData();
        
        room.emit('command', { type: 'game:state', data: gameState });
        
        // 重置倒计时开始下一回合
        if (!gameState.winner) {
          startTurnTimer();
        }
        break;
      }
      
      case 'uno:call': {
        if (!gameState) return;
        const playerHand = gameState.players[sender.id];
        if (playerHand.length === 1) {
          room.emit('command', { type: 'uno:called', data: sender.id });
          room.emit('message', { content: `${sender.name} 喊 UNO！` });
        }
        break;
      }
      
      case 'status': {
        // 发送房间状态（游戏是否开始）
        const roomStatus = gameState ? (gameState.winner ? 'ended' : 'playing') : 'waiting'
        console.log(`处理status请求 - 请求者: ${sender.name} (${sender.role}), gameState存在: ${!!gameState}, 状态: ${roomStatus}`)
        sender.emit('command', { 
          type: 'status', 
          data: { 
            status: roomStatus,
            messageHistory
          } 
        });
        break;
      }
      
      case 'game:state': {
        // 发送当前游戏状态（用于刷新时恢复）
        console.log(`处理game:state请求 - 请求者: ${sender.name} (${sender.role}), gameState存在: ${!!gameState}`)
        if (gameState) {
          sender.emit('command', { type: 'game:state', data: gameState });
        } else {
          console.log(`gameState为空，无法发送游戏状态给 ${sender.name}`)
        }
        break;
      }
      
      case 'game:full_restore': {
        // 发送完整的游戏数据（包括历史记录等）
        console.log(`处理game:full_restore请求 - 请求者: ${sender.name} (${sender.role}), gameState存在: ${!!gameState}`)
        if (gameState) {
          sender.emit('command', { 
            type: 'game:full_restore', 
            data: {
              gameState,
              achievements,
              messageHistory,
              moveHistory,
              lastSaved: Date.now(),
              gameVersion: '1.0'
            }
          });
        } else {
          console.log(`gameState为空，无法发送完整恢复数据给 ${sender.name}`)
        }
        break;
      }
      
    }
  });
}