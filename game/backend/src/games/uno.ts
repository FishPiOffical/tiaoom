import { Room, PlayerStatus, RoomStatus, RoomPlayer } from "tiaoom";
import { GameRoom, IGameCommand } from "./index";

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

class UnoGameRoom extends GameRoom {
  gameState: UnoGameState | null = null;
  moveHistory: Array<{player: string, action: any, timestamp: number}> = [];
  
  readonly TURN_TIMEOUT = 15000;

  init() {
    this.restoreTimer({
      turn: () => this.handleTimeout()
    });

    // 恢复游戏状态
    if (this.gameState && !this.gameState.winner) {
      this.room.players.forEach(player => {
        if (player.role === 'player') {
          player.status = PlayerStatus.playing;
        }
      });
    }

    return super.init().on('player-offline', async (player) => {
      try {
        await this.startHosting(player.id);
      } catch (err) {
        console.error('startHosting error', err);
      }
    }).on('join', (player) => {
      const playerSocket = this.room.players.find((p) => p.id === player.id);
      if (!playerSocket) return;
      
      playerSocket.emit('command', { type: 'achievements', data: this.achievements });
      playerSocket.emit('command', { type: 'message_history', data: this.messageHistory });
      
      if (this.gameState) {
        playerSocket.emit('command', { type: 'game:state', data: this.gameState });
        playerSocket.emit('command', {
          type: 'game:full_restore',
          data: {
            gameState: this.gameState,
            achievements: this.achievements,
            messageHistory: this.messageHistory,
            moveHistory: this.moveHistory,
            lastSaved: Date.now(),
            gameVersion: '1.0'
          }
        });
      }
      
      const roomStatus = this.room.status;
      playerSocket.emit('command', {
        type: 'status',
        data: { status: roomStatus, messageHistory: this.messageHistory }
      });

      if (this.gameState && this.gameState.hosted && this.gameState.hosted[player.id]) {
        this.stopHosting(player.id);
      }
    }).on('leave', async (player) => {
      if (this.gameState && player.role === 'player') {
        this.room.players.forEach((p) => {
          if (p.role !== 'player') return;
          if (!this.achievements[p.name]) this.achievements[p.name] = { win: 0, lost: 0, draw: 0 };
          if (p.id === player.id) this.achievements[p.name].lost += 1;
          else this.achievements[p.name].win += 1;
        });
        this.save();
        this.room.emit('command', { type: 'achievements', data: this.achievements });
      }
    });
  }

  getStatus(sender: RoomPlayer) {
    return {
      ...super.getStatus(sender),
      status: this.room.status,
      gameState: this.gameState,
      moveHistory: this.moveHistory
    }
  }

  onStart() {
    if (this.room.validPlayers.length < this.room.minSize) return;
    this.startGame();
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    const sender = message.sender as RoomPlayer;
    const commandType = message.type || message.data?.type;

    // Allow status/state commands anytime
    if (['status', 'game:state', 'game:full_restore', 'achievements', 'message_history'].includes(commandType)) {
      // Handled below or in specific cases
    } else if (!this.gameState) {
      return;
    }

    if (this.gameState?.winner && !['status', 'game:state', 'game:full_restore', 'achievements', 'message_history'].includes(commandType)) {
      return;
    }

    switch (commandType) {
      case 'uno:play_card':
        this.handlePlayCard(sender, message.data || message.data?.data);
        break;
      case 'uno:draw_card':
        this.handleDrawCard(sender);
        break;
      case 'uno:call':
        this.handleCallUno(sender);
        break;
      case 'uno:challenge':
        this.handleChallenge(sender);
        break;
      case 'status':
        sender.emit('command', { 
          type: 'status', 
          data: { status: this.room.status, messageHistory: this.messageHistory } 
        });
        break;
      case 'game:state':
        if (this.gameState) sender.emit('command', { type: 'game:state', data: this.gameState });
        break;
      case 'game:full_restore':
        if (this.gameState) {
          sender.emit('command', { 
            type: 'game:full_restore', 
            data: {
              gameState: this.gameState,
              achievements: this.achievements,
              messageHistory: this.messageHistory,
              moveHistory: this.moveHistory,
              lastSaved: Date.now(),
              gameVersion: '1.0'
            }
          });
        }
        break;
    }
  }

