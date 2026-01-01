# 游戏数据

游戏数据模块用于维护和查询游戏运行所需的基础数据，例如“谁是卧底”的词库、“你画我猜”的题目库等。

要启用游戏数据管理功能，开发者需要在后端实现 `IGameData` 接口并定义数据模型，在前端基于 `DataForm` 组件实现管理界面。

## 后端实现

1. 定义数据模型 (Model)
   使用 TypeORM 定义数据实体。

2. 实现 IGameData 接口
   在游戏主类（继承自 `GameRoom`）中实现 `IGameData<T>` 接口，提供 `getList`, `insert`, `update`, `delete` 方法。

### 示例：谁是卧底 (Spy)

```typescript
// game/backend/src/games/spy.ts

import { BaseModel, GameRoom, IGameData } from ".";
import { Column, Entity, PrimaryGeneratedColumn, Like } from "typeorm";

// 1. 定义数据模型
@Entity({ name: 'word', comment: '谁是卧底用词' })
export class Model extends BaseModel {
  @Column({ comment: "词1" })
  word1: string = '';

  @Column({ comment: "词2" })
  word2: string = '';
}

// 2. 实现 IGameData 接口
class SpyGameRoom extends GameRoom implements IGameData<Model> {
  // ... 其他游戏逻辑 ...

  // 获取列表
  async getList(query: { word: string, page: number; count: number; }): Promise<{ records: Model[]; total: number; }> {
    const [records, total] = await Model.getRepo<Model>(Model).findAndCount({
      where: [
        { word1: Like(`%${query.word || ''}%`) },
        { word2: Like(`%${query.word || ''}%`) },
      ],
      skip: (query.page - 1) * query.count,
      take: query.count,
    });
    return { records, total }; 
  }

  // 插入数据
  async insert(data: Model): Promise<Model> {
    return await Model.getRepo<Model>(Model).save(Model.getRepo<Model>(Model).create(data));
  }

  // 更新数据
  async update(id: string, data: Partial<Model>): Promise<void> {
    await Model.getRepo<Model>(Model).update(id, data);
  }

  // 删除数据
  async delete(id: string): Promise<void> {
    await Model.getRepo<Model>(Model).delete(id);
  }
}
```

## 前端实现

前端需创建一个管理组件，使用 `DataForm` 组件来展示列表和处理查询，并自行实现新增/编辑的弹窗逻辑。

### 示例：SpyForm.vue

```vue
<script setup lang="ts">
import { ref, reactive } from 'vue';
import DataForm, { Field } from '@/components/common/DataForm.vue';
import { api } from '@/api';
import msg from '../msg';

const gameKey = 'spy';

// 定义列表列
const columns: Field[] = [
  { key: 'id', label: 'ID', type: 'number' },
  { key: 'word1', label: '词语1', type: 'text' },
  { key: 'word2', label: '词语2', type: 'text' },
];

const dataFormRef = ref();
const showModal = ref(false);
const isEdit = ref(false);
const currentId = ref<number | null>(null);
const formData = reactive({
  word1: '',
  word2: '',
});

// 处理新增点击
const handleAdd = () => {
  isEdit.value = false;
  currentId.value = null;
  formData.word1 = '';
  formData.word2 = '';
  showModal.value = true;
};

// 处理编辑点击
const handleEdit = (record: any) => {
  isEdit.value = true;
  currentId.value = record.id;
  formData.word1 = record.word1;
  formData.word2 = record.word2;
  showModal.value = true;
};

// 提交表单
const handleSubmit = async () => {
  try {
    if (isEdit.value && currentId.value != null) {
      await api.updateManageData(gameKey, currentId.value, formData);
    } else {
      await api.saveManageData(gameKey, formData);
    }
    showModal.value = false;
    dataFormRef.value?.refresh(); // 刷新列表
    msg.success('保存成功');
  } catch (e: any) {
    msg.error(e.message || '保存失败');
  }
};
</script>

<template>
  <div>
    <DataForm
      ref="dataFormRef"
      :game-key="gameKey"
      :columns="columns"
      @add="handleAdd"
      @edit="handleEdit"
    >
      <template #search="{ query }">
        <input
          type="text"
          v-model="query.word"
          class="input input-bordered w-full max-w-xs"
          placeholder="请输入关键词搜索"
        />
      </template>
    </DataForm>


    <!-- 自定义新增/编辑弹窗 -->
    <dialog class="modal" :class="{ 'modal-open': showModal }">
      <div class="modal-box">
        <!-- 表单内容 ... -->
        <div class="modal-action">
          <button class="btn" @click="showModal = false">取消</button>
          <button class="btn btn-primary" @click="handleSubmit">保存</button>
        </div>
      </div>
    </dialog>
  </div>
</template>
```

