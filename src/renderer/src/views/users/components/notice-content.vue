<template>
  <div class="notice-content h-full">
    <div v-if="list.length > 0" class="flex flex-col gap-4 p-4">
      <div
        v-for="item in list"
        :key="item.id"
        class="notice-item bg-white rounded-lg p-10px shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
      >
        <div class="flex items-start gap-4">
          <div class="relative">
            <img
              :src="item.friend.avatar || defaultAvatar"
              :alt="item.friend.username"
              class="w-10 h-10 rounded-full object-cover border-2 border-gray-100"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-gray-900 text-16px font-400">
                {{ item.friend.nickname || item.friend.username }}
              </h3>
              <span class="text-xs text-gray-400">{{ formatTime(item.createdAt) }}</span>
            </div>
            <div v-if="item.addBy !== userInfo.id" class="flex items-center">
              <div class="text-sm text-gray-600 flex items-center w-full">
                <span class="truncate flex-1 text-13px">验证信息：{{ item.desc }}</span>
                <div class="flex ml-auto c-gray text-13px">
                  {{ item.status === '4' ? '已拒绝' : item.status === '1' ? '已同意' : '' }}
                </div>
              </div>
            </div>
            <div v-if="item.addBy === userInfo.id" class="flex justify-end c-gray text-13px">
              {{
                item.status === '0'
                  ? '已发起请求 , 等待答复'
                  : item.status === '1'
                    ? '已同意'
                    : item.status === '4'
                      ? '对方已拒绝'
                      : ''
              }}
            </div>
          </div>
        </div>

        <!-- 状态为0时显示操作按钮 -->
        <div
          v-if="item.status === '0' && item.addBy !== userInfo.id"
          class="flex justify-end gap-3 ml-auto"
        >
          <div
            class="text-13px rounded-full hover:bg-primary-dark transition-colors duration-300 flex items-center gap-2 px-10px bg-#9BAAF8 text-#fff shadow cursor-pointer h-30px"
            @click="handleAccept(item)"
          >
            <i i-solar-check-circle-bold-duotone></i>
            同意
          </div>
          <div
            class="text-sm font-medium rounded-full transition-all duration-300 bg-#F3F3F3 flex items-center gap-2 h-30px cursor-pointer px-10px"
            @click="handleReject(item)"
          >
            <i i-solar-close-circle-bold-duotone></i>
            拒绝
          </div>
        </div>
      </div>
    </div>

    <!-- 无通知时显示空状态 -->
    <div v-else class="flex flex-col items-center justify-center h-full text-gray-400 text-30px">
      <i i-solar-bell-bold-duotone class="mb-2 opacity-50"></i>
      <p class="text-sm">暂无{{ type === 'group' ? '群聊' : '好友' }}通知</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import defaultAvatar from '@renderer/assets/imgs/default-avatar.png'
import { useUsersStore } from '../store'
import dayjs from 'dayjs'
import { UpdateFriend } from '@renderer/service/api/user'
import { $msg } from '@renderer/config/interaction.config'
const { noticeList, userInfo, getFriendList } = useUsersStore()

const props = defineProps({
  type: {
    type: String,
    default: () => 'notice'
  }
})

// 使用计算属性
const list = computed(() => {
  if (props.type === 'notice') {
    return noticeList.value
  } else if (props.type === 'group') {
    return []
  }
  return []
})

// 格式化时间
const formatTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

// 处理同意请求
const handleAccept = async (notice: any) => {
  try {
    await UpdateFriend(notice.friend.id, {
      id: notice.id,
      status: '1' // 1表示已添加
    })
    $msg({
      type: 'success',
      msg: '已同意好友请求'
    })
    // 更新通知状态
    notice.status = '1'

    setTimeout(() => {
      getFriendList()
    }, 1000)
  } catch {
    $msg({
      type: 'error',
      msg: '操作失败'
    })
  }
}

// 处理拒绝请求
const handleReject = async (notice: any) => {
  try {
    await UpdateFriend(notice.friend.id, {
      id: notice.id,
      status: '4' // 4表示已拒绝
    })
    $msg({
      type: 'success',
      msg: '已拒绝好友请求'
    })
    // 更新通知状态
    notice.status = '4'
  } catch {
    $msg({
      type: 'error',
      msg: '操作失败'
    })
  }
}
</script>

<style scoped lang="scss">
.notice-content {
  overflow-y: auto;
  flex: 1;
  background-color: #f8f9fa;
  padding-top: 40px;
}

.notice-item {
  border: 1px solid transparent;
  backdrop-filter: blur(8px);

  &:hover {
    transform: translateY(-1px);
  }
}

:deep(i) {
  font-size: 1.2em;
}
</style>