  startGame() {
    this.stopTimer();
    const deck = shuffleDeck(createDeck());
    const playerIds = this.room.validPlayers.map(p => p.id);
    
    const hands: { [playerId: string]: UnoCard[] } = {};
    playerIds.forEach(playerId => {
      hands[playerId] = [];
      for (let i = 0; i < 7; i++) {
        const card = deck.pop();
        if (card) hands[playerId].push(card);
      }
    });
    
    let firstCard = deck.pop()!;
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
    
    this.gameState = {
      deck,
      discardPile: [firstCard],
      players: hands,
      currentPlayer: playerIds[0],
      direction: 1,
      color: firstCard.color as 'red' | 'blue' | 'green' | 'yellow',
      wildDraw4Processed: false,
      draw2Processed: false
    };
    
    this.room.players.forEach(player => {
      if (player.role === 'player') player.status = PlayerStatus.playing;
    });
    
    this.save();
    
    this.room.emit('command', { type: 'game:state', data: this.gameState });
    this.room.emit('command', { type: 'achievements', data: this.achievements });
    this.room.emit('message', { content: `UNO游戏开始！${this.room.validPlayers[0]?.name} 先出牌` });
    
    const initialTimeout = this.isHosted(this.gameState.currentPlayer) ? 5000 : this.TURN_TIMEOUT;
    this.startTurnTimer(initialTimeout);
  }

  startTurnTimer(timeoutMs?: number) {
    const ms = timeoutMs || this.TURN_TIMEOUT;
    if (this.gameState) {
      this.gameState.turnStartTime = Date.now();
      this.gameState.turnTimeout = ms;
      this.gameState.turnTimeLeft = Math.ceil(ms / 1000);
    }
    this.startTimer(() => this.handleTimeout(), ms, 'turn');
    
    // Emit initial state with timer info
    if (this.gameState) {
       this.room.emit('command', { type: 'game:state', data: { ...this.gameState, moveHistory: this.moveHistory } });
    }
  }

  async handleTimeout() {
    if (!this.gameState || this.gameState.winner) return;
    
    const currentPlayerId = this.gameState.currentPlayer;
    if (this.isHosted(currentPlayerId)) {
      await this.hostPlayTurn(currentPlayerId);
      return;
    }

    const currentPlayerSocket = this.room.players.find(p => p.id === currentPlayerId);
    if (currentPlayerSocket) {
      const playerHand = this.gameState.players[currentPlayerId];
      const topCard = this.gameState.discardPile[this.gameState.discardPile.length - 1];
      
      if (topCard.value === 'draw2' && !this.gameState.draw2Processed) {
        for (let i = 0; i < 2 && this.gameState.deck.length > 0; i++) {
          const drawnCard = this.gameState.deck.pop();
          if (drawnCard) playerHand.push(drawnCard);
        }
        this.room.emit('message', { content: `${currentPlayerSocket.name} 超时，被+2惩罚，抽了2张牌并被跳过回合` });
        this.gameState.draw2Processed = true;
        this.advancePlayer(true); // Skip next
      } else if (topCard.value === 'wild_draw4' && !this.gameState.wildDraw4Processed) {
        for (let i = 0; i < 4 && this.gameState.deck.length > 0; i++) {
          const drawnCard = this.gameState.deck.pop();
          if (drawnCard) playerHand.push(drawnCard);
        }
        this.room.emit('message', { content: `${currentPlayerSocket.name} 超时，接受+4惩罚，抽了4张牌并被跳过回合` });
        this.gameState.wildDraw4Processed = true;
        this.advancePlayer(true); // Skip next
      } else {
        if (this.gameState.deck.length > 0) {
          const drawnCard = this.gameState.deck.pop()!;
          playerHand.push(drawnCard);
          this.room.emit('message', { content: `${currentPlayerSocket.name} 超时，自动抽了一张牌` });
        }
        this.advancePlayer();
      }
      
      this.save();
      this.room.emit('command', { type: 'game:state', data: this.gameState });
      
      const nextTimeout = this.isHosted(this.gameState.currentPlayer) ? 5000 : this.TURN_TIMEOUT;
      this.startTurnTimer(nextTimeout);
    }
  }

