export interface GameConfig {
  name: string
  minSize: number
  maxSize: number
  description: string
  rates?: Record<string, number>
  points?: Record<string, number>
  rewardDescription?: string
}

export interface Message {
  type: string
  data: any
  sender?: any
}

export interface Command {
  type: string
  data?: any
}
