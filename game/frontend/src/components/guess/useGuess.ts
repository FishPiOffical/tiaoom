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
  difficulty: string;
  from?: string; // 文章来源（只有完成时才有）
}

// 模块级别的玩家列表缓存，按房间ID存储，避免组件重建时丢失数据
const playersCache = new Map<string, any[]>();

export interface GuessHistoryItem {
  char: string;
  correct: boolean;
}

export function useGuess(game: GameCore, roomPlayer: GuessRoomPlayer & { room: Room }) {
  const article = ref<GuessArticle | null>(null);
  const guessHistory = ref<GuessHistoryItem[]>([]); // 猜测历史（按输入顺序）
  const playerStatus = ref<GuessPlayerStatus>('waiting');
  const titleProgress = ref(0);
  const contentProgress = ref(0);
  
  // Toast 提示状态
  const toastMessage = ref('');
  const showToast = ref(false);
  let toastTimer: any = null;
  
  // 使用缓存或初始化空数组
  const roomId = roomPlayer.room.id;
  if (!playersCache.has(roomId)) {
    playersCache.set(roomId, []);
  }
  const allPlayers = ref<any[]>(playersCache.get(roomId)!);
  
  const difficulty = ref('简单');
  const restrictAlphanumeric = ref(false);
  const guessInput = ref('');
  const countdown = ref(0); // 倒计时秒数
  let countdownTimer: any = null;


  // 监听 allPlayers 的变化，同步更新缓存
  watch(allPlayers, (newVal) => {

    playersCache.set(roomId, newVal);
  }, { deep: true });

  const isPlaying = computed(() => roomPlayer.room.status === 'playing');
  const isOwner = computed(() => roomPlayer.isCreator);
  const canGuess = computed(() => 
    isPlaying.value && 
    playerStatus.value !== 'completed'
  );

  // 显示 Toast 提示
  function showToastMessage(message: string) {
    toastMessage.value = message;
    showToast.value = true;
    
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    
    toastTimer = setTimeout(() => {
      showToast.value = false;
    }, 2000);
  }

  function onRoomStart() {
    // 游戏开始，清空状态
    guessHistory.value = [];
    guessInput.value = '';
    
    // 请求最新游戏状态（包括文章数据）
    // 使用较短的延迟确保后端已经准备好数据
    setTimeout(() => {
      game.command(roomPlayer.room.id, { type: 'status', data: {} });
    }, 100);
  }

  function onRoomEnd() {
    // 游戏结束
  }

  function onCommand(cmd: any) {
    if (roomPlayer.room.attrs?.type !== 'guess') {
      return;
    }
    
    switch (cmd.type) {
      case 'status':
        // 接收完整游戏状态
        if (cmd.data.article) {
          article.value = cmd.data.article;
        }
        if (cmd.data.playerState) {
          playerStatus.value = cmd.data.playerState.status;
          guessHistory.value = cmd.data.playerState.guessHistory || [];
          titleProgress.value = cmd.data.playerState.titleProgress || 0;
          contentProgress.value = cmd.data.playerState.contentProgress || 0;
        }
        // 只在allPlayers存在且有数据时才更新
        if (cmd.data.allPlayers && cmd.data.allPlayers.length > 0) {
          allPlayers.value = cmd.data.allPlayers;
        }
        if (cmd.data.difficulty) {
          difficulty.value = cmd.data.difficulty;
        }
        if (cmd.data.restrictAlphanumeric !== undefined) {
          restrictAlphanumeric.value = cmd.data.restrictAlphanumeric;
        }
        // 检查倒计时状态
        if (cmd.data.tickTimeEnd) {
          handleStatusCountdown(cmd.data.tickTimeEnd);
        }
        break;
      
      case 'playersUpdate':
        // 玩家列表更新
        if (cmd.data.players) {
          allPlayers.value = cmd.data.players;
        }
        break;
      
      case 'guessResult':
        // 猜测结果
        guessHistory.value.push({ 
          char: cmd.data.char, 
          correct: cmd.data.correct 
        });
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
      
      case 'difficultyChanged':
        difficulty.value = cmd.data.difficulty;
        break;
      
      case 'restrictAlphanumericChanged':
        restrictAlphanumeric.value = cmd.data.restrictAlphanumeric;
        break;
      
      case 'countdown':
        // 倒计时开始
        // 只处理重置倒计时，忽略不活跃检查倒计时
        if (cmd.data.name !== 'reset') return;

        countdown.value = cmd.data.seconds;
        if (countdownTimer) clearInterval(countdownTimer);
        countdownTimer = setInterval(() => {
          countdown.value--;
          if (countdown.value <= 0) {
            clearInterval(countdownTimer);
            countdownTimer = null;
          }
        }, 1000);
        break;
    }
  }

  // 在status指令中也检查倒计时状态
  function handleStatusCountdown(tickTimeEnd: any) {
    if (tickTimeEnd && tickTimeEnd['reset']) {
      const remaining = Math.max(0, Math.ceil((tickTimeEnd['reset'] - Date.now()) / 1000));
      if (remaining > 0) {
        countdown.value = remaining;
        if (countdownTimer) clearInterval(countdownTimer);
        countdownTimer = setInterval(() => {
          countdown.value--;
          if (countdown.value <= 0) {
            clearInterval(countdownTimer);
            countdownTimer = null;
          }
        }, 1000);
      }
    }
  }

  function guess(char: string) {
    if (!char || char.length !== 1) return;
    if (guessHistory.value.some(item => item.char === char)) return; // 已经猜过了，忽略
    game.command(roomPlayer.room.id, { type: 'guess', data: { char } });
  }

  function giveup() {
    game.command(roomPlayer.room.id, { type: 'giveup' });
  }

  function setDifficulty(newDifficulty: string) {
    if (!isOwner.value || isPlaying.value) return;
    game.command(roomPlayer.room.id, { type: 'setDifficulty', data: { difficulty: newDifficulty } });
  }

  function setRestrictAlphanumeric(value: boolean) {
    if (!isOwner.value || isPlaying.value) return;
    game.command(roomPlayer.room.id, { type: 'setRestrictAlphanumeric', data: { restrictAlphanumeric: value } });
  }

  function handleGuessSubmit() {
    const char = guessInput.value.trim();
    
    // 检查是否为空
    if (!char) return;
    
    // 检查是否超过1个字符
    if (char.length > 1) {
      // 超过1个字符时不提交，只保留提示
      return;
    }
    
    // 只接受单个字符
    if (char.length !== 1) return;

    // 已经输入过的字：提交后无效果，但清空输入框，并显示提示
    if (guessHistory.value.some(item => item.char === char)) {
      showToastMessage(`已经输入过"${char}"了`);
      guessInput.value = '';
      return;
    }

    guess(char);
    guessInput.value = '';
  }

  function kickPlayer(playerId: string) {
    if (!isOwner.value) return
    if (!confirm('确定要踢出该玩家吗？')) return
    game?.kickPlayer(roomPlayer.room.id, playerId)
  }

  useGameEvents(game, {
    'room.start': onRoomStart,
    'room.end': onRoomEnd,
    'player.command': onCommand,
    'room.command': onCommand,
  })

  // 在事件监听器注册后立即请求状态，确保能接收到响应
  nextTick(() => {
    game.command(roomPlayer.room.id, { type: 'status', data: {} });
  });

  // 计算属性：从历史中提取正确的字符（用于文章显示）
  const correctChars = computed(() => 
    guessHistory.value.filter(item => item.correct).map(item => item.char)
  );

  return {
    article,
    guessHistory,
    correctChars, // 保留以便文章显示使用
    playerStatus,
    titleProgress,
    contentProgress,
    allPlayers,
    difficulty,
    restrictAlphanumeric,
    guessInput,
    countdown,
    isPlaying,
    isOwner,
    canGuess,
    toastMessage,
    showToast,
    guess,
    giveup,
    setDifficulty,
    setRestrictAlphanumeric,
    handleGuessSubmit,
    kickPlayer,
  }
}
