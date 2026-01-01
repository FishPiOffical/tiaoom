<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { api } from '@/api';
import Icon from './Icon.vue';
import msg from '../msg';
import ExcelJS from 'exceljs';

interface Option {
  label: string;
  value: any;
}

export interface Field {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'select' | 'boolean' | 'json' | 'date';
  options?: Option[];
  required?: boolean;
  defaultValue?: any;
  formatter?: (value: any) => string;
}

const props = defineProps<{
  gameKey: string;
  columns: Field[];
  searchFields?: Field[];
  importFields?: Field[];
}>();

const emit = defineEmits<{
  (e: 'add'): void;
  (e: 'edit', record: any): void;
}>();

// State
const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const page = ref(1);
const count = ref(10);
const query = reactive<Record<string, any>>({});

// Permission Modal
const showPermissionModal = ref(false);
const permissions = ref<string[]>([]);
const newPermission = ref('');
const isAdmin = ref(false);

// Initialize query defaults
if (props.searchFields) {
  props.searchFields.forEach(field => {
    if (field.defaultValue !== undefined) {
      query[field.key] = field.defaultValue;
    }
  });
}

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await api.getManageDateList(props.gameKey, {
      page: page.value,
      count: count.value,
      ...query
    });
    
    list.value = res.records;
    total.value = res.total
  } catch (e: any) {
    msg.error(e.message);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  page.value = 1;
  fetchData();
};

const handleReset = () => {
  // Reset query
  for (const key in query) {
    delete query[key];
  }
  if (props.searchFields) {
    props.searchFields.forEach(field => {
      if (field.defaultValue !== undefined) {
        query[field.key] = field.defaultValue;
      }
    });
  }
  handleSearch();
};

const fileInput = ref<HTMLInputElement | null>(null);

const handleImport = () => {
  fileInput.value?.click();
};

const getImportFields = () => {
  const source = props.importFields || props.columns;
  return source.filter(f => !['id', 'createdAt', 'updatedAt'].includes(f.key));
};

const handleDownloadTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Template');
  
  const fields = getImportFields();
  worksheet.columns = fields.map(f => ({
    header: f.label,
    key: f.key,
    width: 20
  }));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${props.gameKey}_template.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};

const onFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  try {
    let data: any[] = [];
    const fields = getImportFields();

    if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) throw new Error('CSV文件内容为空或无数据');
        
        const headers = lines[0].split(',').map(h => h.trim());
        const headerMap: Record<number, string> = {};
        headers.forEach((header, index) => {
            const field = fields.find(f => f.label === header || f.key === header);
            if (field) headerMap[index] = field.key;
        });

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const item: any = {};
            let hasData = false;
            values.forEach((val, index) => {
                const key = headerMap[index];
                if (key) {
                    item[key] = val.trim();
                    hasData = true;
                }
            });
            if (hasData) data.push(item);
        }
    } else {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) throw new Error('无法读取工作表');

        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber] = cell.text;
        });

        const headerMap: Record<number, string> = {};
        headers.forEach((header, index) => {
            const field = fields.find(f => f.label === header || f.key === header);
            if (field) headerMap[index] = field.key;
        });

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const item: any = {};
            let hasData = false;
            row.eachCell((cell, colNumber) => {
                const key = headerMap[colNumber];
                if (key) {
                    let value = cell.value;
                    if (typeof value === 'object' && value !== null) {
                        if ('text' in value) value = (value as any).text;
                        else if ('result' in value) value = (value as any).result;
                    }
                    item[key] = value;
                    hasData = true;
                }
            });
            if (hasData) data.push(item);
        });
    }

    await api.importManageData(props.gameKey, data);
    msg.success('导入成功');
    fetchData();
  } catch (e: any) {
    console.error(e);
    msg.error(e.message || '导入失败');
  } finally {
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
};

const handleDelete = async (record: any) => {
  if (!confirm('确定要删除吗？')) return;
  try {
    await api.removeManageData(props.gameKey, record.id);
    fetchData();
  } catch (e) {
    console.error(e);
    alert('删除失败');
  }
};

const formatValue = (record: any, col: Field) => {
    if (col.formatter) return col.formatter(record[col.key]);
    if (col.type === 'date') return new Date(record[col.key]).toLocaleString();
    if (col.type === 'boolean') return record[col.key] ? '是' : '否';
    if (col.type === 'select' && col.options) {
        const opt = col.options.find(o => o.value === record[col.key]);
        return opt ? opt.label : record[col.key];
    }
    return record[col.key];
};

const checkAdmin = async () => {
  try {
    const user = await api.getUserInfo();
    isAdmin.value = user.isAdmin;
  } catch (e) {
    console.error(e);
  }
};

const openPermissionModal = async () => {
  try {
    const res = await api.getManagePermissions(props.gameKey);
    permissions.value = res;
    showPermissionModal.value = true;
  } catch (e: any) {
    msg.error(e.message || '获取权限列表失败');
  }
};

