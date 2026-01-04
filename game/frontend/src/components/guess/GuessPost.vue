<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { http } from '@/api';
import msg from '../msg';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  difficulty: string;
  valid: boolean;
  from: string;
}

const form = ref({
  title: '',
  content: '',
  category: '百科',
  difficulty: '简单',
});

const myPosts = ref<Article[]>([]);
const loading = ref(false);
const submitting = ref(false);

const categories = ['百科', '历史', '科技', '文学', '地理', '艺术'];
const difficulties = ['简单', '中等', '困难', '地狱'];

const fetchMyPosts = async () => {
  loading.value = true;
  try {
    const res: any = await http.get('/game/guess/my-posts');
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
  if (!form.value.title || !form.value.content) {
    msg.error('标题和正文不能为空');
    return;
  }
  
  submitting.value = true;
  try {
    await http.post('/game/guess/post', { ...form.value });
    msg.success('投稿成功！');
    form.value.title = '';
    form.value.content = '';
    form.value.category = '百科';
    form.value.difficulty = '简单';
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
    <h1 class="text-xl font-bold mb-6">文章投稿</h1>
    
    <!-- 投稿表单 -->
    <div class="card bg-base-200 mb-8">
      <div class="card-body">
        <h2 class="card-title mb-4">投稿新文章</h2>
        
        <div class="form-control w-full mb-4">
          <label class="label">
            <span class="label-text">标题 *</span>
            <span class="label-text-alt">{{ form.title.length }}/100</span>
          </label>
          <input 
            type="text" 
            v-model="form.title" 
            placeholder="请输入文章标题" 
            maxlength="100"
            class="input input-bordered w-full" 
          />
        </div>

        <div class="form-control w-full mb-4">
          <label class="label">
            <span class="label-text">正文 *</span>
            <span class="label-text-alt">{{ form.content.length }}/5000</span>
          </label>
          <textarea 
            v-model="form.content" 
            placeholder="请输入文章正文，包含汉字的内容会被用作猜测题目" 
            maxlength="5000"
            class="textarea textarea-bordered h-32" 
          ></textarea>
        </div>

        <div class="flex flex-col md:flex-row gap-4 mb-4">
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text">分类</span>
            </label>
            <select v-model="form.category" class="select select-bordered w-full">
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text">难度</span>
            </label>
            <select v-model="form.difficulty" class="select select-bordered w-full">
              <option v-for="diff in difficulties" :key="diff" :value="diff">{{ diff }}</option>
            </select>
          </div>
        </div>

        <div class="card-actions justify-end">
          <button 
            class="btn btn-primary" 
            @click="submit" 
            :disabled="submitting || !form.title || !form.content"
          >
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
        
        <div v-else class="space-y-4">
          <div 
            v-for="post in myPosts" 
            :key="post.id"
            class="p-4 bg-base-100 rounded-lg border border-base-content/10"
          >
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-bold text-lg">{{ post.title }}</h3>
              <div class="flex gap-2">
                <span class="badge badge-sm" :class="post.valid ? 'badge-success' : 'badge-warning'">
                  {{ post.valid ? '已审核' : '待审核' }}
                </span>
                <span class="badge badge-sm badge-info">{{ post.category }}</span>
                <span class="badge badge-sm badge-secondary">{{ post.difficulty }}</span>
              </div>
            </div>
            <p class="text-sm text-base-content/70 line-clamp-3">{{ post.content }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
