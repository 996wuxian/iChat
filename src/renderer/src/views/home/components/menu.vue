<template>
  <n-dropdown
    :show="showDropdown"
    :options="dropdownOptions"
    :x="dropdownX"
    :y="dropdownY"
    placement="bottom-start"
    style="border-radius: 10px"
    @clickoutside="showDropdown = false"
    @select="
      (key) => {
        handleSelect(key)
      }
    "
  />
</template>

<script setup lang="ts">
import { h } from 'vue'
import { Message, useHomeStore } from '../store/index'
import { $msg } from '@renderer/config/interaction.config'
import { useDialog } from 'naive-ui'
import { updateDeleteStatus } from '@renderer/service/api/message'
import {
  DeleteChatList,
  UpdateChatTop,
  UpdateDisturb,
  BlacklistFriend,
  UnblacklistFriend
} from '@renderer/service/api/user'

const {
  showDropdown,
  dropdownX,
  dropdownY,
  currentMessage,
  isCurrentUser,
  userStore,
  imStore,
  currentQuote,
  selectedChat,
  inputHeight,
  currentUserId,
  messages,
  userList
} = useHomeStore()
const dialog = useDialog()

// 获取列表菜单选项
const getListOptions = (is_top: string, is_disturb: string) => [
  {
    label: is_top === '1' ? '取消置顶' : '置顶',
    key: 'top',
    icon: () =>
      h('i', { class: is_top === '1' ? 'i-solar-pin-line-duotone' : 'i-solar-pin-bold-duotone' })
  },
  {
    label: '复制账号',
    key: 'copyAccount',
    icon: () => h('i', { class: 'i-solar-copy-line-duotone' })
  },
  {
    label: is_disturb === '1' ? '取消免打扰' : '设置免打扰',
    key: 'mute',
    icon: () =>
      h('i', {
        class: is_disturb === '1' ? 'i-solar-bell-bing-outline' : 'i-solar-bell-off-line-duotone'
      })
  },
  {
    label: '从消息列表中移除',
    key: 'removeFromList',
    icon: () => h('i', { class: 'i-solar-trash-bin-trash-line-duotone' })
  },
  { type: 'divider', key: 'd1' },
  {
    label: '拉黑该用户',
    key: 'block',
    type: 'error',
    icon: () => h('i', { class: 'i-solar-shield-cross-line-duotone' })
  }
]
// 基础菜单选项
const getBaseOptions = () => [
  {
    label: '复制',
    key: 'copy',
    icon: () => h('i', { class: 'i-solar-copy-line-duotone' })
  },
  {
    label: '转发',
    key: 'forward',
    icon: () => h('i', { class: 'i-solar-forward-line-duotone' })
  },
  {
    label: '收藏',
    key: 'favorite',
    icon: () => h('i', { class: 'i-solar-star-line-duotone' })
  },
  {
    label: '引用',
    key: 'quote',
    icon: () => h('i', { class: 'i-solar-sort-vertical-line-duotone' })
  },
  { type: 'divider', key: 'd1' },
  {
    label: '删除',
    key: 'delete',
    type: 'error',
    icon: () => h('i', { class: 'i-solar-trash-bin-trash-line-duotone' })
  }
]

// 获取语音消息选项
const getAudioOptions = () => [
  {
    label: '转文字',
    key: 'toText',
    icon: () => h('i', { class: 'i-solar-sort-horizontal-line-duotone' })
  },
  {
    label: '收藏',
    key: 'favorite',
    icon: () => h('i', { class: 'i-solar-star-line-duotone' })
  },
  {
    label: '引用',
    key: 'quote',
    icon: () => h('i', { class: 'i-solar-sort-vertical-line-duotone' })
  },
  { type: 'divider', key: 'd1' },
  {
    label: '删除',
    key: 'delete',
    type: 'error',
    icon: () => h('i', { class: 'i-solar-trash-bin-trash-line-duotone' })
  }
]

// 检查是否可以撤回消息
const canRecallMessage = (message: Message) => {
  if (!isCurrentUser(message)) return false
  const timeDiff = Date.now() - new Date(message.createdAt).getTime()
  return timeDiff <= 30 * 60 * 1000
}