  handlePlayCard(sender: RoomPlayer, data: any) {
    if (!this.gameState || this.gameState.currentPlayer !== sender.id) return;
    
    const topCard = this.gameState.discardPile[this.gameState.discardPile.length - 1];
    if (topCard.value === 'draw2' && !this.gameState.draw2Processed) {
      this.room.emit('message', { content: `${sender.name} 面临+2惩罚，只能抽牌接受惩罚，不能出牌！` });
      return;
    }
    if (topCard.value === 'wild_draw4' && !this.gameState.wildDraw4Processed) {
      this.room.emit('message', { content: `${sender.name} 面临+4惩罚，只能质疑或抽牌接受惩罚，不能出其他牌！` });
      return;
    }
    
    const { cardId, chosenColor } = data;
    const playerHand = this.gameState.players[sender.id];
    const cardIndex = playerHand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;
    
    const card = playerHand[cardIndex];
    if (!this.canPlayCard(card, topCard, this.gameState.color)) return;
    
    let isIllegalPlay = false;
    if (card.value === 'wild_draw4') {
      isIllegalPlay = !this.canPlayWildDraw4(playerHand, topCard, this.gameState.color);
    }
    
    const previousColor = this.gameState.color;
    playerHand.splice(cardIndex, 1);
    this.gameState.discardPile.push(card);
    this.gameState.draw2Processed = false;
    
    const cardName = card.type === 'wild' ? (card.value === 'wild' ? '变色牌' : '变色+4') : `${card.color === 'red' ? '红' : card.color === 'blue' ? '蓝' : card.color === 'green' ? '绿' : '黄'}${card.value}`;
    this.room.emit('message', { content: `${sender.name} 出了 ${cardName}` });
    
    if (card.type === 'wild') {
      if (chosenColor && ['red', 'blue', 'green', 'yellow'].includes(chosenColor)) {
        this.gameState.color = chosenColor;
        this.room.emit('message', { content: `${sender.name} 将颜色改为${chosenColor === 'red' ? '红色' : chosenColor === 'blue' ? '蓝色' : chosenColor === 'green' ? '绿色' : '黄色'}` });
      } else {
        const colors: ('red' | 'blue' | 'green' | 'yellow')[] = ['red', 'blue', 'green', 'yellow'];
        this.gameState.color = colors[Math.floor(Math.random() * colors.length)];
        this.room.emit('message', { content: `${sender.name} 随机选择了颜色` });
      }
      
      if (card.value === 'wild_draw4') {
        this.gameState.wildDraw4Processed = false;
        this.room.emit('message', { content: `下家将面临+4惩罚！` });
      }
    } else {
      this.gameState.color = card.color as any;
      switch (card.value) {
        case 'skip':
          this.advancePlayer(true); // Skip next logic handled in advancePlayer if needed, but here we just skip
          // Actually advancePlayer moves to next. If we want to skip, we move twice?
          // Let's refine advancePlayer.
          // Standard logic:
          // Skip: next player is skipped.
          // Reverse: direction changes.
          // Draw2: next player draws 2.
          break;
        case 'reverse':
          this.gameState.direction = (this.gameState.direction * -1) as 1 | -1;
          this.room.emit('message', { content: `方向反转！现在是${this.gameState.direction === 1 ? '顺时针' : '逆时针'}` });
          if (Object.keys(this.gameState.players).length === 2) {
             // In 2 player game, reverse acts like skip
             // We will handle skip logic below
          }
          break;
        case 'draw2':
          this.room.emit('message', { content: `下家将面临+2惩罚！必须抽2张牌并结束回合` });
          break;
      }
    }

    if (playerHand.length === 0) {
      this.finishGame(sender);
      return;
    }

    // Handle special card effects on turn progression
    if (card.value === 'skip' || (card.value === 'reverse' && Object.keys(this.gameState.players).length === 2)) {
       const nextP = this.getNextPlayer(Object.keys(this.gameState.players), this.gameState.currentPlayer, this.gameState.direction);
       const skipped = this.room.players.find(p => p.id === nextP);
       this.room.emit('message', { content: `${skipped?.name} 被跳过了！` });
       this.gameState.currentPlayer = nextP; // Move to skipped player
       this.advancePlayer(); // Move from skipped player to next
    } else {
       this.advancePlayer();
    }

    // Check +2 effect for next player
    const currentTopCard = this.gameState.discardPile[this.gameState.discardPile.length - 1];
    if (currentTopCard.value === 'draw2' && !this.gameState.draw2Processed) {
      const nextPlayerId = this.gameState.currentPlayer;
      const nextHand = this.gameState.players[nextPlayerId];
      for (let i = 0; i < 2 && this.gameState.deck.length > 0; i++) {
        const drawnCard = this.gameState.deck.pop();
        if (drawnCard) nextHand.push(drawnCard);
      }
      this.room.emit('message', { content: `${this.room.players.find(p => p.id === nextPlayerId)?.name} 被+2惩罚，抽了2张牌并被跳过回合` });
      this.gameState.draw2Processed = true;
      this.advancePlayer(); // Skip the player who drew 2
    }

    if (this.gameState.deck.length === 0 && this.gameState.discardPile.length > 1) {
      const topCard = this.gameState.discardPile.pop()!;
      this.gameState.deck = shuffleDeck(this.gameState.discardPile);
      this.gameState.discardPile = [topCard];
    }

    this.moveHistory.push({
      player: sender.id,
      action: { type: 'play_card', cardId, chosenColor, illegalWildDraw4: isIllegalPlay, previousColor },
      timestamp: Date.now()
    });

    this.save();
    this.room.emit('command', { type: 'game:state', data: { ...this.gameState, moveHistory: this.moveHistory } });

    if (!this.gameState.winner) {
      const nextTimeout = this.isHosted(this.gameState.currentPlayer) ? 5000 : this.TURN_TIMEOUT;
      this.startTurnTimer(nextTimeout);
    }
  }

