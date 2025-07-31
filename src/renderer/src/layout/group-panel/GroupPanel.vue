<template>
  <div class="group-panel">
    <!-- 群聊信息区域 -->
    <div v-if="groupStore.groupInfo" class="group-info">
      <div class="group-header">
        <div class="group-avatar">
          <img
            :src="groupStore.groupInfo.avatar || defaultAvatar"
            :alt="groupStore.groupInfo.name"
          />
        </div>
        <div class="group-details">
          <span class="group-name">{{ groupStore.groupInfo.name }}</span>
          <p class="group-number">群号：{{ groupStore.groupInfo.groupNumber }}</p>
        </div>
      </div>

      <!-- 群公告 -->
      <div class="group-announcement" @click="showAnnouncementDialog = true">
        <span>群公告</span>
        <p v-if="latestAnnouncement">{{ latestAnnouncement.title }}</p>
        <p v-else class="no-announcement">暂无公告</p>
        <i i-solar-alt-arrow-right-line-duotone class="announcement-arrow"></i>
      </div>
    </div>

    <!-- 群成员区域 -->
    <div class="group-members">
      <div class="members-header">
        <span>群成员 ({{ groupStore.members.length }})</span>
      </div>

      <div class="members-grid">
        <!-- 成员列表 -->
        <div
          v-for="member in groupStore.members"
          :key="member.id"
          class="member-item"
          :class="{ selected: selectedMembers.includes(member.userId) }"
          @click="toggleMemberSelection(member.userId)"
        >
          <div class="member-avatar">
            <img :src="member.avatar || defaultAvatar" :alt="member.nickname" />
            <span v-if="member.role === '0'" class="role-badge">群主</span>
            <span v-else-if="member.role === '1'" class="role-badge admin">管理员</span>
          </div>
          <p class="member-name">{{ member.nickname }}</p>
        </div>

        <!-- 新增按钮 -->
        <div v-if="canManageMembers" class="member-item action-item" @click="addMember">
          <div class="action-avatar add-avatar">
            <svg-icon name="add"></svg-icon>
          </div>
          <p class="action-name">新增</p>
        </div>

        <!-- 移除按钮 -->
        <div
          v-if="canManageMembers && selectedMembers.length > 0"
          class="member-item action-item"
          @click="removeMember"
        >
          <div class="action-avatar remove-avatar">
            <svg-icon name="jian" class="icon-remove"></svg-icon>
          </div>
          <p class="action-name">移除</p>
        </div>
      </div>
    </div>

    <div v-if="isGroupOwner" class="group-actions">
      <button class="action-btn danger-btn" @click="showDisbandConfirm = true">解散群聊</button>
    </div>

    <!-- 加载状态 -->
    <div v-if="groupStore.loading" class="loading">
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-if="groupStore.error" class="error">
      <p>{{ groupStore.error }}</p>
      <button @click="retry">重试</button>
    </div>

    <!-- 解散群聊确认弹窗 -->
    <div v-if="showDisbandConfirm" class="modal-overlay" @click="showDisbandConfirm = false">
      <div class="modal-content" @click.stop>
        <h3>确认解散群聊</h3>
        <p>解散后群聊将被永久删除，所有成员将被移除，此操作不可恢复。</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showDisbandConfirm = false">取消</button>
          <button class="btn-confirm" @click="disbandGroup">确认解散</button>
        </div>
      </div>
    </div>

    <!-- 添加成员弹窗 -->
    <n-modal
      v-model:show="showAddMemberDialog"
      :show-icon="false"
      style="width: 500px"
      role="dialog"
      :bordered="false"
      size="small"
      class="custom-modal"
    >
      <div class="theme-bg rd-10px color-[var(--text-primary)] p-10px">
        <div class="modal-header">
          <span class="modal-title">添加群成员</span>
          <i
            i-solar-close-circle-outline
            class="close-icon"
            @click="showAddMemberDialog = false"
          ></i>
        </div>
        <div class="add-member-dialog">
          <!-- 搜索框 -->
          <div class="flex items-center gap-10px mt-15px mb-15px">
            <input
              v-model="memberSearchQuery"
              class="border-none outline-none flex-1 h-35px pl-10px rd-6px c-[var(--text-primary)] bg-[rgba(153,153,153,.2)]"
              placeholder="搜索好友"
              @input="handleMemberSearch"
            />
            <div
              class="flex h-35px flex-center px-10px bg-[var(--theme-color)] rd-8px cursor-pointer hover:bg-[#8ea0fa] transition-all c-#fff"
              @click="handleMemberSearch"
            >
              <i i-solar-magnifer-linear></i>
            </div>
          </div>

          <!-- 最近聊天 -->
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
                      <n-checkbox v-model:checked="selectedNewMembers[user.id]" />
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

          <!-- 好友列表 -->
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
                      <n-checkbox v-model:checked="selectedNewMembers[user.id]" />
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
          <div v-if="selectedNewMembersCount > 0" class="selected-users mb-15px">
            <div class="text-sm mb-5px">已选择 {{ selectedNewMembersCount }} 位好友</div>
            <div class="flex flex-wrap gap-5px">
              <div
                v-for="user in selectedNewMembersList"
                :key="user.id"
                class="selected-user-tag flex items-center gap-5px bg-[rgba(153,153,153,.2)] rd-15px py-2px px-8px text-sm"
              >
                <span class="truncate max-w-100px">{{ user.nickname || user.username }}</span>
                <i
                  i-solar-close-circle-bold-duotone
                  class="text-14px cursor-pointer"
                  @click="selectedNewMembers[user.id] = false"
                ></i>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-end items-center gap-10px mt-20px">
            <div
              class="py-8px px-15px rd-8px cursor-pointer hover:bg-[rgba(153,153,153,.2)] transition-all"
              @click="showAddMemberDialog = false"
            >
              取消
            </div>
            <div
              class="py-8px px-15px rd-8px bg-[var(--theme-color)] cursor-pointer hover:bg-[#8ea0fa] transition-all c-#fff"
              :class="{ 'opacity-50 cursor-not-allowed': selectedNewMembersCount === 0 }"
              @click="handleConfirmAddMembers"
            >
              确认添加
            </div>
          </div>
        </div>
      </div>
    </n-modal>

    <!-- 群公告列表弹窗 -->
    <n-modal
      v-model:show="showAnnouncementDialog"
      :show-icon="false"
      style="width: 600px"
      role="dialog"
      :bordered="false"
      size="small"
      class="custom-modal"
    >
      <div class="theme-bg rd-10px color-[var(--text-primary)] p-20px">
        <div class="modal-header flex justify-between">
          <span class="modal-title">群公告</span>
          <i
            i-solar-close-circle-outline
            class="text-16px"
            @click="showAnnouncementDialog = false"
          ></i>
        </div>

        <div class="announcement-dialog">
          <!-- 公告列表 -->
          <div class="announcements-list">
            <div v-if="announcementsLoading" class="loading-state">
              <p>加载中...</p>
            </div>

            <div v-else-if="announcements.length === 0" class="empty-state">
              <p>暂无公告</p>
            </div>

            <div v-else>
              <div
                v-for="announcement in announcements"
                :key="announcement.id"
                class="announcement-item"
                @click="viewAnnouncementDetail(announcement)"
              >
                <div class="announcement-header">
                  <h4 class="announcement-title">{{ announcement.title }}</h4>
                  <span class="announcement-time">{{ formatTime(announcement.createdAt) }}</span>
                </div>
                <p class="announcement-content">{{ announcement.content }}</p>
                <div class="announcement-footer">
                  <span class="announcement-author">发布者：{{ announcement.publisherName }}</span>
                  <div v-if="canManageAnnouncements" class="announcement-actions">
                    <button class="edit-btn" @click.stop="editAnnouncement(announcement)">
                      编辑
                    </button>
                    <button class="delete-btn" @click.stop="deleteAnnouncement(announcement.id)">
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="totalPages > 1" class="pagination">
            <button :disabled="currentPage === 1" @click="loadAnnouncements(currentPage - 1)">
              上一页
            </button>
            <span>{{ currentPage }} / {{ totalPages }}</span>
            <button
              :disabled="currentPage === totalPages"
              @click="loadAnnouncements(currentPage + 1)"
            >
              下一页
            </button>
          </div>
          <!-- 发布公告按钮 -->
          <div v-if="canManageAnnouncements" class="publish-section flex-center">
            <button class="publish-btn" @click="showPublishDialog = true">
              <i i-solar-add-circle-outline class="mr-5px"></i>
              发布公告
            </button>
          </div>
        </div>
      </div>
    </n-modal>

    <!-- 发布/编辑公告弹窗 -->
    <n-modal
      v-model:show="showPublishDialog"
      :show-icon="false"
      style="width: 500px"
      role="dialog"
      :bordered="false"
      size="small"
      class="custom-modal"
    >
      <div class="theme-bg rd-10px color-[var(--text-primary)] p-20px">
        <div class="modal-header flex justify-between">
          <span class="modal-title">{{ editingAnnouncement ? '编辑公告' : '发布公告' }}</span>
          <i
            i-solar-close-circle-outline
            class="close-icon text-16px"
            @click="closePublishDialog"
          ></i>
        </div>

        <div class="publish-dialog">
          <div class="form-group">
            <label>公告标题</label>
            <input
              v-model="announcementForm.title"
              class="form-input"
              placeholder="请输入公告标题"
              maxlength="100"
            />
          </div>

          <div class="form-group">
            <label>公告内容</label>
            <textarea
              v-model="announcementForm.content"
              class="form-textarea"
              placeholder="请输入公告内容"
              rows="6"
              maxlength="1000"
            ></textarea>
          </div>

          <div class="form-actions">
            <button class="btn-cancel" @click="closePublishDialog">取消</button>
            <button
              class="btn-confirm"
              :disabled="!announcementForm.title.trim() || !announcementForm.content.trim()"
              @click="submitAnnouncement"
            >
              {{ editingAnnouncement ? '保存' : '发布' }}
            </button>
          </div>
        </div>
      </div>
    </n-modal>

    <!-- 公告详情弹窗 -->
    <n-modal
      v-model:show="showDetailDialog"
      :show-icon="false"
      style="width: 500px"
      role="dialog"
      :bordered="false"
      size="small"
      class="custom-modal"
    >
      <div class="theme-bg rd-10px color-[var(--text-primary)] p-20px">
        <div class="modal-header flex justify-between">
          <span class="modal-title">公告详情</span>
          <i
            i-solar-close-circle-outline
            class="close-icon text-16px"
            @click="showDetailDialog = false"
          ></i>
        </div>

        <div v-if="selectedAnnouncement" class="detail-dialog">
          <h3 class="detail-title">{{ selectedAnnouncement.title }}</h3>
          <div class="detail-meta">
            <span
              >发布者：{{
                selectedAnnouncement.author?.nickname || selectedAnnouncement.author?.username
              }}</span
            >
            <span>发布时间：{{ formatTime(selectedAnnouncement.createdAt) }}</span>
          </div>
          <div class="detail-content">
            {{ selectedAnnouncement.content }}
          </div>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGroupStore } from '@renderer/stores/modules/group'
