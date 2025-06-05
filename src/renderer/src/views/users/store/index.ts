import { ref, computed } from 'vue'
import { GetFriendList } from '@renderer/service/api/user'
import { useDraggableWidth } from '@renderer/hooks/useDraggableWidth'
import useUserStore from '@renderer/stores/modules/user'

const userStore = useUserStore()

const userInfo = userStore.userInfo

const {
  width: sidebarWidth,
  isDragging,
  handleMouseDown
} = useDraggableWidth({
  minWidth: 200,
  maxWidth: 300,
  initialWidth: 300
})
interface Friend {
  id: number
  username: string
  email: string
  phone: string
  state: number
  avatar: string | null
  address: string | null
  desc: string | null
  gender: string
  nickname: string
  online: string
  createdAt: string
  updatedAt: string
}

interface FriendListItem {
  id: number
  userId: number
  friendId: number
  desc: string
  status: string
  remark: string
  friendRemark: string | null
  createdAt: string
  updatedAt: string
  friend: Friend
  addBy: number
  blacklistBy: number
}

interface Notice {
  id: number
  userId: number
  friendId: number
  lastMsg: string | null
  msgStatus: string | null
  remark: string
  status: string
  createdAt: string
  updatedAt: string
  desc: string
  friend: Friend
  addBy: number
}

// 搜索关键词
const searchKey = ref('')

// 好友列表
const friendList = ref<FriendListItem[]>([])

// 黑名单列表
const blackList = ref<any[]>([])

// 通知列表
const noticeList = ref<Notice[]>([])

const remark = ref('')
// 获取好友列表数据
const getFriendList = async () => {
  try {
    const res = await GetFriendList({ type: 'all' })
    if (res.code === 200) {
      friendList.value = res.data.friend || []
      blackList.value = res.data.black || []
      noticeList.value = res.data.notice || []
    }
  } catch (error) {
    console.error('获取好友列表失败:', error)
  }
}

// 计算好友请求数量（状态为0-待确认或4-已拒绝的通知数量）
const friendRequestCount = computed(() => {
  // 确保 noticeList 有值时才进行过滤
  if (!noticeList.value || noticeList.value.length === 0) {
    return 0
  }
  return noticeList.value.filter((notice) => {
    return notice.status === '0' && notice.addBy !== userInfo.id
  }).length
})

// 群聊通知数量
const groupRequestCount = ref(0)

// 处理好友通知点击
const handleFriendRequest = () => {
  console.log('查看好友通知')
}

// 处理群聊通知点击
const handleGroupRequest = () => {
  console.log('查看群聊通知')
}

const selectFriend = ref<FriendListItem | null>()

export const useUsersStore = () => {
  return {
    searchKey,
    sidebarWidth,
    isDragging,
    handleMouseDown,
    selectFriend,
    remark,
    friendList,
    blackList,
    noticeList,
    getFriendList,
    friendRequestCount,
    groupRequestCount,
    handleFriendRequest,
    handleGroupRequest,
    userInfo
  }
}
