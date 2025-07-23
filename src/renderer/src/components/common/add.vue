<template>
  <div ref="addMenuRef" class="relative shrink-0 flex no-drag">
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
              <div v-if="!messageAvatarLoaded[user.id]" class="message-avatar-skeleton"></div>
              <img
                class="w-40px h-40px rd-50%"
                :src="user.avatar ? user.avatar : defaultAvatar"
                :style="{ display: messageAvatarLoaded[user.id] ? 'block' : 'none' }"
                @load="messageAvatarLoaded[user.id] = true"
                @error="handleAvatarError($event, user)"
              />
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

  <!-- 创建群聊弹窗 -->
  <n-modal
    v-model:show="showCreateGroupDialog"
    :show-icon="false"
    style="width: 500px"
    role="dialog"
    :bordered="false"
    size="small"
    class="custom-modal"
  >
    <div class="theme-bg rd-10px color-[var(--text-primary)] p-10px">
      <div class="modal-header">
        <span class="modal-title">创建群聊</span>
        <i
          i-solar-close-circle-outline
          class="close-icon"
          @click="showCreateGroupDialog = false"
        ></i>
      </div>
      <div class="create-group-dialog">
        <!-- 搜索框 -->
        <div class="flex items-center gap-10px mt-15px mb-15px">
          <input
            v-model="groupSearchQuery"
            class="border-none outline-none flex-1 h-35px pl-10px rd-6px c-[var(--text-primary)] bg-[rgba(153,153,153,.2)]"
            placeholder="搜索好友"
            @input="handleGroupSearch"
          />
          <div
            class="flex h-35px flex-center px-10px bg-[var(--theme-color)] rd-8px cursor-pointer hover:bg-[#8ea0fa] transition-all c-#fff"
            @click="handleGroupSearch"
          >
            <i i-solar-magnifer-linear></i>
          </div>
        </div>

        <!-- 分类下拉菜单 -->
        <div class="flex items-center gap-10px mb-15px">
          <div class="flex-1">
            <n-collapse-transition>
              <div
                class="category-header flex items-center justify-between p-8px rd-6px cursor-pointer bg-[rgba(153,153,153,.1)]"
                @click="showRecentChats = !showRecentChats"
              >
                <span>最近聊天</span>
                <i
                  :class="
                    showRecentChats
                      ? 'i-solar-alt-arrow-down-bold-duotone'
                      : 'i-solar-alt-arrow-right-bold-duotone'
                  "
                ></i>
              </div>
              <div v-if="showRecentChats" class="category-content mt-5px">
                <n-scrollbar
                  v-if="filteredRecentChats.length > 0"
                  class="max-h-150px overflow-y-auto"
                >
                  <div
                    v-for="user in filteredRecentChats"
                    :key="user.id"
                    class="user-item flex items-center gap-10px p-8px hover:bg-[rgba(153,153,153,.1)] rd-6px cursor-pointer"
                  >
                    <n-checkbox v-model:checked="selectedUsers[user.id]" />
                    <img
                      class="w-30px h-30px rd-50%"
                      :src="user.avatar ? user.avatar : defaultAvatar"
                    />
                    <div class="flex-1 truncate">{{ user.nickname || user.username }}</div>
                  </div>
                </n-scrollbar>
                <div v-else class="p-10px text-center text-gray-400">暂无最近聊天</div>
              </div>
            </n-collapse-transition>
          </div>
        </div>

        <div class="flex items-center gap-10px mb-15px">
          <div class="flex-1">
            <n-collapse-transition>
              <div
                class="category-header flex items-center justify-between p-8px rd-6px cursor-pointer bg-[rgba(153,153,153,.1)]"
                @click="showFriendList = !showFriendList"
              >
                <span>好友列表</span>
                <i
                  :class="
                    showFriendList
                      ? 'i-solar-alt-arrow-down-bold-duotone'
                      : 'i-solar-alt-arrow-right-bold-duotone'
                  "
                ></i>
              </div>
              <div v-if="showFriendList" class="category-content mt-5px">
                <n-scrollbar
                  v-if="filteredFriendList.length > 0"
                  class="max-h-150px overflow-y-auto"
                >
                  <div
                    v-for="user in filteredFriendList"
                    :key="user.id"
                    class="user-item flex items-center gap-10px p-8px hover:bg-[rgba(153,153,153,.1)] rd-6px cursor-pointer"
                  >
                    <n-checkbox v-model:checked="selectedUsers[user.id]" />
                    <img
                      class="w-30px h-30px rd-50%"
                      :src="user.avatar ? user.avatar : defaultAvatar"
                    />
                    <div class="flex-1 truncate">{{ user.nickname || user.username }}</div>
                  </div>
                </n-scrollbar>
                <div v-else class="p-10px text-center text-gray-400">暂无好友</div>
              </div>
            </n-collapse-transition>
          </div>
        </div>

        <!-- 已选择的好友 -->
        <div v-if="selectedCount > 0" class="selected-users mb-15px">
          <div class="text-sm mb-5px">已选择 {{ selectedCount }} 位好友</div>
          <div class="flex flex-wrap gap-5px">
            <div
              v-for="user in selectedUsersList"
              :key="user.id"
              class="selected-user-tag flex items-center gap-5px bg-[rgba(153,153,153,.2)] rd-15px py-2px px-8px text-sm"
            >
              <span class="truncate max-w-100px">{{ user.nickname || user.username }}</span>
              <i
                i-solar-close-circle-bold-duotone
                class="text-14px cursor-pointer"
                @click="selectedUsers[user.id] = false"
              ></i>
            </div>
          </div>
        </div>

        <!-- 群聊信息输入 -->
        <div class="mb-15px">
          <input
            v-model="groupName"
            class="w-full p-10px rd-6px border-none outline-none c-[var(--text-primary)] bg-[rgba(153,153,153,.2)] mb-10px"
            placeholder="请输入群聊名称"
          />
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end items-center gap-10px mt-20px">
          <div
            class="py-8px px-15px rd-8px cursor-pointer hover:bg-[rgba(153,153,153,.2)] transition-all"
            @click="showCreateGroupDialog = false"
          >
            取消
          </div>
          <div
            class="py-8px px-15px rd-8px bg-[var(--theme-color)] cursor-pointer hover:bg-[#8ea0fa] transition-all c-#fff"
            :class="{ 'opacity-50 cursor-not-allowed': selectedCount === 0 || !groupName }"
            @click="handleCreateGroup"
          >
            创建群聊
          </div>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import defaultAvatar from '@renderer/assets/imgs/default-avatar.png'