import defaultAvatar from '@renderer/assets/imgs/default-avatar.png'
import { $msg } from '@renderer/config/interaction.config'
import {
  DeleteGroup,
  GetChatList,
  GetFriendList,
  RemoveGroupMember,
  AddGroupMember,
  PublishGroupAnnouncement,
  GetGroupAnnouncements,
  DeleteGroupAnnouncement,
  UpdateGroupAnnouncement
} from '@renderer/service/api/user'
import { useDialog } from 'naive-ui'
const dialog = useDialog()

const groupStore = useGroupStore()

// 选中的成员列表（用于批量操作）
const selectedMembers = ref<number[]>([])

// 解散群聊确认弹窗
const showDisbandConfirm = ref(false)

// 是否为群主
const isGroupOwner = computed(() => {
  return groupStore.currentUserRole === '0'
})

// 是否可以管理成员（群主和管理员）
const canManageMembers = computed(() => {
  return groupStore.currentUserRole === '0' || groupStore.currentUserRole === '1'
})

// 群公告相关状态
const showAnnouncementDialog = ref(false)
const showPublishDialog = ref(false)
const showDetailDialog = ref(false)
const announcements = ref<any[]>([])
const announcementsLoading = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const editingAnnouncement = ref<any>(null)
const selectedAnnouncement = ref<any>(null)
const announcementForm = ref({
  title: '',
  content: ''
})

