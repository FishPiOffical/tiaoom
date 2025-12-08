import { IMessageData } from "@lib/models/message";
import { BaseEvents } from "./base";

/**
 * 消息事件定义
 */
export interface IMessageEvents extends BaseEvents {
    /**
     * 服务接收数据
     * @param {IMessagePackage} data 消息数据
     * @param {(...params:any) => any} [cb] 回调函数
     */
    message: (data: IMessageData, cb?: (...params:any) => any) => void;
}