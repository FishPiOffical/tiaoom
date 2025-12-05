export interface GameConfig {
  name: string
  minSize: number
  maxSize: number
  description: string
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
