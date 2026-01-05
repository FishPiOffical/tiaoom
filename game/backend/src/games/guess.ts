import { PlayerRole, PlayerStatus, RoomPlayer, RoomStatus } from "tiaoom";
import { BaseModel, GameRoom, IGameCommand, IGameData } from ".";
import { Column, Entity, Like } from "typeorm";
import { Router } from "express";

// 文章状态枚举
export enum ArticleStatus {
  PENDING = 'pending',      // 待审核
  AVAILABLE = 'available',  // 可用
  FROZEN = 'frozen',        // 冻结
  DELETED = 'deleted'       // 已删除
}

// 文章实体模型
@Entity({ name: 'article', comment: '猜盐游戏文章' })
export class Model extends BaseModel {
  @Column({ comment: "标题", type: 'text' })
  title: string = '';

  @Column({ comment: "正文", type: 'text' })
  content: string = '';

  @Column({ comment: "难度", default: '简单' })
  difficulty: string = '简单';

  @Column({ 
    comment: "状态", 
    type: 'varchar',
    default: ArticleStatus.PENDING 
  })
  status: ArticleStatus = ArticleStatus.PENDING;

  @Column({ comment: "投送人" })
  from: string = '';

  @Column({ comment: "权重", default: 100 })
  weight: number = 100;

  // 为了向后兼容，保留valid字段的getter
  get valid(): boolean {
    return this.status === ArticleStatus.AVAILABLE;
  }
}

export const name = '猜盐游戏';
export const minSize = 0;
export const maxSize = 0;
export const requireAllReadyToStart = false;
export const description = `系统随机选取一篇文章，玩家通过猜测字符来还原文章内容。
猜出完整标题即视为完成。`;
export const points = {
  '我就玩玩': 1,
  '小博一下': 100,
  '大赢家': 1000,
  '梭哈！': 10000,
}
export const extendPages = [
  { name: '投稿', component: 'GuessPost' },
];

// 预制文章数据
const DEFAULT_ARTICLES = [
  {
    title: '万里长城',
    content: '万里长城是中国古代的军事防御工事，是一道高大、坚固而且连绵不断的长垣，用以限隔敌骑的行动。长城不是一道单纯孤立的城墙，而是以城墙为主体，同大量的城、障、亭、标相结合的防御体系。',
    difficulty: '简单',
    status: ArticleStatus.AVAILABLE
  },
  {
    title: '人工智能',
    content: '人工智能是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。',
    difficulty: '中等',
    status: ArticleStatus.AVAILABLE
  },
  {
    title: '红楼梦',
    content: '《红楼梦》是中国古代章回体长篇小说，又名《石头记》，被列为中国古典四大名著之首。小说以贾、史、王、薛四大家族的兴衰为背景，以富贵公子贾宝玉为视角，以贾宝玉与林黛玉、薛宝钗的爱情婚姻悲剧为主线，描绘了一批举止见识出于须眉之上的闺阁佳人的人生百态。',
    difficulty: '困难',
    status: ArticleStatus.AVAILABLE
  }
];

// 玩家游戏状态
type PlayerGameStatus = 'waiting' | 'guessing' | 'completed' | 'giveup';

interface GuessHistoryItem {
  char: string;
  correct: boolean;
}

interface PlayerGameState {
  player: RoomPlayer;
  status: PlayerGameStatus;
  guessHistory: GuessHistoryItem[]; // 猜测历史（按输入顺序）
  guessedCharsSet: Set<string>; // 已猜测的字符集合（用于快速查找）
  correctCharsSet: Set<string>; // 猜对的字符集合（用于进度计算）
  lastGuessTime: number; // 最后猜测时间
  titleProgress: number; // 标题进度百分比
  contentProgress: number; // 正文进度百分比
}

class GuessGameRoom extends GameRoom implements IGameData<Model> {
  currentArticle?: Model;
  playerStates: Map<string, PlayerGameState> = new Map();
  gameStartTime: number = 0;
  restrictAlphanumeric: boolean = false; // 是否禁止数字和字母

