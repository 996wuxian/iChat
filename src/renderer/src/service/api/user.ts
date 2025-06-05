import request from '../request'

const module = 'user/'

export function Register(data: any, showLoading: boolean = false, showMsg: boolean = false) {
  return request<any>({
    method: 'post',
    url: `${module}register`,
    data,
    showLoading,
    showMsg
  })
}

export function Login(data: any, showLoading: boolean = false, showMsg: boolean = false) {
  return request<any>({
    method: 'post',
    url: `${module}login`,
    data,
    showLoading,
    showMsg
  })
}

export function GetUserInfo(id: number, showLoading: boolean = false, showMsg: boolean = false) {
  return request<any>({
    method: 'get',
    url: `${module}info/${id}`,
    showLoading,
    showMsg
  })
}

// 更新用户信息
export function UpdateUserInfo(
  id: number,
  data: any,
  showLoading: boolean = true,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'patch',
    url: `${module}${id}`,
    data,
    showLoading,
    showMsg
  })
}

export function FindAllUsers(data: any, showLoading: boolean = true, showMsg: boolean = false) {
  return request<any>({
    method: 'post',
    url: `${module}findAll`,
    data,
    showLoading,
    showMsg
  })
}

// 添加好友
export function AddFriend(data: any, showLoading: boolean = true, showMsg: boolean = false) {
  return request<any>({
    method: 'post',
    url: `${module}addFriend`,
    data,
    showLoading,
    showMsg
  })
}

// 获取好友列表
export function GetFriendList(params: any, showLoading: boolean = false, showMsg: boolean = false) {
  return request<any>({
    method: 'get',
    url: `${module}friendList`,
    params,
    showLoading,
    showMsg
  })
}

// 更新好友信息
export function UpdateFriend(
  friendId: number,
  data: any,
  showLoading: boolean = true,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'patch',
    url: `${module}friend/${friendId}`,
    data,
    showLoading,
    showMsg
  })
}

// 删除好友
export function DeleteFriend(
  friendId: number,
  showLoading: boolean = true,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'delete',
    url: `${module}friend/${friendId}`,
    showLoading,
    showMsg
  })
}

export function CreateChatList(
  friendId: number,
  showLoading: boolean = true,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'post',
    url: `${module}chat/${friendId}`,
    showLoading,
    showMsg
  })
}

export function GetChatList(showLoading: boolean = false, showMsg: boolean = false) {
  return request<any>({
    method: 'get',
    url: `${module}chat/list`,
    showLoading,
    showMsg
  })
}

// 获取表情列表
export function GetEmojiList(showLoading: boolean = false, showMsg: boolean = false) {
  return request<any>({
    method: 'get',
    url: `${module}emoji/list`,
    showLoading,
    showMsg
  })
}

// 修改聊天列表状态
export function UpdateChatTop(
  chatId: number,
  isTop: string,
  showLoading: boolean = false,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'patch',
    url: `${module}updateChatTop/${chatId}`,
    data: { isTop },
    showLoading,
    showMsg
  })
}

// 修改免打扰状态
export function UpdateDisturb(
  chatId: number,
  is_disturb: string,
  showLoading: boolean = false,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'patch',
    url: `${module}disturb/${chatId}`,
    data: { is_disturb },
    showLoading,
    showMsg
  })
}

// 删除聊天列表
export function DeleteChatList(id: number, showLoading: boolean = false, showMsg: boolean = false) {
  return request<any>({
    method: 'delete',
    url: `${module}chat/${id}`,
    showLoading,
    showMsg
  })
}

// 拉黑好友
export function BlacklistFriend(
  friendId: number,
  showLoading: boolean = true,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'post',
    url: `${module}blacklist/${friendId}`,
    showLoading,
    showMsg
  })
}

// 取消拉黑好友
export function UnblacklistFriend(
  friendId: number,
  showLoading: boolean = true,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'post',
    url: `${module}unblacklist/${friendId}`,
    showLoading,
    showMsg
  })
}
