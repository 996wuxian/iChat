<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '../store'
import defaultAvatar from '@renderer/assets/imgs/default-avatar.png'
import { $msg } from '@renderer/config/interaction.config'
import useUserStore from '@renderer/stores/modules/user'
import { UpdateGroupList } from '@renderer/service/api/user'

const router = useRouter()
const { selectGroup } = useUsersStore()
const userStore = useUserStore()

// 当前用户信息
const currentUser = computed(() => userStore.userInfo)

// 当前选中的群聊
const selectedGroup = computed(() => selectGroup.value)

// 获取当前用户在群中的角色
const userRole = computed(() => {
  if (!selectedGroup.value?.members) return null
  const member = selectedGroup.value.members.find((m) => m.userId === currentUser.value.id)
  return member?.role
})

// 跳转到聊天
const handleChat = async () => {
  try {
    // 创建聊天关系（如果需要的话）
    const res = await UpdateGroupList({ groupId: selectedGroup.value?.group.id, status: '1' })
    router.push({
      path: '/home',
      query: {
        groupId: selectedGroup.value?.group.id
      }
    })
  } catch (error) {
    console.error('跳转到群聊失败:', error)
    $msg({
      type: 'error',
      msg: '跳转到群聊失败'
    })
  }
}

// 格式化时间
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString()
}

// 计算群聊创建时间
const createdTime = computed(() => {
  return formatDate(selectedGroup.value?.group?.createdAt)
})

// 计算是否为管理员
const isAdmin = computed(() => {
  return userRole.value === '0' || userRole.value === '1'
})
</script>

<template>
  <div class="flex-1 p-20px pt-60px">
    <template v-if="selectedGroup">
      <!-- 群聊信息卡片 -->
      <div class="box">
        <!-- 头部信息 -->
        <div class="flex items-start gap-20px mb-20px">
          <div class="relative">
            <img
              :src="selectedGroup?.group?.avatar || defaultAvatar"
              :alt="selectedGroup?.group?.name"
              class="w-70px h-70px rounded-full object-cover border-2 border-gray-100"
            />
          </div>
          <div class="flex-1">
            <h2 class="text-20px font-500 mb-10px">
              {{ selectedGroup?.group?.name }}
            </h2>
            <p class="text-14px text-gray-500">
              {{ selectedGroup?.group?.description || '暂无群描述' }}
            </p>
          </div>

          <div v-if="isAdmin" class="flex ml-auto mb-auto cursor-pointer text-20px">
            <i i-solar-menu-dots-bold-duotone></i>
          </div>
        </div>

        <n-divider />

        <!-- 详细信息 -->
        <div class="text-14px flex flex-col gap-5px">
          <div class="flex items-center text-gray-600 justify-between">
            <div class="flex items-center gap-10px">
              <i i-solar-users-group-two-rounded-bold-duotone class="text-17px text-primary"></i>
              <span>成员数：</span>
            </div>

            {{ selectedGroup?.group?.currentMemberCount }}/{{
              selectedGroup?.group?.maxMemberCount
            }}
          </div>
          <div class="flex items-center gap-10px text-gray-600 justify-between">
            <div class="flex items-center gap-10px">
              <i i-solar-calendar-bold-duotone class="text-17px text-primary"></i>
              <span>创建时间：</span>
            </div>
            {{ createdTime }}
          </div>
        </div>

        <n-divider />

        <!-- 群成员列表 -->
        <div class="mt-20px">
          <div class="flex items-center justify-between mb-15px">
            <h3 class="text-16px font-500">
              群成员 ({{ selectedGroup?.group?.currentMemberCount }})
            </h3>
            <div v-if="isAdmin" class="text-13px text-primary cursor-pointer">
              <i i-solar-user-plus-bold-duotone class="text-15px"></i>
              <span>邀请成员</span>
            </div>
          </div>

          <div class="flex">
            <div
              v-for="member in selectedGroup.members"
              :key="member.id"
              class="flex flex-col items-center py-5px hover:bg-gray-50 rounded-lg transition-colors cursor-pointer line-clamp-1 w-60px relative"
            >
              <img
                :src="member.avatar || defaultAvatar"
                :alt="member.nickname"
                class="w-30px h-30px rounded-full object-cover mb-1px"
              />
              <div class="text-13px text-center truncate w-full">
                <span v-if="member.role === '0'" class="text-10px">(群主)</span>
                <span v-if="member.role === '1'" class="text-10px">(管理)</span>
                {{ member.nickname }}
              </div>
            </div>
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