// 是否可以管理公告（群主和管理员）
const canManageAnnouncements = computed(() => {
  return groupStore.currentUserRole === '0' || groupStore.currentUserRole === '1'
})

// 最新公告
const latestAnnouncement = computed(() => {
  return announcements.value[0] || null
})

// 加载群公告列表
const loadAnnouncements = async (page: number = 1) => {
  if (!groupStore.currentGroupId) return

  announcementsLoading.value = true
  try {
    const res = await GetGroupAnnouncements(parseInt(groupStore.currentGroupId), page, 10)
    if (res.code === 200) {
      announcements.value = res.data.announcements || []
      currentPage.value = res.data.currentPage || 1
      totalPages.value = res.data.totalPages || 1
    }
  } catch (error) {
    console.error('获取群公告失败:', error)
    $msg({
      type: 'error',
      msg: '获取群公告失败'
    })
  } finally {
    announcementsLoading.value = false
  }
}

// 查看公告详情
const viewAnnouncementDetail = (announcement: any) => {
  selectedAnnouncement.value = announcement
  showDetailDialog.value = true
}

// 编辑公告
const editAnnouncement = (announcement: any) => {
  editingAnnouncement.value = announcement
  announcementForm.value = {
    title: announcement.title,
    content: announcement.content
  }
  showPublishDialog.value = true
}