  // 所有可能的汉字字符（用于统计进度）
  titleChars: Set<string> = new Set();
  contentChars: Set<string> = new Set();

  readonly INACTIVE_TIMEOUT = 3 * 60 * 1000; // 3分钟无活动超时

  // 重写save方法以正确序列化Map和Set
  save() {
    // 将 Map 转换为普通对象
    const playerStatesObj: any = {};
    this.playerStates.forEach((state, key) => {
      playerStatesObj[key] = {
        ...state,
        guessedCharsSet: Array.from(state.guessedCharsSet),
        correctCharsSet: Array.from(state.correctCharsSet),
      };
    });

    // 临时保存原始Map
    const originalPlayerStates = this.playerStates;
    const originalTitleChars = this.titleChars;
    const originalContentChars = this.contentChars;

    // 替换为可序列化的对象
    (this as any).playerStates = playerStatesObj;
    (this as any).titleChars = Array.from(this.titleChars);
    (this as any).contentChars = Array.from(this.contentChars);

    // 调用父类save方法
    super.save();

    // 恢复原始Map
    this.playerStates = originalPlayerStates;
    this.titleChars = originalTitleChars;
    this.contentChars = originalContentChars;
  }

  get Routers() {
    const router = Router();
    router.use((req, res, next) => {
      if (!req.session.player) {
        return res.json({ code: 1, message: "请先登录" });
      }
      next();
    });

    // 投稿文章
    router.post("/post", async (req, res) => {
      try {
        const { title, content, difficulty } = req.body;
        if (!title || !content) {
          throw new Error("标题和正文不能为空");
        }
        if (title.length > 100) {
          throw new Error("标题长度不能超过100个字符");
        }
        if (content.length > 5000) {
          throw new Error("正文长度不能超过5000个字符");
        }

        const model = new Model();
        model.title = title;
        model.content = content;
        model.difficulty = difficulty || '简单';
        model.status = ArticleStatus.PENDING; // 投稿后默认为待审核
        model.from = req.session.player?.username || '';
        await this.insert(model);
        res.json({ code: 0, data: model });
      } catch (error: any) {
        res.json({ code: 1, message: error.message });
      }
    });

    // 获取我的投稿
    router.get("/my-posts", async (req, res) => {
      try {
        const posts = await Model.getRepo<Model>(Model).find({
          where: { from: req.session.player?.username || '' },
          order: { createdAt: "DESC" },
        });
        res.json({ code: 0, data: posts });
      } catch (error: any) {
        res.json({ code: 1, message: error.message });
      }
    });

    return router;
  }

  async getList(query: { title?: string; status?: string; difficulty?: string; page: number; count: number; }): Promise<{ records: Model[]; total: number; }> {
    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.difficulty) {
      where.difficulty = query.difficulty;
    }

    const whereConditions = [];
    if (query.title) {
      whereConditions.push({ title: Like(`%${query.title}%`), ...where });
      whereConditions.push({ content: Like(`%${query.title}%`), ...where });
    } else {
      whereConditions.push(where);
    }

