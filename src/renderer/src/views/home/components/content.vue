<template>
  <div v-if="selectedChat" class="chat-main">
    <!-- 聊天头部 -->
    <div class="chat-header">
      <div class="chat-title">
        {{ selectedChat.nickname || selectedChat.username }}
        <span v-if="imStore.chatType === 'group' && groupStore?.groupInfo.currentMemberCount"
          >({{ groupStore.groupInfo.currentMemberCount }})</span
        >
        <span v-if="isCurrentChatTyping" class="text-11px ml-10px c-gray typing-dots">
          正在输入中
          <span class="typing-animation"></span>
        </span>
      </div>
      <div class="flex ml-auto mt-auto cursor-pointer mb-5px text-20px">
        <i i-solar-menu-dots-bold-duotone></i>
      </div>
    </div>

    <!-- 聊天消息区域 -->
    <div class="chat-messages pt-10px">
      <n-scrollbar ref="scrollbarRef" style="height: 100%; padding: 0 20px" @scroll="handleScroll">
        <div v-if="imStore.msgHistoryEnd" class="flex-center c-gray">已加载全部消息</div>
        <div v-if="isLoading" class="flex-center">
          <div class="superballs">
            <div class="superballs__dot"></div>
            <div class="superballs__dot"></div>
          </div>
        </div>
        <div
          v-for="msg in messages"
          :key="msg.id"
          :data-message-id="msg.id"
          class="message-item"
          :class="{ 'message-right': isCurrentUser(msg) }"
        >
          <template v-if="msg.type === 'recall'">
            <div class="recall-message">
              <span class="recall-text">{{ msg.content }}</span>
              <span
                v-if="isCurrentUser(msg) && msg.originalMessage"
                class="redit-text cursor-pointer text-[var(--theme-color)]"
                @click="handleReEdit(msg)"
              >
                重新编辑
              </span>
            </div>
          </template>
          <template v-else-if="msg.type === 'tip'">
            <div class="tip-message">
              <span class="tip-text">{{ msg.content }}</span>
            </div>
          </template>
          <template v-else>
            <div v-if="!messageAvatarLoaded[msg.id]" class="message-avatar-skeleton"></div>
            <img
              :src="isCurrentUser(msg) ? currentUserAvatar : getMessageAvatar(msg)"
              :alt="isCurrentUser(msg) ? '我' : selectedChat.nickname"
              :style="{ display: messageAvatarLoaded[msg.id] ? 'block' : 'none' }"
              class="message-avatar"
              @load="messageAvatarLoaded[msg.id] = true"
              @error="handleAvatarError($event, msg)"
            />
            <div class="message-content" @contextmenu.prevent="handleContextMenu($event, msg, '')">
              <div
                v-if="msg.type === 'text'"
                class="message-text"
                :class="[
                  !isOnlyImages(msg.content)
                    ? isCurrentUser(msg)
                      ? 'bg-[var(--theme-color)] c-white ml-auto'
                      : 'bg-#E5E5E5'
                    : '',
                  isOnlyImages(msg.content) ? 'bg-transparent' : ''
                ]"
                @copy="handleMessageCopy($event)"
              >
                <div class="flex items-end">
                  <div
                    v-for="(part, index) in parseMessageContent(msg.content)"
                    :key="index"
                    class="flex"
                  >
                    <img
                      v-if="part.type === 'image'"
                      :src="part.src"
                      :class="[
                        part.dataType === 'emoji' ? part.class : 'w-300px rd-8px',
                        'cursor-pointer'
                      ]"
                      @click.stop="part.dataType !== 'emoji' && showImagePreview(part.src)"
                    />
                    <span v-else>{{ part.content }}</span>
                  </div>
                </div>
              </div>
              <div
                v-else-if="msg.type === 'card'"
                class="message-text"
                :class="
                  !['document', 'file', 'image', 'video'].includes(msg.cardContent?.type)
                    ? isCurrentUser(msg)
                      ? 'bg-[var(--theme-color)] c-white ml-auto'
                      : 'bg-#E5E5E5'
                    : ''
                "
              >
                <!-- 引用类型的卡片 -->
                <template v-if="msg.cardContent?.type === 'quote'">
                  <div v-html="msg.content"></div>
                  <div
                    class="quote-card flex c-gray mt-5px"
                    @click="scrollToMessage(msg.cardContent.messageId)"
                  >
                    <div class="quote-header text-11px">
                      <span>{{ msg.cardContent.senderName }}：</span>
                    </div>
                    <template v-if="msg.cardContent.cardContent?.type === 'audio'">
                      <div
                        class="quote-content text-11px cursor-pointer flex items-center gap-10px"
                      >
                        <div
                          class="bg"
                          :class="{ voicePlay: isPlaying(msg.cardContent.cardContent?.messageId) }"
                          style="filter: hue-rotate(180deg) brightness(0.7)"
                        ></div>
                        <div class="audio-info">
                          <span class="duration">{{
                            formatDuration(msg.cardContent.cardContent?.duration)
                          }}</span>
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <div
                        class="quote-content text-11px cursor-pointer flex"
                        v-html="msg.cardContent.content"
                      ></div>
                    </template>
                  </div>
                </template>

                <!-- 音频类型的卡片 -->
                <template v-else-if="msg.cardContent?.type === 'audio'">
                  <div
                    class="flex items-center gap-10px cursor-pointer"
                    @click="toggleAudioPlay(msg)"
                  >
                    <div
                      class="bg"
                      :class="{
                        voicePlay: isPlaying(msg.id)
                      }"
                      :style="
                        !isCurrentUser(msg) ? 'filter: hue-rotate(180deg) brightness(0.3)' : ''
                      "
                    ></div>
                    <div class="audio-info">
                      <span class="duration">{{ formatDuration(msg.cardContent.duration) }}</span>
                    </div>
                  </div>
                </template>

                <!-- 文档 -->
                <template v-else-if="msg.cardContent?.type === 'document'">
                  <div
                    class="flex gap-10px"
                    @click="handleOpenFile(msg, msg.cardContent?.url, msg.cardContent?.localPath)"
                  >
                    <div
                      class="flex justify-between w-170px h-70px bg-gradient-to-l from-[#F5F4F6] to-[#D8E9F1] rd-8px items-center p-10px cursor-pointer relative"
                    >
                      <div class="text-14px c-gray-500 flex flex-col justify-between h-full flex-1">
                        <span class="line-clamp-1">{{ msg.cardContent?.name }}</span>
                        <span class="text-11px c-gray-500">{{
                          formatFileSize(msg.cardContent?.size)
                        }}</span>
                      </div>
                      <div class="flex items-center gap-10px">
                        <svg-icon
                          :name="getFileIcon(msg.cardContent?.fileType)"
                          :width="28"
                          :height="28"
                        />
                      </div>
                    </div>
                    <!-- 下载状态图标 -->
                    <template v-if="!isCurrentUser(msg)">
                      <div v-if="msg.fileStatus === 'uploaded'" class="flex mt-auto cursor-pointer">
                        <i
                          i-solar-file-download-broken
                          class="text-18px c-gray-500 hover:c-[var(--theme-color)]"
                        />
                      </div>
                      <div
                        v-else-if="msg.cardContent?.status === 'downloading'"
                        class="download-progress"
                      >
                        <div
                          class="progress-circle"
                          :style="{
                            background: `conic-gradient(var(--theme-color) ${msg.cardContent?.progress * 360}deg, #E5E5E5 0deg)`
                          }"
                        ></div>
                        <span class="progress-text"
                          >{{ Math.round(msg.cardContent?.progress * 100) }}%</span
                        >
                      </div>
                      <div
                        v-else-if="msg.cardContent?.status === 'downloaded'"
                        class="download-status"
                      >
                        <i i-solar-check-circle-linear class="text-18px c-[var(--theme-color)]" />
                      </div>
                    </template>
                  </div>
                </template>

                <!-- 视频 -->
                <template v-else-if="msg.cardContent?.type === 'video'">
                  <video :src="msg.cardContent.url" controls class="rd-8px"></video>
                </template>
              </div>
              <div class="message-status">
                <span v-if="isCurrentUser(msg)">{{
                  formatTime(msg.status === '0' ? '送达' : '已读')
                }}</span>
                <span>{{ formatTime(msg.createdAt) }}</span>
              </div>
            </div>
          </template>
        </div>

        <!-- 添加正在输入的气泡 -->
        <div v-if="isCurrentChatTyping" class="message-item typing-message">
          <div v-if="!messageAvatarLoaded['typing']" class="message-avatar-skeleton"></div>
          <img
            :src="getMessageAvatar({ sender: selectedChat })"
            :alt="selectedChat.nickname"
            :style="{ display: messageAvatarLoaded['typing'] ? 'block' : 'none' }"
            class="message-avatar"
            @load="messageAvatarLoaded['typing'] = true"
            @error="handleAvatarError($event, { id: 'typing' })"
          />
          <div class="message-content">
            <div class="message-text bg-#E5E5E5 typing-bubble">
              <div class="typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
              </div>
            </div>
          </div>
        </div>
      </n-scrollbar>
    </div>

    <!-- 拖拽条 -->
    <div class="resize-handle" @mousedown="handleChatMouseDown"></div>

    <!-- 聊天输入框 -->
    <div class="chat-input" :style="{ height: `${inputHeight}px` }">
      <div v-if="!recordVisible" class="flex gap-15px text-20px relative">
        <i
          i-solar-emoji-funny-circle-linear
          class="hover:color-[var(--theme-color)] transition-all duration-300 cursor-pointer"
          @click="showEmojiPopup = !showEmojiPopup"
        ></i>
        <i
          i-solar-gallery-linear
          class="hover:color-[var(--theme-color)] transition-all duration-300 cursor-pointer"
          @click="handleSelectImage"
        ></i>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleImageChange"
        />
        <i
          i-solar-microphone-large-broken
          class="hover:color-[var(--theme-color)] transition-all duration-300 cursor-pointer"
          @click="showRecord"
        ></i>
        <i
          i-solar-file-broken
          class="hover:color-[var(--theme-color)] transition-all duration-300 cursor-pointer"
          @click="handleSelectFile"
        ></i>

        <!-- 表情弹窗 -->
        <div v-if="showEmojiPopup" class="emoji-popup">
          <div class="emoji-popup-content">
            <div class="emoji-header">
              <span>表情</span>
              <i
                i-solar-close-circle-outline
                class="close-icon"
                @click="showEmojiPopup = false"
              ></i>
            </div>
            <div class="emoji-list">
              <div
                v-for="emoji in emojiList"
                :key="emoji.name"
                class="emoji-item"
                @click="insertEmoji(emoji)"
              >
                <template v-if="!imageLoaded[emoji.url]">
                  <div class="skeleton-emoji"></div>
                </template>
                <img
                  class="w-30px h-30px"
                  :src="emoji.url"
                  :alt="emoji.name"
                  :style="{ display: imageLoaded[emoji.url] ? 'block' : 'none' }"
                  @load="imageLoaded[emoji.url] = true"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 语音录制区域 -->
      <div v-if="recordVisible" class="voice-record-area">
        <Audio />
      </div>

      <n-scrollbar v-if="!recordVisible">
        <div
          v-if="currentQuote"
          class="quote-message bg-gray-100 p-5px mb-10px rd-4px flex items-center"
        >
          <div class="flex-1 flex text-12px c-gray-500">
            <div class="quote-header items-center">
              <span>{{ currentQuote.senderName }}：</span>
            </div>
            <div class="quote-content" v-html="currentQuote.content"></div>
          </div>
          <i
            class="i-solar-close-circle-outline text-14px cursor-pointer ml-10px"
            @click="removeQuote"
          ></i>
        </div>
        <Input />
      </n-scrollbar>

      <button v-if="!recordVisible" class="send-button" @click="handleSendMessage">
        <i i-solar-plain-line-duotone></i>
      </button>
    </div>
  </div>

  <!-- 未选择聊天时的提示 -->
  <div v-else class="chat-placeholder">
    <img class="w-200px" src="@renderer/assets/imgs/chat-empty.png" alt="暂无聊天" />
    <div class="placeholder-text">选择一个聊天开始会话</div>
  </div>

  <!-- 添加图片预览组件 -->
  <div v-if="previewImage" class="image-preview-overlay" @click="closePreview">
    <div class="image-preview-content" @click.stop>
      <img
        :src="previewImage"
        alt="预览图片"
        :style="{ transform: `scale(${imageScale})` }"
        class="rd-10px"
        @wheel="handleImageWheel"
        @click.stop
      />
      <div class="preview-controls">
        <span class="scale-info">{{ Math.round(imageScale * 100) }}%</span>
        <button @click="resetImageScale" class="reset-btn">重置</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Input from './input.vue'