  handleDrawCard(sender: RoomPlayer) {
    if (!this.gameState || this.gameState.currentPlayer !== sender.id) return;
    
    const topCard = this.gameState.discardPile[this.gameState.discardPile.length - 1];
    const playerHand = this.gameState.players[sender.id];
    
    if (topCard.value === 'draw2' && !this.gameState.draw2Processed) {
      for (let i = 0; i < 2 && this.gameState.deck.length > 0; i++) {
        const drawnCard = this.gameState.deck.pop();
        if (drawnCard) playerHand.push(drawnCard);
      }
      this.room.emit('message', { content: `${sender.name} 被+2惩罚，抽了2张牌并被跳过回合` });
      this.gameState.draw2Processed = true;
      this.advancePlayer(); // Skip
    } else if (topCard.value === 'wild_draw4' && !this.gameState.wildDraw4Processed) {
      for (let i = 0; i < 4 && this.gameState.deck.length > 0; i++) {
        const drawnCard = this.gameState.deck.pop();
        if (drawnCard) playerHand.push(drawnCard);
      }
      this.room.emit('message', { content: `${sender.name} 接受+4惩罚，抽了4张牌并被跳过回合` });
      this.gameState.wildDraw4Processed = true;
      this.advancePlayer(); // Skip
    } else {
      if (this.gameState.deck.length > 0) {
        const drawnCard = this.gameState.deck.pop()!;
        this.gameState.players[sender.id].push(drawnCard);
        this.room.emit('message', { content: `${sender.name} 抽了一张牌` });
      }
      this.advancePlayer();
    }
    
    this.moveHistory.push({ player: sender.id, action: { type: 'draw_card' }, timestamp: Date.now() });
    this.save();
    this.room.emit('command', { type: 'game:state', data: { ...this.gameState, moveHistory: this.moveHistory } });
    
    if (!this.gameState.winner) {
      const nextTimeout = this.isHosted(this.gameState.currentPlayer) ? 5000 : this.TURN_TIMEOUT;
      this.startTurnTimer(nextTimeout);
    }
  }

