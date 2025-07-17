import request from '../request'

const module = 'message/'

// 获取两个用户之间的消息记录
export function findMessagesBetweenUsers(
  senderId: number,
  receiverId: number,
  page: number = 1,
  pageSize: number = 20,
  showLoading: boolean = true,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'get',
    url: `${module}between/${senderId}/${receiverId}`,
    params: {
      page,
      pageSize
    },
    showLoading,
    showMsg
  })
}

// 更新消息删除状态
export function updateDeleteStatus(
  messageId: number,
  userId: number,
  showLoading: boolean = true,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'patch',
    url: `${module}delete/${messageId}`,
    data: { userId },
    showLoading,
    showMsg
  })
}

export function uploadFileStatus(
  id: number,
  showLoading: boolean = false,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'patch',
    url: `${module}/fileStatus/${id}`,
    showLoading,
    showMsg
  })
}

// 获取群聊的消息记录
export function findGroupMessages(
  groupId: number,
  page: number = 1,
  pageSize: number = 20,
  showLoading: boolean = true,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'get',
    url: `${module}group/${groupId}`,
    params: {
      page,
      pageSize
    },
    showLoading,
    showMsg
  })
}
