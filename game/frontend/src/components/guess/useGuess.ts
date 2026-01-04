import { ref, computed, watch, nextTick } from 'vue'
import { Room, RoomPlayer } from 'tiaoom/client'
import { GameCore } from '@/core/game';
import { useGameEvents } from '@/hook/useGameEvents';

export type GuessPlayerStatus = 'waiting' | 'guessing' | 'completed' | 'giveup';

export interface GuessRoomPlayer extends RoomPlayer {
  gameStatus?: GuessPlayerStatus;
  titleProgress?: number;
  contentProgress?: number;
}

export interface GuessArticle {
  title: string;
  content: string;
  category: string;
  difficulty: string;
}

// 模块级别的玩家列表缓存，按房间ID存储，避免组件重建时丢失数据
const playersCache = new Map<string, any[]>();

// 消息缓存
const messagesCache = new Map<string, Array<{ sender?: any; content: string }>>();

export function useGuess(game: GameCore, roomPlayer: GuessRoomPlayer & { room: Room }) {
  const article = ref<GuessArticle | null>(null);
  const correctChars = ref<string[]>([]);
  const wrongChars = ref<string[]>([]);
  const playerStatus = ref<GuessPlayerStatus>('waiting');
  const titleProgress = ref(0);
  const contentProgress = ref(0);
  
  // 使用缓存或初始化空数组
  const roomId = roomPlayer.room.id;
  if (!playersCache.has(roomId)) {
    playersCache.set(roomId, []);
  }
  const allPlayers = ref<any[]>(playersCache.get(roomId)!);
  
  // 消息列表
  if (!messagesCache.has(roomId)) {
    messagesCache.set(roomId, []);
  }
  const messages = ref<Array<{ sender?: any; content: string }>>(messagesCache.get(roomId)!);
  
  const category = ref('百科');
  const difficulty = ref('简单');
  const guessInput = ref('');

  console.log('[猜盐] useGuess 初始化, roomId:', roomId, 'allPlayers初始值:', allPlayers.value);

  // 监听 allPlayers 的变化，同步更新缓存
  watch(allPlayers, (newVal) => {
    console.log('[猜盐] allPlayers 值变化:', {
      roomId,
      newLength: newVal?.length,
      new: newVal
    });
    playersCache.set(roomId, newVal);
  }, { deep: true });

  const isPlaying = computed(() => roomPlayer.room.status === 'playing');
  const isOwner = computed(() => roomPlayer.isCreator);
  const canGuess = computed(() => 
    isPlaying.value && 
    playerStatus.value !== 'completed'
  );

  function onRoomStart() {
    console.log('[猜盐] onRoomStart 触发');
    // 游戏开始，清空状态
    correctChars.value = [];
    wrongChars.value = [];
    guessInput.value = '';
    
    // 请求最新游戏状态（包括文章数据）
    // 使用较短的延迟确保后端已经准备好数据
    setTimeout(() => {
      console.log('[猜盐] 游戏开始，请求status获取文章');
      game.command(roomPlayer.room.id, { type: 'status', data: {} });
    }, 100);
  }

  function onRoomEnd() {
    console.log('[猜盐] onRoomEnd 触发');
    // 游戏结束
  }

  function onCommand(cmd: any) {
    console.log('[猜盐] onCommand 被调用:', {
      cmdType: cmd.type,
      cmdData: cmd.data,
      hasArticle: !!cmd.data?.article,
      roomType: roomPlayer.room.attrs?.type,
      isGuessRoom: roomPlayer.room.attrs?.type === 'guess',
      roomStatus: roomPlayer.room.status
    });
    
    if (roomPlayer.room.attrs?.type !== 'guess') {
      console.log('[猜盐] 房间类型不是guess，忽略命令');
      return;
    }
    
    switch (cmd.type) {
      case 'status':
        console.log('[猜盐] 收到status命令:', {
          hasArticle: !!cmd.data.article,
          article: cmd.data.article,
          hasAllPlayers: !!cmd.data.allPlayers,
          allPlayersLength: cmd.data.allPlayers?.length,
          allPlayers: cmd.data.allPlayers,
          currentAllPlayers: allPlayers.value
        });
        // 接收完整游戏状态
        if (cmd.data.article) {
          console.log('[猜盐] 更新article:', cmd.data.article);
          article.value = cmd.data.article;
        } else {
          console.log('[猜盐] status命令中没有article数据');
        }
        if (cmd.data.playerState) {
          playerStatus.value = cmd.data.playerState.status;
          correctChars.value = cmd.data.playerState.correctChars || [];
          wrongChars.value = cmd.data.playerState.wrongChars || [];
          titleProgress.value = cmd.data.playerState.titleProgress || 0;
          contentProgress.value = cmd.data.playerState.contentProgress || 0;
        }
        // 只在allPlayers存在且有数据时才更新
        if (cmd.data.allPlayers && cmd.data.allPlayers.length > 0) {
          console.log('[猜盐] 更新allPlayers:', cmd.data.allPlayers);
          allPlayers.value = cmd.data.allPlayers;
        } else {
          console.log('[猜盐] status命令中allPlayers为空或不存在，不更新');
        }
        if (cmd.data.category) {
          category.value = cmd.data.category;
        }
        if (cmd.data.difficulty) {
          difficulty.value = cmd.data.difficulty;
        }
        break;
      
      case 'playersUpdate':
        console.log('[猜盐] 收到playersUpdate命令:', {
          hasPlayers: !!cmd.data.players,
          playersLength: cmd.data.players?.length,
          players: cmd.data.players,
          currentAllPlayers: allPlayers.value
        });
        // 玩家列表更新
        if (cmd.data.players) {
          console.log('[猜盐] 更新allPlayers from playersUpdate:', cmd.data.players);
          allPlayers.value = cmd.data.players;
        }
        break;
      
      case 'guessResult':
        // 猜测结果
        if (cmd.data.correct) {
          correctChars.value.push(cmd.data.char);
        } else {
          wrongChars.value.push(cmd.data.char);
        }
        titleProgress.value = cmd.data.titleProgress || 0;
        contentProgress.value = cmd.data.contentProgress || 0;
        // 更新文章显示
        if (cmd.data.article) {
          article.value = cmd.data.article;
        }
        guessInput.value = '';
        break;
      
      case 'statusChanged':
        // 状态改变
        playerStatus.value = cmd.data.status;
        break;
      
      case 'categoryChanged':
        category.value = cmd.data.category;
        break;
      
      case 'difficultyChanged':
        difficulty.value = cmd.data.difficulty;
        break;
    }
  }

  function guess(char: string) {
    if (!char || char.length !== 1) return;
    if (correctChars.value.includes(char) || wrongChars.value.includes(char)) {
      return; // 已经猜过了
    }
    game.command(roomPlayer.room.id, { type: 'guess', data: { char } });
  }

  function giveup() {
    game.command(roomPlayer.room.id, { type: 'giveup' });
  }

  function setCategory(newCategory: string) {
    if (!isOwner.value || isPlaying.value) return;
    game.command(roomPlayer.room.id, { type: 'setCategory', data: { category: newCategory } });
  }

  function setDifficulty(newDifficulty: string) {
    if (!isOwner.value || isPlaying.value) return;
    game.command(roomPlayer.room.id, { type: 'setDifficulty', data: { difficulty: newDifficulty } });
  }

  function handleGuessSubmit() {
    const char = guessInput.value.trim();
    if (char.length === 1) {
      guess(char);
    }
  }

  // 监听消息事件
  function onMessage(msg: any, sender?: any) {
    if (roomPlayer.room.attrs?.type !== 'guess') return;
    
    console.log('[猜盐] 收到消息 - 完整数据:', { 
      msg, 
      sender, 
      msgType: typeof msg,
      hasSender: !!sender,
      senderName: sender?.name 
    });
    
    // 确保内容是字符串
    let content: string;
    if (typeof msg === 'string') {
      content = msg;
    } else if (msg && typeof msg === 'object') {
      // 如果是对象，尝试提取 message 或 text 字段
      content = msg.message || msg.text || msg.content || JSON.stringify(msg);
    } else {
      content = String(msg);
    }
    
    console.log('[猜盐] 处理后的消息:', { content, sender: sender?.name || '无' });
    
    messages.value.push({
      sender: sender,
      content
    });
    
    // 更新缓存
    messagesCache.set(roomId, messages.value);
    
    // 限制消息数量，保留最新100条
    if (messages.value.length > 100) {
      messages.value.shift();
    }
  }

  useGameEvents(game, {
    'room.start': onRoomStart,
    'room.end': onRoomEnd,
    'player.command': onCommand,
    'room.command': onCommand,
    'room.message': onMessage,
  })

  // 在事件监听器注册后立即请求状态，确保能接收到响应
  nextTick(() => {
    console.log('[猜盐] useGuess初始化后立即请求status');
    game.command(roomPlayer.room.id, { type: 'status', data: {} });
  });

  return {
    article,
    correctChars,
    wrongChars,
    playerStatus,
    titleProgress,
    contentProgress,
    allPlayers,
    messages,
    category,
    difficulty,
    guessInput,
    isPlaying,
    isOwner,
    canGuess,
    guess,
    giveup,
    setCategory,
    setDifficulty,
    handleGuessSubmit,
  }
}