import {
  AddFriend,
  CreateGroup,
  FindAllUsers,
  GetChatList,
  GetFriendList
} from '@renderer/service/api/user'
import { $msg } from '@renderer/config/interaction.config'
import useUsersStore from '@renderer/stores/modules/user'
const useUser = useUsersStore()
const { userInfo } = useUser

// 搜索相关
const showSearchDialog = ref(false)
const showAddDialog = ref(false)
const searchResult = ref<any[]>([])
const searchQuery = ref('')
const addRemark = ref('')
const addDesc = ref('')
const selectedUserId = ref('')
const showAddMenu = ref(false)

// 创建群聊相关
const showCreateGroupDialog = ref(false)
const groupSearchQuery = ref('')
const showRecentChats = ref(true)
const showFriendList = ref(true)
const selectedUsers = ref<Record<number, boolean>>({})
const recentChats = ref<any[]>([])
const friendList = ref<any[]>([])
const groupName = ref('')

// 计算已选择的用户数量
const selectedCount = computed(() => {
  return Object.values(selectedUsers.value).filter(Boolean).length
})

// 计算已选择的用户列表
const selectedUsersList = computed(() => {
  // 合并两个列表并去重
  const allUsers = [...recentChats.value, ...friendList.value]
  const uniqueUsers = allUsers.reduce((acc: any[], user) => {
    // 如果用户ID不在累加器中且被选中，则添加到累加器
    if (!acc.some((u) => u.id === user.id) && selectedUsers.value[user.id]) {
      acc.push(user)
    }
    return acc
  }, [])
  return uniqueUsers
})

// 过滤后的最近聊天列表
const filteredRecentChats = computed(() => {
  if (!groupSearchQuery.value) return recentChats.value
  return recentChats.value.filter(
    (user) =>
      (user.nickname &&
        user.nickname.toLowerCase().includes(groupSearchQuery.value.toLowerCase())) ||
      (user.username && user.username.toLowerCase().includes(groupSearchQuery.value.toLowerCase()))
  )
})

// 过滤后的好友列表
const filteredFriendList = computed(() => {
  if (!groupSearchQuery.value) return friendList.value
  return friendList.value.filter(
    (user) =>
      (user.nickname &&
        user.nickname.toLowerCase().includes(groupSearchQuery.value.toLowerCase())) ||
      (user.username && user.username.toLowerCase().includes(groupSearchQuery.value.toLowerCase()))
  )
})
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

