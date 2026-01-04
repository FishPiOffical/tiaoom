<script setup lang="ts">
import { ref, reactive } from 'vue';
import DataForm, { Field } from '@/components/common/DataForm.vue';
import { api } from '@/api';
import msg from '../msg';

const gameKey = 'guess';

const columns: Field[] = [
  { key: 'title', label: '标题', type: 'text' },
  { key: 'content', label: '正文', type: 'text' },
  { key: 'difficulty', label: '难度', type: 'text' },
  { key: 'from', label: '投稿人', type: 'text' },
];

const dataFormRef = ref();
const showModal = ref(false);
const isEdit = ref(false);
const currentId = ref<number | null>(null);
const formData = reactive({
  title: '',
  content: '',
  difficulty: '简单',
  status: 'available',
});

const difficulties = ['简单', '中等', '困难'];
const statuses = [
  { label: '待审核', value: 'pending' },
  { label: '可用', value: 'available' },
  { label: '冻结', value: 'frozen' },
  { label: '已删除', value: 'deleted' }
];

const handleAdd = () => {
  isEdit.value = false;
  currentId.value = null;
  formData.title = '';
  formData.content = '';
  formData.difficulty = '简单';
  formData.status = 'available';
  showModal.value = true;
};

const handleEdit = (record: any) => {
  isEdit.value = true;
  currentId.value = record.id;
  formData.title = record.title;
  formData.content = record.content;
  formData.difficulty = record.difficulty;
  formData.status = record.status;
  showModal.value = true;
};

const handleSubmit = async () => {
  if (!formData.title || !formData.content) {
    msg.error('标题和正文不能为空');
    return;
  }
  if (formData.title.length > 100) {
    msg.error('标题长度不能超过100个字符');
    return;
  }
  if (formData.content.length > 5000) {
    msg.error('正文长度不能超过5000个字符');
    return;
  }
  try {
    if (isEdit.value && currentId.value != null) {
      await api.updateManageData(gameKey, currentId.value, formData);
    } else {
      await api.saveManageData(gameKey, formData);
    }
    showModal.value = false;
    dataFormRef.value?.refresh();
    msg.success('保存成功');
  } catch (e: any) {
    console.error(e);
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
      :default-query="{ status: '' }"
      @add="handleAdd"
      @edit="handleEdit"
    >
      <template #search="{ query }">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">
            <span class="label-text">标题</span>
          </legend>
          <input
            type="text"
            v-model="query.title"
            class="input input-bordered"
            placeholder="搜索标题或正文内容"
          />
        </fieldset>
        <fieldset class="fieldset">
          <legend class="fieldset-legend">
            <span class="label-text">难度</span>
          </legend>
          <select v-model="query.difficulty" class="select select-bordered">
            <option value="">全部</option>
            <option v-for="diff in difficulties" :key="diff" :value="diff">{{ diff }}</option>
          </select>
        </fieldset>
        <fieldset class="fieldset">
          <legend class="fieldset-legend">
            <span class="label-text">状态</span>
          </legend>
          <select v-model="query.status" class="select select-bordered">
            <option value="">全部</option>
            <option v-for="status in statuses" :key="status.value" :value="status.value">{{ status.label }}</option>
          </select>
        </fieldset>
      </template>
    </DataForm>

    <dialog class="modal" :class="{ 'modal-open': showModal }">
      <div class="modal-box max-w-3xl">
        <h3 class="font-bold text-lg mb-4">{{ isEdit ? '编辑' : '新增' }}文章</h3>
        <div class="py-4 flex flex-col gap-4">
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text">标题 *</span>
              <span class="label-text-alt">{{ formData.title.length }}/100</span>
            </label>
            <input 
              type="text" 
              v-model="formData.title" 
              class="input input-bordered w-full" 
              placeholder="请输入文章标题"
              maxlength="100"
            />
          </div>

          <div class="form-control w-full">
            <label class="label">
              <span class="label-text">正文 *</span>
              <span class="label-text-alt">{{ formData.content.length }}/5000</span>
            </label>
            <textarea 
              v-model="formData.content" 
              class="textarea textarea-bordered h-48" 
              placeholder="请输入文章正文，包含汉字的内容会被用作猜测题目"
              maxlength="5000"
            ></textarea>
            <label class="label">
              <span class="label-text-alt text-base-content/60">提示：文章中的汉字会被隐藏，玩家通过猜测来还原</span>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="form-control w-full">
              <label class="label">
                <span class="label-text">难度</span>
              </label>
              <select v-model="formData.difficulty" class="select select-bordered w-full">
                <option v-for="diff in difficulties" :key="diff" :value="diff">{{ diff }}</option>
              </select>
            </div>

            <div class="form-control w-full">
              <label class="label">
                <span class="label-text">状态</span>
              </label>
              <select v-model="formData.status" class="select select-bordered w-full">
                <option v-for="status in statuses" :key="status.value" :value="status.value">
                  {{ status.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="alert alert-info text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>只有"可用"状态的文章才能参与游戏</span>
          </div>
        </div>
        <div class="modal-action">
          <button class="btn" @click="showModal = false">取消</button>
          <button class="btn btn-primary" @click="handleSubmit">保存</button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.fieldset {
  border: 1px solid oklch(var(--bc) / 0.2);
  border-radius: var(--rounded-btn, 0.5rem);
  padding: 0.5rem 1rem;
  position: relative;
}

.fieldset-legend {
  padding: 0 0.5rem;
  margin-left: -0.5rem;
  font-size: 0.875rem;
  color: oklch(var(--bc) / 0.6);
}
</style>
