export interface BaseEvents {
  //服务初始化回调
  ready : () => void;
  //服务关闭回调
  close: () => void;
  error: (error: Error) => void;
}