// 删除公告
const deleteAnnouncement = async (announcementId: number) => {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条公告吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const res = await DeleteGroupAnnouncement(announcementId)
        if (res.code === 200) {
          $msg({
            type: 'success',
            msg: '公告删除成功'
          })
          // 重新获取公告列表
          loadAnnouncements(currentPage.value)
        } else {
          $msg({
            type: 'error',
            msg: res.msg || '删除失败'
          })
        }
      } catch (error) {
        console.error('删除公告失败:', error)
        $msg({
          type: 'error',
          msg: '删除失败，请重试'
        })
      }
    }
  })
}

// 提交公告（发布或编辑）
const submitAnnouncement = async () => {
  if (!announcementForm.value.title.trim() || !announcementForm.value.content.trim()) {
    $msg({
      type: 'warning',
      msg: '请填写完整的公告信息'
    })
    return
  }

  try {
    let res
    if (editingAnnouncement.value) {
      // 编辑公告
      res = await UpdateGroupAnnouncement(
        editingAnnouncement.value.id,
        announcementForm.value.title,
        announcementForm.value.content
      )
    } else {
      // 发布新公告
      res = await PublishGroupAnnouncement(
        parseInt(groupStore.currentGroupId),
        announcementForm.value.title,
        announcementForm.value.content
      )
    }

    if (res.code === 200) {
      $msg({
        type: 'success',
        msg: editingAnnouncement.value ? '公告编辑成功' : '公告发布成功'
      })
      closePublishDialog()
      loadAnnouncements(1) // 重新加载第一页
    } else {
      $msg({
        type: 'error',
        msg: res.msg || (editingAnnouncement.value ? '编辑公告失败' : '发布公告失败')
      })
    }
  } catch (error) {
    console.error('提交公告失败:', error)
    $msg({
      type: 'error',
      msg: editingAnnouncement.value ? '编辑公告失败' : '发布公告失败'
    })
  }
}

