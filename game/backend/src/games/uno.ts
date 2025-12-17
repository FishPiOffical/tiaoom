import { Room, PlayerStatus } from "tiaoom";
import { IGameMethod } from "./index";

export const name = "UNO";
export const minSize = 2;
export const maxSize = 6;
export const description = "经典的UNO纸牌游戏（最多6人），匹配颜色或数字，先出完牌的玩家获胜";

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
  winner?: string;
  turnStartTime?: number;
  turnTimeout?: number;
  turnTimeLeft?: number; // 剩余时间（秒）
  // 托管状态：playerId -> true 表示该玩家被托管
  hosted?: { [playerId: string]: boolean };
  // +4质疑状态：记录哪个+4牌已经被处理过（质疑或接受惩罚）
  wildDraw4Processed?: boolean;
  // +2惩罚状态：记录+2惩罚是否已被处理
  draw2Processed?: boolean;
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
    
    // 恢复倒计时状态 - 延迟到函数定义后执行
    setTimeout(() => {
      if (gameState && !gameState.winner && gameState.turnStartTime && gameState.turnTimeout && gameState.turnTimeLeft !== undefined) {
        const elapsed = Date.now() - gameState.turnStartTime;
        const remaining = gameState.turnTimeout - elapsed;
        
        if (remaining > 0) {
          // 还有剩余时间，继续倒计时
          gameState.turnTimeLeft = Math.ceil(remaining / 1000);
          
          currentTimeout = setTimeout(() => {
            handleTimeout();
          }, remaining);
          
          console.log(`恢复倒计时: ${gameState.turnTimeLeft}秒`);
        } else {
          // 倒计时已过期，立即处理超时
          handleTimeout();
        }
      } else if (gameState && !gameState.winner) {
          // 没有倒计时状态，开始新的倒计时（如果当前玩家被托管则缩短为5秒）
          const initialTimeout = gameState.hosted && gameState.currentPlayer && gameState.hosted[gameState.currentPlayer] ? 5000 : TURN_TIMEOUT;
          startTurnTimer(initialTimeout);
        }
    }, 0);
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
    // 清除任何现有的倒计时
    clearTurnTimer();
    
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
      wildDraw4Processed: false,
      draw2Processed: false
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
    const initialTimeout = gameState.hosted && gameState.currentPlayer && gameState.hosted[gameState.currentPlayer] ? 5000 : TURN_TIMEOUT;
    startTurnTimer(initialTimeout);
  };
  
  // 检查是否可以出+4（官方规则：只有在没有任何合法可出的牌时才能使用+4）
  const canPlayWildDraw4 = (hand: UnoCard[], topCard: UnoCard, currentColor: string): boolean => {
    // 检查手牌中是否有任何可出的牌
    for (const card of hand) {
      // 跳过所有变色牌（包括普通变色牌和+4牌），它们不算作"可出的牌"
      if (card.type === 'wild') {
        continue;
      }
      // 检查颜色匹配
      if (card.color === currentColor) {
        return false; // 有相同颜色的牌，不能出+4
      }
      // 检查数字/功能匹配
      if (card.value === topCard.value) {
        return false; // 有相同功能的牌，不能出+4
      }
    }
    return true; // 没有任何合法可出的牌，可以使用+4
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

  const getPreviousPlayer = (players: string[], currentPlayer: string, direction: 1 | -1): string => {
    const currentIndex = players.indexOf(currentPlayer);
    const prevIndex = (currentIndex - direction + players.length) % players.length;
    return players[prevIndex];
  };

  // 倒计时管理函数
  const startTurnTimer = (timeoutMs?: number) => {
    if (currentTimeout) {
      clearTimeout(currentTimeout);
    }
    
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    
    if (gameState && !gameState.winner) {
      const ms = timeoutMs || TURN_TIMEOUT;
      gameState.turnStartTime = Date.now();
      gameState.turnTimeout = ms;
      gameState.turnTimeLeft = Math.ceil(ms / 1000); // 转换为秒
      
      currentTimeout = setTimeout(() => {
        handleTimeout();
      }, ms);
      
      // 每秒更新倒计时状态
      countdownInterval = setInterval(() => {
        if (gameState && gameState.turnTimeLeft !== undefined) {
          gameState.turnTimeLeft = Math.max(0, gameState.turnTimeLeft - 1);
          // 实时发送倒计时更新给所有玩家
          room.emit('command', { type: 'game:state', data: { ...gameState, moveHistory } });
          
          // 当倒计时归零时清除定时器
          if (gameState.turnTimeLeft <= 0) {
            if (countdownInterval) {
              clearInterval(countdownInterval);
            }
          }
        }
      }, 1000);
      
    }
  };

  // 是否被托管
  const isHosted = (playerId: string) => {
    return !!(gameState && gameState.hosted && gameState.hosted[playerId]);
  };

  // 启动托管
  const startHosting = async (playerId: string) => {
    if (!gameState) return;
    gameState.hosted = gameState.hosted || {};
    if (gameState.hosted[playerId]) return; // 已托管
    gameState.hosted[playerId] = true;
    room.emit('message', { content: `玩家 ${playerId} 离线，进入托管。` });
    await saveGameData();
    room.emit('command', { type: 'game:state', data: gameState });

    // 如果当前正在该玩家回合，缩短倒计时
    if (gameState.currentPlayer === playerId && !gameState.winner) {
      clearTurnTimer();
      startTurnTimer(5000);
    }
  };

  // 停止托管（玩家重连）
  const stopHosting = async (playerId: string) => {
    if (!gameState || !gameState.hosted) return;
    if (!gameState.hosted[playerId]) return;
    delete gameState.hosted[playerId];
    room.emit('message', { content: `玩家 ${playerId} 已重连，取消托管。` });
    await saveGameData();
    room.emit('command', { type: 'game:state', data: gameState });
  };

  // 托管代替玩家出牌或抓牌并结束回合
  const hostPlayTurn = async (playerId: string) => {
    if (!gameState || gameState.winner) return;
    const hand = gameState.players[playerId];
    if (!hand) return;

    const topCard = gameState.discardPile[gameState.discardPile.length - 1];

    // 检查是否面临+2惩罚（只能接受惩罚）
    if (topCard.value === 'draw2' && !gameState.draw2Processed) {
      // 托管玩家无条件接受+2惩罚
      for (let i = 0; i < 2 && gameState.deck.length > 0; i++) {
        const drawn = gameState.deck.pop();
        if (drawn) hand.push(drawn);
      }
      room.emit('message', { content: `${playerId} (托管) 被+2惩罚，抽了2张牌` });
      
      // 标记+2已处理
      gameState.draw2Processed = true;
      
      // 跳过当前玩家，直接到下下个玩家
      const actualNextPlayerId = getNextPlayer(Object.keys(gameState.players), playerId, gameState.direction);
      const actualNextPlayer = room.players.find(p => p.id === actualNextPlayerId);
      if (actualNextPlayer) {
        room.emit('message', { content: `轮到 ${actualNextPlayer.name} 出牌` });
      }
      gameState.currentPlayer = actualNextPlayerId;
      
      // 切换到下一个玩家后直接返回，不执行后续的出牌逻辑
      return;
    }

    // 检查是否面临+4惩罚（只能接受惩罚，托管不能质疑）
    if (topCard.value === 'wild_draw4' && !gameState.wildDraw4Processed) {
      // 托管玩家无条件接受+4惩罚
      for (let i = 0; i < 4 && gameState.deck.length > 0; i++) {
        const drawn = gameState.deck.pop();
        if (drawn) hand.push(drawn);
      }
      room.emit('message', { content: `${playerId} (托管) 被+4惩罚，抽了4张牌` });
      
      // 标记+4已处理
      gameState.wildDraw4Processed = true;
      
      // 跳过当前玩家，直接到下下个玩家
      const actualNextPlayerId = getNextPlayer(Object.keys(gameState.players), playerId, gameState.direction);
      const actualNextPlayer = room.players.find(p => p.id === actualNextPlayerId);
      if (actualNextPlayer) {
        room.emit('message', { content: `轮到 ${actualNextPlayer.name} 出牌` });
      }
      gameState.currentPlayer = actualNextPlayerId;
      
      // 切换到下一个玩家后直接返回，不执行后续的出牌逻辑
      return;
    }

    // 先尝试出牌（优先非万能牌）
    let chosenIndex = -1;
    for (let i = 0; i < hand.length; i++) {
      const c = hand[i];
      if (c.type !== 'wild' && canPlayCard(c, topCard, gameState.color)) { chosenIndex = i; break; }
    }
    if (chosenIndex === -1) {
      // 没找到非万能牌，尝试万能牌（托管模式下，只有当+4是唯一合法选择时才使用）
      for (let i = 0; i < hand.length; i++) {
        const c = hand[i];
        if (c.type === 'wild') {
          if (c.value === 'wild_draw4') {
            // +4只有在没有任何合法可出的牌时才能使用
            if (canPlayWildDraw4(hand, topCard, gameState.color)) {
              chosenIndex = i; break;
            }
          } else {
            // 普通变色牌可以随时使用
            chosenIndex = i; break;
          }
        }
      }
    }

    const playerSocket = room.players.find(p => p.id === playerId);

    if (chosenIndex !== -1) {
      const card = hand[chosenIndex];
      // 简单策略：若是万能牌，选择手牌中最多的颜色
      let chosenColor: any = undefined;
      if (card.type === 'wild') {
        const colorCount: Record<string, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        hand.forEach(hc => { if (hc.color && hc.color !== 'black') colorCount[hc.color] = (colorCount[hc.color] || 0) + 1; });
        const colors = Object.keys(colorCount) as Array<'red'|'blue'|'green'|'yellow'>;
        colors.sort((a,b) => colorCount[b] - colorCount[a]);
        chosenColor = colors[0];
      }

      // 执行出牌逻辑（复用 play_card 的处理）
      hand.splice(chosenIndex, 1);
      gameState.discardPile.push(card);
      
      // 重置+2处理标志（新回合开始）
      gameState.draw2Processed = false;
      
      const cardName = card.type === 'wild' ? 
        (card.value === 'wild' ? '变色牌' : '变色+4') : 
        `${card.color === 'red' ? '红' : card.color === 'blue' ? '蓝' : card.color === 'green' ? '绿' : '黄'}${card.value}`;
      room.emit('message', { content: `${playerSocket?.name || playerId} (托管) 出了 ${cardName}` });

      if (card.type === 'wild') {
        if (chosenColor && ['red','blue','green','yellow'].includes(chosenColor)) {
          gameState.color = chosenColor as any;
          room.emit('message', { content: `${playerSocket?.name || playerId} 将颜色改为${chosenColor}` });
        } else {
          const colors: ('red' | 'blue' | 'green' | 'yellow')[] = ['red','blue','green','yellow'];
          gameState.color = colors[Math.floor(Math.random() * colors.length)];
        }
        if (card.value === 'wild_draw4') {
          // +4效果不累积，等待下一位玩家回合时处理
          gameState.wildDraw4Processed = false;
          room.emit('message', { content: `下家将面临+4惩罚！` });
        }
      } else {
        gameState.color = card.color as any;
        switch (card.value) {
          case 'skip':
            {
              const nextP = getNextPlayer(Object.keys(gameState.players), gameState.currentPlayer, gameState.direction);
              const skipped = room.players.find(p => p.id === nextP);
              room.emit('message', { content: `${skipped?.name} 被跳过了！` });
              gameState.currentPlayer = nextP;
            }
            break;
          case 'reverse':
            gameState.direction = (gameState.direction * -1) as 1 | -1;
            room.emit('message', { content: `方向反转！现在是${gameState.direction === 1 ? '顺时针' : '逆时针'}` });
            if (Object.keys(gameState.players).length === 2) {
              const nextP = getNextPlayer(Object.keys(gameState.players), gameState.currentPlayer, gameState.direction);
              const skipped = room.players.find(p => p.id === nextP);
              room.emit('message', { content: `${skipped?.name} 被跳过了！` });
              gameState.currentPlayer = nextP;
            }
            break;
          case 'draw2':
            // +2惩罚：下家必须抽2张牌并结束回合
            room.emit('message', { content: `下家将面临+2惩罚！必须抽2张牌并结束回合` });
            break;
        }
      }

      // 检查是否获胜
      if (hand.length === 0) {
        gameState.winner = playerId;
        room.emit('message', { content: `🎉 恭喜 ${playerSocket?.name || playerId} 获得胜利！` });

        // 更新成就（与主动出牌获胜时一致）
        room.players.forEach((p) => {
          if (p.role !== 'player') return;
          if (!achievements[p.name]) {
            achievements[p.name] = { win: 0, lost: 0 };
          }
          if (p.id === playerId) {
            achievements[p.name].win += 1;
          } else {
            achievements[p.name].lost += 1;
          }
        });

        // 清除倒计时并保存最终状态
        clearTurnTimer();
        await saveGameData();

        // 广播最终状态与成就
        room.emit('command', { type: 'game:state', data: { ...gameState, moveHistory } });
        room.emit('command', { type: 'game:over', data: { winner: playerId } });
        room.emit('command', { type: 'achievements', data: achievements });

        // 将所有玩家状态重置为未准备，通知客户端以刷新准备列表
        room.players.forEach(player => {
          if (player.role === 'player') {
            try {
              player.isReady = false;
              player.emit('status', PlayerStatus.unready);
              room.emit('player-unready', { ...player });
            } catch (e) {
              console.warn('无法将玩家设为未准备', player.id, e);
            }
          }
        });
        // room.status 是只读，改为通过命令广播状态更新给客户端
        room.emit('command', { type: 'status', data: { status: 'waiting' } });

        // 局结束后踢出所有处于托管的玩家
        if (gameState && gameState.hosted) {
          Object.keys(gameState.hosted).forEach((pid) => {
            try {
              room.kickPlayer(pid);
            } catch (e) {
              console.warn('踢出托管玩家失败', pid, e);
            }
          });
        }

        // 不立即调用 room.end()，让玩家可以查看结果
        return;
      }

      // 记录移动历史
      moveHistory.push({ player: playerId, action: { type: 'play_card', cardId: card.id, chosenColor }, timestamp: Date.now() });

    } else {
      // 无牌可出：检查是否面临+4惩罚
      const topCard = gameState.discardPile[gameState.discardPile.length - 1];
      
      if (topCard.value === 'wild_draw4' && !gameState.wildDraw4Processed) {
        // +4惩罚：无条件抽4张
        for (let i = 0; i < 4 && gameState.deck.length > 0; i++) {
          const drawn = gameState.deck.pop();
          if (drawn) hand.push(drawn);
        }
        room.emit('message', { content: `${playerSocket?.name || playerId} (托管) 被+4惩罚，抽了4张牌` });
      } else {
        // 正常情况抽1张牌
        if (gameState.deck.length > 0) {
          const drawn = gameState.deck.pop();
          if (drawn) hand.push(drawn);
          room.emit('message', { content: `${playerSocket?.name || playerId} (托管) 抽了一张牌` });
        }
      }

      moveHistory.push({ player: playerId, action: { type: 'draw_card' }, timestamp: Date.now() });
    }

    // 切换到下一个玩家
    const nextPlayerId = getNextPlayer(Object.keys(gameState.players), gameState.currentPlayer, gameState.direction);
    const nextPlayer = room.players.find(p => p.id === nextPlayerId);
    if (nextPlayer) room.emit('message', { content: `轮到 ${nextPlayer.name} 出牌` });
    gameState.currentPlayer = nextPlayerId;

    // 如果牌堆用完了，重新洗牌
    if (gameState.deck.length === 0 && gameState.discardPile.length > 1) {
      const top = gameState.discardPile.pop()!;
      gameState.deck = shuffleDeck(gameState.discardPile);
      gameState.discardPile = [top];
    }

    await saveGameData();
    room.emit('command', { type: 'game:state', data: gameState });

    // 为下一位玩家启动倒计时，若下一位被托管则为5秒
    const nextTimeout = isHosted(nextPlayerId) ? 5000 : TURN_TIMEOUT;
    startTurnTimer(nextTimeout);
  };

  const handleTimeout = async () => {
    if (!gameState || gameState.winner) return;
    
    const currentPlayerId = gameState.currentPlayer;
    // 如果当前玩家处于托管，使用托管逻辑代替超时自动抽牌
    if (isHosted(currentPlayerId)) {
      await hostPlayTurn(currentPlayerId);
      return;
    }

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
      

      
      // 保存状态并发送更新
      await saveGameData();
      room.emit('command', { type: 'game:state', data: gameState });
      
      // 清除当前倒计时并开始下一回合的倒计时（若下一位被托管则为5秒）
      const nextTimeout = gameState.hosted && gameState.hosted[nextPlayerId] ? 5000 : TURN_TIMEOUT;
      startTurnTimer(nextTimeout);
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
    // 如果玩家重连并且之前被托管，则取消托管
    if (gameState && gameState.hosted && gameState.hosted[player.id]) {
      stopHosting(player.id);
    }
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
    if ((!gameState || gameState.winner) && room.validPlayers.length >= room.minSize) {
      startGame();
    }
  });

  // 监听房间的 end 事件
  room.on('end', () => {
    // 重置游戏状态，为下一局做准备
    gameState = null;
  });

  // 玩家离线事件：立即启动托管（room 会在一分钟后触发该事件）
  room.on('player-offline', async (player) => {
    try {
      await startHosting(player.id);
    } catch (err) {
      console.error('startHosting error', err);
    }
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
        
        // 检查是否面临+2或+4惩罚
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        if (topCard.value === 'draw2' && !gameState.draw2Processed) {
          room.emit('message', { content: `${sender.name} 面临+2惩罚，只能抽牌接受惩罚，不能出牌！` });
          return;
        }
        if (topCard.value === 'wild_draw4' && !gameState.wildDraw4Processed) {
          room.emit('message', { content: `${sender.name} 面临+4惩罚，只能质疑或抽牌接受惩罚，不能出其他牌！` });
          return;
        }
        
        const { cardId, chosenColor } = message.data || message.data.data;
        const playerHand = gameState.players[sender.id];
        const cardIndex = playerHand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;
        
        const card = playerHand[cardIndex];
        
        // 检查是否可以出牌
        if (!canPlayCard(card, topCard, gameState.color)) {
          return;
        }
        
        // 检查+4的使用限制（只记录是否违规，不禁止出牌）
        let isIllegalPlay = false;
        if (card.value === 'wild_draw4') {
          const canPlayWild4 = canPlayWildDraw4(playerHand, topCard, gameState.color);
          isIllegalPlay = !canPlayWild4;
          
          // 添加调试日志
          console.log(`+4检查 - 玩家: ${sender.name}, 可出+4: ${canPlayWild4}, 违规: ${isIllegalPlay}`);
          console.log(`手牌:`, playerHand.map(c => `${c.color}-${c.value}`));
          console.log(`顶牌: ${topCard.color}-${topCard.value}, 当前颜色: ${gameState.color}`);
        }
        
        // 保存出牌前的颜色（用于+4质疑检查）
        const previousColor = gameState.color;
        
        // 出牌
        playerHand.splice(cardIndex, 1);
        gameState.discardPile.push(card);
        
        // 重置+2处理标志（新回合开始）
        gameState.draw2Processed = false;
        
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
            // +4效果不累积，等待下一位玩家回合时处理
            // 重置+4处理标志，允许质疑
            gameState.wildDraw4Processed = false;
            room.emit('message', { content: `下家将面临+4惩罚！` });
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
              // +2惩罚：下家必须抽2张牌并结束回合
              room.emit('message', { content: `下家将面临+2惩罚！必须抽2张牌并结束回合` });
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
          
          // 清除倒计时
          clearTurnTimer();
        
          
          // 保存成就和最终状态
          await saveGameData();
          
          room.emit('command', { type: 'game:over', data: { winner: sender.id } });
          room.emit('command', { type: 'achievements', data: achievements });
          
          // 设置所有玩家状态为unready（游戏结束），并通知客户端
          room.players.forEach(player => {
            if (player.role === 'player') {
              try {
                player.isReady = false;
                player.emit('status', PlayerStatus.unready);
                room.emit('player-unready', { ...player });
              } catch (e) {
                console.warn('无法将玩家设为未准备', player.id, e);
              }
            }
          });
          
          // 设置房间状态为waiting，允许开始新一局（通过广播通知客户端，避免写入只读属性）
          room.emit('command', { type: 'status', data: { status: 'waiting' } });
          
          // 局结束后踢出所有处于托管的玩家
          if (gameState && gameState.hosted) {
            Object.keys(gameState.hosted).forEach((pid) => {
              try {
                room.kickPlayer(pid);
              } catch (e) {
                console.warn('踢出托管玩家失败', pid, e);
              }
            });
          }
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
        
        // 检查+2效果（+4通过质疑机制处理，不在这里立即执行）
        const currentTopCard = gameState.discardPile[gameState.discardPile.length - 1];
        if (currentTopCard.value === 'draw2' && !gameState.draw2Processed) {
          const nextHand = gameState.players[nextPlayerId];
          
          // 强制抽2张牌并跳过回合
          for (let i = 0; i < 2 && gameState.deck.length > 0; i++) {
            const drawnCard = gameState.deck.pop();
            if (drawnCard) nextHand.push(drawnCard);
          }
          room.emit('message', { content: `${room.players.find(p => p.id === nextPlayerId)?.name} 被+2惩罚，抽了2张牌并被跳过回合` });
          
          // 标记+2已处理
          gameState.draw2Processed = true;
          
          // 跳过该玩家，直接到下下个玩家
          const actualNextPlayerId = getNextPlayer(Object.keys(gameState.players), nextPlayerId, gameState.direction);
          const actualNextPlayer = room.players.find(p => p.id === actualNextPlayerId);
          if (actualNextPlayer) {
            room.emit('message', { content: `轮到 ${actualNextPlayer.name} 出牌` });
          }
          gameState.currentPlayer = actualNextPlayerId;
        }

        
        // 如果牌堆用完了，重新洗牌
        if (gameState.deck.length === 0 && gameState.discardPile.length > 1) {
          const topCard = gameState.discardPile.pop()!;
          gameState.deck = shuffleDeck(gameState.discardPile);
          gameState.discardPile = [topCard];
        }
        
        // 记录移动历史（所有出牌都要记录）
        // 对于+4，需要记录出牌前的颜色用于质疑检查
        moveHistory.push({
          player: sender.id,
          action: { type: 'play_card', cardId, chosenColor, illegalWildDraw4: isIllegalPlay, previousColor },
          timestamp: Date.now()
        });
        
        // 保存游戏状态
        await saveGameData();
        
        room.emit('command', { type: 'game:state', data: { ...gameState, moveHistory } });
        
        // 清除当前倒计时并开始下一回合的倒计时
        if (!gameState.winner) {
          const nextTimeoutForStart = gameState.hosted && gameState.hosted[gameState.currentPlayer] ? 5000 : TURN_TIMEOUT;
          startTurnTimer(nextTimeoutForStart);
        }
        break;
      }
      
      case 'uno:draw_card': {
        if (!gameState || gameState.currentPlayer !== sender.id) {
          return;
        }
        
        // 检查是否面临+2惩罚
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        const playerHand = gameState.players[sender.id];
        
        if (topCard.value === 'draw2' && !gameState.draw2Processed) {
          // 面临+2惩罚，必须抽2张牌并跳过回合
          for (let i = 0; i < 2 && gameState.deck.length > 0; i++) {
            const drawnCard = gameState.deck.pop();
            if (drawnCard) playerHand.push(drawnCard);
          }
          room.emit('message', { content: `${sender.name} 被+2惩罚，抽了2张牌并被跳过回合` });
          
          // 标记+2已处理
          gameState.draw2Processed = true;
          
          // 跳过当前玩家，直接到下下个玩家
          const actualNextPlayerId = getNextPlayer(Object.keys(gameState.players), gameState.currentPlayer, gameState.direction);
          const actualNextPlayer = room.players.find(p => p.id === actualNextPlayerId);
          if (actualNextPlayer) {
            room.emit('message', { content: `轮到 ${actualNextPlayer.name} 出牌` });
          }
          gameState.currentPlayer = actualNextPlayerId;
          return; // 提前返回，不执行后续的玩家切换逻辑
        } else if (topCard.value === 'wild_draw4' && !gameState.wildDraw4Processed) {
          // +4惩罚：玩家选择接受惩罚，抽4张牌并跳过
          for (let i = 0; i < 4 && gameState.deck.length > 0; i++) {
            const drawnCard = gameState.deck.pop();
            if (drawnCard) playerHand.push(drawnCard);
          }
          room.emit('message', { content: `${sender.name} 接受+4惩罚，抽了4张牌并被跳过回合` });
          
          // 标记+4已处理
          gameState.wildDraw4Processed = true;
          
          // 跳过当前玩家，直接到下下个玩家
          const actualNextPlayerId = getNextPlayer(Object.keys(gameState.players), gameState.currentPlayer, gameState.direction);
          const actualNextPlayer = room.players.find(p => p.id === actualNextPlayerId);
          if (actualNextPlayer) {
            room.emit('message', { content: `轮到 ${actualNextPlayer.name} 出牌` });
          }
          gameState.currentPlayer = actualNextPlayerId;
          return; // 提前返回，不执行后续的玩家切换逻辑
        } else {
          // 正常情况抽1张牌
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
        
        room.emit('command', { type: 'game:state', data: { ...gameState, moveHistory } });
        
        // 清除当前倒计时并开始下一回合的倒计时
        if (!gameState.winner) {  
          const nextTimeoutForDraw = gameState.hosted && gameState.hosted[gameState.currentPlayer] ? 5000 : TURN_TIMEOUT;
          startTurnTimer(nextTimeoutForDraw);
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
      
      case 'uno:challenge': {
        if (!gameState || gameState.currentPlayer !== sender.id) return;
        
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        
        // 只能对+4进行质疑
        if (topCard.value !== 'wild_draw4') {
          room.emit('message', { content: `${sender.name} 只能对变色+4进行质疑！` });
          return;
        }
        
        // 检查+4是否已经被处理过
        if (gameState.wildDraw4Processed) {
          room.emit('message', { content: `这个+4已经被处理过了，无法再次质疑！` });
          return;
        }
        
        // 找出上一位玩家（打出+4的玩家）
        const prevPlayerId = getPreviousPlayer(Object.keys(gameState.players), gameState.currentPlayer, gameState.direction);
        const prevPlayer = room.players.find(p => p.id === prevPlayerId);
        const prevHand = gameState.players[prevPlayerId];
        
        if (!prevPlayer || !prevHand) return;
        
        // 获取上一次移动历史，找到出牌前的颜色
        let previousColor = gameState.color; // 默认使用当前颜色作为后备
        if (moveHistory.length > 0) {
          const lastMove = moveHistory[moveHistory.length - 1];
          if (lastMove.player === prevPlayerId && lastMove.action.type === 'play_card' && lastMove.action.previousColor) {
            previousColor = lastMove.action.previousColor;
          }
        }
        
        // 获取出牌时上一位玩家的手牌快照
        // 这里简化处理，使用当前手牌，实际应该使用出牌时的快照
        console.log(`质疑检查 - 上家: ${prevPlayer.name}, 顶牌: ${topCard.color}-${topCard.value}, 出牌前颜色: ${previousColor}`);
        console.log(`上家手牌:`, prevHand.map(c => `${c.color}-${c.value}`));
        const wasLegalPlay = canPlayWildDraw4(prevHand, topCard, previousColor);
        console.log(`质疑结果 - 合法: ${wasLegalPlay}`);
        
        room.emit('message', { content: `${sender.name} 对 ${prevPlayer.name} 的+4使用提出质疑！` });
        
        if (wasLegalPlay) {
          // +4使用合法，质疑失败
          room.emit('message', { content: `${prevPlayer.name} 的+4使用合法！${sender.name} 质疑失败，抽4张牌并跳过回合` });
          
          // 质疑者抽4张牌
          const currentHand = gameState.players[sender.id];
          for (let i = 0; i < 4 && gameState.deck.length > 0; i++) {
            const drawnCard = gameState.deck.pop();
            if (drawnCard) currentHand.push(drawnCard);
          }
          
          // 标记+4已处理
          gameState.wildDraw4Processed = true;
        } else {
          // +4使用违规，质疑成功
          room.emit('message', { content: `${prevPlayer.name} 的+4使用违规！${sender.name} 质疑成功，${prevPlayer.name} 需抽6张牌` });
          
          // 违规者抽6张牌
          for (let i = 0; i < 6 && gameState.deck.length > 0; i++) {
            const drawnCard = gameState.deck.pop();
            if (drawnCard) prevHand.push(drawnCard);
          }
          
          // 标记+4已处理
          gameState.wildDraw4Processed = true;
        }
        
        // 质疑失败或正常情况，切换到下一位玩家
        const nextPlayerId = getNextPlayer(Object.keys(gameState.players), gameState.currentPlayer, gameState.direction);
        const nextPlayer = room.players.find(p => p.id === nextPlayerId);
        if (nextPlayer) {
          room.emit('message', { content: `轮到 ${nextPlayer.name} 出牌` });
        }
        gameState.currentPlayer = nextPlayerId;
        
        // 保存游戏状态
        await saveGameData();
        room.emit('command', { type: 'game:state', data: { ...gameState, moveHistory } });
        
        // 开始下一位玩家的倒计时
        if (!gameState.winner) {
          const nextTimeoutForChallengeNext = gameState.hosted && gameState.hosted[gameState.currentPlayer] ? 5000 : TURN_TIMEOUT;
          startTurnTimer(nextTimeoutForChallengeNext);
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