<template>
  <div class="black-list-container">
    <div v-if="blackList.length === 0" class="flex-center w-full h-full">
      <n-empty description="暂无黑名单" />
    </div>

    <div v-else class="black-list">
      <n-card v-for="item in blackList" :key="item.id" class="black-item" size="small">
        <div class="user-info">
          <div class="avatar-container">
            <n-avatar :src="item.friend.avatar || defaultAvatar" round size="large" />
          </div>

          <div class="user-details">
            <div class="user-name">
              {{ item.friend.nickname || item.friend.username }}
            </div>
          </div>
          <div
            i-solar-trash-bin-minimalistic-2-bold-duotone
            class="text-20px cursor-pointer hover:c-red transition-all"
          ></div>
        </div>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUsersStore } from '../store'
import { NEmpty, NCard, NAvatar, useMessage } from 'naive-ui'
import defaultAvatar from '@renderer/assets/imgs/default-avatar.png'

const { blackList } = useUsersStore()
const message = useMessage()

// 移除黑名单
const removeFromBlacklist = (item: any) => {
  // 这里添加移除黑名单的逻辑
  // 例如调用API或者更新store
  message.success(`已将 ${item.friend.nickname || item.friend.username} 从黑名单中移除`)
}
</script>

<style scoped lang="scss">
.black-list-container {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  flex: 1;
  background-color: #f8f9fa;
}

.black-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 40px;
}

.black-item {
  border-radius: 8px;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-container {
  position: relative;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0; /* 确保ellipsis生效 */
}

.user-name {
  font-weight: 500;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
