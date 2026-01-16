<template>
  <div class="card bg-base-100 w-full shadow-xl">
    <div class="card-body">
      <div role="alert" class="alert alert-soft alert-warning mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <span>注意：初始化配置保存后将不再显示此页面。若后续需要修改配置，请直接在服务器修改 config.json 文件。</span>
      </div>
      <form @submit.prevent="submitConfig" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="col-span-full text-lg font-semibold border-b border-base-300 pb-2 mt-2">基本设置</div>
          <div class="form-control w-full">
              <label class="label" for="webport">
                <span class="label-text">Web 端口</span>
              </label>
              <input type="number" id="webport" v-model.number="form.webport" required class="input input-bordered w-full">
          </div>

          <div class="col-span-full text-lg font-semibold border-b border-base-300 pb-2 mt-4">数据库设置</div>
          <div class="form-control w-full">
              <label class="label" for="host">
                <span class="label-text">主机地址</span>
              </label>
              <input type="text" id="host" v-model="form.host" required class="input input-bordered w-full">
          </div>
          <div class="form-control w-full">
              <label class="label" for="port">
                <span class="label-text">端口</span>
              </label>
              <input type="number" id="port" v-model.number="form.port" required class="input input-bordered w-full">
          </div>
          <div class="form-control w-full">
              <label class="label" for="username">
                <span class="label-text">用户名</span>
              </label>
              <input type="text" id="username" v-model="form.username" required class="input input-bordered w-full">
          </div>
          <div class="form-control w-full">
              <label class="label" for="password">
                <span class="label-text">密码</span>
              </label>
              <input type="password" id="password" v-model="form.password" required class="input input-bordered w-full">
          </div>
          <div class="form-control w-full">
              <label class="label" for="database">
                <span class="label-text">数据库名</span>
              </label>
              <input type="text" id="database" v-model="form.database" required class="input input-bordered w-full">
          </div>
          <div class="form-control w-full">
              <label class="label" for="prefix">
                <span class="label-text">表前缀 (可选)</span>
              </label>
              <input type="text" id="prefix" v-model="form.prefix" class="input input-bordered w-full">
          </div>

          <div class="col-span-full text-lg font-semibold border-b border-base-300 pb-2 mt-4">持久化设置</div>
          <div class="form-control w-full">
              <label class="label" for="persistence_driver">
                <span class="label-text">持久化方式</span>
              </label>
              <select id="persistence_driver" v-model="form.persistence_driver" class="select select-bordered w-full">
                  <option value="none">无</option>
                  <option value="mysql">MySQL</option>
                  <option value="redis">Redis</option>
                  <option value="mongodb">MongoDB</option>
              </select>
          </div>

          <div v-if="['redis', 'mongodb'].includes(form.persistence_driver)" class="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control w-full">
                  <label class="label" for="persistence_host">
                    <span class="label-text">主机地址</span>
                  </label>
                  <input type="text" id="persistence_host" v-model="form.persistence_host" class="input input-bordered w-full">
              </div>
              <div class="form-control w-full">
                  <label class="label" for="persistence_port">
                    <span class="label-text">端口</span>
                  </label>
                  <input type="number" id="persistence_port" v-model.number="form.persistence_port" class="input input-bordered w-full">
              </div>
              <div class="form-control w-full">
                  <label class="label" for="persistence_username">
                    <span class="label-text">用户名</span>
                  </label>
                  <input type="text" id="persistence_username" v-model="form.persistence_username" class="input input-bordered w-full">
              </div>
              <div class="form-control w-full">
                  <label class="label" for="persistence_password">
                    <span class="label-text">密码</span>
                  </label>
                  <input type="password" id="persistence_password" v-model="form.persistence_password" class="input input-bordered w-full">
              </div>
              <div class="form-control w-full" v-if="form.persistence_driver === 'mongodb'">
                  <label class="label" for="persistence_database">
                    <span class="label-text">数据库名</span>
                  </label>
                  <input type="text" id="persistence_database" v-model="form.persistence_database" class="input input-bordered w-full">
              </div>
              <div class="form-control w-full">
                  <label class="label" for="persistence_prefix">
                    <span class="label-text">前缀</span>
                  </label>
                  <input type="text" id="persistence_prefix" v-model="form.persistence_prefix" class="input input-bordered w-full">
              </div>
          </div>

          <div class="col-span-full text-lg font-semibold border-b border-base-300 pb-2 mt-4">第三方登录设置（可选）</div>
          <div class="form-control w-full">
              <label class="label" for="githubClientId">
                <span class="label-text">GitHub Client ID</span>
              </label>
              <input type="text" id="githubClientId" v-model="form.githubClientId" class="input input-bordered w-full">
          </div>
          <div class="form-control w-full">
              <label class="label" for="githubClientSecret">
                <span class="label-text">GitHub Client Secret</span>
              </label>
              <input type="text" id="githubClientSecret" v-model="form.githubClientSecret" class="input input-bordered w-full">
          </div>
          <div class="form-control w-full">
              <label class="label" for="steamApiKey">
                <span class="label-text">Steam API Key</span>
              </label>
              <input type="text" id="steamApiKey" v-model="form.steamApiKey" class="input input-bordered w-full">
          </div>

          <div class="col-span-full text-lg font-semibold border-b border-base-300 pb-2 mt-4">摸鱼派密钥设置（可选）</div>
          <div class="form-control w-full">
              <label class="label" for="goldenKey">
                <span class="label-text">Golden Key (积分密钥)</span>
              </label>
              <input type="text" id="goldenKey" v-model="form.goldenKey" class="input input-bordered w-full">
          </div>
          <div class="form-control w-full">
              <label class="label" for="marketKey">
                <span class="label-text">Market Key (市场密钥)</span>
              </label>
              <input type="text" id="marketKey" v-model="form.marketKey" class="input input-bordered w-full">
          </div>

          <div class="col-span-full mt-6">
            <button type="submit" class="btn btn-primary w-full" :disabled="submitting">
              <span v-if="submitting" class="loading loading-spinner"></span>
              {{ submitting ? '提交中...' : '保存配置' }}
            </button>
          </div>
      </form>
      
      <div v-if="message" role="alert" :class="['alert mt-4', messageType === 'success' ? 'alert-success' : 'alert-error']">
        <svg v-if="messageType === 'success'" xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>{{ message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const submitting = ref(false)
const message = ref('')
const messageType = ref('')

const form = reactive({
  webport: 27015,
  host: '127.0.0.1',
  port: 3306,
  username: '',
  password: '',
  database: '',
  prefix: '',
  persistence_driver: 'none',
  persistence_host: '',
  persistence_port: undefined as number | undefined,
  persistence_username: '',
  persistence_password: '',
  persistence_database: '',
  persistence_prefix: '',
  githubClientId: '',
  githubClientSecret: '',
  steamApiKey: '',
  goldenKey: '',
  marketKey: ''
})

const submitConfig = async () => {
  submitting.value = true
  message.value = ''
  
  try {
    const response = await fetch('/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
    });

    const result = await response.json();

    if (result.code === 0) {
        message.value = result.msg || '配置保存成功！';
        messageType.value = 'success';
        setTimeout(() => {
            if (!location.host.includes(':')) {
                location.href = '/';
            } else {
                location.href = `${location.protocol}//${location.hostname}:${form.webport}/`;
            }
        }, 1500);
    } else {
        throw new Error(result.msg || '未知错误');
    }
  } catch (error: any) {
    message.value = '保存失败: ' + error.message;
    messageType.value = 'error';
  } finally {
    submitting.value = false
  }
}
</script>