// 关闭发布弹窗
const closePublishDialog = () => {
  showPublishDialog.value = false
  editingAnnouncement.value = null
  announcementForm.value = {
    title: '',
    content: ''
  }
}

// 格式化时间
const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

// 切换成员选择状态
const toggleMemberSelection = (userId: number) => {
  if (!canManageMembers.value) return

  const index = selectedMembers.value.indexOf(userId)
  if (index > -1) {
    selectedMembers.value.splice(index, 1)
  } else {
    selectedMembers.value.push(userId)
  }
}

// 添加成员弹窗相关
const showAddMemberDialog = ref(false)
const memberSearchQuery = ref('')
const showRecentChats = ref(true)
const showFriendList = ref(true)
const selectedNewMembers = ref<Record<number, boolean>>({})
const recentChats = ref<any[]>([])
const friendList = ref<any[]>([])

// 计算已选择的新成员数量
const selectedNewMembersCount = computed(() => {
  return Object.values(selectedNewMembers.value).filter(Boolean).length
})

// 计算已选择的新成员列表
const selectedNewMembersList = computed(() => {
  const allUsers = [...recentChats.value, ...friendList.value]
  const uniqueUsers = allUsers.reduce((acc: any[], user) => {
    if (!acc.some((u) => u.id === user.id) && selectedNewMembers.value[user.id]) {
      acc.push(user)
    }
    return acc
  }, [])
  return uniqueUsers
})

// 过滤后的最近聊天列表（排除已在群内的成员）
const filteredRecentChats = computed(() => {
  let filtered = recentChats.value.filter((user) => {
    // 排除已在群内的成员
    return !groupStore.members.some((member) => member.userId === user.id)
  })

  if (memberSearchQuery.value) {
    filtered = filtered.filter(
      (user) =>
        (user.nickname &&
          user.nickname.toLowerCase().includes(memberSearchQuery.value.toLowerCase())) ||
        (user.username &&
          user.username.toLowerCase().includes(memberSearchQuery.value.toLowerCase()))
    )
  }
  return filtered
})

// 过滤后的好友列表（排除已在群内的成员）
const filteredFriendList = computed(() => {
  let filtered = friendList.value.filter((user) => {
    // 排除已在群内的成员
    return !groupStore.members.some((member) => member.userId === user.id)
  })

  if (memberSearchQuery.value) {
    filtered = filtered.filter(
      (user) =>
        (user.nickname &&
          user.nickname.toLowerCase().includes(memberSearchQuery.value.toLowerCase())) ||
        (user.username &&
          user.username.toLowerCase().includes(memberSearchQuery.value.toLowerCase()))
    )
  }
  return filtered
})

