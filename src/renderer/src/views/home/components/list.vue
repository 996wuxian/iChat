<template>
  <div class="sidebar relative bg-#fff" :style="{ width: `${sidebarWidth}px` }">
    <!-- 搜索和添加区域 -->
    <div class="search-bar">
      <div class="search-input">
        <i i-solar-magnifer-linear class="search-icon"></i>
        <input v-model="searchKey" type="text" placeholder="搜索" class="search-field" />
      </div>
      <Add />
    </div>

    <!-- 用户列表 -->
    <div v-if="Object.keys(userList).length > 0" class="user-list">
      <div
        v-for="user in filteredUserList"
        :key="user.id"
        class="user-item"
        :class="[
          { 'user-item-active': selectedChat?.id === user.id },
          { 'bg-#F5F5F5': user?.is_top === '1' }
        ]"
        @click="handleSelectChat(user)"
        @contextmenu.prevent="handleContextMenu($event, user, 'list')"
      >
        <div class="user-avatar">
          <img :src="user.avatar || defaultAvatar" :alt="user.nickname" />
          <span
            v-if="user.unReadCount > 0"
            class="unReadCount-badge"
            :class="user?.is_disturb === '1' ? 'bg-gray-400' : 'bg-red-500'"
            >{{ user.unReadCount }}</span
          >
          <!-- 在线状态指示器 -->
          <span class="online-status" :class="{ 'is-online': user.online === '1' }"></span>
        </div>
        <div class="user-info">
          <div class="user-header">
            <span class="nickname">{{ user.nickname || user.username }}</span>
            <span class="time ml-auto">{{ formatTime(user.lastMsgTime) }}</span>
            <i
              v-if="user?.is_top === '1'"
              i-solar-pin-list-broken
              class="ml-10px w-18px h-18px"
            ></i>
            <svg-icon
              v-if="user?.is_disturb === '1'"
              name="disturb"
              :width="14"
              :height="14"
              class="ml-10px"
            />
          </div>

          <div v-if="user.lastMsg" class="last-message">
            <template v-for="(part, index) in parseMessageContent(user.lastMsg)" :key="index">
              <img
                v-if="part.type === 'image'"
                :src="part.src"
                class="inline-block w-16px h-16px align-text-bottom"
              />
              <span v-else>{{ part.content }}</span>
            </template>
          </div>
          <div v-else class="c-gray text-12px">暂无消息</div>
        </div>
      </div>
    </div>

    <!-- 无用户列表提示 -->
    <div v-else class="flex-center h-full c-gray flex-col">
      <img class="w-200px" src="@renderer/assets/imgs/user-empty.png" alt="暂无用户" />
      <p class="mb-50px">暂无聊天</p>
    </div>

    <!-- 拖拽条 -->
    <div class="resize-handle" @mousedown="handleMouseDown"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import Add from '@renderer/components/common/add.vue'
import defaultAvatar from '@renderer/assets/imgs/default-avatar.jpg'
import { formatTime } from '@renderer/utils/tools'
import { useHomeStore } from '../store'

const {
  userList,
  searchKey,
  handleSelectChat,
  sidebarWidth,
  handleMouseDown,
  selectedChat,
  closeAddMenu,
  handleContextMenu
} = useHomeStore()

const addMenuRef = ref<HTMLElement | null>(null)

const handleClickOutside = (event: MouseEvent) => {
  if (addMenuRef.value && !addMenuRef.value.contains(event.target as Node)) {
    closeAddMenu()
  }
}

// 过滤后的用户列表
const filteredUserList = computed(() => {
  const users = Object.values(userList.value).map((item) => item.list)

  // 多重排序
  users.sort((a, b) => {
    // 首先按置顶状态排序
    if (a.is_top !== b.is_top) {
      return a.is_top === '1' ? -1 : 1
    }

    // 其次按未读消息数排序
    if (a.unReadCount !== b.unReadCount) {
      return b.unReadCount - a.unReadCount
    }

    // 最后按最后消息时间排序
    return new Date(b.lastMsgTime).getTime() - new Date(a.lastMsgTime).getTime()
  })

  if (!searchKey.value) return users

  return users.filter((item) =>
    item.nickname?.toLowerCase().includes(searchKey.value.toLowerCase())
  )
})

// 解析消息内容
const parseMessageContent = (content: string) => {
  const parts = []
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = content

  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.trim()) {
        parts.push({
          type: 'text',
          content: node.textContent
        })
      }
    } else if (node.nodeType === Node.ELEMENT_NODE && node instanceof HTMLImageElement) {
      parts.push({
        type: 'image',
        src: node.src,
        class: node.className
      })
    } else if (node.childNodes.length) {
      node.childNodes.forEach(processNode)
    }
  }

  tempDiv.childNodes.forEach(processNode)
  return parts
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
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

.user-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s;

  &:hover {
    background: #f5f5f5;
  }

  &.user-item-active {
    background: rgba(0, 0, 0, 0.1);

    .nickname,
    .time,
    .last-message {
      color: #333;
    }
  }
}

.user-avatar {
  position: relative;
  width: 40px;
  height: 40px;

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
}

.online-status {
  position: absolute;
  left: -2px;
  top: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #999;
  border: 2px solid #fff;
  transition: all 0.3s;

  &.is-online {
    background: #52c41a;
  }
}

.unReadCount-badge {
  position: absolute;
  right: -2px;
  top: -2px;
  color: #fff;
  font-size: 12px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.user-info {
  flex: 1;
  min-width: 0;
  justify-content: space-between;
}

.user-header {
  display: flex;
  align-items: center;
}

.nickname {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.time {
  font-size: 12px;
  color: #999;
}

.last-message {
  font-size: 12px;
  color: gray;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

  .dialog-footer {
    text-align: right;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--divider-color);
  }
}

.search-user-dialog {
  .n-input-group {
    .n-input {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }

    .n-button {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }
  }

  .search-results {
    max-height: 400px;
    overflow-y: auto;
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

    img {
      opacity: 0.8;
    }

    p {
      color: gray;
      font-size: 14px;
    }
  }
}
</style>
