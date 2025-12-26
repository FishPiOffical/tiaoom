# MessageBox 消息弹窗组件

`MessageBox` 是一个模态对话框组件，用于显示提示信息、确认操作或自定义内容。

通常情况下，推荐使用封装好的 `msgbox` [工具函数](#use)（如 `alert`, `confirm`），而不是直接使用此组件。

## Props

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `visible` | `boolean` | `false` | 是否显示弹窗。 |
| `title` | `string` | `'提示'` | 弹窗标题。 |
| `message` | `string \| object` | `''` | 弹窗内容。如果是字符串，将直接显示；如果是对象，可配合插槽使用（虽然通常直接用插槽）。 |
| `showCancel` | `boolean` | `true` | 是否显示取消按钮。 |
| `confirmText` | `string` | `'确定'` | 确定按钮文本。 |
| `cancelText` | `string` | `'取消'` | 取消按钮文本。 |

## Events

| 事件名 | 说明 | 回调参数 |
| :--- | :--- | :--- |
| `confirm` | 点击确定按钮时触发。 | - |
| `cancel` | 点击取消按钮时触发。 | - |
| `close` | 点击遮罩层或关闭图标时触发。 | - |

## Slots

| 插槽名 | 说明 |
| :--- | :--- |
| `default` | 自定义弹窗内容区域。 |

## 示例

### 基础用法

```vue
<template>
  <MessageBox 
    :visible="isVisible" 
    title="确认删除" 
    message="你确定要删除这条记录吗？"
    @confirm="handleConfirm"
    @cancel="isVisible = false"
    @close="isVisible = false"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MessageBox from '@/components/msgbox/MessageBox.vue';

const isVisible = ref(false);

function handleConfirm() {
  console.log('Confirmed');
  isVisible.value = false;
}
</script>
```

### 使用工具函数（推荐）{#use}

在 `src/components/msgbox/index.ts` 中通常封装了便捷调用的方法：

```typescript
import { alert, confirm } from '@/components/msgbox';

// 显示提示框
await alert('操作成功');

// 显示确认框
const result = await confirm('确定要退出吗？', '提示');
if (result) {
  // 用户点击了确定
}
```
