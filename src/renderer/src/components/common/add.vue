<template>
  <div ref="addMenuRef" class="relative shrink-0 flex">
    <i i-solar-add-square-line-duotone class="add-icon" @click="showAddMenu = !showAddMenu"></i>
    <!-- 添加菜单 -->
    <div v-if="showAddMenu" class="add-menu theme-bg color-[var(--text-primary)]">
      <div class="add-menu-item" @click="handleAddContact">
        <i i-solar-user-plus-bold-duotone></i>
        <span>加好友/群</span>
      </div>
      <div class="add-menu-item" @click="handleAddGroup">
        <i i-solar-users-group-rounded-bold-duotone></i>
        <span>创建群聊</span>
      </div>
    </div>
  </div>

  <!-- 搜索用户弹窗 -->
  <n-modal
    v-model:show="showSearchDialog"
    :show-icon="false"
    style="width: 400px"
    role="dialog"
    :bordered="false"
    size="small"
    class="custom-modal"
  >
    <div class="theme-bg rd-10px color-[var(--text-primary)] p-10px">
      <div class="modal-header">
        <span class="modal-title">添加好友/群</span>
        <i i-solar-close-circle-outline class="close-icon" @click="showSearchDialog = false"></i>
      </div>
      <div class="search-user-dialog">
        <div class="flex items-center gap-10px mt-15px">
          <input
            v-model="searchQuery"
            class="border-none outline-none flex-1 h-35px pl-10px rd-6px c-[var(--text-primary)] bg-[rgba(153,153,153,.2)]"
            placeholder="请输入用户名/群名"
            @keyup.enter="handleSearch"
          />
          <div
            class="flex h-35px flex-center px-10px bg-[var(--theme-color)] rd-8px cursor-pointer hover:bg-[#8ea0fa] transition-all c-#fff"
            @click="handleSearch"
          >
            <i i-solar-magnifer-linear></i>
          </div>
        </div>

        <div v-if="searchResult.length > 0" class="search-results mt-4">
          <div v-for="user in searchResult" :key="user.id" class="search-result-item">
            <div class="flex items-center gap-10px">
              <img class="w-40px h-40px rd-50%" :src="user.avatar ? user.avatar : defaultAvatar" />
              <div class="user-detail">
                <span>{{ user.nickname }}</span>
              </div>
            </div>
            <div
              class="py-5px px-10px rd-10px text-20px cursor-pointer transition-all flex"
              @click="handleAddFriend(user.id)"
            >
              <i i-solar-user-plus-bold-duotone></i>
            </div>
          </div>
        </div>

        <div v-else class="empty-result">
          <img
            class="w-250px opacity-60%"
            src="@renderer/assets/imgs/search-empty.png"
            alt="暂无搜索结果"
          />
          <p>暂无搜索结果</p>
        </div>
      </div>
    </div>
  </n-modal>

  <!-- 添加好友弹窗 -->
  <n-modal
    v-model:show="showAddDialog"
    :show-icon="false"
    style="width: 400px"
    role="dialog"
    :bordered="false"
    size="small"
    class="custom-modal"
  >
    <div class="theme-bg rd-10px color-[var(--text-primary)] p-10px">
      <div class="modal-header">
        <span class="modal-title">添加好友</span>
        <i i-solar-close-circle-outline class="close-icon" @click="showAddDialog = false"></i>
      </div>
      <div class="search-user-dialog">
        <div class="mt-15px">
          <input
            v-model="addRemark"
            class="w-full p-10px rd-6px border-none outline-none c-[var(--text-primary)] bg-[rgba(153,153,153,.2)] mb-10px"
            placeholder="请输入好友备注"
          />
          <textarea
            v-model="addDesc"
            class="w-full min-h-100px p-10px rd-6px border-none outline-none c-[var(--text-primary)] bg-[rgba(153,153,153,.2)] resize-none font-['微软雅黑']"
            placeholder="请输入添加描述"
          ></textarea>
        </div>
        <div class="flex justify-end items-center gap-10px mt-20px">
          <div
            class="py-8px px-15px rd-8px cursor-pointer hover:bg-[rgba(153,153,153,.2)] transition-all"
            @click="showAddDialog = false"
          >
            取消
          </div>
          <div
            class="py-8px px-15px rd-8px bg-[var(--theme-color)] cursor-pointer hover:bg-[#8ea0fa] transition-all c-#fff"
            @click="handleConfirmAdd"
          >
            确认添加
          </div>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import defaultAvatar from '@renderer/assets/imgs/default-avatar.jpg'
