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
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: "词1" })
  word1: string = '';

  @Column({ comment: "词2" })
  word2: string = '';

  @Column('bigint', { comment: "创建时间" })
  createdAt: number = Date.now();

  @Column('bigint', { comment: "更新时间" })
  updatedAt: number = Date.now();
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

// 定义查询字段
const searchFields: Field[] = [
  { key: 'word', label: '关键词', type: 'text' },
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
      :search-fields="searchFields"
      @add="handleAdd"
      @edit="handleEdit"
    />

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