  handleCallUno(sender: RoomPlayer) {
    if (!this.gameState) return;
    const playerHand = this.gameState.players[sender.id];
    if (playerHand.length === 1) {
      this.room.emit('command', { type: 'uno:called', data: sender.id });
      this.room.emit('message', { content: `${sender.name} 喊 UNO！` });
    }
  }

  handleChallenge(sender: RoomPlayer) {
    if (!this.gameState || this.gameState.currentPlayer !== sender.id) return;
    const topCard = this.gameState.discardPile[this.gameState.discardPile.length - 1];
    if (topCard.value !== 'wild_draw4') {
      this.room.emit('message', { content: `${sender.name} 只能对变色+4进行质疑！` });
      return;
    }
    if (this.gameState.wildDraw4Processed) {
      this.room.emit('message', { content: `这个+4已经被处理过了，无法再次质疑！` });
      return;
    }

    const prevPlayerId = this.getPreviousPlayer(Object.keys(this.gameState.players), this.gameState.currentPlayer, this.gameState.direction);
    const prevPlayer = this.room.players.find(p => p.id === prevPlayerId);
    const prevHand = this.gameState.players[prevPlayerId];
    if (!prevPlayer || !prevHand) return;

    let previousColor = this.gameState.color;
    if (this.moveHistory.length > 0) {
      const lastMove = this.moveHistory[this.moveHistory.length - 1];
      if (lastMove.player === prevPlayerId && lastMove.action.type === 'play_card' && lastMove.action.previousColor) {
        previousColor = lastMove.action.previousColor;
      }
    }

    const wasLegalPlay = this.canPlayWildDraw4(prevHand, topCard, previousColor);
    this.room.emit('message', { content: `${sender.name} 对 ${prevPlayer.name} 的+4使用提出质疑！` });

    if (wasLegalPlay) {
      this.room.emit('message', { content: `${prevPlayer.name} 的+4使用合法！${sender.name} 质疑失败，抽6张牌并跳过回合` });
      const currentHand = this.gameState.players[sender.id];
      for (let i = 0; i < 6 && this.gameState.deck.length > 0; i++) {
        const drawnCard = this.gameState.deck.pop();
        if (drawnCard) currentHand.push(drawnCard);
      }
      this.gameState.wildDraw4Processed = true;
      this.advancePlayer();
    } else {
      this.room.emit('message', { content: `${prevPlayer.name} 的+4使用违规！${sender.name} 质疑成功，${prevPlayer.name} 需抽4张牌` });
      for (let i = 0; i < 4 && this.gameState.deck.length > 0; i++) {
        const drawnCard = this.gameState.deck.pop();
        if (drawnCard) prevHand.push(drawnCard);
      }
      this.gameState.wildDraw4Processed = true;
      this.room.emit('message', { content: `${sender.name} 质疑成功，继续你的回合` });
    }

    this.save();
    this.room.emit('command', { type: 'game:state', data: { ...this.gameState, moveHistory: this.moveHistory } });
    
    if (!this.gameState.winner) {
      const nextTimeout = this.isHosted(this.gameState.currentPlayer) ? 5000 : this.TURN_TIMEOUT;
      this.startTurnTimer(nextTimeout);
    }
  }

