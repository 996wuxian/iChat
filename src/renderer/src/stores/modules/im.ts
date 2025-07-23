import { defineStore } from 'pinia'
import { io, Socket } from 'socket.io-client'
import { ref } from 'vue'
import { Local, Session } from '@renderer/utils/storage'
import { $msg } from '@renderer/config/interaction.config'
import piniaPersistConfig from '@renderer/utils/persist'
import { GetChatList } from '@renderer/service/api/user'
import { findGroupMessages, findMessagesBetweenUsers } from '@renderer/service/api/message'

interface UserList {
  [username: string]: {
    list: ChatItem
    msgList: any[]
  }
}
interface ChatItem {
  id: number
  avatar?: string
  username: string
  nickname?: string
  lastMsg: string
  lastMsgTime: string
  unReadCount: number
  online: string
  chatType: string
  is_top: string
  is_disturb: string
  role?: string
}

interface SystemMessage {
  type: string
  targetUserId: number
  data: any
}

export const useImStore = defineStore(
  'im',
  () => {
    const socket = ref<Socket | null>(null)
    const isConnected = ref(false)
    const reconnectCount = ref(0)
    const heartbeatTimer = ref<NodeJS.Timeout | null>(null)
    const reconnectTimer = ref<NodeJS.Timeout | null>(null)
    const notices = ref<any[]>(Local.get('notices') || [])
    const noticeCount = ref(0)
    const userList = ref<UserList>(Local.get('im')?.userList || {})
    const receiveId = ref()
    const chatWithUserName = ref<string>()
    const msgCurrentPage = ref(1)
    const msgHistoryEnd = ref(false)
    const originalMessage = ref()

    const getReconnectDelay = () => {
      if (reconnectCount.value <= 50) return 1000
      if (reconnectCount.value <= 100) return 5000
      if (reconnectCount.value <= 500) return 10000
      return 20000
    }
    // 初始化 socket 连接
    const initSocket = () => {
      console.log('初始化 socket 连接')
      if (!socket.value) {
        const user = Local.get('userInfo')
        const token = Session.get('token')
        if (!user?.userInfo?.id || !token) {
          console.log('无用户信息或token，不创建socket连接')
          return
        }

        socket.value = io('http://localhost:9528', {
          transports: ['websocket'],
          autoConnect: true
        })

        // 连接成功
        socket.value.on('connect', () => {
          isConnected.value = true
          reconnectCount.value = 0
          stopReconnect()
          const user = Local.get('userInfo')
          let userInfo
          if (user) {
            userInfo = user.userInfo
          }
          console.log('%c [im] 链接已成功建立', 'color: green')
          if (!userInfo?.id && !Session.get('token')) {
            console.error('用户信息不存在/token不存在')
            return
          }
          // 发送认证信息
          socket.value?.emit(
            'createSocket',
            {
              userId: userInfo?.id,
              platform: 'Pc',
              token: Session.get('token')
            },
            (response: any) => {
              if (response.code === 200) {
                startHeartbeat()
                initNoticeCount()
                getChatList()
              } else {
                console.error('认证失败:', response.msg)
              }
            }
          )
        })

        // 连接断开
        socket.value.on('disconnect', () => {
          isConnected.value = false
          console.log('Socket disconnected')
          stopHeartbeat()
          startReconnect()
        })

        // 连接错误
        socket.value.on('connect_error', (error) => {
          console.error('Socket connection error:', error)
          isConnected.value = false
          stopHeartbeat()
          startReconnect()
        })

        // 心跳检测
        socket.value.on('pong', () => {
          console.log(
            `%c ${new Date().toLocaleString()} >>>>> im心跳正常,继续下一次心跳检测`,
            'color: green'
          )
        })

        // 监听系统消息
        socket.value.on('systemMessage', (message: SystemMessage) => {
          handleSystemMessage(message)
        })

        socket.value.on('createSocketResponse', (message: any) => {
          handleCreateSocketResponse(message)
        })

        socket.value.on('messageSent', (message: any) => {
          console.log('发送的消息:', message)
        })

        socket.value.on('receivePrivateMessage', async (message: any) => {
          // 同时显示桌面通知
          window.api.sendNotification(
            `收到来自 ${message.sender.nickname || message.sender.username} 的消息`,
            `${message.content}`,
            message.sender.id,
            message.sender.username,
            message.sender.avatar // 传入好友头像作为图标
          )

          // 检查发送消息的用户是否在聊天列表中
          if (!userList.value[message.sender.username]) {
            // 如果不在列表中，重新获取聊天列表
            console.log(`用户 ${message.sender.username} 不在聊天列表中，重新获取列表`)
            await getChatList()

            // 如果获取列表后仍然不存在，可能是API尚未更新，创建一个临时条目
            if (!userList.value[message.sender.username]) {
              userList.value[message.sender.username] = {
                list: {
                  id: message.sender.id,
                  username: message.sender.username,
                  nickname: message.sender.nickname,
                  avatar: message.sender.avatar,
                  lastMsg: '',
                  lastMsgTime: new Date().toLocaleString(),
                  unReadCount: 0,
                  online: '1',
                  is_top: '0',
                  is_disturb: '0',
                  chatType: 'friend'
                },
                msgList: []
              }
            }
          }

          userList.value[message.sender.username].msgList.push(message)
          userList.value[message.sender.username].list.lastMsg = message.content
          userList.value[message.sender.username].list.lastMsgTime = new Date(
            message.createdAt
          ).toLocaleString()

          if (chatWithUserName.value && userList.value[chatWithUserName.value]) {
            if (chatWithUserName.value === message.sender.username) {
              userList.value[chatWithUserName.value].list.unReadCount = 0
            } else {
              userList.value[message.sender.username].list.unReadCount++
            }
            oneMsgRead(message.id)
          } else {
            userList.value[message.sender.username].list.unReadCount++
          }

          console.log('收到的消息:', message)
        })

        // 添加消息已读回执处理
        socket.value.on('messageRead', (data: { messageId: number; status: string }) => {
          if (chatWithUserName.value && userList.value[chatWithUserName.value]) {
            userList.value[chatWithUserName.value].msgList.map((msg) => {
              if (msg.id === data.messageId) {
                msg.status = data.status
              }
            })
          }
        })

        // 添加消息已读回执处理
        socket.value.on('messagesAllRead', (data: { status: boolean }) => {
          if (!data.status) return
          if (chatWithUserName.value && userList.value[chatWithUserName.value]) {
            userList.value[chatWithUserName.value].msgList.map((msg) => {
              msg.status = '1'
            })
          }
        })

        // 消息撤回回执
        socket.value.on(
          'messageRecalled',
          (data: { messageId: number; senderId: number; receiverId: number; time: Date }) => {
            // 更新本地消息状态
            if (chatWithUserName.value && userList.value[chatWithUserName.value]) {
              const msgList = userList.value[chatWithUserName.value].msgList
              const msgIndex = msgList.findIndex((msg) => msg.id === data.messageId)

              if (msgIndex !== -1) {
                // 将消息内容替换为撤回提示
                msgList[msgIndex] = {
                  ...msgList[msgIndex],
                  content: '[对方已撤回] 一条消息',
                  type: 'recall'
                }

                // 更新最后一条消息显示
                if (msgIndex === msgList.length - 1) {
                  userList.value[chatWithUserName.value].list.lastMsg = '[已撤回] 一条消息'
                  userList.value[chatWithUserName.value].list.lastMsgTime = new Date(
                    data.time
                  ).toLocaleString()
                }
              }
            }
          }
        )

        // 监听消息撤回结果
        socket.value.on(
          'messageRecallResult',
          (response: {
            code: number
            msg: string
            data: {
              messageId: number
              time: Date
            }
          }) => {
            if (response.code === 200) {
              // 更新本地消息状态
              if (chatWithUserName.value && userList.value[chatWithUserName.value]) {
                const msgList = userList.value[chatWithUserName.value].msgList
                const msgIndex = msgList.findIndex((msg) => msg.id === response.data.messageId)

                if (msgIndex !== -1) {
                  // 将消息内容替换为撤回提示
                  msgList[msgIndex] = {
                    ...msgList[msgIndex],
                    content: '[已撤回] 一条消息',
                    type: 'recall',
                    originalMessage: originalMessage.value
                  }

                  // 更新最后一条消息显示
                  if (msgIndex === msgList.length - 1) {
                    userList.value[chatWithUserName.value].list.lastMsg = '[已撤回] 一条消息'
                    userList.value[chatWithUserName.value].list.lastMsgTime = new Date(
                      response.data.time
                    ).toLocaleString()
                  }
                }
              }
            }
          }
        )

        // 收到群聊消息
        socket.value.on('receiveGroupMessage', async (message: any) => {
          // 需要找到对应的群聊username
          // 由于消息中只有groupId，需要在userList中找到对应的群聊
          let groupUsername = null
          for (const [username, chatData] of Object.entries(userList.value)) {
            if (chatData.list.chatType === 'group' && chatData.list.id === message.groupId) {
              groupUsername = username
              break
            }
          }

          // 如果找不到对应的群聊，重新获取聊天列表
          if (!groupUsername) {
            console.log(`群聊 ${message.groupId} 不在聊天列表中，重新获取列表`)
            await getChatList()

            // 重新查找
            for (const [username, chatData] of Object.entries(userList.value)) {
              if (chatData.list.chatType === 'group' && chatData.list.id === message.groupId) {
                groupUsername = username
                break
              }
            }
          }

          // 如果仍然找不到，说明可能是新群聊或数据异常
          if (!groupUsername) {
            console.warn(`无法找到群聊 ${message.groupId} 的对应记录`)
            return
          }

          // 将消息添加到群聊的消息列表中
          userList.value[groupUsername].msgList.push(message)
          userList.value[groupUsername].list.lastMsg = message.content
          userList.value[groupUsername].list.lastMsgTime = new Date(
            message.createdAt
          ).toLocaleString()

          // 处理未读消息计数
          if (chatWithUserName.value && userList.value[chatWithUserName.value]) {
            if (chatWithUserName.value === groupUsername) {
              // 如果当前正在查看这个群聊，标记为已读
              userList.value[groupUsername].list.unReadCount = 0
              // 如果有群聊消息已读接口，可以调用
              // oneMsgRead(message.id)
            } else {
              // 如果不是当前查看的群聊，增加未读计数
              userList.value[groupUsername].list.unReadCount++
            }
          } else {
            // 如果没有选中任何聊天，增加未读计数
            userList.value[groupUsername].list.unReadCount++
          }
        })
      }
    }

    const handleCreateSocketResponse = (message: any) => {
      $msg({
        type: 'error',
        msg: message.msg
      })
    }

    const startHeartbeat = () => {
      stopHeartbeat() // 先清除可能存在的定时器
      console.log(`%c ${new Date().toLocaleString()} >>>>> im开始心跳检测`, 'color: green')
      heartbeatTimer.value = setInterval(() => {
        if (socket.value && isConnected.value) {
          socket.value.emit('ping')
        }
      }, 10000) // 10秒一次心跳
    }

    // 停止心跳检测
    const stopHeartbeat = () => {
      if (heartbeatTimer.value) {
        clearInterval(heartbeatTimer.value)
        heartbeatTimer.value = null

        console.log(`%c ${new Date().toLocaleString()} >>>>> im停止心跳检测`, 'color: green')
      }
    }

    // 开始重连
    const startReconnect = () => {
      if (reconnectTimer.value) return // 如果已经在重连中，不重复启动

      const user = Local.get('userInfo')
      const token = Session.get('token')
      if (!user?.userInfo?.id || !token) {
        console.log('无用户信息或token，停止重连')
        stopReconnect()
        return
      }
      const attemptReconnect = () => {
        reconnectCount.value++
        console.log(`第 ${reconnectCount.value} 次重连尝试`)
        initSocket()
      }

      reconnectTimer.value = setInterval(() => {
        // 每次重连前都检查用户信息和token
        const currentUser = Local.get('userInfo')
        const currentToken = Session.get('token')
        if (!currentUser?.userInfo?.id || !currentToken) {
          console.log('用户信息或token已失效，停止重连')
          stopReconnect()
          return
        }
        attemptReconnect()
      }, getReconnectDelay())

      // 立即执行第一次重连
      attemptReconnect()
    }

    // 停止重连
    const stopReconnect = () => {
      if (reconnectTimer.value) {
        clearInterval(reconnectTimer.value)
        reconnectTimer.value = null
      }
    }

    // 断开连接
    const disconnect = () => {
      stopHeartbeat()
      stopReconnect()
      if (socket.value) {
        socket.value.disconnect()
        socket.value.removeAllListeners() // 添加这行，移除所有事件监听
        socket.value = null
      }
      isConnected.value = false
      reconnectCount.value = 0
    }

    // 发送消息
    const emit = (event: string, data: any) => {
      if (socket.value && isConnected.value) {
        socket.value.emit(event, data)
      }
    }

    // 监听事件
    const on = (event: string, callback: (...args: any[]) => void) => {
      if (socket.value) {
        socket.value.on(event, callback)
      }
    }

    // 移除事件监听
    const off = (event: string, callback?: (...args: any[]) => void) => {
      if (socket.value) {
        socket.value.off(event, callback)
      }
    }

    // 处理系统消息
    const handleSystemMessage = (message: SystemMessage) => {
      console.log('%c [im] 收到系统消息', 'color: blue', message)

      switch (message.type) {
        case 'friendRequest':
          handleFriendRequest(message.data, 'request')
          break

        case 'friendAccepted':
          handleFriendRequest(message.data, 'accept')
          break
        case 'friendRejected':
          handleFriendRequest(message.data, 'rejected')
          break
        default:
          console.log('未知的系统消息类型:', message.type)
      }
    }

    // 处理好友请求消息
    const handleFriendRequest = (data: any, type: string) => {
      const { fromUserName } = data

      switch (type) {
        case 'request':
          $msg({
            type: 'info',
            msg: `收到来自 ${fromUserName} 的好友请求`
          })
          break
        case 'accept':
          $msg({
            type: 'success',
            msg: `来自 ${fromUserName} 的好友请求已通过`
          })
          break
        case 'rejected':
          $msg({
            type: 'error',
            msg: `来自 ${fromUserName} 的好友请求已拒绝`
          })
          break
      }

      // 计算新通知的 ID
      const lastNotice = notices.value[notices.value.length - 1]
      const newId = lastNotice ? lastNotice.id + 1 : 1

      notices.value.push({
        id: newId,
        isRead: false,
        type: 'friendRequest',
        ...data
      })
      initNoticeCount()
    }

    const initNoticeCount = () => {
      if (!notices.value.length) return
      notices.value.forEach((notice) => {
        if (!notice.isRead) {
          noticeCount.value++
        }
      })
    }

    const initNotices = () => {
      notices.value = Local.get('notices') || []
      noticeCount.value = 1
    }

    const markNoticeAsRead = (notice: any) => {
      if (!notice.isRead) {
        noticeCount.value--
        notices.value = notices.value.map((item) =>
          item.id === notice.id ? { ...item, isRead: true } : item
        )
      }
    }

    // 获取聊天列表
    const getChatList = async () => {
      try {
        const res = await GetChatList()
        if (res.code === 200) {
          // 获取当前用户ID
          const currentUser = Local.get('userInfo')
          const currentUserId = currentUser?.userInfo?.id

          // 重置 userList
          userList.value = {}
          console.log(userList.value, 'userList')

          res.data.forEach((item: any) => {
            // 处理好友聊天
            if (item.chatType === 'friend') {
              // 跳过自己的用户ID
              if (item.friend.id === currentUserId) return

              userList.value[item.friend.username] = {
                list: {
                  ...item.friend,
                  chatType: 'friend',
                  lastMsg: item.lastMsg,
                  unReadCount: item.unReadCount,
                  is_top: item.is_top,
                  is_disturb: item.is_disturb,
                  listId: item.id,
                  lastMsgTime: item.lastMsgTime ? new Date(item.lastMsgTime).toLocaleString() : ''
                },
                msgList: []
              }
            }
            // 处理群聊
            else if (item.chatType === 'group') {
              userList.value[item.username] = {
                list: {
                  id: item.id,
                  chatType: 'group',
                  username: item.username,
                  nickname: item.name,
                  avatar: item.avatar,
                  lastMsg: item.lastMsg,
                  unReadCount: item.unReadCount || 0,
                  is_top: item.is_top,
                  is_disturb: item.is_disturb,
                  lastMsgTime: item.lastMsgTime ? new Date(item.lastMsgTime).toLocaleString() : '',
                  online: '1', // 群聊默认在线
                  role: item.role
                },
                msgList: []
              }
            }
          })
        }
      } catch (error) {
        console.error('获取聊天列表失败:', error)
      }
    }

    // 发送消息
    const sendMsg = async (receiverId: number, content: string, type: string) => {
      if (!socket.value || !isConnected.value) {
        try {
          await startReconnect()
        } catch {
          $msg({
            type: 'error',
            msg: '网络开小差了，请稍后重试'
          })
          return false
        }
      }

      if (socket.value && isConnected.value) {
        return new Promise((resolve) => {
          const sendData = {
            message: content,
            type
          } as any
          if (type === 'group') {
            sendData.groupId = receiverId
            sendData.isGroup = true
          } else {
            sendData.toUserId = receiverId
          }
          socket.value?.emit('sendTextMessage', sendData, (response: any) => {
            console.log('🚀 ~ socket.value?.emit ~ response:', response)
            if (response.code === 200) {
              if (chatWithUserName.value && userList.value[chatWithUserName.value]) {
                userList.value[chatWithUserName.value].msgList.push(response.data)
                userList.value[chatWithUserName.value].list.lastMsg =
                  '[送达]' + response.data.content
                userList.value[chatWithUserName.value].list.lastMsgTime = new Date(
                  response.data.createdAt
                ).toLocaleString()
              }
              resolve(true)
            } else {
              $msg({
                type: 'error',
                msg: response.msg || '消息发送失败'
              })
              resolve(false)
            }
          })
        })
      }

      return false
    }
    // 发送卡片消息
    const sendCardMsg = async (receiverId: number, content: string, cardContent: any) => {
      if (!socket.value || !isConnected.value) {
        try {
          await startReconnect()
        } catch {
          $msg({
            type: 'error',
            msg: '网络开小差了，请稍后重试'
          })
          return false
        }
      }

      if (socket.value && isConnected.value) {
        return new Promise((resolve) => {
          socket.value?.emit(
            'sendCardMessage',
            {
              toUserId: receiverId,
              message: content,
              cardContent
            },
            (response: any) => {
              if (response.code === 200) {
                if (chatWithUserName.value && userList.value[chatWithUserName.value]) {
                  userList.value[chatWithUserName.value].msgList.push(response.data)
                  userList.value[chatWithUserName.value].list.lastMsg =
                    '[送达]' + response.data.content
                  userList.value[chatWithUserName.value].list.lastMsgTime = new Date(
                    response.data.createdAt
                  ).toLocaleString()
                }
                resolve(true)
              } else {
                $msg({
                  type: 'error',
                  msg: response.msg || '消息发送失败'
                })
                resolve(false)
              }
            }
          )
        })
      }

      return false
    }

    // 获取消息历史记录
    const getMessageHistory = async (
      senderId: number,
      receiverId: number,
      chatType: string = 'friend'
    ) => {
      try {
        if (msgHistoryEnd.value) return

        let res
        // 根据聊天类型调用不同的 API
        if (chatType === 'group') {
          res = await findGroupMessages(receiverId, msgCurrentPage.value)
          console.log('🚀 ~ res:', res)
        } else {
          res = await findMessagesBetweenUsers(senderId, receiverId, msgCurrentPage.value)
        }

        if (res.code === 200) {
          if (!res.data.list || res.data.list.length === 0) {
            if (chatWithUserName.value && userList.value[chatWithUserName.value]) {
              userList.value[chatWithUserName.value].msgList = []
              userList.value[chatWithUserName.value].list.unReadCount = 0
              msgHistoryEnd.value = true
              return true
            }
            return
          }

          if (chatWithUserName.value && userList.value[chatWithUserName.value]) {
            // 如果是第一页，清空现有消息列表
            if (msgCurrentPage.value === 1) {
              userList.value[chatWithUserName.value].msgList = [...res.data.list]
            } else {
              // 不是第一页才追加到现有列表前面
              userList.value[chatWithUserName.value].msgList = [
                ...res.data.list,
                ...userList.value[chatWithUserName.value].msgList
              ]
            }
            userList.value[chatWithUserName.value].list.unReadCount = 0
          }
          return true
        } else {
          $msg({
            type: 'error',
            msg: res.msg || '获取消息历史记录失败'
          })
          return []
        }
      } catch (error) {
        console.error('获取消息历史记录失败:', error)
        $msg({
          type: 'error',
          msg: '获取消息历史记录失败'
        })
        return []
      }
    }
    // 标记单条消息为已读
    const oneMsgRead = (messageId: number) => {
      // 先检查本地消息状态
      const message = userList.value[chatWithUserName.value!].msgList.find(
        (item) => item.id === messageId
      )
      // 如果消息不存在或已经是已读状态，直接返回
      if (!message || message.status === '1') {
        return
      }

      if (socket.value && isConnected.value) {
        socket.value.emit('oneMsgRead', { messageId }, (response: any) => {
          if (response.code === 200) {
            // 更新本地消息状态
            if (chatWithUserName.value && userList.value[chatWithUserName.value]) {
              userList.value[chatWithUserName.value].msgList = userList.value[
                chatWithUserName.value
              ].msgList.map((msg) => (msg.id === messageId ? { ...msg, status: '1' } : msg))
            }
          } else {
            $msg({
              type: 'error',
              msg: response.msg || '标记已读失败'
            })
          }
        })
      }
    }

    // 标记与指定用户的所有消息为已读
    const allMsgRead = (fromUserId: number) => {
      if (socket.value && isConnected.value) {
        socket.value.emit('allMsgRead', { fromUserId }, (response: any) => {
          if (response.code === 200) {
            if (chatWithUserName.value && userList.value[chatWithUserName.value]) {
              userList.value[chatWithUserName.value].msgList = userList.value[
                chatWithUserName.value
              ].msgList.map((msg) => {
                if (msg.senderId === fromUserId) {
                  return { ...msg, status: '1' }
                }
                return msg
              })
            }
          } else {
            $msg({
              type: 'error',
              msg: response.msg || '标记已读失败'
            })
          }
        })
      }
    }

    // 发送消息撤回请求
    const recallMessage = (messageId: number) => {
      if (!socket.value || !isConnected.value) {
        $msg({
          type: 'error',
          msg: '网络连接已断开'
        })
        return false
      }

      return new Promise((resolve) => {
        socket.value?.emit('recallMessage', { messageId }, (response: any) => {
          if (response.code === 200) {
            resolve(true)
          } else {
            $msg({
              type: 'error',
              msg: response.msg || '消息撤回失败'
            })
            resolve(false)
          }
        })
      })
    }

    // 将所有通知标记为已读
    const markAllNoticesAsRead = () => {
      if (!notices.value.length) return

      notices.value = notices.value.map((notice) => ({
        ...notice,
        isRead: true
      }))

      noticeCount.value = 0
      Local.set('notices', notices.value)

      $msg({
        type: 'success',
        msg: '已将所有通知标记为已读'
      })
    }

    // 清空所有通知
    const clearAllNotices = () => {
      if (!notices.value.length) return

      notices.value = []
      noticeCount.value = 0
      Local.set('notices', [])

      $msg({
        type: 'success',
        msg: '已清空所有通知'
      })
    }

    return {
      socket,
      isConnected,
      reconnectCount,
      initSocket,
      initNotices,
      disconnect,
      emit,
      on,
      off,
      notices,
      noticeCount,
      markNoticeAsRead,
      getChatList,
      userList,
      chatWithUserName,
      receiveId,
      sendMsg,
      sendCardMsg,
      msgCurrentPage,
      getMessageHistory,
      msgHistoryEnd,
      oneMsgRead,
      allMsgRead,
      recallMessage,
      originalMessage,
      markAllNoticesAsRead,
      clearAllNotices
    }
  },
  {
    persist: piniaPersistConfig('im', ['notices', 'userList'])
  }
)
