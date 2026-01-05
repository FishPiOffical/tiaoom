import { GameRoom, IGameCommand } from '.';
import { RoomPlayer } from 'tiaoom';

export const name = '德州扑克';
export const minSize = 2;
export const maxSize = 6;
export const description = '经典德州扑克游戏，支持2-6人对战。';

export const points = {
  '我就玩玩': 10,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
};

export const rates = {
  '我就玩玩': 1,
  '双倍奖励': 2,
  '玩的就是心跳': 5,
};

interface Card {
  suit: string;
  rank: string;
}

interface PlayerState {
  id: string;
  cards: Card[];
  chips: number;
  bet: number;
  folded: boolean;
  allIn: boolean;
}

export default class TexasHoldemRoom extends GameRoom {
  deck: Card[] = [];
  communityCards: Card[] = [];
  players: Map<string, PlayerState> = new Map();
  pot = 0;
  currentBet = 0;
  dealerIndex = 0;
  currentPlayerIndex = 0;
  stage: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' = 'preflop';
  smallBlind = 10;
  bigBlind = 20;

  init() {
    this.restoreTimer({
      action: () => this.handleTimeout(),
    });
    return super.init();
  }

  onStart() {
    this.initGame();
    this.dealCards();
    this.startBettingRound();
  }

  initGame() {
    this.deck = this.createDeck();
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = this.bigBlind;
    this.dealerIndex = 0;
    this.stage = 'preflop';

    const startChips = this.room.attrs?.point || 1000;
    this.room.validPlayers.forEach(player => {
      this.players.set(player.id, {
        id: player.id,
        cards: [],
        chips: startChips,
        bet: 0,
        folded: false,
        allIn: false,
      });
    });

    const sbIndex = (this.dealerIndex + 1) % this.room.validPlayers.length;
    const bbIndex = (this.dealerIndex + 2) % this.room.validPlayers.length;

    this.placeBet(this.room.validPlayers[sbIndex].id, this.smallBlind);
    this.placeBet(this.room.validPlayers[bbIndex].id, this.bigBlind);

    this.currentPlayerIndex = (this.dealerIndex + 3) % this.room.validPlayers.length;
  }

