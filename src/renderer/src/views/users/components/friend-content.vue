<script setup lang="ts">
import { computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '../store'
import defaultAvatar from '@renderer/assets/imgs/default-avatar.png'
import { CreateChatList } from '@renderer/service/api/user'
import { $msg } from '@renderer/config/interaction.config'

const router = useRouter()
const { selectFriend, remark } = useUsersStore()

// 当前选中的好友
const selectedFriend = computed(() => selectFriend?.value?.friend)
remark.value = selectFriend.value?.remark || ''

// 跳转到聊天
const handleChat = async () => {
  try {
    // 创建聊天关系
    const res = await CreateChatList(selectedFriend.value!.id!)
    if (res.code === 200 || res.msg === '聊天已存在') {
      // 创建成功后跳转到聊天页面
      router.push({
        path: '/home',
        query: {
          userId: selectedFriend.value?.id
        }
      })
    } else {
      $msg({
        type: 'error',
        msg: res.msg || '创建聊天关系失败'
      })
    }
  } catch (error) {
    console.error('创建聊天关系失败:', error)
    $msg({
      type: 'error',
      msg: '创建聊天关系失败'
    })
  }
}

const options = [
  {
    label: '屏蔽',
    key: 'marina bay sands',
    icon: () => h('i', { class: 'i-solar-user-block-broken' })
  },
  {
    label: '拉黑',
    key: "brown's hotel, london",
    icon: () => h('i', { class: 'i-solar-user-minus-line-duotone' })
  },
  {
    label: '举报',
    key: 'atlantis nahamas, nassau',
    icon: () => h('i', { class: 'i-solar-danger-broken' })
  },
  {
    label: '删除',
    key: 'the beverly hills hotel, los angeles',
    icon: () => h('i', { class: 'i-solar-user-cross-rounded-line-duotone' })
  }
]
const handleSelect = (key: string | number) => {}
</script>

<template>
  <div class="flex-1 p-20px pt-60px">
    <template v-if="selectedFriend">
      <!-- 用户信息卡片 -->
      <div class="box">
        <!-- 头部信息 -->
        <div class="flex items-start gap-20px mb-20px">
          <div class="relative">
            <img
              :src="selectedFriend.avatar || defaultAvatar"
              :alt="selectedFriend.username"
              class="w-70px h-70px rounded-full object-cover border-2 border-gray-100"
            />
            <!-- 简化的在线状态指示器 -->
            <span
              class="absolute right-5px bottom-8px w-12px h-12px rounded-full border-2 border-white b-solid"
              :class="selectedFriend.online === '1' ? 'bg-green-500' : 'bg-gray-400'"
            ></span>
          </div>
          <div class="flex-1">
            <h2 class="text-20px font-500 mb-10px">
              {{ selectedFriend.nickname || selectedFriend.username }}
              <span v-if="remark">({{ remark }})</span>
            </h2>
            <p class="text-14px text-gray-500">
              {{ selectedFriend.desc || '这个人很懒，什么都没写~' }}
            </p>
          </div>

          <n-dropdown trigger="click" :options="options" @select="handleSelect">
            <div class="flex ml-auto mb-auto cursor-pointer text-20px">
              <i i-solar-menu-dots-bold-duotone></i>
            </div>
          </n-dropdown>
        </div>

        <n-divider />

        <!-- 详细信息 -->
        <div class="text-14px flex flex-col gap-20px">
          <div class="flex items-center text-gray-600 justify-between">
            <div class="flex items-center gap-10px">
              <i i-solar-user-id-bold-duotone class="text-17px text-primary"></i>
              <span>账号</span>
            </div>

            {{ selectedFriend.username }}
          </div>
          <div class="flex items-center text-gray-600 justify-between">
            <div class="flex items-center gap-10px">
              <i i-solar-user-bold-duotone class="text-17px text-primary"></i>
              <span>性别</span>
            </div>

            {{ Number(selectedFriend.gender) === 1 ? '男' : '女' }}
          </div>
          <div class="flex items-center text-gray-600 justify-between">
            <div class="flex items-center gap-10px">
              <i i-solar-phone-bold-duotone class="text-17px text-primary"></i>
              <span>手机</span>
            </div>

            {{ selectedFriend.phone || '暂无联系方式' }}
          </div>
          <div class="flex items-center text-gray-600 justify-between">
            <div class="flex items-center gap-10px">
              <i i-solar-letter-bold-duotone class="text-17px text-primary"></i>
              <span>邮箱</span>
            </div>

            {{ selectedFriend.email || '暂无邮箱' }}
          </div>
          <div class="flex items-center text-gray-600 justify-between">
            <div class="flex items-center gap-10px">
              <i i-solar-point-on-map-bold-duotone class="text-17px text-primary"></i>
              <span>地址</span>
            </div>

            {{ selectedFriend.address || '暂无地址' }}
          </div>
          <div class="flex items-center text-gray-600 justify-between">
            <div class="flex items-center gap-10px">
              <i i-solar-pen-bold-duotone class="text-17px text-primary"></i>
              <span>备注</span>
            </div>

            {{ remark || '暂无备注' }}
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="mt-40px flex justify-center">
          <div
            class="flex items-center gap-8px bg-[var(--theme-color)] text-white px-15px py-8px rounded-full hover:opacity-90 transition-opacity cursor-pointer"
            @click="handleChat"
          >
            <i i-solar-chat-round-dots-bold-duotone class="text-17px"></i>
            <span>发送消息</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.box {
  padding: 20px;
}
</style>