    const [records, total] = await Model.getRepo<Model>(Model).findAndCount({
      where: whereConditions,
      skip: (query.page - 1) * query.count,
      take: query.count,
    });
    return { records, total };
  }

  async insert(data: Model): Promise<Model> {
    return await Model.getRepo<Model>(Model).save(Model.getRepo<Model>(Model).create(data));
  }

  async update(id: string, data: Partial<Model>): Promise<void> {
    await Model.getRepo<Model>(Model).update(id, data);
  }

  async delete(id: string): Promise<void> {
    await Model.getRepo<Model>(Model).delete(id);
  }

  init() {
    // 确保 playerStates 是 Map 对象
    if (!(this.playerStates instanceof Map)) {
      const oldStates = this.playerStates as any;
      this.playerStates = new Map();
      
      // 如果存在旧数据，恢复到 Map 中
      if (oldStates && typeof oldStates === 'object') {
        Object.entries(oldStates).forEach(([key, value]: [string, any]) => {
          if (value && value.player) {
            // 兼容旧数据格式
            if (value.correctChars || value.wrongChars) {
              // 从旧格式迁移到新格式
              value.guessHistory = [];
              const oldCorrectChars = Array.isArray(value.correctChars) 
                ? value.correctChars 
                : (value.correctChars ? Array.from(Object.values(value.correctChars)) : []);
              const oldWrongChars = Array.isArray(value.wrongChars) 
                ? value.wrongChars 
                : (value.wrongChars ? Array.from(Object.values(value.wrongChars)) : []);
              
              // 合并旧数据到guessHistory（无法保证顺序）
              oldCorrectChars.forEach((char: string) => {
                value.guessHistory.push({ char, correct: true });
              });
              oldWrongChars.forEach((char: string) => {
                value.guessHistory.push({ char, correct: false });
              });
              
              value.correctCharsSet = new Set(oldCorrectChars);
              value.guessedCharsSet = new Set([...oldCorrectChars, ...oldWrongChars]);
            } else {
              // 恢复新格式
              value.guessHistory = value.guessHistory || [];
              
              if (value.guessedCharsSet && !Array.isArray(value.guessedCharsSet)) {
                value.guessedCharsSet = new Set(Object.values(value.guessedCharsSet || {}));
              } else if (Array.isArray(value.guessedCharsSet)) {
                value.guessedCharsSet = new Set(value.guessedCharsSet);
              } else {
                value.guessedCharsSet = new Set();
              }
              
              if (value.correctCharsSet && !Array.isArray(value.correctCharsSet)) {
                value.correctCharsSet = new Set(Object.values(value.correctCharsSet || {}));
              } else if (Array.isArray(value.correctCharsSet)) {
                value.correctCharsSet = new Set(value.correctCharsSet);
              } else {
                value.correctCharsSet = new Set();
              }
            }
            
            this.playerStates.set(key, value);
          }
        });
      }
    }
    
    // 重建汉字 Set
    if (this.titleChars && !(this.titleChars instanceof Set)) {
      this.titleChars = new Set(Array.isArray(this.titleChars) ? this.titleChars : Object.values(this.titleChars || {}));
    }
    if (this.contentChars && !(this.contentChars instanceof Set)) {
      this.contentChars = new Set(Array.isArray(this.contentChars) ? this.contentChars : Object.values(this.contentChars || {}));
    }
    
    this.restoreTimer({
      checkInactive: () => {
        this.checkInactivePlayers();
      },
      reset: () => {
        this.resetGame();
      },
    });
    
    // 监听玩家加入事件
    this.room.on('join', (player) => {
      console.log('[猜盐后端] 玩家加入事件触发:', player.name, '房间状态:', this.room.status);
      // 如果游戏正在进行，新加入的玩家状态为"等待中"
      if (this.room.status === RoomStatus.playing) {
        // join 事件里传来的 player 可能还是 watcher（默认行为），这里对猜盐做特判：允许直接转为 player 参与
        const roomPlayer = this.room.players.find(p => p.id === player.id);
        if (roomPlayer) {
          if (roomPlayer.role === PlayerRole.watcher) {
            roomPlayer.role = PlayerRole.player;
            roomPlayer.isReady = false;
            roomPlayer.status = PlayerStatus.playing;
            roomPlayer.emit('status', PlayerStatus.playing);
            this.room.emit('update', this.room);
          }

          // 初始化为等待中（也能参与猜题，首次猜测会自动进入流程）
          this.initPlayerState(roomPlayer, 'waiting');
          this.say(`玩家 ${roomPlayer.name} 加入游戏，状态为等待中。`);
          this.broadcastPlayersUpdate();
          this.save();
        }
      } else {
        // 准备阶段也广播玩家列表更新
        console.log('[猜盐后端] 准备阶段，广播玩家列表更新');
        this.broadcastPlayersUpdate();
      }
      
      // 延迟后向新加入的玩家发送完整状态
      setTimeout(() => {
        console.log('[猜盐后端] 延迟200ms后发送玩家列表给', player.name);
        const roomPlayer = this.room.validPlayers.find(p => p.id === player.id);
        if (roomPlayer) {
          const players = this.room.status === RoomStatus.playing 
            ? Array.from(this.playerStates.values()).map(s => ({
                name: s.player.name,
                status: s.status,
                titleProgress: s.titleProgress,
                contentProgress: s.contentProgress,
                avatar: s.player.attributes?.avatar,
                isPlaying: true,
              }))
            : this.room.validPlayers.map(p => ({
                name: p.name,
                status: p.isReady ? 'ready' : 'unready',
                titleProgress: 0,
                contentProgress: 0,
                avatar: p.attributes?.avatar,
                isPlaying: false,
              }));
          console.log('[猜盐后端] 发送玩家列表:', players);
          this.commandTo('playersUpdate', { players }, roomPlayer);
        }
      }, 200);
    });
    
    // 监听玩家准备状态变化
    this.room.on('player-ready', () => {
      this.broadcastPlayersUpdate();
    });
    
    this.room.on('player-unready', () => {
      this.broadcastPlayersUpdate();
    });

    // 监听玩家离开事件
    this.room.on('leave', (player) => {
      const state = this.playerStates.get(player.id);
      if (state) {
        this.playerStates.delete(player.id);
      }

      this.broadcastPlayersUpdate();

      // 游戏中：踢出/离开都可能导致满足结束条件（例如最后一个 guess 玩家被踢）
      if (this.room.status === RoomStatus.playing) {
        this.checkGameEnd();
      }

      this.save();
    });
    
    return super.init().on('end', () => {
      this.stopTimer();
      // 游戏结束时降低文章权重
      this.decreaseArticleWeight();
    }).on('join', () => {
      // 确保新加入的玩家立即收到玩家列表
      setTimeout(() => this.broadcastPlayersUpdate(), 100);
    });
  }

  // 检查不活跃玩家
  checkInactivePlayers() {
    const now = Date.now();
    this.playerStates.forEach((state, playerId) => {
      if (state.status === 'guessing') {
        if (now - state.lastGuessTime > this.INACTIVE_TIMEOUT) {
          // 检查玩家是否还在房间中
          const player = this.room.validPlayers.find(p => p.id === playerId);
          if (player) {
            this.say(`玩家 ${state.player.name} 超过3分钟无活动，自动放弃。`);
            state.status = 'giveup';
            this.commandTo('statusChanged', { status: 'giveup' }, player);
            this.checkGameEnd();
          } else {
            // 玩家已离开，直接删除状态
            this.playerStates.delete(playerId);
          }
        }
      }
    });
    this.save();

    // 继续检查
    if (this.room.status === RoomStatus.playing) {
      this.startTimer(() => {
        this.checkInactivePlayers();
      }, 30000, 'checkInactive');
    }
  }

  // 提取文章中的汉字
  extractChineseChars(text: string): Set<string> {
    const chineseRegex = /[\u4e00-\u9fa5]/g;
    const matches = text.match(chineseRegex);
    return new Set(matches || []);
  }

  // 计算玩家进度
  calculateProgress(state: PlayerGameState): void {
    if (!this.currentArticle) return;

    // 计算标题进度
    const titleGuessed = Array.from(this.titleChars).filter(char => 
      state.correctCharsSet.has(char)
    ).length;
    state.titleProgress = this.titleChars.size > 0 ? (titleGuessed / this.titleChars.size) * 100 : 0;

    // 计算正文进度
    const contentGuessed = Array.from(this.contentChars).filter(char => 
      state.correctCharsSet.has(char)
    ).length;
    state.contentProgress = this.contentChars.size > 0 ? (contentGuessed / this.contentChars.size) * 100 : 0;

    // 检查标题是否完全猜出
    if (this.titleChars.size > 0 && titleGuessed === this.titleChars.size && state.status !== 'completed') {
      state.status = 'completed';
      this.say(`玩家 ${state.player.name} 完成了猜测！`);
      this.commandTo('statusChanged', { status: 'completed' }, state.player);
      
      // 如果是猜题中的玩家完成，保存成就
      if (state.status === 'completed') {
        this.saveAchievements([state.player]);
      }
      
      this.checkGameEnd();
    }
    
    // 广播玩家列表更新
    this.broadcastPlayersUpdate();
  }

  // 广播玩家列表更新
  broadcastPlayersUpdate() {
    let players;
    
    console.log('[猜盐后端] broadcastPlayersUpdate 被调用, 房间状态:', this.room.status);
    
    if (this.room.status === RoomStatus.playing) {
      // 游戏中：显示游戏状态和进度
      players = Array.from(this.playerStates.values()).map(s => ({
        name: s.player.name,
        status: s.status,
        titleProgress: s.titleProgress,
        contentProgress: s.contentProgress,
        avatar: s.player.attributes?.avatar,
        isPlaying: true,
      }));
    } else {
      // 准备阶段：显示准备状态
      players = this.room.validPlayers.map(p => ({
        name: p.name,
        status: p.isReady ? 'ready' : 'unready',
        titleProgress: 0,
        contentProgress: 0,
        avatar: p.attributes?.avatar,
        isPlaying: false,
      }));
    }
    
    console.log('[猜盐后端] 广播玩家列表:', players);
    this.command('playersUpdate', { players });
  }

  // 检查游戏是否结束
  checkGameEnd() {
    const allPlayers = Array.from(this.playerStates.values());
    const guessingPlayers = allPlayers.filter(state => state.status === 'guessing');
    const completedPlayers = allPlayers.filter(state => state.status === 'completed');
    const activePlayers = allPlayers.filter(state => state.status !== 'waiting'); // 排除等待中的玩家

    // 所有猜题中的玩家已完成或放弃
    if (guessingPlayers.length === 0 && activePlayers.length > 0) {
      // 检查是否所有活跃玩家都完成了（排除等待中的玩家）
      if (completedPlayers.length > 0 && completedPlayers.length === activePlayers.length) {
        this.say(`所有玩家已完成！10秒后开始下一轮...`);
        
        // 使用 GameRoom 的 startTimer 方法启动倒计时
        // 会自动广播 countdown 指令给前端
        this.startTimer(() => {
          this.resetGame();
        }, 10000, 'reset');
      } else {
        this.say(`所有猜题中的玩家已完成或放弃，本回合将在10秒后结束。`);
        this.startTimer(() => {
          this.resetGame();
        }, 10000, 'reset');
      }
    }
  }

  // 重置游戏到准备阶段
  resetGame() {
    // 清空所有玩家状态
    this.playerStates.clear();
    this.currentArticle = undefined;
    this.titleChars.clear();
    this.contentChars.clear();
    this.gameStartTime = 0;
    
    this.say(`游戏已重置，准备开始下一轮！`);
    
    // 结束游戏，这会自动将房间状态改为waiting，并将所有玩家改为unready
    this.room.end();
    
    // 广播更新
    this.broadcastPlayersUpdate();
    this.save();
  }

  getStatus(sender: RoomPlayer) {
    return {
      ...super.getStatus(sender),
      ...this.getStatusData(sender)
    };
  }

  getData() {
    return {
      article: this.currentArticle,
      players: Array.from(this.playerStates.values()).map(s => ({
        name: s.player.name,
        status: s.status,
        guessHistory: s.guessHistory,
        titleProgress: s.titleProgress,
        contentProgress: s.contentProgress,
        avatar: s.player.attributes?.avatar,
      })),
      message: this.messageHistory,
    };
  }

  onSay(message: IGameCommand) {
    const sender = message.sender as RoomPlayer;
    const data = typeof message.data === 'string' ? message.data : message.data?.message;
    const channel = typeof message.data === 'object' ? message.data?.channel : 'public';
    
    // 如果是通关频道，只发送给已完成的玩家
    if (channel === 'completed') {
      const state = this.playerStates.get(sender.id);
      if (state?.status !== 'completed') {
        return this.sayTo(`你还未完成，无法在通关频道发言。`, sender);
      }
      
      // 只发送给已完成的玩家，通过单独的 command 发送以保留 sender 信息
      const completedPlayers = Array.from(this.playerStates.values())
        .filter(s => s.status === 'completed')
        .map(s => s.player);
      
      completedPlayers.forEach(player => {
        player.emit('message', { content: `[通关] ${data}`, sender });
      });
    } else {
      // 公开频道，发送给所有人
      this.say(`${data}`, sender);
    }
  }

  onCommand(message: IGameCommand) {
    super.onCommand(message);
    const sender = message.sender as RoomPlayer;

    switch (message.type) {
      case 'guess':
        this.handleGuess(sender, message.data?.char);
        break;
      case 'giveup':
        this.handleGiveup(sender);
        break;
      case 'setRestrictAlphanumeric':
        if (sender.isCreator && this.room.status !== RoomStatus.playing) {
          this.restrictAlphanumeric = message.data.restrictAlphanumeric;
          this.command('restrictAlphanumericChanged', { restrictAlphanumeric: this.restrictAlphanumeric });
          this.save();
        }
        break;
    }
  }

  // 处理玩家猜测
  handleGuess(sender: RoomPlayer, char: string) {

    // 确保玩家有状态
    if (!this.playerStates.has(sender.id)) {
      this.initPlayerState(sender, 'waiting');
    }

    // 如果开启了数字字母限制，检查输入是否为汉字
    if (this.restrictAlphanumeric && !/[一-龥]/.test(char)) {
      return this.sayTo('只能输入汉字！', sender);
    }

    const state = this.playerStates.get(sender.id)!;

    // 检查是否已经猜过这个字符
    if (state.guessedCharsSet.has(char)) {
      return; // 重复输入，直接返回不更新
    }

    state.lastGuessTime = Date.now();

    // 检查字符是否在文章中
    const allChars = new Set([...this.titleChars, ...this.contentChars]);
    const correct = allChars.has(char);
    
    // 添加到历史记录（按输入顺序）
    state.guessHistory.push({ char, correct });
    state.guessedCharsSet.add(char);
    
    if (correct) {
      state.correctCharsSet.add(char);
    }

    // 如果是已放弃的玩家继续猜测，状态改为等待中
    if (state.status === 'giveup') {
      state.status = 'waiting';
      this.commandTo('statusChanged', { status: 'waiting' }, sender);
    }

    // 计算进度
    this.calculateProgress(state);

    // 生成更新后的文章显示
    let displayTitle = '';
    let displayContent = '';
    
    if (this.currentArticle) {
      // 如果玩家已完成，显示完整文章；否则未猜中的显示为□
      const showFull = (state.status as PlayerGameStatus) === 'completed';
      
      displayTitle = Array.from(this.currentArticle.title).map(char => {
        if (/[\u4e00-\u9fa5]/.test(char)) {
          return state.correctCharsSet.has(char) || showFull ? char : '□';
        }
        // 如果开启了数字字母限制，英文和数字也显示为□
        if (this.restrictAlphanumeric && /[a-zA-Z0-9]/.test(char)) {
          return '□';
        }
        return char;
      }).join('');

      displayContent = Array.from(this.currentArticle.content).map(char => {
        if (/[\u4e00-\u9fa5]/.test(char)) {
          return state.correctCharsSet.has(char) || showFull ? char : '□';
        }
        // 如果开启了数字字母限制，英文和数字也显示为□
        if (this.restrictAlphanumeric && /[a-zA-Z0-9]/.test(char)) {
          return '□';
        }
        return char;
      }).join('');
    }

    // 发送更新，包含更新后的文章显示
    this.commandTo('guessResult', {
      char,
      correct: allChars.has(char),
      titleProgress: state.titleProgress,
      contentProgress: state.contentProgress,
      article: {
        title: displayTitle,
        content: displayContent,
        difficulty: this.currentArticle?.difficulty,
      },
    }, sender);

    this.save();
  }

  // 处理玩家放弃
  handleGiveup(sender: RoomPlayer) {
    const state = this.playerStates.get(sender.id);
    if (!state) {
      return this.sayTo(`你还没有参与游戏。`, sender);
    }

    if (state.status === 'completed') {
      return this.sayTo(`你已经完成了猜测，无法放弃。`, sender);
    }

    if (state.status === 'giveup') {
      return this.sayTo(`你已经放弃过了。`, sender);
    }

    const wasGuessing = state.status === 'guessing';
    state.status = 'giveup';
    this.say(`玩家 ${sender.name} 选择放弃。`);
    this.commandTo('statusChanged', { status: 'giveup' }, sender);
    this.broadcastPlayersUpdate();

    // 只有猜题中的玩家放弃才检查游戏结束
    if (wasGuessing) {
      this.checkGameEnd();
    }

    this.save();
  }

  // 初始化玩家状态
  initPlayerState(player: RoomPlayer, status: PlayerGameStatus) {
    this.playerStates.set(player.id, {
      player,
      status,
      guessHistory: [],
      guessedCharsSet: new Set(),
      correctCharsSet: new Set(),
      lastGuessTime: Date.now(),
      titleProgress: 0,
      contentProgress: 0,
    });
  }

  async onStart() {
    // 当 minSize 为 0 时，至少需要 1 个玩家
    const minPlayers = this.room.minSize === 0 ? 1 : this.room.minSize;
    if (this.room.validPlayers.length < minPlayers) {
      return this.say(`玩家人数不足，无法开始游戏。`);
    }

    this.playerStates.clear();
    this.stopTimer();

    // 获取所有可用状态的文章
    const articles = await Model.getRepo<Model>(Model).find({
      where: { status: ArticleStatus.AVAILABLE },
    });

    if (articles.length === 0) {
      // 如果数据库中没有任何文章，使用预制文章并保存到数据库
      this.say(`数据库中没有文章，使用预制样例文章。`);
      
      // 保存所有预制文章到数据库
      for (const articleData of DEFAULT_ARTICLES) {
        const model = new Model();
        model.title = articleData.title;
        model.content = articleData.content;
        model.difficulty = articleData.difficulty;
        model.status = articleData.status;
        model.from = 'system';
        model.weight = 100;
        await this.insert(model);
      }
      
      // 随机选一个预制文章
      const selected = DEFAULT_ARTICLES[Math.floor(Math.random() * DEFAULT_ARTICLES.length)];
      this.currentArticle = Object.assign(new Model(), { ...selected, weight: 100 });
    } else {
      // 基于权重的随机选择
      this.currentArticle = this.selectArticleByWeight(articles);
    }

    // 提取文章中的汉字
    this.titleChars = this.extractChineseChars(this.currentArticle.title);
    this.contentChars = this.extractChineseChars(this.currentArticle.content);

    // 初始化所有在房间中的玩家为"猜题中"状态
    this.room.validPlayers.forEach(player => {
      this.initPlayerState(player, 'guessing');
    });

    this.gameStartTime = Date.now();

    // 启动不活跃检查定时器
    this.startTimer(() => {
      this.checkInactivePlayers();
    }, 30000, 'checkInactive');

    // 广播玩家列表
    this.broadcastPlayersUpdate();

    // 主动向所有玩家发送初始状态（包括文章）
    this.room.validPlayers.forEach(player => {
      const state = this.playerStates.get(player.id);
      if (state) {
        this.commandTo('status', this.getStatusData(player), player);
      }
    });

    this.save();
  }

  // 获取状态数据（提取为独立方法以便复用）
  getStatusData(sender: RoomPlayer) {
    const state = this.playerStates.get(sender.id);
    
    // 生成显示用的文章内容
    let displayTitle = '';
    let displayContent = '';

    if (this.currentArticle && state) {
      // 如果玩家已完成，显示完整文章；否则未猜中的显示为□
      const showFull = (state.status as PlayerGameStatus) === 'completed';
      
      // 标题显示
      displayTitle = Array.from(this.currentArticle.title).map(char => {
        if (/[\u4e00-\u9fa5]/.test(char)) {
          return state.correctCharsSet.has(char) || showFull ? char : '□';
        }
        // 如果开启了数字字母限制，英文和数字也显示为□
        if (this.restrictAlphanumeric && /[a-zA-Z0-9]/.test(char)) {
          return '□';
        }
        return char;
      }).join('');

      // 正文显示：完成后显示完整内容
      displayContent = Array.from(this.currentArticle.content).map(char => {
        if (/[\u4e00-\u9fa5]/.test(char)) {
          return state.correctCharsSet.has(char) || showFull ? char : '□';
        }
        // 如果开启了数字字母限制，英文和数字也显示为□
        if (this.restrictAlphanumeric && /[a-zA-Z0-9]/.test(char)) {
          return '□';
        }
        return char;
      }).join('');
    }

    return {
      article: this.currentArticle ? {
        title: displayTitle,
        content: displayContent,
        difficulty: this.currentArticle.difficulty,
        // 只有完成时才发送 from 字段
        ...(state?.status === 'completed' ? { from: this.currentArticle.from } : {}),
      } : null,
      playerState: state ? {
        status: state.status,
        guessHistory: state.guessHistory, // 返回完整的猜测历史
        titleProgress: state.titleProgress,
        contentProgress: state.contentProgress,
      } : null,
      allPlayers: this.room.status === RoomStatus.playing 
        ? Array.from(this.playerStates.values()).map(s => ({
            name: s.player.name,
            status: s.status,
            titleProgress: s.titleProgress,
            contentProgress: s.contentProgress,
            avatar: s.player.attributes?.avatar,
            isPlaying: true,
          }))
        : this.room.validPlayers.map(p => ({
            name: p.name,
            status: p.isReady ? 'ready' : 'unready',
            titleProgress: 0,
            contentProgress: 0,
            avatar: p.attributes?.avatar,
            isPlaying: false,
          })),
      restrictAlphanumeric: this.restrictAlphanumeric,
    };
  }

  // 基于权重的随机选择文章
  selectArticleByWeight(articles: Model[]): Model {
    // 计算总权重
    const totalWeight = articles.reduce((sum, article) => sum + (article.weight || 100), 0);
    
    // 生成随机数
    let random = Math.random() * totalWeight;
    
    // 根据权重选择文章
    for (const article of articles) {
      random -= (article.weight || 100);
      if (random <= 0) {
        return article;
      }
    }
    
    // 兜底：返回最后一个
    return articles[articles.length - 1];
  }

  // 游戏结束时降低文章权重
  async decreaseArticleWeight() {
    if (!this.currentArticle || !this.currentArticle.id) return;
    
    try {
      // 降低权重，但不低于10
      const newWeight = Math.max(10, (this.currentArticle.weight || 100) - 20);
      await Model.getRepo<Model>(Model).update(this.currentArticle.id, { 
        weight: newWeight 
      });
    } catch (error) {
      console.error('Failed to decrease article weight:', error);
    }
  }
}

export default GuessGameRoom;
