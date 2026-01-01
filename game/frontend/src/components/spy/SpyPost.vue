<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { http } from '@/api';
import msg from '../msg';

interface SpyWord {
  id: string;
  word1: string;
  word2: string;
  valid: boolean;
}

const form = ref({
  word1: '',
  word2: '',
});

const myPosts = ref<SpyWord[]>([]);
const loading = ref(false);
const submitting = ref(false);

const fetchMyPosts = async () => {
  loading.value = true;
  try {
    const res: any = await http.get('/game/spy/my-posts');
    if (Array.isArray(res)) {
      myPosts.value = res;
    } else if (res && Array.isArray(res.records)) {
      myPosts.value = res.records;
    }
  } catch (error) {
    console.error('Failed to fetch posts:', error);
  } finally {
    loading.value = false;
  }
};

const submit = async () => {
  if (!form.value.word1 || !form.value.word2) return;
  submitting.value = true;
  try {
    await http.post('/game/spy/post', { ...form.value });
    form.value.word1 = '';
    form.value.word2 = '';
    await fetchMyPosts();
  } catch (error: any) {
    msg.error(error.message);
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  fetchMyPosts();
});
</script>

<template>
  <div class="p-4 max-w-4xl mx-auto">
    <h1 class="text-xl font-bold mb-6">我要投稿</h1>
    
    <!-- 投稿表单 -->
    <div class="card bg-base-200 mb-8">
      <div class="card-body">
        <h2 class="card-title mb-4">新词组投稿</h2>
        <div class="flex flex-col md:flex-row gap-4">
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text">平民词</span>
            </label>
            <input type="text" v-model="form.word1" placeholder="例如：蝴蝶" class="input input-bordered w-full" />
          </div>
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text">卧底词</span>
            </label>
            <input type="text" v-model="form.word2" placeholder="例如：蜜蜂" class="input input-bordered w-full" />
          </div>
        </div>
        <div class="card-actions justify-end mt-4">
          <button class="btn btn-primary" @click="submit" :disabled="submitting || !form.word1 || !form.word2">
            <span v-if="submitting" class="loading loading-spinner"></span>
            提交投稿
          </button>
        </div>
      </div>
    </div>

    <!-- 已投稿列表 -->
    <div class="card bg-base-200">
      <div class="card-body">
        <h2 class="card-title mb-4">我的投稿记录</h2>
        <div v-if="loading" class="flex justify-center p-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
        <div v-else-if="myPosts.length === 0" class="text-center p-8 text-base-content/60">
          暂无投稿记录
        </div>
        <div v-else class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>平民词</th>
                <th>卧底词</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="post in myPosts" :key="post.id">
                <td>{{ post.word1 }}</td>
                <td>{{ post.word2 }}</td>
                <td>
                  <div class="badge" :class="post.valid ? 'badge-success' : 'badge-warning'">
                    {{ post.valid ? '已采纳' : '审核中' }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>