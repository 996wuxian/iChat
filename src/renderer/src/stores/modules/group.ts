import { defineStore } from 'pinia'
import { reactive, toRefs, computed } from 'vue'
import { GetGroupDetail } from '@renderer/service/api/user'

// 群成员接口
interface GroupMember {
  id: number
  userId: number
  nickname: string
  avatar: string
  role: string
  joinTime: string
}

// 群聊信息接口
interface GroupInfo {
  id: number
  name: string
  groupNumber: string
  avatar: string | null
  description: string | null
  creatorId: number
  currentMemberCount: number
  maxMemberCount: number
  is_dismiss: string
  is_disturb: string
  is_top: string
  lastMsg: string
  lastMsgTime: string
  role: string
  createdAt: string
  updatedAt: string
}

// 群聊详情接口
interface GroupDetail {
  group: GroupInfo
  members: GroupMember[]
}

export const useGroupStore = defineStore('group', () => {
  const state = reactive({
    currentGroupId: '',
    groupDetail: null as GroupDetail | null,
    loading: false,
    error: null as string | null
  })

  // 计算属性
  const groupInfo = computed(() => state.groupDetail?.group || null)
  const members = computed(() => state.groupDetail?.members || [])
  const announcement = computed(() => state.groupDetail?.group?.description || '暂无群公告')
  const currentUserRole = computed(() => state.groupDetail?.group?.role || '2')

  // 获取群聊详情
  const fetchGroupDetail = async (groupId: number) => {
    state.loading = true
    state.error = null

    try {
      const { code, data } = await GetGroupDetail(groupId)
      if (code === 200) {
        state.groupDetail = data
        state.currentGroupId = groupId.toString()
      } else {
        state.error = '获取群聊详情失败'
      }
    } catch (error) {
      state.error = '网络错误，请重试'
      console.error('获取群聊详情失败:', error)
    } finally {
      state.loading = false
    }
  }

  // 清空群聊数据
  const clearGroupData = () => {
    state.groupDetail = null
    state.currentGroupId = ''
    state.error = null
  }

  // 添加群成员
  const addMember = (member: GroupMember) => {
    if (state.groupDetail) {
      state.groupDetail.members.push(member)
      state.groupDetail.group.currentMemberCount++
    }
  }

  // 移除群成员
  const removeMember = (userId: number) => {
    if (state.groupDetail) {
      const index = state.groupDetail.members.findIndex((m) => m.userId === userId)
      if (index > -1) {
        state.groupDetail.members.splice(index, 1)
        state.groupDetail.group.currentMemberCount--
      }
    }
  }

  return {
    ...toRefs(state),
    groupInfo,
    members,
    announcement,
    currentUserRole,
    fetchGroupDetail,
    clearGroupData,
    addMember,
    removeMember
  }
})
