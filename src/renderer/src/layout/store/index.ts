import { $msg } from '@renderer/config/interaction.config'
import { Local } from '@renderer/utils/storage'

// 添加锁定相关变量
const isLocked = ref(false)
const showLockDialog = ref(false)
const lockPassword = ref('')
const unlockPassword = ref('')
const passwordError = ref(false)

// 处理解锁
const handleUnlock = () => {
  const savedPassword = Local.get('lock_password')
  if (unlockPassword.value === savedPassword) {
    isLocked.value = false
    unlockPassword.value = ''
    passwordError.value = false
    $msg({
      type: 'success',
      msg: '解锁成功'
    })
  } else {
    passwordError.value = true
    $msg({
      type: 'error',
      msg: '密码错误'
    })
  }
}
export const useLayoutStore = () => {
  return {
    isLocked,
    showLockDialog,
    lockPassword,
    unlockPassword,
    passwordError,
    handleUnlock
  }
}
