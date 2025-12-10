import { GameConfig } from '@/types'
import { Player, Room } from 'tiaoom/client'
import axios from 'axios'

export interface IUser {
  id: string
  name: string
  avatar?: string
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
  getSession(): Promise<{ player: IUser }> {
    return instance.get('/info')
  },
  getMessages(): Promise<{ messages: { data: string, sender: Player, createdAt: number }[] }> {
    return instance.get('/message')
  },
  login(name: string): Promise<Player> {
    return instance.post('/login', { name })
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
