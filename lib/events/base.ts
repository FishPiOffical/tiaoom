/**
 * 基础事件定义
 */
export interface BaseEvents {
  /**
   * 服务初始化回调
   */
  ready : () => void;
  /**
   * 服务关闭回调
   */
  close: () => void;
  /**
   * 错误回调
   * @param {Error} error 错误信息
   */
  error: (error: Error) => void;
}

/**
 * 基础事件定义（Emitter 版本）
 */
export interface BaseEmitterEvents {
  /**
   * 服务初始化回调
   */
  ready : [];
  /**
   * 服务关闭回调
   */
  close: [];
  /**
   * 错误回调
   * @param {Error} error 错误信息
   */
  error: [error: Error];
}
