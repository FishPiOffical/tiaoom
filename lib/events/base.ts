import { Message } from "@lib/models/message";

export interface BaseEvents {
  //服务初始化回调
  init : () => void;
  //服务关闭回调
  close: (force: boolean) => void;
  error: (error: Error) => void;
}