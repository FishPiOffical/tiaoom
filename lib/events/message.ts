import { MessagePackage } from "@lib/models/message";
import { BaseEvents } from "./base";

export interface MessageEvents extends BaseEvents {
    /**
     * 服务接收数据
     */
    message: (data: MessagePackage, cb?: (...params:any) => any) => void;
}