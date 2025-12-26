import { GameConfig } from '@/types'
import { Player, Room } from 'tiaoom/client'
import axios from 'axios'

export interface IUser {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  from?: string;
  isAdmin?: boolean;
}

export class User implements IUser {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  from: string;
  isAdmin: boolean;

  constructor(user: Partial<IUser>) {
    this.id = user.id || '';
    this.username = user.username || '';
    this.nickname = user.nickname || '';
    this.avatar = user.avatar || '';
    this.from = user.from || '';
    this.isAdmin = user.isAdmin || false;
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

const instance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 10000,
})

instance.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 0) {
      return Promise.reject(res.message || 'Unknown Error')
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
  getUser(username: string): Promise<User> {
    return instance.get(`/user/${username}`).then((data: any) => new User(data))
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
}
