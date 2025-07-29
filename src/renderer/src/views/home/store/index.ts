import { ref } from 'vue'
import { useDraggableWidth } from '@renderer/hooks/useDraggableWidth'
import { useImStore } from '@renderer/stores/modules/im'
import useUserStore from '@renderer/stores/modules/user'
import { Local } from '@renderer/utils/storage'
const imStore = useImStore()
const userStore = useUserStore()

// 好友信息接口
export interface Message {
  id: number
  senderId: number
  receiverId: number
  content: string
  type: string
  cardContent: any | null
  createdAt: string
  updatedAt: string
  groupId: number | null
  isGroup: boolean
  status: string
  originalMessage: string
  fileStatus: string
}

// 聊天列表项接口
interface ChatItem {
  id: number
  listId: number
  avatar?: string
  username: string
  nickname?: string
  lastMsg: string
  lastMsgTime: string
  unReadCount: number
  online: string
  is_top: string
  is_disturb: string
  chatType: string
}

const { width: sidebarWidth, handleMouseDown } = useDraggableWidth({
  minWidth: 200,
  maxWidth: 250,
  initialWidth: 250
})

const currentMessage = ref<(Message & ChatItem) | null>(null)

const showDropdown = ref(false)
const dropdownX = ref(0)
const dropdownY = ref(0)

// 获取当前用户ID
const currentUserId = computed(() => {
  const userInfo = Local.get('userInfo')
  return userInfo?.userInfo?.id
})

const messageInputRef = ref<HTMLDivElement | null>(null)

const messageContent = ref('')

// 判断是否为当前用户发送的消息
const isCurrentUser = (msg: Message) => msg.senderId === currentUserId.value

// 搜索关键词
const searchKey = ref('')

const isRecording = ref(false)
const recordVisible = ref(false)

const showRecord = () => {
  recordVisible.value = !recordVisible.value
}

const closeAddMenu = () => {
  showAddMenu.value = false
}

const userList = computed(() => imStore.userList)

// 是否显示添加菜单
const showAddMenu = ref(false)

// 选中的聊天
const selectedChat = ref<ChatItem | null>()

const messages = ref<Message[]>()

const handleSelectChat = async (user: any) => {
  selectedChat.value = user
  console.log('🚀 ~ handleSelectChat ~ selectedChat.value:', selectedChat.value)
  imStore.receiveId = user.id
  imStore.chatWithUserName = user.username
  imStore.chatType = user.chatType
  recordVisible.value = false

  // 清空当前消息列表
  messages.value = []

  // 获取消息历史记录
  const userInfo = userStore.userInfo
  if (userInfo?.id) {
    imStore.msgCurrentPage = 1
    imStore.msgHistoryEnd = false
    const resolve = await imStore.getMessageHistory(userInfo.id, user.id, user.chatType)
    if (!resolve) return

    // 等待一下确保消息列表已经准备好
    await nextTick()

    // 检查最后一条消息的状态
    if (userList.value[user.username]?.msgList) {
      // 创建一个本地副本，避免引用问题
      messages.value = [...userList.value[user.username].msgList]

      // 根据聊天类型处理已读逻辑
      if (user.chatType === 'group') {
        window.api.expandGroupPanel()

        // 群聊：检查是否有未读消息，如果有则标记群聊为已读
        const hasUnreadMessages = userList.value[user.username].list.unReadCount > 0
        console.log('🚀 ~ handleSelectChat ~ hasUnreadMessages:', hasUnreadMessages)
        if (hasUnreadMessages) {
          imStore.groupAllMsgRead(user.id)
        }
      } else {
        // 私聊：原有逻辑
        const unReadCountMessages = messages.value.filter(
          (msg) => msg.status === '0' && msg.senderId === user.id
        )

        if (unReadCountMessages.length > 0) {
          imStore.allMsgRead(user.id)
        }
      }
    } else {
      console.error('无法获取消息列表:', user.username)
    }
  }
}

watch(
  () => selectedChat.value?.username,
  (username) => {
    if (username && userList.value[username]?.msgList) {
      // 创建一个本地副本，避免引用问题
      messages.value = [...userList.value[username].msgList]
    }
  },
  { immediate: true }
)

