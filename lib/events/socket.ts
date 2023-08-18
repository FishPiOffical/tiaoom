import { Message } from "@lib/models/message";

export interface SocketEvents {
    // 服务初始化回调
    init : () => void;
    // 服务关闭回调
    close: (force: boolean) => void;
    // 用户消息回调
    message: (data: Message) => void;
  }