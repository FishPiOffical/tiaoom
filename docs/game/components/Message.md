# Message 消息提醒组件

`Message` 用于在页面右上角展示全局的消息通知（Toast）。

通常不需要直接在模板中使用此组件，而是通过导出的 [API](#use) 来调用。

## 方法 {#methods}

组件通过 `defineExpose` 暴露了以下方法：

### `add(payload)` {#add}

添加一条消息。

**参数：**

- `payload`: `object`
  - `type`: `'success' | 'info' | 'warning' | 'error'` - 消息类型。
  - `content`: `string` - 消息内容。
  - `duration`: `number` - 显示时长（毫秒）。
  - `onClose`: `() => void` - (可选) 关闭时的回调。

**返回：**

- `id`: `number` - 消息 ID。

### `remove(id)` {#remove}

移除指定 ID 的消息。

**参数：**

- `id`: `number` - 消息 ID。

## 示例 {#example}

### 基础用法（组件内）{#example-component}

```vue
<template>
  <Message ref="msgRef" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Message from '@/components/msg/Message.vue';

const msgRef = ref<InstanceType<typeof Message> | null>(null);

onMounted(() => {
  msgRef.value?.add({
    type: 'success',
    content: '加载成功',
    duration: 3000
  });
});
</script>
```

### 使用工具函数（推荐）{#use}

通常项目中会封装全局调用的方法（例如在 `src/components/msg/index.ts`）：

```typescript
import { message } from '@/components/msg';

message.success('操作成功');
message.error('发生错误');
message.info('这是一条提示');
message.warning('警告信息');
```
