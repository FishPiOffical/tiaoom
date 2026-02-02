import { GameConfig } from '@/types'
import { Player, Room, RoomPlayer } from 'tiaoom/client'
import axios from 'axios'

export interface IRoomMessage {
  /**
   * 消息内容
   */
  content: string;
  /**
   * 消息发送者
   */
  sender?: RoomPlayer;
  /**
   * 消息创建时间
   */
  createdAt: number;
}

export interface GameStats {
  type: string;
  total: number;
  wins: number;
  draws: number;
  losses: number;
  score?: number;
}

export interface IUser {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  from?: string;
  isAdmin?: boolean;
  isVisitor?: boolean;
  state?: GameStats[];
}

export class User implements IUser {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  from: string;
  isAdmin: boolean;
  isVisitor: boolean;
  state: GameStats[];

  constructor(user: Partial<IUser>) {
    this.id = user.id || '';
    this.username = user.username || '';
    this.nickname = user.nickname || '';
    this.avatar = user.avatar || '';
    this.from = user.from || '';
    this.isAdmin = user.isAdmin || false;
    this.isVisitor = user.isVisitor || false;
    this.state = user.state || [];
  }

  get player(): Player {
    return new Player({
      id: this.id,
      name: this.nickname,
      isAdmin: this.isAdmin,
      isVisitor: this.isVisitor,
      attributes: {
        avatar: this.avatar || '',
        username: this.username,
        id: this.id,
        from: this.from || ''
      }
    });
  }
}

export interface IManageData {
  key: string;
  name: string;
  canManage: boolean;
}

export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 10000,
})

http.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 0) {
      return Promise.reject(new Error(res.message || 'Unknown Error'))
    }
    return res.data
  },
  (error) => {
    return Promise.reject(error)
  }
)

export const api = {
  isConfigured(): Promise<boolean> {
    return http.get('/is-configured')
  },
  getConfig(): Promise<{ game: Record<string, GameConfig>, thirdParty: string[] }> {
    return http.get('/config')
  },
  getUserInfo(params: { apiKey?: string } = {}): Promise<User> {
    return http.get('/info', { params }).then((data: any) => new User(data.player))
  },
  getRecord(id: number): Promise<any> {
    return http.get(`/record/${id}`);
  },
  getUser(username: string): Promise<User> {
    return http.get(`/user/${username}`).then((data: any) => new User(data))
  },
  getUserRecords({username, page = 1, count = 10, type}: {username: string, page?: number, count?: number, type?: string}): Promise<{ records: any[], total: number }> {
    return http.get(`/user/${username}/record`, {
      params: { p: page, count, type }
    });
  },
  getLeaderboard(type: string): Promise<any[]> {
    return http.get(`/leaderboard/${type}`)
  },
  getMessages(): Promise<{ messages: { data: string, sender: Player, createdAt: number }[] }> {
    return http.get('/message')
  },
  updateVisitorName(newName: string): Promise<User> {
    return http.post('/visitor/updateName', { name: newName }).then((data: any) => new User(data))
  },
  login(name: string): Promise<User> {
    return http.post('/login', { name }).then((data: any) => new User(data))
  },
  loginVisitor(): Promise<User> {
    return http.post('/login/visitor').then((data: any) => new User(data))
  },
  checkLoginError() {
    return http.get('/login/error').catch((err) => {
      if (err?.status == 404) {
        location.href = '/config';
      } else {
        throw err;
      }
    })
  },
  logout(): Promise<void> {
    return http.post('/logout')
  },
  getPlayers(): Promise<Player[]> {
    return http.get('/players')
  },
  getRooms(): Promise<Room[]> {
    return http.get('/rooms')
  },
  getRoom(id: string): Promise<Room> {
    return http.get(`/rooms/${id}`)
  },
  getPlayer(id: string): Promise<Player> {
    return http.get(`/players/${id}`)
  },
  getManages(): Promise<IManageData[]> {
    return http.get('/game/manages');
  },
  getManageDateList(gameKey: string, query: any & { page?: number, count?: number }): Promise<{ records: any[], total: number }> {
    return http.get(`/game/manages/${gameKey}/list`, { params: query });
  },
  saveManageData(gameKey: string, record: any) {
    return http.post(`/game/manages/${gameKey}`, record);
  },
  updateManageData(gameKey: string, id: number, record: any) {
    return http.put(`/game/manages/${gameKey}/${id}`, record);
  },
  removeManageData(gameKey: string, id: number) {
    return http.delete(`/game/manages/${gameKey}/${id}`);
  },
  importManageData(gameKey: string, records: any[]) {
    return http.post(`/game/manages/${gameKey}/import`, records);
  },
  getManagePermissions(gameKey: string): Promise<string[]> {
    return http.get(`/game/manages/${gameKey}/permissions`);
  },
  updateManagePermissions(gameKey: string, manages: string[]) {
    return http.put(`/game/manages/${gameKey}/permissions`, { manages });
  }
}
