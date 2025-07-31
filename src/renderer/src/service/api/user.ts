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

// 创建群聊
export function CreateGroup(data: any, showLoading: boolean = true, showMsg: boolean = false) {
  return request<any>({
    method: 'post',
    url: `${module}group/create`,
    data,
    showLoading,
    showMsg
  })
}

// 获取用户所在的群聊列表
export function GetUserGroups(showLoading: boolean = false, showMsg: boolean = false) {
  return request<any>({
    method: 'get',
    url: `${module}group/list`,
    showLoading,
    showMsg
  })
}

// 获取群聊详情
export function GetGroupDetail(
  groupId: number,
  showLoading: boolean = false,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'get',
    url: `${module}group/${groupId}`,
    showLoading,
    showMsg
  })
}

// 修改群聊列表状态
export function UpdateGroupList(data: any, showLoading: boolean = false, showMsg: boolean = false) {
  return request<any>({
    method: 'post',
    url: `${module}group/updateGroupList/`,
    data,
    showLoading,
    showMsg
  })
}

// 移除群聊成员
export function RemoveGroupMember(
  groupId: number,
  memberId: number,
  showLoading: boolean = true,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'delete',
    url: `${module}group/${groupId}/member/${memberId}`,
    showLoading,
    showMsg
  })
}

// 删除群聊（解散群聊）
export function DeleteGroup(
  groupId: number,
  showLoading: boolean = true,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'delete',
    url: `${module}group/${groupId}`,
    showLoading,
    showMsg
  })
}

// 添加群成员
export function AddGroupMember(
  groupId: number,
  userIds: number[],
  showLoading: boolean = true,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'post',
    url: `${module}group/${groupId}/members`,
    data: { userIds },
    showLoading,
    showMsg
  })
}

// 发布群公告
export function PublishGroupAnnouncement(
  groupId: number,
  title: string,
  content: string,
  showLoading: boolean = true,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'post',
    url: `${module}group/${groupId}/announcements`,
    data: { title, content },
    showLoading,
    showMsg
  })
}

// 获取群公告列表
export function GetGroupAnnouncements(
  groupId: number,
  page: number = 1,
  limit: number = 10,
  showLoading: boolean = false,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'get',
    url: `${module}group/${groupId}/announcements`,
    params: { page, limit },
    showLoading,
    showMsg
  })
}

// 删除群公告
export function DeleteGroupAnnouncement(
  announcementId: number,
  showLoading: boolean = true,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'delete',
    url: `${module}announcements/${announcementId}`,
    showLoading,
    showMsg
  })
}

// 修改群公告
export function UpdateGroupAnnouncement(
  announcementId: number,
  title: string,
  content: string,
  showLoading: boolean = true,
  showMsg: boolean = false
) {
  return request<any>({
    method: 'put',
    url: `${module}announcements/${announcementId}`,
    data: { title, content },
    showLoading,
    showMsg
  })
}