// 添加成员
const addMember = async () => {
  showAddMemberDialog.value = true

  // 获取最近聊天列表
  try {
    const res = await GetChatList()
    if (res.code === 200) {
      const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}')
      const currentUserId = currentUser?.userInfo?.id

      recentChats.value = res.data
        .filter((item: any) => {
          // 根据聊天类型过滤
          if (item.chatType === 'friend') {
            return item.friend && item.friend.id !== currentUserId
          } else if (item.chatType === 'group') {
            // 群聊不需要过滤，因为我们要添加成员到当前群聊
            return false // 或者可以选择显示其他群聊
          }
          return false
        })
        .map((item: any) => {
          // 根据聊天类型映射数据
          if (item.chatType === 'friend') {
            return {
              id: item.friend.id,
              username: item.friend.username,
              nickname: item.friend.nickname,
              avatar: item.friend.avatar
            }
          }
          // 如果需要显示群聊，可以在这里处理
          return null
        })
        .filter(Boolean) // 过滤掉 null 值
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

// 搜索成员
const handleMemberSearch = () => {
  // 搜索逻辑已通过计算属性实现
}

// 确认添加成员
const handleConfirmAddMembers = async () => {
  if (selectedNewMembersCount.value === 0) {
    $msg({
      type: 'warning',
      msg: '请至少选择一位好友'
    })
    return
  }

  // 获取选中的用户ID列表
  const selectedUserIds = Object.entries(selectedNewMembers.value)
    .filter(([_, selected]) => selected)
    .map(([id]) => parseInt(id))

  try {
    const groupId = parseInt(groupStore.currentGroupId)
    const res = await AddGroupMember(groupId, selectedUserIds)

    if (res.code === 200) {
      $msg({
        type: 'success',
        msg: '成员添加成功'
      })

      // 重新获取群聊详情以更新成员列表
      await groupStore.fetchGroupDetail(groupId)

      showAddMemberDialog.value = false
      // 重置表单
      selectedNewMembers.value = {}
      memberSearchQuery.value = ''
    } else {
      $msg({
        type: 'error',
        msg: res.msg || '添加成员失败'
      })
    }
  } catch (error) {
    console.error('添加成员失败:', error)
    $msg({
      type: 'error',
      msg: '添加成员失败，请稍后重试'
    })
  }
}

// 监听公告弹窗打开，加载公告列表
watch(showAnnouncementDialog, (newVal) => {
  if (newVal) {
    loadAnnouncements(1)
  }
})

// 监听添加成员弹窗关闭，清空输入框和选择
watch(showAddMemberDialog, (newVal) => {
  if (!newVal) {
    memberSearchQuery.value = ''
    selectedNewMembers.value = {}
  }
})

// 移除成员
const removeMember = async () => {
  if (selectedMembers.value.length === 0) {
    $msg({
      type: 'warning',
      msg: '请选择要移除的成员'
    })
    return
  }

  try {
    const groupId = parseInt(groupStore.currentGroupId)

    // 批量移除成员
    for (const memberId of selectedMembers.value) {
      await RemoveGroupMember(groupId, memberId)
      // 从本地状态中移除成员
      groupStore.removeMember(memberId)
    }

    selectedMembers.value = []
    $msg({
      type: 'success',
      msg: '成员移除成功'
    })
  } catch (error) {
    console.error('移除成员失败:', error)
    $msg({
      type: 'error',
      msg: '移除成员失败'
    })
  }
}

// 解散群聊
const disbandGroup = async () => {
  try {
    const groupId = parseInt(groupStore.currentGroupId)
    const { code } = await DeleteGroup(groupId)

    if (code === 200) {
      $msg({
        type: 'success',
        msg: '群聊解散成功'
      })

      // 清空群聊数据
      groupStore.clearGroupData()

      // 关闭群聊面板
      window.api.collapseGroupPanel()

      showDisbandConfirm.value = false
    } else {
      $msg({
        type: 'error',
        msg: '解散群聊失败'
      })
    }
  } catch (error) {
    console.error('解散群聊失败:', error)
    $msg({
      type: 'error',
      msg: '解散群聊失败'
    })
  }
}

// 重试加载
const retry = () => {
  if (groupStore.currentGroupId) {
    groupStore.fetchGroupDetail(parseInt(groupStore.currentGroupId))
  }
}

// 组件挂载时加载公告
onMounted(() => {
  if (groupStore.currentGroupId) {
    loadAnnouncements(1)
  }
})
</script>

<style scoped>
.group-panel {
  width: 300px;
  height: 100%;
  background: #f9fafd;
  border-left: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 10px;
  padding-top: 25px;
}

.group-info {
  border-bottom: 1px solid #e9ecef;
}

.group-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 5px;
}

.group-avatar img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
}

.group-details {
  flex: 1;
}

.group-name {
  font-size: 16px;
  margin: 0 0 4px 0;
  color: #212529;
}

.group-number {
  font-size: 12px;
  color: #6c757d;
  margin: 0;
}

.group-announcement span {
  font-size: 14px;
  margin: 0 0 8px 0;
  color: #666;
}

.group-announcement p {
  font-size: 12px;
  margin: 0;
  color: #666;
  line-height: 1.4;
}

.group-members {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border: 1px solid #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  padding: 8px;
  margin-top: 10px;
  margin-bottom: 10px;
}