// 监听搜索弹窗关闭，清空输入框和搜索结果
watch(showSearchDialog, (newVal) => {
  if (!newVal) {
    searchQuery.value = ''
    searchResult.value = []
  }
})

// 监听添加好友弹窗关闭，清空输入框
watch(showAddDialog, (newVal) => {
  if (!newVal) {
    addRemark.value = ''
    addDesc.value = ''
  }
})

const handleAddContact = () => {
  showSearchDialog.value = true
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
    }

    if (res.data.length === 0) {
      $msg({
        type: 'warning',
        msg: '没有找到用户'
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

const handleAddGroup = async () => {
  showCreateGroupDialog.value = true
  showAddMenu.value = false

  // 获取最近聊天列表
  try {
    const res = await GetChatList()
    if (res.code === 200) {
      // 获取当前用户ID
      const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}')
      const currentUserId = currentUser?.userInfo?.id

      recentChats.value = res.data
        .filter((item: any) => item.friend.id !== currentUserId)
        .map((item: any) => ({
          id: item.friend.id,
          username: item.friend.username,
          nickname: item.friend.nickname,
          avatar: item.friend.avatar
        }))
    }
  } catch (error) {
    console.error('获取聊天列表失败:', error)
  }

  // 获取好友列表
  try {
    const res = await GetFriendList({ type: 'all' })
    if (res.code === 200) {
      friendList.value = (res.data.friend || []).map((item: any) => ({
        id: item.friend.id,
        username: item.friend.username,
        nickname: item.friend.nickname,
        avatar: item.friend.avatar
      }))
    }
  } catch (error) {
    console.error('获取好友列表失败:', error)
  }
}

// 群聊搜索
const handleGroupSearch = () => {
  // 搜索逻辑已通过计算属性实现
}

// 创建群聊
// 创建群聊
const handleCreateGroup = async () => {
  if (selectedCount.value === 0) {
    $msg({
      type: 'warning',
      msg: '请至少选择一位好友'
    })
    return
  }

  if (!groupName.value) {
    $msg({
      type: 'warning',
      msg: '请输入群聊名称'
    })
    return
  }

  // 获取选中的用户ID列表
  const selectedUserIds = Object.entries(selectedUsers.value)
    .filter(([_, selected]) => selected)
    .map(([id]) => parseInt(id))

  // 获取当前用户信息
  const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}')
  const currentUserId = currentUser?.userInfo?.id

  // 确保当前用户ID不在成员列表中（后端会自动添加创建者）
  const memberIds = selectedUserIds.filter((id) => id !== currentUserId)

  try {
    const res = await CreateGroup({
      name: groupName.value,
      creatorId: userInfo.id,
      memberIds: memberIds
    })

    if (res.code === 200) {
      $msg({
        type: 'success',
        msg: res.msg || '群聊创建成功'
      })
      showCreateGroupDialog.value = false
      // 重置表单
      groupName.value = ''
      selectedUsers.value = {}
    } else {
      $msg({
        type: 'error',
        msg: res.msg || '创建群聊失败'
      })
    }
  } catch (error) {
    console.error('创建群聊失败:', error)
    $msg({
      type: 'error',
      msg: '创建群聊失败，请稍后重试'
    })
  }
}

// 添加消息头像加载状态
const messageAvatarLoaded = ref<Record<string, boolean>>({})

// 消息头像错误处理
const handleAvatarError = (event: Event, item: any) => {
  const target = event.target as HTMLImageElement
  target.src = defaultAvatar
  messageAvatarLoaded.value[item.id] = true
}

// 监听创建群聊弹窗关闭，清空输入框和选择
watch(showCreateGroupDialog, (newVal) => {
  if (!newVal) {
    groupName.value = ''
    groupSearchQuery.value = ''
    selectedUsers.value = {}
  }
})

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
    border-bottom: 1px solid rgb(226, 226, 226);
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

.category-header {
  transition: all 0.3s;
  &:hover {
    background: rgba(153, 153, 153, 0.2);
  }
}

.user-item {
  transition: all 0.3s;
}

.selected-user-tag {
  transition: all 0.3s;
  &:hover {
    background: rgba(153, 153, 153, 0.3);
  }
}

.message-avatar-skeleton {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