import Audio from './audio.vue'

import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useHomeStore } from '../store'
import defaultAvatar from '@renderer/assets/imgs/default-avatar.png'
import { formatTime, throttle } from '@renderer/utils/tools'
import type { Message } from '../store/index'
import { useRoute } from 'vue-router'
import { $msg } from '@renderer/config/interaction.config'
import { uploadFile } from '@renderer/service/api/upload'
import { formatFileSize } from '@renderer/utils/tools'
import { uploadFileStatus } from '@renderer/service/api/message'
const route = useRoute()

const {
  selectedChat,
  handleChatMouseDown,
  isCurrentUser,
  messageInputRef,
  userStore,
  imStore,
  recordVisible,
  showRecord,
  inputHeight,
  messageContent,
  messages,
  handleSendMessage,
  userList,
  handleSelectChat,
  currentQuote,
  formatDuration,
  isPlaying,
  toggleAudioPlay,
  handleContextMenu,
  groupStore
} = useHomeStore()

const currentUserAvatar = computed(() => {
  return userStore.userInfo?.avatar || defaultAvatar
})

const scrollbarRef = ref()
const imageLoaded = ref<Record<string, boolean>>({})
const showEmojiPopup = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
// 计算当前聊天对象是否正在输入
const isCurrentChatTyping = computed(() => {
  return imStore.getCurrentChatTypingStatus()
})

