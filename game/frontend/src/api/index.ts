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
  state?: GameStats[];
}

export class User implements IUser {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  from: string;
  isAdmin: boolean;
  state: GameStats[];

  constructor(user: Partial<IUser>) {
    this.id = user.id || '';
    this.username = user.username || '';
    this.nickname = user.nickname || '';
    this.avatar = user.avatar || '';
    this.from = user.from || '';
    this.isAdmin = user.isAdmin || false;
    this.state = user.state || [];
  }

  get player(): Player {
    return new Player({
      id: this.id,
      name: this.nickname,
      attributes: {
        avatar: this.avatar || '',
        username: this.username,
        id: this.id,
      }
    });
  }
}

export interface IManageData {
  key: string;
  name: string;
  canManage: boolean;
}

const instance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 10000,
})

instance.interceptors.response.use(
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
  getConfig(): Promise<Record<string, GameConfig>> {
    return instance.get('/config')
  },
  getUserInfo(): Promise<User> {
    return instance.get('/info').then((data: any) => new User(data.player))
  },
  getRecord(id: number): Promise<any> {
    return instance.get(`/record/${id}`);
  },
  getUser(username: string): Promise<User> {
    return instance.get(`/user/${username}`).then((data: any) => new User(data))
  },
  getUserRecords(username: string, page: number = 1, count: number = 10): Promise<{ records: any[], total: number }> {
    return instance.get(`/user/${username}/record`, {
      params: { p: page, count }
    });
  },
  getLeaderboard(type: string): Promise<any[]> {
    return instance.get(`/leaderboard/${type}`)
  },
  getMessages(): Promise<{ messages: { data: string, sender: Player, createdAt: number }[] }> {
    return instance.get('/message')
  },
  login(name: string): Promise<User> {
    return instance.post('/login', { name }).then((data: any) => new User(data))
  },
  checkLoginError() {
    return instance.get('/login/error').catch((err) => {
      if (err?.status == 404) {
        location.href = '/config';
      } else {
        throw err;
      }
    })
  },
  logout(): Promise<void> {
    return instance.post('/logout')
  },
  getPlayers(): Promise<Player[]> {
    return instance.get('/players')
  },
  getRooms(): Promise<Room[]> {
    return instance.get('/rooms')
  },
  getRoom(id: string): Promise<Room> {
    return instance.get(`/rooms/${id}`)
  },
  getPlayer(id: string): Promise<Player> {
    return instance.get(`/players/${id}`)
  },
  getManages(): Promise<IManageData[]> {
    return instance.get('/game/manages');
  },
  getManageDateList(gameKey: string, query: any & { page?: number, count?: number }): Promise<{ records: any[], total: number }> {
    return instance.get(`/game/manages/${gameKey}/list`, { params: query });
  },
  saveManageData(gameKey: string, record: any) {
    return instance.post(`/game/manages/${gameKey}`, record);
  },
  updateManageData(gameKey: string, id: number, record: any) {
    return instance.put(`/game/manages/${gameKey}/${id}`, record);
  },
  removeManageData(gameKey: string, id: number) {
    return instance.delete(`/game/manages/${gameKey}/${id}`);
  },
  importManageData(gameKey: string, records: any[]) {
    return instance.post(`/game/manages/${gameKey}/import`, records);
  },
  getManagePermissions(gameKey: string): Promise<string[]> {
    return instance.get(`/game/manages/${gameKey}/permissions`);
  },
  updateManagePermissions(gameKey: string, manages: string[]) {
    return instance.put(`/game/manages/${gameKey}/permissions`, { manages });
  }
}
