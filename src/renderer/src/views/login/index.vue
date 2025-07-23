<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Session } from '@renderer/utils/storage'
import { Register, Login } from '@renderer/service/api/user'
import { $msg } from '@renderer/config/interaction.config'
import useUserStore from '@renderer/stores/modules/user'
import { useImStore } from '@renderer/stores/modules/im'
const userStore = useUserStore()
const imStore = useImStore()

const router = useRouter()
const username = ref('')
const password = ref('')
const phone = ref('')
const isLoggingIn = ref(false)
const showHistory = ref(false)
const historyAccounts = ref<any[]>([])
const isRegisterMode = ref(false)
const showpassword = ref(false)
const showMoreOptions = ref(false)
const successVisible = ref(false)
const rememberPassword = ref(false) // 记住密码
const autoLogin = ref(false) // 自动登录

// 加载历史账号
const loadHistoryAccounts = async () => {
  try {
    const accounts = await window.api.getAccounts()
    historyAccounts.value = accounts

    // 如果存在历史账号且当前用户名为空，自动选择第一个账号
    if (accounts.length > 0 && !username.value) {
      await selectAccount(accounts[0])
    }
  } catch (error) {
    console.error('加载历史账号失败:', error)
  }
}

// 检查自动登录
const checkAutoLogin = async () => {
  try {
    const autoLoginAccount = await window.api.getAutoLoginAccount()
    if (autoLoginAccount) {
      username.value = autoLoginAccount.username
      password.value = autoLoginAccount.password
      autoLogin.value = true
      rememberPassword.value = true
      // 自动执行登录
      await handleLogin()
    }
  } catch (error) {
    console.error('检查自动登录失败:', error)
  }
}

const handleRegister = () => {
  isRegisterMode.value = true
  showMoreOptions.value = false
}

const switchToLogin = () => {
  isRegisterMode.value = false
  // 清空注册表单
  username.value = ''
  phone.value = ''
  password.value = ''
  successVisible.value = false
}

const submitRegister = async () => {
  if (!username.value) {
    $msg({
      type: 'warning',
      msg: '请输入昵称'
    })
    return
  }
  if (!phone.value) {
    $msg({
      type: 'warning',
      msg: '请输入手机号'
    })
    return
  }
  if (!password.value) {
    $msg({
      type: 'warning',
      msg: '请输入密码'
    })
    return
  }
  const { code, data } = await Register(
    {
      nickname: username.value,
      phone: phone.value,
      password: password.value
    },
    false,
    true
  )
  if (code !== 200) return
  userStore.setUserInfo({ userInfo: data })
  username.value = data.username
  successVisible.value = true
}

const handleLogin = async () => {
  if (!username.value) {
    $msg({
      type: 'warning',
      msg: '请输入账号'
    })
    return
  }
  if (!password.value) {
    $msg({
      type: 'warning',
      msg: '请输入密码'
    })
    return
  }
  // 防止重复点击
  if (isLoggingIn.value) return

  isLoggingIn.value = true

  const { code, data } = await Login(
    {
      username: username.value,
      password: password.value
    },
    false,
    true
  )

  isLoggingIn.value = false

  if (code !== 200) return

  // 登录成功后保存账号信息
  try {
    // 如果选择了自动登录，先清除其他账号的自动登录状态
    if (autoLogin.value) {
      await window.api.clearAutoLogin()
    }
    // 总是保存账号信息，但根据选项决定是否保存密码
    await window.api.saveAccount(
      username.value,
      password.value,
      autoLogin.value,
      rememberPassword.value
    )
    // 重新加载历史账号列表
    await loadHistoryAccounts()
  } catch (error) {
    console.error('保存账号信息失败:', error)
  }

  // 这里模拟登录成功
  await Session.set('token', data.token)
  await Session.set('refresh_token', data.refresh_token)
  await userStore.setUserInfo({ userInfo: data.userInfo })
  imStore.initSocket()
  window.api.loginSuccess()
}