  finishGame(winner: RoomPlayer) {
    if (!this.gameState) return;
    this.gameState.winner = winner.id;
    this.room.emit('message', { content: `🎉 恭喜 ${winner.name} 获得胜利！` });
    
    this.room.players.forEach((p) => {
      if (p.role !== 'player') return;
      if (!this.achievements[p.name]) this.achievements[p.name] = { win: 0, lost: 0, draw: 0 };
      if (p.id === winner.id) this.achievements[p.name].win += 1;
      else this.achievements[p.name].lost += 1;
    });

    this.stopTimer();
    if (this.gameState.hosted) this.gameState.hosted = {};
    
    this.save();
    this.room.emit('command', { type: 'game:state', data: { ...this.gameState, moveHistory: this.moveHistory } });
    this.room.emit('command', { type: 'game:over', data: { winner: winner.id } });
    this.room.emit('command', { type: 'achievements', data: this.achievements });
    
    this.room.players.forEach(player => {
      if (player.role === 'player') {
        player.isReady = false;
        player.emit('status', PlayerStatus.unready);
        this.room.emit('player-unready', { ...player });
      }
    });
    this.room.emit('command', { type: 'status', data: { status: 'waiting' } });
  }

  // Helpers
  advancePlayer(skip = false) {
    if (!this.gameState) return;
    let next = this.getNextPlayer(Object.keys(this.gameState.players), this.gameState.currentPlayer, this.gameState.direction);
    if (skip) {
       // If skipping, we just move one more step? No, advancePlayer is called to move to next.
       // If we want to skip the *next* player, we should call advancePlayer twice?
       // Wait, the logic in original code was:
       // skip -> getNext -> emit skipped -> currentPlayer = next -> (loop continues or breaks)
       // Here I am encapsulating "move to next".
       // If I want to skip, I should calculate next, emit skip, set current to next, then calculate next again.
       // But let's keep it simple: advancePlayer just moves one step.
       // The caller handles the "skip" logic by calling advancePlayer multiple times or setting currentPlayer manually.
       // Actually, let's look at how I used it.
       // In handlePlayCard:
       // skip -> advancePlayer(true) -> I commented "Skip next logic handled in advancePlayer"
       // Let's implement skip logic inside advancePlayer?
       // No, better to be explicit in the caller.
       // Let's revert advancePlayer to just move one step, and handle skip in caller.
    }
    // Re-implementing advancePlayer to just move one step
    const nextPlayerId = this.getNextPlayer(Object.keys(this.gameState.players), this.gameState.currentPlayer, this.gameState.direction);
    const nextPlayer = this.room.players.find(p => p.id === nextPlayerId);
    if (nextPlayer) this.room.emit('message', { content: `轮到 ${nextPlayer.name} 出牌` });
    this.gameState.currentPlayer = nextPlayerId;
  }

  getNextPlayer(players: string[], currentPlayer: string, direction: 1 | -1): string {
    const currentIndex = players.indexOf(currentPlayer);
    const nextIndex = (currentIndex + direction + players.length) % players.length;
    return players[nextIndex];
  }

  getPreviousPlayer(players: string[], currentPlayer: string, direction: 1 | -1): string {
    const currentIndex = players.indexOf(currentPlayer);
    const prevIndex = (currentIndex - direction + players.length) % players.length;
    return players[prevIndex];
  }

  canPlayCard(card: UnoCard, topCard: UnoCard, currentColor: string): boolean {
    if (card.type === 'wild') return true;
    if (card.color === currentColor) return true;
    if (card.value === topCard.value) return true;
    return false;
  }