## 扩展页面

游戏数据管理后台需要开通权限才能访问，而如果要开放给所有用户使用，可以使用游戏扩展页面功能，创建一个前端页面并调用相应的 API。

### 配置扩展页面

在游戏配置文件中（通常是 `game/backend/src/games/<game>.ts`），导出配置对象时添加 `extendPages` 属性。

```typescript
export const extendPages: [
  {
    name: '投稿', // 按钮显示的文字
    component: 'SpyPost' // 点击后在抽屉中显示的组件
  }
]
```

添加游戏扩展接口

```typescript
class SpyGameRoom extends GameRoom implements IGameData<Model> {
  // ... 其他方法 ...

  // 提交投稿
  get Routers() {
    const router = Router()
    router.post('/post', async (req, res) => {
      const data = req.body;
      // 处理投稿逻辑，例如保存到数据库
      res.json({ code: 0, message: '投稿成功' });
    });
    router.get('/my-posts', async (req, res) => {
      const userId = req.user.id;
      // 查询该用户的投稿记录
      const records = []; // 从数据库获取
      res.json({ code: 0, data: records });
    });
    return router;
  }
}
```

### 开发扩展组件

扩展组件就是一个标准的 Vue 组件。它可以调用后端 API 来实现各种功能，例如玩家投稿、查看排行榜、查看游戏说明等。

扩展组件将在创建房间页面的侧边抽屉中显示。

```vue
<!-- SpyPost.vue -->
<template>
  <div class="p-4">
    <h2>我要投稿</h2>
    <!-- 表单内容 -->
  </div>
</template>
<script setup lang="ts">
// 组件逻辑
// ...
// 调用接口
http.post('/api/games/spy/post', { word1, word2 });
</script>
```

## 接口定义

### IGameData (Backend)

```typescript
export interface IGameData<T> {
  /**
   * 获取数据列表
   * @param query 查询参数，包含分页信息 page, count 和其他自定义查询字段
   */
  getList(query: { [key: string]: any, page: number, count: number }): Promise<{ records: T[], total: number }>;
  
  /**
   * 插入数据
   * @param data 数据对象
   */
  insert(data: T): Promise<T>;
  
  /**
   * 更新数据
   * @param id 数据ID
   * @param data 更新的数据对象
   */
  update(id: string, data: Partial<T>): Promise<void>;
  
  /**
   * 删除数据
   * @param id 数据ID
   */
  delete(id: string): Promise<void>;
}
```

### DataForm (Frontend)

通用数据管理表单组件，提供列表展示、分页、查询、删除、批量导入/导出模板等功能。

**Props**

| 属性名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `gameKey` | `string` | 游戏唯一标识符，用于 API 调用 |
| `columns` | `Field[]` | 表格列定义 |
| `searchFields` | `Field[]` | (可选) 查询区域字段定义 |
| `importFields` | `Field[]` | (可选) 导入/模板下载使用的字段定义。若不传则使用 `columns` (自动过滤 id, createdAt, updatedAt) |

**Events**

| 事件名 | 参数 | 说明 |
| :--- | :--- | :--- |
| `add` | - | 点击“新增”按钮时触发 |
| `edit` | `record: any` | 点击某行的“编辑”按钮时触发，传递当前行数据 |

**Methods (Exposed)**

| 方法名 | 参数 | 说明 |
| :--- | :--- | :--- |
| `refresh` | - | 刷新当前列表数据 |

**Slots**

| 插槽名 | 说明 |
| :--- | :--- |
| `search` | 自定义查询区域内容，作用域插槽，提供 `query` 对象供使用 |

**Field Interface**

```typescript
interface Option {
  label: string;
  value: any;
}

export interface Field {
  key: string;           // 字段键名
  label: string;         // 显示名称
  type?: 'text' | 'number' | 'textarea' | 'select' | 'boolean' | 'json' | 'date'; // 字段类型
  options?: Option[];    // 选项列表 (type='select' 时使用)
  required?: boolean;    // 是否必填
  defaultValue?: any;    // 默认值
  formatter?: (value: any) => string; // 自定义格式化函数
}
```
