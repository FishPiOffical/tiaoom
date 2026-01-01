<script setup lang="ts">
import { ref, reactive } from 'vue';
import DataForm, { Field } from '@/components/common/DataForm.vue';
import { api } from '@/api';
import msg from '../msg';

const gameKey = 'spy';

const columns: Field[] = [
  { key: 'word1', label: '词语1', type: 'text' },
  { key: 'word2', label: '词语2', type: 'text' },
];

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

const handleAdd = () => {
  isEdit.value = false;
  currentId.value = null;
  formData.word1 = '';
  formData.word2 = '';
  showModal.value = true;
};

const handleEdit = (record: any) => {
  isEdit.value = true;
  currentId.value = record.id;
  formData.word1 = record.word1;
  formData.word2 = record.word2;
  showModal.value = true;
};

const handleSubmit = async () => {
  if (!formData.word1 || !formData.word2) {
    msg.error('请输入完整的词语');
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
      :search-fields="searchFields"
      @add="handleAdd"
      @edit="handleEdit"
    />

    <dialog class="modal" :class="{ 'modal-open': showModal }">
      <div class="modal-box">
        <h3 class="font-bold text-lg">{{ isEdit ? '编辑' : '新增' }}词组</h3>
        <div class="py-4 flex flex-col gap-4">
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text">词语1</span>
            </label>
            <input type="text" v-model="formData.word1" class="input input-bordered w-full" placeholder="请输入平民词/卧底词" />
          </div>
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text">词语2</span>
            </label>
            <input type="text" v-model="formData.word2" class="input input-bordered w-full" placeholder="请输入卧底词/平民词" />
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