  createDeck(): Card[] {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank });
      }
    }

    return this.shuffle(deck);
  }

  shuffle(array: Card[]): Card[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  dealCards() {
    this.room.validPlayers.forEach(player => {
      const state = this.players.get(player.id)!;
      state.cards = [this.deck.pop()!, this.deck.pop()!];
    });

    this.room.validPlayers.forEach(player => {
      const state = this.players.get(player.id)!;
      this.commandTo('deal', { cards: state.cards }, player);
    });

    this.broadcastGameState();
  }

  startBettingRound() {
    this.startTimer(() => this.handleTimeout(), 30 * 1000, 'action');
    this.broadcastGameState();
  }

  handleTimeout() {
    const currentPlayer = this.room.validPlayers[this.currentPlayerIndex];
    this.handleFold(currentPlayer.id);
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);

    const currentPlayer = this.room.validPlayers[this.currentPlayerIndex];
    if (message.sender.id !== currentPlayer.id) return;

    switch (message.type) {
      case 'fold':
        this.handleFold(message.sender.id);
        break;
      case 'call':
        this.handleCall(message.sender.id);
        break;
      case 'raise':
        this.handleRaise(message.sender.id, message.data.amount);
        break;
      case 'allin':
        this.handleAllIn(message.sender.id);
        break;
    }
  }

  handleFold(playerId: string) {
    const state = this.players.get(playerId)!;
    state.folded = true;
    this.say(`${this.getPlayerName(playerId)} 弃牌`);
    this.nextPlayer();
  }

  handleCall(playerId: string) {
    const state = this.players.get(playerId)!;
    const callAmount = this.currentBet - state.bet;

    if (callAmount >= state.chips) {
      this.handleAllIn(playerId);
      return;
    }

    this.placeBet(playerId, callAmount);
    this.say(`${this.getPlayerName(playerId)} 跟注 ${callAmount}`);
    this.nextPlayer();
  }

  handleRaise(playerId: string, amount: number) {
    const state = this.players.get(playerId)!;
    const totalBet = this.currentBet + amount;
    const raiseAmount = totalBet - state.bet;

    if (raiseAmount >= state.chips) {
      this.handleAllIn(playerId);
      return;
    }

    this.placeBet(playerId, raiseAmount);
    this.currentBet = totalBet;
    this.say(`${this.getPlayerName(playerId)} 加注到 ${totalBet}`);
    this.nextPlayer();
  }

  handleAllIn(playerId: string) {
    const state = this.players.get(playerId)!;
    const amount = state.chips;
    this.placeBet(playerId, amount);
    state.allIn = true;
    this.say(`${this.getPlayerName(playerId)} 全下 ${amount}`);
    this.nextPlayer();
  }

  placeBet(playerId: string, amount: number) {
    const state = this.players.get(playerId)!;
    state.chips -= amount;
    state.bet += amount;
    this.pot += amount;
    this.save();
  }

  nextPlayer() {
    this.stopTimer('action');

    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 1) {
      this.endGame(activePlayers[0]);
      return;
    }

    let nextIndex = (this.currentPlayerIndex + 1) % this.room.validPlayers.length;
    let checked = 0;

    while (checked < this.room.validPlayers.length) {
      const player = this.room.validPlayers[nextIndex];
      const state = this.players.get(player.id)!;

      if (!state.folded && !state.allIn) {
        if (state.bet === this.currentBet || this.allPlayersActed()) {
          this.currentPlayerIndex = nextIndex;

          if (this.allPlayersActed()) {
            this.nextStage();
          } else {
            this.startBettingRound();
          }
          return;
        }

        this.currentPlayerIndex = nextIndex;
        this.startBettingRound();
        return;
      }

      nextIndex = (nextIndex + 1) % this.room.validPlayers.length;
      checked++;
    }

    this.nextStage();
  }

  allPlayersActed(): boolean {
    const activePlayers = this.getActivePlayers();
    return activePlayers.every(p => {
      const state = this.players.get(p.id)!;
      return state.bet === this.currentBet || state.allIn;
    });
  }

  nextStage() {
    this.room.validPlayers.forEach(player => {
      const state = this.players.get(player.id)!;
      state.bet = 0;
    });
    this.currentBet = 0;

    if (this.stage === 'preflop') {
      this.stage = 'flop';
      this.communityCards.push(this.deck.pop()!, this.deck.pop()!, this.deck.pop()!);
    } else if (this.stage === 'flop') {
      this.stage = 'turn';
      this.communityCards.push(this.deck.pop()!);
    } else if (this.stage === 'turn') {
      this.stage = 'river';
      this.communityCards.push(this.deck.pop()!);
    } else {
      this.showdown();
      return;
    }

    this.command('stage', { stage: this.stage, communityCards: this.communityCards });
    this.currentPlayerIndex = (this.dealerIndex + 1) % this.room.validPlayers.length;
    this.startBettingRound();
  }

  showdown() {
    const activePlayers = this.getActivePlayers();
    const results = activePlayers.map(player => {
      const state = this.players.get(player.id)!;
      const hand = this.evaluateHand([...state.cards, ...this.communityCards]);
      return { player, hand };
    });

    results.sort((a, b) => b.hand.rank - a.hand.rank);
    const winner = results[0].player;

    this.command('showdown', {
      results: results.map(r => ({
        playerId: r.player.id,
        cards: this.players.get(r.player.id)!.cards,
        handName: r.hand.name,
      })),
    });

    setTimeout(() => this.endGame(winner), 5000);
  }

  evaluateHand(cards: Card[]): { rank: number; name: string } {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const rankValues = cards.map(c => ranks.indexOf(c.rank));
    const suits = cards.map(c => c.suit);

    const isFlush = suits.some(s => suits.filter(suit => suit === s).length >= 5);
    const sortedRanks = rankValues.sort((a, b) => b - a);

    let maxRank = Math.max(...sortedRanks);
    return { rank: maxRank, name: '高牌' };
  }

  getActivePlayers(): RoomPlayer[] {
    return this.room.validPlayers.filter(p => {
      const state = this.players.get(p.id)!;
      return !state.folded;
    });
  }

  getPlayerName(playerId: string): string {
    return this.room.validPlayers.find(p => p.id === playerId)?.name || '未知';
  }

  endGame(winner: RoomPlayer) {
    this.say(`${winner.name} 获胜，赢得 ${this.pot} 筹码！`);
    this.saveAchievements([winner]);
    this.room.end();
  }

  broadcastGameState() {
    this.command('state', {
      pot: this.pot,
      currentBet: this.currentBet,
      currentPlayerId: this.room.validPlayers[this.currentPlayerIndex].id,
      stage: this.stage,
      communityCards: this.communityCards,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        chips: p.chips,
        bet: p.bet,
        folded: p.folded,
        allIn: p.allIn,
      })),
    });
  }

  getStatus(sender: any) {
    const state = this.players.get(sender.id);
    return {
      ...super.getStatus(sender),
      myCards: state?.cards || [],
      pot: this.pot,
      currentBet: this.currentBet,
      stage: this.stage,
      communityCards: this.communityCards,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        chips: p.chips,
        bet: p.bet,
        folded: p.folded,
        allIn: p.allIn,
      })),
    };
  }

  getData() {
    return {
      ...super.getData(),
      pot: this.pot,
      winner: this.getActivePlayers()[0]?.id,
    };
  }
}