// 获取图片相关选项
const getImageOptions = () => [
  {
    label: '另存为',
    key: 'saveAs',
    icon: () => h('i', { class: 'i-solar-download-line-duotone' })
  },
  {
    label: '添加到表情',
    key: 'addToEmoji',
    icon: () => h('i', { class: 'i-solar-emoji-funny-circle-linear' })
  },
  {
    label: '打开文件夹',
    key: 'openFolder',
    icon: () => h('i', { class: 'i-solar-folder-with-files-line-duotone' })
  }
]

// 菜单选项计算属性
const dropdownOptions = computed(() => {
  if (!currentMessage.value) return []

  // 处理列表右键菜单
  if (currentMessage.value.type === 'list') {
    return getListOptions(currentMessage.value.is_top, currentMessage.value.is_disturb)
  }

  // 处理语音消息
  if (currentMessage.value.type === 'card' && currentMessage.value?.cardContent?.type === 'audio') {
    let options = getAudioOptions()
    if (canRecallMessage(currentMessage.value)) {
      options.splice(-2, 0, {
        label: '撤回',
        key: 'recall',
        icon: () => h('i', { class: 'i-solar-undo-right-line-duotone' })
      })
    }
    return options
  }

  // 处理其他类型消息
  let options = getBaseOptions()

  if (canRecallMessage(currentMessage.value)) {
    options.push({
      label: '撤回',
      key: 'recall',
      icon: () => h('i', { class: 'i-solar-undo-right-line-duotone' })
    })
  }

  if (currentMessage.value.type === 'card' && currentMessage.value?.cardContent?.image) {
    options = [
      ...options.slice(0, -2),
      ...getImageOptions(),
      { type: 'divider', key: 'd1' },
      options[options.length - 1] // 保留删除选项
    ]
  }

  return options
})