// 登录回调处理函数
const handleLoginReply = (data: string) => {
  console.log('login-callback', data)
  isLoggingIn.value = false
  if (data === 'success') {
    router.push('/')
  }
}

// 组件挂载时添加事件监听
onMounted(async () => {
  // 移除可能存在的旧监听器
  window.api.onLoginReply(handleLoginReply)
  // 加载历史账号
  await loadHistoryAccounts()
  // 检查自动登录
  await checkAutoLogin()
})

const showPassword = ref(false)

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const clearUsername = () => {
  username.value = ''
}

const clearPhone = () => {
  phone.value = ''
}

const clearPassword = () => {
  password.value = ''
}

const selectAccount = async (account: any) => {
  username.value = account.username
  showHistory.value = false

  try {
    const accounts = await window.api.getAccounts()
    const fullAccount = accounts.find((acc: any) => acc.username === account.username)
    if (fullAccount) {
      password.value = fullAccount.password || ''
      rememberPassword.value = fullAccount.rememberPassword || false
      autoLogin.value = fullAccount.autoLogin || false
    }
  } catch (error) {
    console.error('获取账号详情失败:', error)
  }
}

const deleteUser = async (account: any) => {
  try {
    await window.api.removeAccount(account.username)
    await loadHistoryAccounts()
    $msg({
      type: 'success',
      msg: '删除成功'
    })
  } catch (error) {
    console.error('删除账号失败:', error)
    $msg({
      type: 'error',
      msg: '删除失败'
    })
  }
}

const handleMoreOptions = () => {
  showMoreOptions.value = !showMoreOptions.value
}

const closeWindow = () => {
  window.api.closeWindow()
}

async function copyToClipboard(text: any) {
  try {
    await navigator.clipboard.writeText(text)
    $msg({
      type: 'success',
      msg: '复制成功'
    })
    return true
  } catch {
    $msg({
      type: 'error',
      msg: '复制失败'
    })
    return false
  }
}
</script>