// 监听聊天切换，清除输入状态
watch(
  () => selectedChat.value?.username,
  () => {
    imStore.clearTypingStatus()
  }
)

watch(
  () => isCurrentChatTyping.value,
  (isTyping) => {
    if (isTyping) {
      nextTick(() => {
        if (scrollbarRef.value) {
          scrollbarRef.value.scrollTo({
            left: 0,
            top: 99999,
            behavior: 'smooth'
          })
        }
      })
    }
  }
)

// 处理图片选择按钮点击
const handleSelectImage = () => {
  fileInputRef.value?.click()
}

// 添加图片预览相关的状态
const previewImage = ref<string | null>(null)
// 添加图片缩放相关状态
const imageScale = ref(1)
const minScale = 0.1
const maxScale = 5

// 处理鼠标滚轮缩放
const handleImageWheel = (e: WheelEvent) => {
  e.preventDefault()

  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newScale = imageScale.value + delta

  if (newScale >= minScale && newScale <= maxScale) {
    imageScale.value = newScale
  }
}

// 重置图片缩放
const resetImageScale = () => {
  imageScale.value = 1
}

// 检查消息是否只包含图片
const isOnlyImages = (content: string) => {
  const parts = parseMessageContent(content)
  return parts.length > 0 && parts.every((part) => part.type === 'image')
}