// 处理菜单选项点击
const handleSelect = async (key: string) => {
  if (!currentMessage.value) return

  switch (key) {
    case 'copy':
      if (currentMessage.value.type === 'text') {
        if (currentMessage.value.content) {
          const text = currentMessage.value.content.replace(/<[^>]+>/g, '') // 提取纯文本
          const html = currentMessage.value.content // 保留HTML格式

          // 使用 Clipboard API 创建双格式的剪贴板内容
          const clipboardItems = [
            new ClipboardItem({
              'text/plain': new Blob([text], { type: 'text/plain' }),
              'text/html': new Blob([html], { type: 'text/html' })
            })
          ]

          // 写入剪贴板
          navigator.clipboard
            .write(clipboardItems)
            .then(() => {
              $msg({
                type: 'success',
                msg: '已复制'
              })
            })
            .catch((err) => {
              console.error('复制失败:', err)
              $msg({
                type: 'error',
                msg: '复制失败'
              })
            })
        }
      }
      break
    case 'forward':
      // 实现转发逻辑
      break
    case 'favorite':
      // 实现收藏逻辑
      break
    case 'quote':
      if (currentMessage.value) {
        // 设置引用内容
        currentQuote.value = {
          senderName: isCurrentUser(currentMessage.value)
            ? userStore.userInfo?.nickname || userStore.userInfo?.username || '未知用户'
            : selectedChat.value?.nickname || selectedChat.value?.username || '未知用户',
          content: currentMessage.value.content,
          type: 'quote',
          messageId: currentMessage.value.id,
          cardContent: currentMessage.value.cardContent
        }
        inputHeight.value = 200
      }
      break
    case 'delete':
      dialog.warning({
        content: '删除后将不会出现在你的消息记录中，确定删除吗？',
        positiveText: '确定',
        negativeText: '取消',
        showIcon: false,
        draggable: true,
        onPositiveClick: async () => {
          try {
            const res = await updateDeleteStatus(currentMessage.value!.id, currentUserId.value!)
            if (res.code === 200) {
              // 从消息列表中移除该消息
              if (messages.value) {
                const index = messages.value.findIndex((msg) => msg.id === currentMessage.value!.id)
                if (index !== -1) {
                  messages.value.splice(index, 1)
                }
                // 同步更新 userList 中的消息列表
                if (selectedChat.value?.username) {
                  const username = selectedChat.value.username
                  userList.value[username].msgList = messages.value

                  // 如果删除的是最后一条消息，更新最后一条消息信息
                  if (messages.value.length > 0) {
                    const lastMsg = messages.value[messages.value.length - 1]
                    userList.value[username].list.lastMsg = lastMsg.content
                    userList.value[username].list.lastMsgTime = new Date(
                      lastMsg.createdAt
                    ).toLocaleString()
                  } else {
                    // 如果没有消息了，清空最后一条消息信息
                    userList.value[username].list.lastMsg = '暂无消息'
                    userList.value[username].list.lastMsgTime = ''
                  }
                }
              }
              $msg({
                type: 'success',
                msg: '消息已在您的记录中删除'
              })
            } else {
              $msg({
                type: 'error',
                msg: res.msg || '删除失败'
              })
            }
          } catch (error) {
            console.error('删除失败:', error)
            $msg({
              type: 'error',
              msg: '删除失败'
            })
          }
        }
      })
      break
    case 'recall':
      dialog.warning({
        content: '确定要撤回这条消息吗？',
        positiveText: '确定',
        negativeText: '取消',
        showIcon: false,
        draggable: true,
        onPositiveClick: async () => {
          try {
            imStore.originalMessage = currentMessage.value!.content
            const result = await imStore.recallMessage(currentMessage.value!.id)
            if (result) {
              $msg({
                type: 'success',
                msg: '消息已撤回'
              })
            }
          } catch (error) {
            console.error('撤回失败:', error)
            $msg({
              type: 'error',
              msg: '消息撤回失败'
            })
          }
        }
      })
      break
    case 'saveAs':
      // 实现图片另存为逻辑
      break
    case 'addToEmoji':
      // 实现添加到表情逻辑
      break
    case 'openFolder':
      // 实现打开文件夹逻辑
      break
    case 'toText':
      // 实现语音转文字的逻辑
      break
    case 'top':
      if (currentMessage.value.type === 'list' && currentMessage.value.id) {
        const res = await UpdateChatTop(
          currentMessage.value.id,
          currentMessage.value.is_top === '1' ? '0' : '1'
        )
        if (res.code === 200) {
          // 更新临时引用
          currentMessage.value.is_top = currentMessage.value.is_top === '1' ? '0' : '1'

          // 同步更新userList中的数据
          if (currentMessage.value.username && userList.value[currentMessage.value.username]) {
            userList.value[currentMessage.value.username].list.is_top = currentMessage.value.is_top
          }

          $msg({
            type: 'success',
            msg: currentMessage.value.is_top === '1' ? '置顶成功' : '取消置顶成功'
          })
        }
      }
      break
    case 'copyAccount':
      if (currentMessage.value.username) {
        window.api.copyText(currentMessage.value.username)
        $msg({
          type: 'success',
          msg: '已复制账号'
        })
      }
      break
    case 'mute':
      if (currentMessage.value.type === 'list' && currentMessage.value.id) {
        const res = await UpdateDisturb(
          currentMessage.value.id,
          currentMessage.value.is_disturb === '1' ? '0' : '1'
        )
        if (res.code === 200) {
          // 更新临时引用
          currentMessage.value.is_disturb = currentMessage.value.is_disturb === '1' ? '0' : '1'

          // 同步更新userList中的数据
          if (currentMessage.value.username && userList.value[currentMessage.value.username]) {
            userList.value[currentMessage.value.username].list.is_disturb =
              currentMessage.value.is_disturb
          }

          $msg({
            type: 'success',
            msg: currentMessage.value.is_disturb === '1' ? '已设置免打扰' : '已取消免打扰'
          })
        }
      }
      break
    case 'removeFromList':
      dialog.warning({
        title: '删除确认',
        content: '是否从聊天列表中移除该用户',
        positiveText: '确定',
        negativeText: '取消',
        showIcon: false,
        onPositiveClick: async () => {
          const res = await DeleteChatList(currentMessage.value!.listId)
          if (res.code === 200) {
            imStore.getChatList()
            $msg({
              type: 'success',
              msg: '已从聊天列表中移除'
            })
            currentMessage.value = null
            selectedChat.value = null
          }
        }
      })
      break
    case 'block':
      // 处理拉黑用户
      dialog.warning({
        title: '拉黑确认',
        content: '确定要拉黑该用户吗？拉黑后将无法接收该用户的消息。',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: async () => {
          // 处理拉黑逻辑
          const res = await BlacklistFriend(currentMessage.value!.id)
          if (res.code === 200) {
            $msg({
              type: 'success',
              msg: '已拉黑该用户'
            })
          }
        }
      })
      break
  }

  showDropdown.value = false
}
</script>