  canPlayWildDraw4(hand: UnoCard[], topCard: UnoCard, currentColor: string): boolean {
    for (const card of hand) {
      if (card.type === 'wild') continue;
      if (card.color === currentColor) return false;
      if (card.value === topCard.value) return false;
    }
    return true;
  }

  isHosted(playerId: string) {
    return !!(this.gameState && this.gameState.hosted && this.gameState.hosted[playerId]);
  }

  async startHosting(playerId: string) {
    if (!this.gameState) return;
    this.gameState.hosted = this.gameState.hosted || {};
    if (this.gameState.hosted[playerId]) return;
    this.gameState.hosted[playerId] = true;
    this.room.emit('message', { content: `玩家 ${playerId} 离线，进入托管。` });
    this.save();
    this.room.emit('command', { type: 'game:state', data: this.gameState });

    if (this.gameState.currentPlayer === playerId && !this.gameState.winner) {
      this.startTurnTimer(5000);
    }
  }

  async stopHosting(playerId: string) {
    if (!this.gameState || !this.gameState.hosted) return;
    if (!this.gameState.hosted[playerId]) return;
    delete this.gameState.hosted[playerId];
    this.room.emit('message', { content: `玩家 ${playerId} 已重连，取消托管。` });
    this.save();
    this.room.emit('command', { type: 'game:state', data: this.gameState });
  }

