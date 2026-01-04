export interface GameConfig {
  name: string
  minSize: number
  maxSize: number
  description: string
  requireAllReadyToStart?: boolean
  rates?: Record<string, number>
  points?: Record<string, number>
  rewardDescription?: string
  extendPages?: {
    /** 
     * 入口名称 
     **/
    name: string;
    /** 
     * 页面路径 
     **/
    component: string;
  }[]
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