.members-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.members-header span {
  font-size: 14px;
  margin: 0;
  color: #495057;
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  padding: 8px;
  max-height: calc(5 * 70px + 4 * 8px);
}

.member-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  min-height: 70px;
}

.member-item:hover {
  background: #f8f9fa;
}

.member-item.selected {
  background: #e3f2fd;
}

.member-avatar {
  position: relative;
}

.member-avatar img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.role-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: #ffc107;
  color: white;
  font-size: 8px;
  padding: 1px 3px;
  border-radius: 2px;
  font-weight: 500;
}

.role-badge.admin {
  background: #17a2b8;
}

.member-name {
  font-size: 11px;
  margin: 0;
  color: #212529;
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-item {
  border: 1px dashed #dee2e6;
}

.action-item:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.action-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.add-avatar {
  background: #e8f5e8;
  color: #28a745;
}

.remove-avatar {
  background: #fdeaea;
  color: #dc3545;
}

.action-name {
  font-size: 11px;
  margin: 0;
  text-align: center;
  color: #6c757d;
}

.loading,
.error {
  padding: 20px;
  text-align: center;
  color: #6c757d;
}

.error button {
  margin-top: 8px;
  padding: 6px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-content h3 {
  margin: 0 0 16px 0;
  color: #dc3545;
  font-size: 18px;
}

.modal-content p {
  margin: 0 0 24px 0;
  color: #666;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f8f9fa;
  color: #6c757d;
  border: 1px solid #dee2e6;
}

.btn-cancel:hover {
  background: #e9ecef;
}

.btn-confirm {
  background: #dc3545;
  color: white;
}

.btn-confirm:hover {
  background: #c82333;
}

.group-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f8f9fa;
}

.danger-btn {
  color: #dc3545;
  border-color: #dc3545;
}

.danger-btn:hover {
  background: #f8d7da;
}

.group-announcement {
  background: #fff;
  border: 1px solid #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s;
}

.group-announcement:hover {
  background: #f8f9fa;
}

.group-announcement .announcement-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
  font-size: 14px;
}

.no-announcement {
  color: #999 !important;
}

/* 公告弹窗样式 */
.announcement-dialog {
  max-height: 500px;
  overflow-y: auto;
}

.publish-section {
  text-align: right;
}

.publish-btn {
  background: var(--theme-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background-color 0.2s;
}

.publish-btn:hover {
  background: #8ea0fa;
}

.announcements-list {
  max-height: 400px;
  overflow-y: auto;
  margin-top: 10px;
}

.announcement-item {
  background: #e9ecef;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.announcement-item:hover {
  background: #dde6f0;
}

.announcement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.announcement-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #212529;
}

.announcement-time {
  font-size: 12px;
  color: #6c757d;
}

.announcement-content {
  font-size: 14px;
  color: #495057;
  margin: 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.announcement-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.announcement-author {
  font-size: 12px;
  color: #6c757d;
}

.announcement-actions {
  display: flex;
  gap: 8px;
}

.edit-btn,
.delete-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.edit-btn {
  background: #17a2b8;
  color: white;
}

.edit-btn:hover {
  background: #138496;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.delete-btn:hover {
  background: #c82333;
}

/* 分页样式 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
}

.pagination button {
  padding: 6px 12px;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.pagination button:hover:not(:disabled) {
  background: #f8f9fa;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 发布弹窗样式 */
.publish-dialog {
  padding: 10px 0;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #495057;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--theme-color);
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-cancel {
  background: #6c757d;
  color: white;
}

.btn-cancel:hover {
  background: #5a6268;
}

.btn-confirm {
  background: var(--theme-color);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: #8ea0fa;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 详情弹窗样式 */
.detail-dialog {
  padding: 10px 0;
}

.detail-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 15px 0;
  color: #212529;
}

.detail-meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 15px;
  font-size: 12px;
  color: #6c757d;
}

.detail-content {
  font-size: 14px;
  line-height: 1.6;
  color: #495057;
  white-space: pre-wrap;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6c757d;
}
</style>
