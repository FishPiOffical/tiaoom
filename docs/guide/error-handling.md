# 错误处理

在开发多人游戏时，错误处理是不可或缺的一部分。Tiaoom 提供了一套简洁的机制来处理服务端产生的错误，并将其传递给前端。

## 服务端发送错误

在服务端，你可以利用 `emit` 方法发送 `'global.error'` 事件来通知客户端发生了错误。这适用于逻辑校验失败、操作非法或系统异常等场景。

```typescript
// 发送一个错误对象
this.emit('global.error', new Error('发生了一个错误'));
```

### 库内部错误

值得注意的是，Tiaoom 服务端库内部在执行过程中如果捕获到未处理的异常或执行过程可预知的异常，也会自动通过 `'global.error'` 事件发出。这意味着你不需要手动捕获每一个底层错误，前端依然有机会接收到这些系统级的异常通知。

## 前端接收错误

在前端，客户端需要监听 `'global.error'` 事件来接收并处理这些错误信息。

```typescript
import { Client } from 'tiaoom/client';

const client = new Client('ws://localhost:8080');

client.on('global.error', (error) => {
  console.error('收到错误:', error);
  
  // 根据错误类型进行 UI 提示
  if (typeof error === 'string') {
    alert(error);
  } else {
    alert(error.message || '发生未知错误');
  }
});
```

通过这种方式，你可以统一管理应用的错误反馈，提升用户体验。
