import { defineStore } from 'pinia'
import { reactive, toRefs } from 'vue'
import piniaPersistConfig from '@renderer/utils/persist'
import { Local } from '@renderer/utils/storage'
import { GetEmojiList } from '@renderer/service/api/user'

interface User {
  id?: number
  username?: string // 用户名
  nickname?: string // 昵称
  email?: string // 邮箱
  phone?: string // 手机号
  state?: number // 在线状态 1-在线 0-离线
  avatar?: string // 头像
  address?: string // 地址
  desc?: string // 个性签名
  gender?: number // 性别 1-男 2-女
  createdAt?: string // 注册时间
  updatedAt?: string // 更新时间
}

interface Emoji {
  name: string
  url: string
}

interface State {
  userInfo: User
  emojiList: Emoji[]
  isTop?: string
  winTop?: string
  isRightTop?: boolean
  fileType?: string
  filePath?: string
  historyPath?: string
  fileFullPath?: string
  historyFullPath?: string
  isHideMenu?: boolean
  isHide?: boolean
}

interface Action<T extends keyof State> {
  type: T
  value: State[T]
}

const useUserStore = defineStore(
  'user',
  () => {
    const state = reactive<State>({
      userInfo: {} as User,
      emojiList: [] as Emoji[],
      winTop: Local.get('winTop') || '0',
      isTop: Local.get('isTop') || '0',
      isRightTop: Local.get('isRightTop') || false,
      fileType: Local.get('fileType') || 'txt',
      filePath: Local.get('filePath') || '',
      historyPath: Local.get('historyPath') || '',
      fileFullPath: Local.get('fileFullPath') || '',
      historyFullPath: Local.get('historyFullPath') || '',
      isHideMenu: Local.get('isHideMenu') || false,
      isHide: Local.get('isHide') || false
    })

    const setUserInfo = async (action: any) => {
      state.userInfo = action.userInfo
    }

    const setTop = async <T extends keyof State>(action: Action<T>) => {
      state[action.type] = action.value
    }

    const setStatus = async <T extends keyof State>(action: Action<T>) => {
      state[action.type] = action.value
    }

    const setValue = async <T extends keyof State>(action: Action<T>) => {
      state[action.type] = action.value
    }

    // 获取表情列表
    const getEmojiList = async () => {
      try {
        const res = await GetEmojiList()
        if (res.code === 200) {
          state.emojiList = res.data
        }
      } catch (error) {
        console.error('获取表情列表失败:', error)
      }
    }

    return {
      ...toRefs(state),
      setUserInfo,
      setTop,
      setStatus,
      setValue,
      getEmojiList
    }
  },
  {
    persist: piniaPersistConfig('userInfo', ['userInfo', 'emojiList'])
  }
)

export default useUserStore