const addPermission = async () => {
  if (!newPermission.value) return;
  if (permissions.value.includes(newPermission.value)) {
    msg.error('用户已存在');
    return;
  }
  try {
    const newPermissions = [...permissions.value, newPermission.value];
    await api.updateManagePermissions(props.gameKey, newPermissions);
    permissions.value = newPermissions;
    newPermission.value = '';
    msg.success('添加成功');
  } catch (e: any) {
    msg.error(e.message || '添加失败');
  }
};

const removePermission = async (username: string) => {
  if (!confirm(`确定要移除 ${username} 的管理权限吗？`)) return;
  try {
    const newPermissions = permissions.value.filter(p => p !== username);
    await api.updateManagePermissions(props.gameKey, newPermissions);
    permissions.value = newPermissions;
    msg.success('移除成功');
  } catch (e: any) {
    msg.error(e.message || '移除失败');
  }
};

onMounted(() => {
  fetchData();
  checkAdmin();
});

watch(() => props.gameKey, () => {
    fetchData();
});

defineExpose({
  refresh: fetchData
});
</script>

<template>
  <section class="p-4">
    <!-- Search Area -->
    <header class="mb-4 flex flex-wrap gap-4 items-end" v-if="searchFields && searchFields.length">
      <div v-for="field in searchFields" :key="field.key" class="form-control w-full max-w-xs">
        <label class="label">
          <span class="label-text">{{ field.label }}</span>
        </label>
        <input v-if="!field.type || field.type === 'text'" type="text" v-model="query[field.key]" class="input input-bordered w-full max-w-xs" />
        <select v-else-if="field.type === 'select'" v-model="query[field.key]" class="select select-bordered w-full max-w-xs">
            <option :value="undefined">全部</option>
            <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
      <div class="flex gap-2 pb-1">
        <button class="btn btn-primary" @click="handleSearch">
            <Icon icon="mingcute:search-line" /> 查询
        </button>
        <button class="btn btn-ghost" @click="handleReset">重置</button>
      </div>
    </header>

    <!-- Toolbar -->
    <div class="mb-4 flex justify-between">
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="emit('add')">
          <Icon icon="mingcute:plus-fill" /> 新增
        </button>
        <button class="btn btn-secondary" @click="handleImport">
          <Icon icon="mingcute:upload-fill" /> 批量导入
        </button>
        <button class="btn btn-accent" @click="handleDownloadTemplate">
          <Icon icon="mingcute:download-fill" /> 下载模板
        </button>
        <button v-if="isAdmin" class="btn btn-warning" @click="openPermissionModal">
          <Icon icon="mingcute:user-setting-fill" /> 权限管理
        </button>
        <input 
          type="file" 
          ref="fileInput" 
          class="hidden" 
          accept=".xlsx,.csv" 
          @change="onFileChange" 
        />
      </div>
      <!-- Pagination -->
      <div class="flex justify-center mt-4">
        <div class="join">
          <button class="join-item btn" :disabled="page <= 1" @click="page--; fetchData()">
            <Icon icon="flowbite:caret-left-solid" />
          </button>
          <button class="join-item btn">Page {{ page }}</button>
          <button class="join-item btn" :disabled="list.length < count" @click="page++; fetchData()">
            <Icon icon="flowbite:caret-right-solid" />
          </button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length + 1" class="text-center">加载中...</td>
          </tr>
          <tr v-else-if="list.length === 0">
            <td :colspan="columns.length + 1" class="text-center">暂无数据</td>
          </tr>
          <tr v-else v-for="item in list" :key="item.id">
            <td v-for="col in columns" :key="col.key">
                {{ formatValue(item, col) }}
            </td>
            <td class="flex gap-2">
                <button class="btn btn-xs btn-info" @click="emit('edit', item)">编辑</button>
                <button class="btn btn-xs btn-error" @click="handleDelete(item)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Permission Modal -->
    <dialog class="modal" :class="{ 'modal-open': showPermissionModal }">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">权限管理</h3>
        
        <div class="flex gap-2 mb-4">
          <input type="text" v-model="newPermission" class="input input-bordered w-full" placeholder="输入用户名" @keyup.enter="addPermission" />
          <button class="btn btn-primary" @click="addPermission">添加</button>
        </div>

        <div class="overflow-y-auto max-h-60">
          <table class="table w-full">
            <thead>
              <tr>
                <th>用户名</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="permissions.length === 0">
                <td colspan="2" class="text-center">暂无管理员</td>
              </tr>
              <tr v-for="user in permissions" :key="user">
                <td>{{ user }}</td>
                <td>
                  <button class="btn btn-xs btn-error" @click="removePermission(user)">移除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-action">
          <button class="btn" @click="showPermissionModal = false">关闭</button>
        </div>
      </div>
    </dialog>
  </section>
</template>