import { AddFriend, FindAllUsers } from '@renderer/service/api/user'
import { $msg } from '@renderer/config/interaction.config'

// 搜索相关
const showSearchDialog = ref(false)
const showAddDialog = ref(false)
const searchResult = ref<any[]>([])
const searchQuery = ref('')
const addRemark = ref('')
const addDesc = ref('')
const selectedUserId = ref('')
const showAddMenu = ref(false)

// 添加菜单相关
const addMenuRef = ref<HTMLElement | null>(null)

const handleClickOutside = (event: MouseEvent) => {
  if (addMenuRef.value && !addMenuRef.value.contains(event.target as Node)) {
    closeAddMenu()
  }
}

const closeAddMenu = () => {
  showAddMenu.value = false
}

const handleAddContact = () => {
  showSearchDialog.value = true
  showAddMenu.value = false
}

const handleAddGroup = () => {
  console.log('添加群聊')
  showAddMenu.value = false
}

// 搜索用户
const handleSearch = async () => {
  if (!searchQuery.value) {
    $msg({
      type: 'warning',
      msg: '请输入搜索内容'
    })
    return
  }

  try {
    const res = await FindAllUsers({
      keyWord: searchQuery.value
    })

    if (res.code === 200) {
      searchResult.value = res.data || []
    } else {
      $msg({
        type: 'error',
        msg: res.msg || '搜索失败'
      })
    }
  } catch (error) {
    console.error('搜索用户失败:', error)
    $msg({
      type: 'error',
      msg: '搜索失败，请稍后重试'
    })
  }
}

// 添加好友
const handleAddFriend = async (userId: string) => {
  selectedUserId.value = userId
  showSearchDialog.value = false
  showAddDialog.value = true
  addDesc.value = '' // 重置描述
  addRemark.value = '' // 重置备注
}

// 确认添加好友
const handleConfirmAdd = async () => {
  try {
    const res = await AddFriend({
      friendId: selectedUserId.value,
      remark: addRemark.value,
      desc: addDesc.value
    })

    if (res.code === 200) {
      $msg({
        type: 'success',
        msg: res.msg || '添加成功'
      })
      showAddDialog.value = false
      addRemark.value = ''
      addDesc.value = ''
    } else {
      $msg({
        type: 'error',
        msg: res.msg || '添加失败'
      })
    }
  } catch (error) {
    console.error('添加好友失败:', error)
    $msg({
      type: 'error',
      msg: '添加失败，请稍后重试'
    })
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped lang="scss">
.add-icon {
  font-size: 24px;
  cursor: pointer;
  flex-shrink: 0;
}

.add-menu {
  position: absolute;
  right: 0;
  top: 120%;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 5px;
  z-index: 10;
  min-width: 120px;
  user-select: none;
}

.add-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
  font-size: 13px;

  &:hover {
    background: #f5f5f5;
    color: var(--theme-color);
  }

  i {
    font-size: 16px;
  }
}

.custom-modal {
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid gray;
    padding-bottom: 10px;

    .modal-title {
      font-size: 16px;
      font-weight: 500;
      color: var(--text-color-base);
    }

    .close-icon {
      font-size: 20px;
      cursor: pointer;
      transition: all 0.3s;
    }
  }
}

.search-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s;
  margin-bottom: 8px;
  background: rgba(153, 153, 153, 0.3);
  cursor: pointer;

  &:hover {
    border-color: var(--theme-color);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }
}

.empty-result {
  padding: 32px 0;
  text-align: center;
  color: gray;
}
</style>