// 解析消息内容
const parseMessageContent = (content: string) => {
  const parts = [] as any[]
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
        class: node.className,
        dataType: node.dataset.type || 'image' // 获取data-type属性，默认为'image'
      })
    } else if (node.childNodes.length) {
      node.childNodes.forEach(processNode)
    }
  }

  tempDiv.childNodes.forEach(processNode)
  return parts
}

// 显示图片预览
const showImagePreview = (src: string) => {
  previewImage.value = src
}

// 关闭图片预览
const closePreview = () => {
  previewImage.value = null
  imageScale.value = 1
}

// 添加移除引用的方法
const removeQuote = () => {
  currentQuote.value = null
}

// 滚动到指定消息
const scrollToMessage = (messageId: number) => {
  // 找到目标消息元素
  const targetMessage = document.querySelector(`[data-message-id="${messageId}"]`)
  if (targetMessage && scrollbarRef.value) {
    // 直接使用 scrollTo 方法滚动到目标元素的位置
    scrollbarRef.value.scrollTo({
      left: 0,
      top: targetMessage.offsetTop - 20, // 20px的上边距
      behavior: 'smooth'
    })

    // 移除可能存在的其他高亮效果
    document.querySelectorAll('.message-highlight').forEach((el) => {
      el.classList.remove('message-highlight')
    })

    // 添加高亮效果
    targetMessage.classList.add('message-highlight')
    // 动画结束后移除类
    setTimeout(() => {
      targetMessage.classList.remove('message-highlight')
    }, 4000)
  }
}

// 添加一个加载状态标记
const isLoading = ref(false)

// 添加滚动监听处理
const handleScroll = throttle(async (e: { target: { scrollTop: number } }) => {
  if (!scrollbarRef.value || isLoading.value) return

  // 从事件对象中获取 scrollTop
  const scrollTop = e.target.scrollTop

  if (scrollTop === 0) {
    // 设置加载状态
    isLoading.value = true

    try {
      // 在加载新消息前，先记录当前最后一条消息的位置
      const lastMessageBeforeLoad = messages?.value[0]

      imStore.msgCurrentPage++
      const userInfo = userStore.userInfo
      if (userInfo?.id && selectedChat.value?.id) {
        const resolve = await imStore.getMessageHistory(
          userInfo.id,
          selectedChat.value.id,
          selectedChat.value.chatType
        )
        if (!resolve) return

        // 保持滚动位置在加载前的最后一条消息处
        nextTick(() => {
          if (scrollbarRef.value && messages.value && lastMessageBeforeLoad) {
            const lastMessage = document.querySelector(
              `[data-message-id="${lastMessageBeforeLoad.id}"]`
            )
            if (lastMessage) {
              scrollbarRef.value.scrollTo({
                top: lastMessage.offsetTop,
                behavior: 'instant'
              })
            }
          }
        })
      }
    } finally {
      // 重置加载状态
      isLoading.value = false
    }
  }
}, 1000)

// 监听表情弹窗的显示状态
watch(showEmojiPopup, (newVal) => {
  if (!newVal) {
    // 关闭弹窗时重置所有图片的加载状态
    imageLoaded.value = {}
  }
})

watch(
  messages,
  () => {
    nextTick(() => {
      if (scrollbarRef.value) {
        const scrollbar = scrollbarRef.value
        // 使用 scrollTo 方法，设置滚动位置和行为
        scrollbar.scrollTo({
          left: 0,
          top: 99999, // 使用一个足够大的值来滚动到底部
          behavior: 'instant'
        })
      }
    })
  },
  { deep: true }
)

// 处理消息复制
const handleMessageCopy = (e: ClipboardEvent) => {
  // 阻止默认复制行为
  e.preventDefault()

  // 获取选中的内容
  const selection = window.getSelection()
  if (!selection?.rangeCount) return

  const range = selection.getRangeAt(0)
  const container = document.createElement('div')
  container.appendChild(range.cloneContents())

  // 设置剪贴板内容
  e.clipboardData?.setData('text/html', container.innerHTML)
  e.clipboardData?.setData('text/plain', container.textContent || '')
}

// 表情列表
const emojiList = computed(() => {
  return userStore.emojiList
})