// 同时监听消息列表的变化
watch(
  () => {
    if (!selectedChat.value?.username) return null
    return userList.value[selectedChat.value.username]?.msgList
  },
  (newMsgList) => {
    if (newMsgList && newMsgList.length > 0) {
      // 创建一个本地副本，避免引用问题
      messages.value = [...newMsgList]
    }
  },
  { deep: true }
)

const inputHeight = ref(150)
const isChatDragging = ref(false)
let startY = 0
let startHeight = 0

const handleChatMouseDown = (e: MouseEvent) => {
  e.stopPropagation()
  isChatDragging.value = true
  startY = e.clientY
  startHeight = inputHeight.value

  const handleDrag = (e: MouseEvent) => {
    if (!isChatDragging.value) return
    const deltaY = e.clientY - startY
    const newHeight = startHeight - deltaY
    if (newHeight >= 150 && newHeight <= 300) {
      inputHeight.value = newHeight
    }
  }

  const handleDragEnd = () => {
    isChatDragging.value = false
    document.removeEventListener('mousemove', handleDrag)
    document.removeEventListener('mouseup', handleDragEnd)
    document.body.style.cursor = 'default'
    document.body.style.userSelect = 'auto'
  }

  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', handleDragEnd)
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
}

const currentQuote = ref<{
  senderName: string
  content: string
  type: string
  messageId: number
  cardContent: any
} | null>(null)

// 发送消息
const handleSendMessage = async () => {
  console.log(selectedChat.value, 'selectedChat.value')
  if (!messageContent.value.trim() || !selectedChat.value?.id) return

  if (currentQuote.value) {
    await imStore.sendCardMsg(selectedChat.value.id, messageContent.value, currentQuote.value)
    currentQuote.value = null
    messageContent.value = ''
    return
  }

  const data = await imStore.sendMsg(
    selectedChat.value.id,
    messageContent.value,
    selectedChat.value.chatType
  )

  if (data) {
    messageContent.value = ''
  }
}

// 在script setup中添加
const playingAudio = ref<number | null>(null)
const audioElement = ref<HTMLAudioElement | null>(null)

// 格式化时长显示
const formatDuration = (seconds: number) => {
  return `${Math.floor(seconds)}秒`
}

// 判断是否正在播放
const isPlaying = (messageId: number) => playingAudio.value === messageId

// 控制音频播放
const toggleAudioPlay = (msg: Message) => {
  if (!msg.cardContent?.url) return

  if (playingAudio.value === msg.id) {
    // 停止播放
    audioElement.value?.pause()
    audioElement.value = null
    playingAudio.value = null
  } else {
    // 停止当前播放的音频
    if (audioElement.value) {
      audioElement.value.pause()
    }

    // 开始播放新的音频
    const audio = new Audio(msg.cardContent.url)
    audio.onended = () => {
      playingAudio.value = null
      audioElement.value = null
    }
    audio.play()
    audioElement.value = audio
    playingAudio.value = msg.id
  }
}

// 处理右键菜单显示
const handleContextMenu = (e: MouseEvent, msg: any, type: string) => {
  e.preventDefault()
  showDropdown.value = true
  dropdownX.value = e.clientX
  dropdownY.value = e.clientY

  if (type === 'list') {
    currentMessage.value = { ...msg, type: 'list' }
  } else {
    currentMessage.value = msg
  }
}

export const useHomeStore = () => {
  return {
    currentMessage,

    showDropdown,
    dropdownX,
    dropdownY,

    isCurrentUser,
    currentUserId,

    messageInputRef,

    userStore,
    imStore,

    isRecording,
    recordVisible,
    showRecord,

    handleContextMenu,

    userList,
    searchKey,
    handleSelectChat,
    sidebarWidth,
    handleMouseDown,
    selectedChat,
    closeAddMenu,
    handleChatMouseDown,
    inputHeight,
    messageContent,
    messages,
    handleSendMessage,
    currentQuote,
    formatDuration,
    isPlaying,
    toggleAudioPlay
  }
}