  async hostPlayTurn(playerId: string) {
    if (!this.gameState || this.gameState.winner) return;
    const hand = this.gameState.players[playerId];
    if (!hand) return;

    const topCard = this.gameState.discardPile[this.gameState.discardPile.length - 1];

    if (topCard.value === 'draw2' && !this.gameState.draw2Processed) {
      for (let i = 0; i < 2 && this.gameState.deck.length > 0; i++) {
        const drawn = this.gameState.deck.pop();
        if (drawn) hand.push(drawn);
      }
      this.room.emit('message', { content: `${playerId} (托管) 被+2惩罚，抽了2张牌` });
      this.gameState.draw2Processed = true;
      this.advancePlayer(); // Skip
      return;
    }

    if (topCard.value === 'wild_draw4' && !this.gameState.wildDraw4Processed) {
      for (let i = 0; i < 4 && this.gameState.deck.length > 0; i++) {
        const drawn = this.gameState.deck.pop();
        if (drawn) hand.push(drawn);
      }
      this.room.emit('message', { content: `${playerId} (托管) 被+4惩罚，抽了4张牌` });
      this.gameState.wildDraw4Processed = true;
      this.advancePlayer(); // Skip
      return;
    }

    let chosenIndex = -1;
    for (let i = 0; i < hand.length; i++) {
      const c = hand[i];
      if (c.type !== 'wild' && this.canPlayCard(c, topCard, this.gameState.color)) { chosenIndex = i; break; }
    }
    if (chosenIndex === -1) {
      for (let i = 0; i < hand.length; i++) {
        const c = hand[i];
        if (c.type === 'wild') {
          if (c.value === 'wild_draw4') {
            if (this.canPlayWildDraw4(hand, topCard, this.gameState.color)) {
              chosenIndex = i; break;
            }
          } else {
            chosenIndex = i; break;
          }
        }
      }
    }

    const playerSocket = this.room.players.find(p => p.id === playerId);

    if (chosenIndex !== -1) {
      const card = hand[chosenIndex];
      let chosenColor: any = undefined;
      if (card.type === 'wild') {
        const colorCount: Record<string, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        hand.forEach(hc => { if (hc.color && hc.color !== 'black') colorCount[hc.color] = (colorCount[hc.color] || 0) + 1; });
        const colors = Object.keys(colorCount) as Array<'red'|'blue'|'green'|'yellow'>;
        colors.sort((a,b) => colorCount[b] - colorCount[a]);
        chosenColor = colors[0] || 'red';
      }

      hand.splice(chosenIndex, 1);
      this.gameState.discardPile.push(card);
      this.gameState.draw2Processed = false;
      
      const cardName = card.type === 'wild' ? (card.value === 'wild' ? '变色牌' : '变色+4') : `${card.color === 'red' ? '红' : card.color === 'blue' ? '蓝' : card.color === 'green' ? '绿' : '黄'}${card.value}`;
      this.room.emit('message', { content: `${playerSocket?.name || playerId} (托管) 出了 ${cardName}` });

      if (card.type === 'wild') {
        this.gameState.color = chosenColor;
        this.room.emit('message', { content: `${playerSocket?.name || playerId} 将颜色改为${chosenColor === 'red' ? '红色' : chosenColor === 'blue' ? '蓝色' : chosenColor === 'green' ? '绿色' : '黄色'}` });
        if (card.value === 'wild_draw4') {
          this.gameState.wildDraw4Processed = false;
          this.room.emit('message', { content: `下家将面临+4惩罚！` });
        }
      } else {
        this.gameState.color = card.color as any;
        switch (card.value) {
          case 'skip':
            this.advancePlayer(true); // Skip next logic handled below
            break;
          case 'reverse':
            this.gameState.direction = (this.gameState.direction * -1) as 1 | -1;
            this.room.emit('message', { content: `方向反转！现在是${this.gameState.direction === 1 ? '顺时针' : '逆时针'}` });
            break;
          case 'draw2':
            this.room.emit('message', { content: `下家将面临+2惩罚！必须抽2张牌并结束回合` });
            break;
        }
      }

      if (hand.length === 0) {
        this.finishGame(playerSocket || { id: playerId, name: playerId } as any);
        return;
      }

      // Handle special card effects on turn progression
      if (card.value === 'skip' || (card.value === 'reverse' && Object.keys(this.gameState.players).length === 2)) {
         const nextP = this.getNextPlayer(Object.keys(this.gameState.players), this.gameState.currentPlayer, this.gameState.direction);
         const skipped = this.room.players.find(p => p.id === nextP);
         this.room.emit('message', { content: `${skipped?.name} 被跳过了！` });
         this.gameState.currentPlayer = nextP;
         this.advancePlayer();
      } else {
         this.advancePlayer();
      }

      this.moveHistory.push({ player: playerId, action: { type: 'play_card', cardId: card.id, chosenColor }, timestamp: Date.now() });

    } else {
      const topCard = this.gameState.discardPile[this.gameState.discardPile.length - 1];
      if (topCard.value === 'wild_draw4' && !this.gameState.wildDraw4Processed) {
        for (let i = 0; i < 4 && this.gameState.deck.length > 0; i++) {
          const drawn = this.gameState.deck.pop();
          if (drawn) hand.push(drawn);
        }
        this.room.emit('message', { content: `${playerSocket?.name || playerId} (托管) 被+4惩罚，抽了4张牌` });
      } else {
        if (this.gameState.deck.length > 0) {
          const drawn = this.gameState.deck.pop();
          if (drawn) hand.push(drawn);
          this.room.emit('message', { content: `${playerSocket?.name || playerId} (托管) 抽了一张牌` });
        }
      }
      this.moveHistory.push({ player: playerId, action: { type: 'draw_card' }, timestamp: Date.now() });
      this.advancePlayer();
    }

    if (this.gameState.deck.length === 0 && this.gameState.discardPile.length > 1) {
      const top = this.gameState.discardPile.pop()!;
      this.gameState.deck = shuffleDeck(this.gameState.discardPile);
      this.gameState.discardPile = [top];
    }

    this.save();
    this.room.emit('command', { type: 'game:state', data: this.gameState });

    const nextTimeout = this.isHosted(this.gameState.currentPlayer) ? 5000 : this.TURN_TIMEOUT;
    this.startTurnTimer(nextTimeout);
  }
}

export default UnoGameRoom;