// 获取消息头像
const getMessageAvatar = (msg: any) => {
  if (!selectedChat.value) return defaultAvatar
  // 如果是群聊，使用发送者的头像
  if (selectedChat.value.chatType === 'group') {
    return msg.sender?.avatar || defaultAvatar
  }
  // 如果是私聊，使用选中聊天的头像
  return selectedChat.value.avatar || defaultAvatar
}

// 修改插入表情的方法
const insertEmoji = (emoji: { name: string; url: string }) => {
  if (messageInputRef.value) {
    // 创建表情图片元素
    const img = document.createElement('img')
    img.src = emoji.url
    img.className = 'w-20px h-20px inline-block'
    img.alt = emoji.name
    img.dataset.type = 'emoji'

    // 直接将表情追加到内容末尾
    messageInputRef.value.appendChild(img)

    // 更新 messageContent 的值
    messageContent.value = messageInputRef.value.innerHTML
  }
}

// 发送图片
const handleImageChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      $msg({
        type: 'warning',
        msg: '请选择图片文件'
      })
      return
    }

    // 检查文件大小（限制为 10MB）
    if (file.size > 10 * 1024 * 1024) {
      $msg({
        type: 'warning',
        msg: '图片大小不能超过10MB'
      })
      return
    }

    try {
      // 上传图片
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadFile(formData, false, false)

      if (res.code === 200) {
        // 创建图片元素并插入到输入框
        const img = document.createElement('img')
        img.src = res.data.url
        img.className = 'w-100px h-100px inline-block'
        img.dataset.type = 'image'

        if (messageInputRef.value) {
          messageInputRef.value.appendChild(img)
          // 更新消息内容
          messageContent.value = messageInputRef.value.innerHTML
        }
      }
    } catch (error) {
      console.error('图片处理失败:', error)
      $msg({
        type: 'error',
        msg: '图片处理失败'
      })
    }
  }

  // 清空文件输入框，以便可以重复选择同一文件
  target.value = ''
}

// 处理文件选择
const handleSelectFile = async () => {
  try {
    const filePath = await window.api.selectFile()
    if (!filePath) return

    // 使用 Node.js 的 fs 模块读取文件信息
    const fileInfo = await window.api.getFileInfo(filePath)
    if (!fileInfo) return

    const { name, size, type } = fileInfo

    // 根据MIME类型确定文件类别
    let fileCategory = 'other'
    if (/^image\//.test(type)) {
      fileCategory = 'image'
    } else if (/^audio\//.test(type)) {
      fileCategory = 'audio'
    } else if (/^video\//.test(type)) {
      fileCategory = 'video'
    } else if (
      /^application\/pdf|^application\/msword|^application\/vnd\.openxmlformats|^text\/plain/.test(
        type
      )
    ) {
      fileCategory = 'document'
    }

    // 显示上传中提示
    $msg({
      type: 'info',
      msg: '文件上传中...'
    })

    // 调用上传API
    const formData = new FormData()
    formData.append('file', new File([await window.api.readFile(filePath)], name, { type }))
    formData.append('type', fileCategory)
    formData.append('localPath', filePath)

    const res = await uploadFile(formData, false, false)
    if (res.code === 200) {
      if (selectedChat.value?.id) {
        // 创建音频卡片内容
        const audioCardContent = {
          type: fileCategory,
          url: res.data.url,
          fileType: type,
          localPath: filePath,
          size: size,
          name: name,
          status: 'uploading'
        }

        // 发送音频卡片消息
        await imStore.sendCardMsg(selectedChat.value.id, name, audioCardContent)
      }
      $msg({
        type: 'success',
        msg: '文件上传成功'
      })
    }
  } catch (error) {
    console.error('文件处理失败:', error)
    $msg({
      type: 'error',
      msg: '文件处理失败'
    })
  }
}
const handleOpenFile = async (msg: any, url?: string, localPath?: string) => {
  if (!url) return

  // 判断是否是当前用户的消息
  if (isCurrentUser(msg)) {
    // 如果是自己的消息，检查本地文件是否存在
    if (localPath) {
      try {
        await window.api.openFile(localPath)
      } catch {
        $msg({
          type: 'error',
          msg: '文件已被删除或移动到其他位置'
        })
      }
    }
  } else {
    // 如果是对方的消息，检查是否已下载
    const downloadedPath = localStorage.getItem(`downloaded_${url}`)
    if (downloadedPath) {
      // 已下载过，尝试打开本地文件
      try {
        await window.api.openFile(downloadedPath)
      } catch {
        // 本地文件不存在，重新下载
        $msg({
          type: 'info',
          msg: '文件已被删除，正在重新下载...'
        })
        setTimeout(async () => {
          await downloadAndOpen(url, msg)
        }, 2000)
      }
    } else {
      // 首次打开，下载文件
      downloadAndOpen(url, msg)
    }
  }
}