<template>
  <div
    class="h-455px w-325px overflow-hidden flex flex-col items-center justify-center m-auto mt-2px rounded-10px shadow-[0px_0px_10px_rgba(0,0,0,0.1)] drag theme-bg"
  >
    <div class="absolute left-20px top-10px cursor-pointer no-drag text-primary font-700">
      iChat
    </div>
    <div class="flex absolute right-10px top-10px cursor-pointer no-drag text-primary">
      <i i-solar-close-circle-outline @click="closeWindow"></i>
    </div>
    <img
      v-if="!successVisible"
      :class="isRegisterMode ? 'w-200px' : 'w-250px '"
      class="mb-20px"
      src="@renderer/assets/imgs/login.png"
      alt=""
    />
    <div v-if="!isRegisterMode" class="no-drag w-[calc(100%-90px)]">
      <div
        class="mb-20px w-full p-12px border border-[#ddd] rounded-8px shadow-[0px_0px_10px_rgba(0,0,0,0.1)] text-center bg-[var(--input-bg)] relative"
      >
        <input
          v-model="username"
          type="text"
          placeholder="请输入账号"
          class="outline-none border-none w-100px text-16px placeholder:text-[#777] bg-transparent text-primary text-center"
          maxlength="10"
        />
        <div
          class="absolute right-12px top-1/2 -translate-y-1/2 flex items-center gap-8px text-[#777]"
        >
          <i
            v-show="username"
            i-solar-close-circle-outline
            class="cursor-pointer hover:text-primary transition-colors"
            @click="clearUsername"
          ></i>
          <i
            i-solar-alt-arrow-down-outline
            class="cursor-pointer hover:text-primary transition-colors transition-all duration-300"
            :class="{ 'rotate-180 transition-all duration-300': showHistory }"
            @click="showHistory = !showHistory"
          ></i>
        </div>
        <!-- 历史账号下拉框 -->
        <div
          v-if="showHistory"
          class="absolute left-0 right-0 top-[calc(100%+4px)] theme-bg rounded-4px shadow-lg z-10 text-left"
        >
          <div
            v-for="account in historyAccounts"
            :key="account.username"
            class="px-12px py-8px hover:bg-gray cursor-pointer text-primary transition-all duration-300 rd-8px flex justify-between items-center"
            @click="selectAccount(account)"
          >
            {{ account.username }}
            <i i-solar-close-circle-outline @click.stop="deleteUser(account)"></i>
          </div>
        </div>
      </div>
      <div
        class="mb-10px w-full p-12px border border-[#ddd] rounded-8px shadow-[0px_0px_10px_rgba(0,0,0,0.1)] text-center bg-[var(--input-bg)] relative"
      >
        <input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="请输入密码"
          class="outline-none border-none w-100px text-16px placeholder:text-[#777] bg-transparent text-primary text-center"
          maxlength="20"
        />
        <div
          class="absolute right-12px top-1/2 -translate-y-1/2 flex items-center gap-10px text-[#777]"
        >
          <i
            v-show="password"
            i-solar-close-circle-outline
            class="cursor-pointer hover:text-primary transition-colors"
            @click="clearPassword"
          ></i>
          <i
            v-if="!showPassword"
            i-solar-eye-closed-line-duotone
            class="cursor-pointer hover:text-primary transition-colors"
            @click="togglePassword"
          ></i>
          <i
            v-else
            i-solar-eye-line-duotone
            class="cursor-pointer hover:text-primary transition-colors"
            @click="togglePassword"
          ></i>
        </div>
      </div>

      <!-- 记住密码和自动登录选项 -->
      <div class="mb-5px flex gap-8px text-12px justify-between">
        <label
          class="flex items-center gap-8px cursor-pointer text-[#777] hover:text-primary transition-colors"
        >
          <input
            v-model="rememberPassword"
            type="checkbox"
            class="w-14px h-14px accent-[var(--theme-color)]"
          />
          <span>记住密码</span>
        </label>
        <label
          v-if="rememberPassword"
          class="flex items-center gap-8px cursor-pointer text-[#777] hover:text-primary transition-colors"
        >
          <input
            v-model="autoLogin"
            type="checkbox"
            class="w-14px h-14px accent-[var(--theme-color)]"
          />
          <span>自动登录</span>
        </label>
      </div>

      <button
        :disabled="isLoggingIn"
        class="w-full p-10px text-white border-none rounded-8px cursor-pointer text-14px disabled:cursor-not-allowed bg-[var(--theme-color)] hover:bg-[#8ea0fa] transition-all"
        @click="handleLogin"
      >
        {{ isLoggingIn ? '登录中...' : '登录' }}
      </button>
    </div>
    <div
      v-if="!isRegisterMode"
      class="flex items-center gap-20px mt-20px color-[var(--theme-color)] text-14px cursor-pointer no-drag hover:color-[#8ea0fa] transition-all"
    >
      <div>扫码登录</div>
      <div class="relative">
        <div @click="handleMoreOptions">更多选项</div>
        <div
          v-if="showMoreOptions"
          class="absolute left-50% -translate-x-50% -top-90px theme-bg rounded-4px shadow-lg z-10 text-center min-w-100px p-5px"
        >
          <div
            class="px-12px py-8px hover:bg-gray cursor-pointer hover:c-[#fff] transition-all duration-300 rd-8px"
            @click="handleRegister"
          >
            注册用户
          </div>
          <div
            class="px-12px py-8px hover:bg-gray cursor-pointer hover:c-[#fff] transition-all duration-300 rd-8px"
          >
            找回密码
          </div>
        </div>
      </div>
    </div>

    <!-- 注册表单 -->
    <div v-if="isRegisterMode && !successVisible" class="no-drag w-[calc(100%-90px)]">
      <div
        class="mb-20px w-full p-12px border border-[#ddd] rounded-8px shadow-[0px_0px_10px_rgba(0,0,0,0.1)] text-center bg-[var(--input-bg)] relative"
      >
        <input
          v-model="username"
          type="text"
          placeholder="请输入昵称"
          class="outline-none border-none w-100px text-16px placeholder:text-[#777] bg-transparent text-primary text-center"
          maxlength="10"
        />
        <div
          class="absolute right-12px top-1/2 -translate-y-1/2 flex items-center gap-8px text-[#777]"
        >
          <i
            v-show="username"
            i-solar-close-circle-outline
            class="cursor-pointer hover:text-primary transition-colors"
            @click="clearUsername"
          ></i>
        </div>
      </div>
      <div
        class="mb-20px w-full p-12px border border-[#ddd] rounded-8px shadow-[0px_0px_10px_rgba(0,0,0,0.1)] text-center bg-[var(--input-bg)] relative"
      >
        <input
          v-model="phone"
          type="tel"
          placeholder="请输入手机号"
          class="outline-none border-none w-100px text-16px placeholder:text-[#777] bg-transparent text-primary text-center"
          maxlength="11"
        />
        <div
          class="absolute right-12px top-1/2 -translate-y-1/2 flex items-center gap-8px text-[#777]"
        >
          <i
            v-show="phone"
            i-solar-close-circle-outline
            class="cursor-pointer hover:text-primary transition-colors"
            @click="clearPhone"
          ></i>
        </div>
      </div>
      <div
        class="mb-20px w-full p-12px border border-[#ddd] rounded-8px shadow-[0px_0px_10px_rgba(0,0,0,0.1)] text-center bg-[var(--input-bg)] relative"
      >
        <input
          v-model="password"
          :type="showpassword ? 'text' : 'password'"
          placeholder="请输入密码"
          class="outline-none border-none w-100px text-16px placeholder:text-[#777] bg-transparent text-primary text-center"
          maxlength="20"
        />
        <div
          class="absolute right-12px top-1/2 -translate-y-1/2 flex items-center gap-10px text-[#777]"
        >
          <i
            v-show="password"
            i-solar-close-circle-outline
            class="cursor-pointer hover:text-primary transition-colors"
            @click="clearPassword"
          ></i>
          <i
            v-if="!showpassword"
            i-solar-eye-closed-line-duotone
            class="cursor-pointer hover:text-primary transition-colors"
            @click="showpassword = true"
          ></i>
          <i
            v-else
            i-solar-eye-line-duotone
            class="cursor-pointer hover:text-primary transition-colors"
            @click="showpassword = false"
          ></i>
        </div>
      </div>
      <button
        class="w-full p-10px text-white border-none rounded-8px cursor-pointer text-14px bg-[var(--theme-color)] hover:bg-[#8ea0fa] transition-all"
        @click="submitRegister"
      >
        注册
      </button>
      <div class="text-center mt-10px">
        <span class="text-12px text-[#777] cursor-pointer hover:text-primary" @click="switchToLogin"
          >返回登录</span
        >
      </div>
    </div>

    <div v-if="successVisible" class="no-drag w-[calc(100%-90px)] flex flex-col items-center">
      <img class="w-100px mb-20px" src="@renderer/assets/imgs/success.png" alt="" />
      <div class="text-16px text-primary mb-10px">注册成功！</div>
      <div class="text-14px text-[#777] mb-20px">您的账号为：</div>
      <div class="flex items-center gap-10px mb-30px">
        <span class="text-16px text-primary">{{ username }}</span>
        <i
          i-solar-copy-line-duotone
          class="cursor-pointer text-[#777] hover:text-primary transition-colors"
          @click="copyToClipboard(username)"
        ></i>
      </div>
      <div class="text-12px text-[#777] mb-20px">请妥善保管您的账号信息</div>
      <button
        class="w-full p-10px text-white border-none rounded-8px cursor-pointer text-14px bg-[var(--theme-color)] hover:bg-[#8ea0fa] transition-all"
        @click="switchToLogin"
      >
        去登录
      </button>
    </div>
  </div>
</template>
