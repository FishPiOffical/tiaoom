export interface TiaoomEvents {
  //服务初始化回调
  init : () => void;
  //服务关闭回调
  close: (force: boolean) => void;
  //房间创建回调
  roomCreated: (roomId: string,size:number) => void;
  //房间销毁回调
  roomDestoryed: (roomId: string) => void;
  //房间加入回调
  userJoin: (roomId: string, userId: string) => void;
  //房间退出回调
  userExit: (roomId: string, userId: string) => void;
  //用户准备回调
  userReady: (roomId: string, userId: string) => void;
  //用户取消准备回调
  userNotReady: (roomId: string, userId: string) => void;
  //用户消息回调
  message: (data: any) => void;
}