// 下载并打开文件
const downloadAndOpen = async (url: string, msg: any) => {
  try {
    msg.cardContent.progress = 0

    $msg({
      type: 'info',
      msg: '正在下载文件...'
    })

    // 获取文件名
    const fileName = url.split('/').pop()
    if (!fileName) throw new Error('无效的文件名')

    // 下载文件
    const response = await fetch(url)
    if (!response.ok) throw new Error('文件下载失败')

    // 获取文件数据并转换为ArrayBuffer
    const arrayBuffer = await response.arrayBuffer()

    // 保存文件到本地
    const downloadedPath = await window.api.saveFile({
      fileName,
      fileData: new Uint8Array(arrayBuffer)
    })

    // 保存下载路径到本地存储
    localStorage.setItem(`downloaded_${url}`, downloadedPath)

    msg.fileStatus = 'downloaded'
    msg.cardContent.progress = 1

    // 打开文件
    await window.api.openFile(downloadedPath)

    $msg({
      type: 'success',
      msg: '文件下载完成'
    })

    await uploadFileStatus(msg.id)
  } catch (error) {
    console.error('文件下载失败:', error)
    if (msg?.cardContent) {
      msg.cardContent.status = 'uploading'
      msg.cardContent.progress = 0
    }
    $msg({
      type: 'error',
      msg: error instanceof Error ? error.message : '文件下载失败'
    })
  }
}

const getFileIcon = (fileType: string | undefined) => {
  if (!fileType) return 'txt'

  switch (fileType.toLowerCase()) {
    case 'application/pdf':
      return 'pdf'
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'doc'
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'excel'
    case 'application/vnd.ms-powerpoint':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return 'ppt'
    default:
      return 'txt'
  }
}

// 添加消息头像加载状态
const messageAvatarLoaded = ref<Record<string, boolean>>({})

// 消息头像错误处理
const handleAvatarError = (event: Event, msg: Message) => {
  const target = event.target as HTMLImageElement
  target.src = defaultAvatar
  messageAvatarLoaded.value[msg.id] = true
}

// 监听选中聊天的变化，重置头像加载状态
watch(selectedChat, () => {
  if (selectedChat.value) {
    // 清空头像加载状态
    messageAvatarLoaded.value = {}
  }
})

// 修改发送消息后清空输入框的逻辑
watch(messageContent, (newVal, oldVal) => {
  if (oldVal && !newVal && messageInputRef.value) {
    messageInputRef.value.innerHTML = ''
  }
})

// 重新编辑
const handleReEdit = (msg: Message) => {
  if (msg.originalMessage) {
    messageContent.value = msg.originalMessage
    messageInputRef.value?.focus()

    // 确保输入框内容被更新
    nextTick(() => {
      if (messageInputRef.value) {
        messageInputRef.value.innerHTML = msg.originalMessage
      }
    })
    if (imStore.chatWithUserName && userList.value[imStore.chatWithUserName]) {
      const msgList = userList.value[imStore.chatWithUserName].msgList
      const msgIndex = msgList.findIndex((item) => item.id === msg.id)
      if (msgIndex !== -1) {
        msgList.splice(msgIndex, 1)
      }
    }
  }
}

// 处理点击表情弹窗外部的事件
const handleClickOutside = (event: MouseEvent) => {
  const emojiPopup = document.querySelector('.emoji-popup')
  const emojiTrigger = document.querySelector('[i-solar-emoji-funny-circle-linear]')

  if (
    showEmojiPopup.value &&
    emojiPopup &&
    !emojiPopup.contains(event.target as Node) &&
    emojiTrigger &&
    !emojiTrigger.contains(event.target as Node)
  ) {
    showEmojiPopup.value = false
  }
}

let recordTimer: NodeJS.Timeout | null = null

onMounted(async () => {
  await imStore.getChatList()
  const userId = route.query.userId
  if (userId && userList.value) {
    // 找到对应的用户
    const targetUser = Object.values(userList.value)
      .map((item) => item.list)
      .find((user) => user.id === Number(userId))

    if (targetUser) {
      handleSelectChat(targetUser)
    }
  }

  scrollbarRef?.value?.scrollTo({
    left: 0,
    top: 99999, // 使用一个足够大的值来滚动到底部
    behavior: 'instant'
  })

  userStore.getEmojiList()

  // 添加点击事件监听器，用于关闭表情弹窗
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  scrollbarRef?.value?.destroy()
  selectedChat.value = null

  // 移除点击事件监听器
  document.removeEventListener('click', handleClickOutside)

  if (recordTimer) {
    clearInterval(recordTimer)
  }
})
</script>

<style scoped lang="scss">
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.chat-header {
  height: 57px;
  padding: 0 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
}

.chat-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.chat-messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.resize-handle {
  width: 100%;
  height: 4px;
  cursor: row-resize;
  background: transparent;
  transition: background 0.2s;
}

.message-group {
  margin-bottom: 20px;
}

.message-time {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin: 10px 0;
}

.message-item {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex: 1;

  .message-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &.message-right {
    flex-direction: row-reverse;
  }
}

