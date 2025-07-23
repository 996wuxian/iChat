<template>
  <div class="sidebar relative bg-#fff" :style="{ width: `${sidebarWidth}px` }">
    <!-- 搜索和添加区域 -->
    <div class="search-bar no-drag">
      <div class="search-input">
        <i i-solar-magnifer-linear class="search-icon"></i>
        <input v-model="searchKey" type="text" placeholder="搜索" class="search-field" />
      </div>
      <Add />
    </div>

    <div class="flex flex-col p-10px">
      <div
        class="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
        :class="{ 'bg-gray-100': selectMenu === 'notice' }"
        @click.stop="changeContent('notice')"
      >
        <div class="flex items-center gap-2">
          <i i-solar-users-group-rounded-bold-duotone class="text-20px"></i>
          <span>好友通知</span>
        </div>
        <div class="relative">
          <span
            v-if="friendRequestCount > 0"
            class="absolute -top-2 right-0px bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center"
          >
            {{ friendRequestCount }}
          </span>
          <i i-solar-alt-arrow-right-bold-duotone></i>
        </div>
      </div>

      <div
        class="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
        :class="{ 'bg-gray-100': selectMenu === 'group' }"
        @click.stop="changeContent('group')"
      >
        <div class="flex items-center gap-2">
          <i i-solar-bell-bold-duotone class="text-20px"></i>
          <span>群聊通知</span>
        </div>
        <div class="relative">
          <span
            v-if="groupRequestCount > 0"
            class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center"
          >
            {{ groupRequestCount }}
          </span>
          <i i-solar-alt-arrow-right-bold-duotone></i>
        </div>
      </div>

      <div
        class="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
        :class="{ 'bg-gray-100': selectMenu === 'black' }"
        @click="changeContent('black')"
      >
        <div class="flex items-center gap-2">
          <i i-solar-shield-user-bold-duotone class="text-20px"></i>
          <span>黑名单</span>
        </div>
      </div>
    </div>

    <!-- 拖拽条 -->
    <div class="resize-handle" @mousedown="handleMouseDown"></div>

    <!-- 切换按钮 -->
    <div class="w-85% flex justify-between p-4px h-35px bg-#EBF0F5 mx-auto rd-8px gap-10px">
      <div
        class="tab-item"
        :class="{ active: listType === 'friends' }"
        @click="handleTabChange('friends')"
      >
        <i i-solar-user-bold-duotone class="text-18px"></i>
        <span>好友</span>
      </div>
      <div
        class="tab-item"
        :class="{ active: listType === 'groups' }"
        @click="handleTabChange('groups')"
      >
        <i i-solar-users-group-rounded-bold-duotone class="text-18px"></i>
        <span>群聊</span>
      </div>
    </div>

    <!-- 好友列表 -->
    <div
      v-if="listType === 'friends' && friendList.length > 0"
      class="flex flex-col b-t-1px b-#EEEEEE b-t-solid p-10px gap-10px"
    >
      <div class="text-gray-500 text-12px flex items-center gap-10px justify-center mb-10px">
        <span class="w-50px h-1px bg-#eee"></span>
        共{{ friendList.length }}个好友
        <span class="w-50px h-1px bg-#eee"></span>
      </div>
      <div
        v-for="item in friendList"
        :key="item.id"
        class="friend-card rounded-lg p-2 cursor-pointer"
        :class="{ 'bg-#F5F5F5 c-#fff': selectFriend?.id === item.id }"
        @click.stop="changeContent('friend', item)"
      >
        <div class="flex items-start gap-3">
          <div v-if="!messageAvatarLoaded[item.id]" class="message-avatar-skeleton"></div>
          <img
            :src="item.friend.avatar || defaultAvatar"
            :alt="item.friend.username"
            :style="{ display: messageAvatarLoaded[item.id] ? 'block' : 'none' }"
            class="w-10 h-10 rounded-full object-cover"
            @load="messageAvatarLoaded[item.id] = true"
            @error="handleAvatarError($event, item)"
          />
          <div class="flex-1">
            <div class="flex items-center justify-between relative">
              <h3 class="font-medium text-gray-900">
                {{ item.friend.nickname || item.friend.username }}
              </h3>
              <span
                class="absolute right-1 top-1 w-3 h-3 border-2 border-#DBDEE1 border b-solid rounded-full transition-all"
                :class="item.friend.online === '1' ? 'bg-green-500' : 'bg-gray-400'"
              ></span>
            </div>
            <p class="text-12px text-gray-500">
              {{ item.friend.desc || '这个人很懒，什么都没填' }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <!-- 群聊列表 -->
    <div
      v-else-if="listType === 'groups' && groupList.length > 0"
      class="flex flex-col b-t-1px b-#EEEEEE b-t-solid p-10px gap-10px"
    >
      <div class="text-gray-500 text-12px flex items-center gap-10px justify-center mb-10px">
        <span class="w-50px h-1px bg-#eee"></span>
        共{{ groupList.length }}个群聊
        <span class="w-50px h-1px bg-#eee"></span>
      </div>
      <div
        v-for="group in groupList"
        :key="group.id"
        class="friend-card rounded-lg p-2 cursor-pointer"
        :class="{ 'bg-#F5F5F5 c-#fff': selectGroup?.group?.id === group.id }"
        @click.stop="changeContent('groupDetail', group)"
      >
        <div class="flex items-start gap-3">
          <img
            :src="group.avatar || defaultAvatar"
            :alt="group.name"
            class="w-10 h-10 rounded-full object-cover"
          />
          <div class="flex-1">
            <div class="flex items-center justify-between relative">
              <h3 class="font-medium text-gray-900">{{ group.name }}</h3>
            </div>
            <p class="text-12px text-gray-500">
              {{ group.description || '暂无群描述' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态提示 -->
    <div v-else class="flex flex-col items-center justify-center flex-1 text-gray-500">
      <i i-solar-users-group-rounded-bold-duotone class="text-40px mb-4"></i>
      <p>{{ listType === 'friends' ? '暂无好友' : '暂无群聊' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import defaultAvatar from '@renderer/assets/imgs/default-avatar.png'
import { useUsersStore } from '../store'
import Add from '@renderer/components/common/add.vue'

const {
  searchKey,
  friendRequestCount,
  groupRequestCount,
  selectFriend,
  friendList,
  sidebarWidth,
  handleMouseDown,
  remark,
  listType,
  selectGroup,
  toggleListType,
  groupList,
  getGroupDetail
} = useUsersStore()

const emit = defineEmits(['select'])
const selectMenu = ref('friend')
// 处理标签切换
const handleTabChange = (type: 'friends' | 'groups') => {
  if (type !== listType.value) {
    toggleListType()
  }
  messageAvatarLoaded.value = {}
}

const changeContent = (
  type: 'notice' | 'group' | 'black' | 'friend' | 'groupDetail',
  item?: any
) => {
  selectMenu.value = type
  switch (type) {
    case 'notice':
      emit('select', 'notice')
      selectFriend.value = null
      break
    case 'group':
      emit('select', 'group')
      break
    case 'black':
      emit('select', 'black')
      break
    case 'friend':
      selectFriend.value = item
      remark.value = item.remark
      emit('select', 'friend')
      break
    case 'groupDetail':
      selectGroup.value = item
      selectFriend.value = null
      getGroupDetail(item.id) // 获取群聊详情
      emit('select', 'groupDetail')
      break
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

onUnmounted(() => {
  selectFriend.value = null
  selectGroup.value = null
})
</script>

<style scoped lang="scss">
.sidebar {
  min-width: 200px;
  max-width: 300px;
  height: 100%;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  user-select: none;
}

.resize-handle {
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  position: absolute;
  right: 0;
  top: 0;
  transform: translateX(calc(100% - 2px));
  transition: background 0.2s;
}

.search-bar {
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #eee;
  min-width: 0; // 添加这行以确保flex子项可以正确缩小
}

.search-input {
  flex: 1;
  height: 36px;
  background: #f5f5f5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  font-size: 14px;
  position: relative;
  min-width: 0; // 添加这行以确保flex子项可以正确缩小
}

.search-icon {
  font-size: 16px;
  color: #999;
  position: absolute;
  left: 10px;
  flex-shrink: 0; // 防止图标被压缩
}

.search-field {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: #333;
  padding: 0 10px 0 30px; // 调整padding，为图标留出空间
  width: 100%; // 确保输入框填满容器
  min-width: 0; // 允许输入框缩小

  &::placeholder {
    color: #999;
    font-size: 13px;
  }
}

.add-icon {
  font-size: 24px;
  cursor: pointer;
  flex-shrink: 0; // 防止图标被压缩
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

.friend-card {
  box-shadow: 0 0px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 0px 4px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
}

.tab-item {
  color: gray;
  flex: 1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.3s;
  cursor: pointer;
  height: 100%;
  vertical-align: middle;
}

.tab-item.active {
  color: var(--theme-color);
  background-color: #fff;
  transition: all 0.3s;
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