.message-avatar-skeleton {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.message-text {
  padding: 6px 8px;
  font-size: 14px;
  word-break: break-all;
  border-radius: 8px;
  width: fit-content;
}

.message-status {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 5px;
}

.dot {
  font-size: 10px;
}

.chat-input {
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
}

.typing-dots {
  &::after {
    content: '...';
    display: inline-block;
    animation: typingDots 1.5s infinite;
    width: 12px;
    overflow: hidden;
    margin-left: 4px;
    vertical-align: middle;
  }
}

@keyframes typingDots {
  0% {
    width: 0;
  }
  33% {
    width: 4px;
  }
  66% {
    width: 8px;
  }
  100% {
    width: 12px;
  }
}

// 表情弹窗样式
.emoji-popup {
  position: absolute;
  top: -250px;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.emoji-popup-content {
  background-color: white;
  border-radius: 8px;
  width: 430px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.emoji-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
  font-size: 14px;
  font-weight: 500;
}

.close-icon {
  cursor: pointer;
  font-size: 18px;
  color: #999;

  &:hover {
    color: var(--theme-color);
  }
}

.emoji-list {
  display: flex;
  flex-wrap: wrap;
  padding: 10px;
}

.emoji-item {
  cursor: pointer;
  border-radius: 10px;
  padding: 2px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.2s;

  &:hover {
    background-color: #f5f5f5;
  }
}

.skeleton-emoji {
  width: 30px;
  height: 30px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: pointer;
}

.image-preview-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  cursor: default;

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    transition: transform 0.1s ease;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }
}

.preview-controls {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 16px;
  border-radius: 20px;
  color: white;
  font-size: 14px;

  .scale-info {
    min-width: 50px;
    text-align: center;
  }

  .reset-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    padding: 4px 12px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.quote-card {
  padding: 5px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.6);
}

.quote-header {
  display: flex;
  // align-items: center;
}

.card-image img {
  cursor: pointer;
  transition: transform 0.3s ease;
}

.card-image img:hover {
  transform: scale(1.02);
}

.message-highlight {
  border-radius: 8px;
  animation: highlight-flash 2s ease-in-out 2;
}

@keyframes highlight-flash {
  0%,
  100% {
    background-color: transparent;
  }
  50% {
    background-color: rgba(0, 0, 0, 0.1);
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  }
}

.superballs {
  --uib-size: 45px;
  --uib-speed: 1.1s;
  --uib-color: #3b3b23;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--uib-size);
  width: var(--uib-size);
}

.superballs__dot {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.superballs__dot::before {
  content: '';
  height: 30%;
  width: 30%;
  border-radius: 50%;
  background-color: var(--uib-color);
  will-change: transform;
  flex-shrink: 0;
}

.superballs__dot:nth-child(1) {
  transform: rotate(45deg);
}

.superballs__dot:nth-child(1)::before {
  animation: orbit82140 var(--uib-speed) linear calc(var(--uib-speed) * -0.143) infinite;
}

.superballs__dot:nth-child(2) {
  transform: rotate(-45deg);
}

.superballs__dot:nth-child(2)::before {
  animation: orbit82140 var(--uib-speed) linear calc(var(--uib-speed) / -2) infinite;
}

@keyframes orbit82140 {
  0% {
    transform: translate(calc(var(--uib-size) * 0.5)) scale(0.73684);
    opacity: 0.65;
  }

  5% {
    transform: translate(calc(var(--uib-size) * 0.4)) scale(0.684208);
    opacity: 0.58;
  }

  10% {
    transform: translate(calc(var(--uib-size) * 0.3)) scale(0.631576);
    opacity: 0.51;
  }

  15% {
    transform: translate(calc(var(--uib-size) * 0.2)) scale(0.578944);
    opacity: 0.44;
  }

  20% {
    transform: translate(calc(var(--uib-size) * 0.1)) scale(0.526312);
    opacity: 0.37;
  }

  25% {
    transform: translate(0%) scale(0.47368);
    opacity: 0.3;
  }

  30% {
    transform: translate(calc(var(--uib-size) * -0.1)) scale(0.526312);
    opacity: 0.37;
  }

  35% {
    transform: translate(calc(var(--uib-size) * -0.2)) scale(0.578944);
    opacity: 0.44;
  }

  40% {
    transform: translate(calc(var(--uib-size) * -0.3)) scale(0.631576);
    opacity: 0.51;
  }

  45% {
    transform: translate(calc(var(--uib-size) * -0.4)) scale(0.684208);
    opacity: 0.58;
  }

  50% {
    transform: translate(calc(var(--uib-size) * -0.5)) scale(0.73684);
    opacity: 0.65;
  }

  55% {
    transform: translate(calc(var(--uib-size) * -0.4)) scale(0.789472);
    opacity: 0.72;
  }

  60% {
    transform: translate(calc(var(--uib-size) * -0.3)) scale(0.842104);
    opacity: 0.79;
  }

  65% {
    transform: translate(calc(var(--uib-size) * -0.2)) scale(0.894736);
    opacity: 0.86;
  }

  70% {
    transform: translate(calc(var(--uib-size) * -0.1)) scale(0.947368);
    opacity: 0.93;
  }

  75% {
    transform: translate(0%) scale(1);
    opacity: 1;
  }

  80% {
    transform: translate(calc(var(--uib-size) * 0.1)) scale(0.947368);
    opacity: 0.93;
  }

  85% {
    transform: translate(calc(var(--uib-size) * 0.2)) scale(0.894736);
    opacity: 0.86;
  }

  90% {
    transform: translate(calc(var(--uib-size) * 0.3)) scale(0.842104);
    opacity: 0.79;
  }

  95% {
    transform: translate(calc(var(--uib-size) * 0.4)) scale(0.789472);
    opacity: 0.72;
  }

  100% {
    transform: translate(calc(var(--uib-size) * 0.5)) scale(0.73684);
    opacity: 0.65;
  }
}

.recall-message {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
  width: 100%;
}

.recall-text {
  font-size: 12px;
  color: #999;
  background-color: rgba(0, 0, 0, 0.03);
  padding: 4px 12px;
  border-radius: 100px;
}

.send-button {
  display: flex;
  width: fit-content;
  padding: 8px 20px;
  border: none;
  font-size: 14px;
  border-radius: 8px;
  background: var(--theme-color);
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
  margin-left: auto;

  &:hover {
    opacity: 0.8;
  }
}

.chat-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  height: 100%;
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.placeholder-text {
  font-size: 14px;
}

.voice-record-area {
  min-width: 500px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 8px;
  padding-top: 20px;
  padding-bottom: 0px;
}

.bg {
  background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAAAYCAYAAAAF6fiUAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NzlFRDZDRDNENzlFMTFFNkJDN0NFMjA2QTFFRTRDQkIiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NzlFRDZDRDJENzlFMTFFNkJDN0NFMjA2QTFFRTRDQkIiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTcgKFdpbmRvd3MpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MTAxQkEzQ0RENzM2MTFFNjgyMEI5MTNDRkQ0OTM5QUEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MTAxQkEzQ0VENzM2MTFFNjgyMEI5MTNDRkQ0OTM5QUEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4K4iKVAAACUUlEQVR42uSazytEURTHvTHjR4kaU8xsSDZSdmbjx4oSK8XGQrJlpSwYTSmxEWWhUIpsZK3kD7DRNBuSBZFCNjZ+JPKcV6ecXu/d3sy7595bc+vbfXPue5/749z77o83lm3bZYYFC8RZqAbQAigP2tXNj5aZF7gdkAZNk9+7WvnOCCgxRUCb9n/o1sk3pUH6QDHF/GNsoM+QeYfiy6qkFeLZDBb0GlTB4AAR/xXT9nXxZVa0WCekQd9Y0HOJjg3CHySviiZmfjO3AyIhnu0gBc0wjAIR/wLtW8z87aAOWAI9gqaYRoAff4ZUoi7EKCiUP462j4CdSCrfK4N1Ahpi6I0i/hPa50M4oFB+Dbm/SzXfL5MD4rUogxP8+Itozynm59E+q5ovyuQdHxphWh568XvR5kxq1SEn40L4e0XMA1L4EcEe7RTjLqYdqRf/gezQUwr5LxjXq+aLHPCFcTmTA7z4tutIQhXfLiJPKXyRA/oxzgW8v9DgxU+S62eF/ATGr6r5fg26Corj9RHD4Z0fvwfjS9CbQn4bxrfK+R6TyzxZNk260solTL4i/g3al10TsMXIryA72T7VfK8MnJO8X9CKy14lafXjxx8jFUsSeyUzfxhtPwHPoqTy/TJJMJzJiPgNpJdsuNJizPwztB/q4JtwHN2KW3sn3HuMOouR30l6bbsOvgkOyGIBnaPbRldalJl/h2knuvgmOKAWNAFKMUz4Iv4O6Z1xXXxTPxtazHy6khnVyS/Fb8IDpHGyuvmWgX9L4Q4toDnQFWhNN/9PgAEAR4w1ULjdCbEAAAAASUVORK5CYII=)
    right 0 no-repeat;
  width: 15px;
  height: 15px;
  background-size: 400%;
}

.voicePlay {
  animation-name: voicePlay;
  animation-duration: 1s;
  animation-direction: normal;
  animation-iteration-count: infinite;
  animation-timing-function: steps(3);
}

@keyframes voicePlay {
  0% {
    background-position: 0;
  }
  100% {
    background-position: 100%;
  }
}

// 正在输入气泡样式
.typing-message {
  opacity: 0;
  animation: fadeInUp 0.3s ease-out forwards;
}

.typing-bubble {
  padding: 14px 16px;
  border-radius: 8px;
  max-width: 80px;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: #999;
  animation: typingAnimation 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingAnimation {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-5px);
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tip-message {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
  width: 100%;
}

.tip-text {
  font-size: 12px;
  color: #666;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 4px 12px;
  border-radius: 100px;
}
</style>
