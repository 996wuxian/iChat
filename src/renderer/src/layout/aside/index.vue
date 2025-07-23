<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import useRoutesStore from '@renderer/stores/modules/routes'
import { Local, Session } from '@renderer/utils/storage'
import { $msg } from '@renderer/config/interaction.config'
import { useImStore } from '@renderer/stores/modules/im'
import useUserStore from '@renderer/stores/modules/user'
import defaultAvatar from '@renderer/assets/imgs/default-avatar.png'
import EditProfileDialog from './components/EditProfileDialog.vue'
import { useLayoutStore } from '../store'
const { isLocked, showLockDialog, lockPassword } = useLayoutStore()

const userStore = useUserStore()

const imStore = useImStore()
const router = useRouter()
const useRoutes = useRoutesStore()
const routes = ref()
const activeMenu = ref('')

const settingRef = ref<HTMLElement | null>(null)
const showNotices = ref(false)
const noticeCount = computed(() => imStore.noticeCount)
const notices = computed(() => imStore.notices)
const showUserInfo = ref(false)
const userInfo = computed(() => userStore.userInfo)
const userInfoRef = ref<HTMLElement | null>(null)
const avatarRef = ref<HTMLElement | null>(null)

// 添加编辑弹窗控制变量
const showEditDialog = ref(false)

const handleClickOutside = (event: MouseEvent) => {
  if (settingRef.value && !settingRef.value.contains(event.target as Node)) {
    showSettingMenu.value = false
    showNotices.value = false
  }

  // 处理用户信息弹窗的点击外部关闭
  if (
    showUserInfo.value &&
    userInfoRef.value &&
    avatarRef.value &&
    !userInfoRef.value.contains(event.target as Node) &&
    !avatarRef.value.contains(event.target as Node)
  ) {
    showUserInfo.value = false
  }
}

// 添加编辑按钮点击处理函数
const handleEditClick = () => {
  showEditDialog.value = true
}

onMounted(async () => {
  routes.value = useRoutes.routes[0]?.children
  activeMenu.value = router.currentRoute.value.path
  if (!imStore.socket) {
    imStore.initSocket()
    imStore.noticeCount = 0
  }
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleMenuClick = (path: string) => {
  activeMenu.value = path
  router.push(path)
}

const showSettingMenu = ref(false)

const handleSettingClick = () => {
  showSettingMenu.value = !showSettingMenu.value
  if (showNotices.value) {
    showNotices.value = false
  }
}

const handleNoticeClick = () => {
  showNotices.value = !showNotices.value
  if (showSettingMenu.value) {
    showSettingMenu.value = false
  }
}

const handleAvatarClick = () => {
  showUserInfo.value = !showUserInfo.value
  if (showSettingMenu.value) {
    showSettingMenu.value = false
  }
  if (showNotices.value) {
    showNotices.value = false
  }
}

// 添加一键已读方法
const handleMarkAllRead = () => {
  imStore.markAllNoticesAsRead()
}

// 添加清空通知方法
const handleClearAll = () => {
  imStore.clearAllNotices()
}

const handleLogout = () => {
  imStore.disconnect()
  Session.clear()
  Local.clear()
  window.api.clearAutoLogin()
  window.api.logout()
  imStore.notices = []
  imStore.noticeCount = 0
  imStore.userList = {}
  imStore.receiveId = ''
  imStore.chatWithUserName = ''
  $msg({
    type: 'success',
    msg: '退出成功'
  })
}

// 处理锁定
const handleLock = () => {
  lockPassword.value = ''
  if (!lockPassword.value) {
    showLockDialog.value = true
  } else {
    isLocked.value = true
    showSettingMenu.value = false
    $msg({
      type: 'success',
      msg: '已锁定'
    })
  }
}

// 设置锁定密码并锁定
const setLockPassword = () => {
  if (lockPassword.value.length < 4) {
    $msg({
      type: 'warning',
      msg: '密码长度至少为4位'
    })
    return
  }

  // 保存密码到本地存储
  Local.set('lock_password', lockPassword.value)
  showLockDialog.value = false
  isLocked.value = true
  $msg({
    type: 'success',
    msg: '已锁定'
  })
}

const handleCheckUpdate = () => {
  // 处理检查更新
  console.log('检查更新')
}

const toUsers = () => {
  router.push('/users')
}

watch(
  () => router.currentRoute.value.path,
  (newPath) => {
    activeMenu.value = newPath
  }
)

const noticeClick = (item: any) => {
  imStore.markNoticeAsRead(item)
}
</script>

<template>
  <nav class="menu theme-bg">
    <div class="cursor-pointer no-drag text-primary font-700 mb-20px">iChat</div>
    <!-- 头像部分 -->
    <div
      ref="avatarRef"
      class="avatar-container relative cursor-pointer"
      @click="handleAvatarClick"
    >
      <img
        :src="userInfo?.avatar || defaultAvatar"
        alt="avatar"
        class="avatar"
        :class="{ grayscale: !imStore.isConnected && imStore.reconnectCount > 0 }"
      />

      <div
        class="status-indicator"
        :class="{
          'bg-green-500': imStore.isConnected,
          'bg-gray-400': !imStore.isConnected
        }"
      ></div>
      <!-- 重连状态loading -->
      <div v-if="!imStore.isConnected && imStore.reconnectCount > 0" class="loading-overlay">
        <div class="loading-spinner"></div>
      </div>

      <div
        v-if="showUserInfo"
        ref="userInfoRef"
        class="absolute left-[calc(100%+8px)] top-0px text-14px rounded-8px shadow-lg z-50 min-w-250px p-15px bg-#fff color-[var(--text-primary)]"
      >
        <div class="flex items-center gap-3 mb-15px">
          <div class="relative w-50px h-50px rounded-full object-cover border-2 border-gray-100">
            <img
              :src="userInfo?.avatar || defaultAvatar"
              :alt="userInfo?.username"
              class="w-50px h-50px rounded-full object-cover border-2 border-gray-100"
            />
            <!-- 添加在线状态指示器 -->
            <span
              class="status-indicator w-12px! h-12px!"
              :class="userInfo?.state === 1 ? 'bg-green-500' : 'bg-gray-400'"
            ></span>
          </div>
          <div class="flex-1">
            <div class="font-600 text-16px mb-5px flex justify-between">
              {{ userInfo?.nickname || userInfo?.username }}

              <span class="flex items-center gap-1 text-12px font-400">
                <i
                  class="w-8px h-8px rounded-full inline-block border-2 border-white"
                  :class="userInfo?.state === 1 ? 'bg-green-500' : 'bg-gray-400'"
                ></i>
                {{ userInfo?.state === 1 ? '在线' : '离线' }}
              </span>
            </div>
            <div class="text-12px flex items-center gap-5px justify-between">
              <span class="text-gray-400">账号: {{ userInfo?.username }}</span>

              <i
                i-solar-pen-new-round-line-duotone
                class="cursor-pointer hover-c-#22C55E transition-all duration-300 text-14px"
                @click.stop="handleEditClick"
              ></i>
            </div>
          </div>
        </div>

        <div class="text-13px">
          <div class="flex items-center gap-2 p-8px hover:bg-[rgba(153,153,153,.1)] rd-6px">
            <i i-solar-phone-bold-duotone class="text-16px text-primary"></i>
            <span>{{ userInfo?.phone || '暂无联系方式' }}</span>
          </div>
          <div class="flex items-center gap-2 p-8px hover:bg-[rgba(153,153,153,.1)] rd-6px">
            <i i-solar-letter-bold-duotone class="text-16px text-primary"></i>
            <span>{{ userInfo?.email || '暂无邮箱' }}</span>
          </div>
          <div class="flex items-center gap-2 p-8px hover:bg-[rgba(153,153,153,.1)] rd-6px">
            <i i-solar-point-on-map-bold-duotone class="text-16px text-primary"></i>
            <span>{{ userInfo?.address || '暂无地址' }}</span>
          </div>
          <div class="flex items-center gap-2 p-8px hover:bg-[rgba(153,153,153,.1)] rd-6px">
            <i i-solar-calendar-bold-duotone class="text-16px text-primary"></i>
            <span>注册时间：{{ new Date(userInfo?.createdAt!).toLocaleDateString() }}</span>
          </div>
          <div class="flex items-center gap-2 p-8px hover:bg-[rgba(153,153,153,.1)] rd-6px">
            <i i-solar-user-id-bold-duotone class="text-16px text-primary"></i>
            <span>{{ userInfo?.desc || '这个人很懒，什么都没写~' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 菜单列表 -->
    <div class="menu-list">
      <template v-for="route in routes" :key="route.path">
        <div
          v-if="!route.meta?.hide"
          class="menu-item"
          :class="{ active: activeMenu === route.path }"
          @click="handleMenuClick(route.path)"
        >
          <i :class="route.meta?.icon" class="menu-icon"></i>
        </div>
      </template>
    </div>

    <div ref="settingRef" class="relative flex mt-auto text-primary flex-col">
      <div class="relative flex">
        <i
          i-solar-bell-bold-duotone
          class="mb-20px cursor-pointer w-20px h-20px"
          @click="handleNoticeClick"
        ></i>
        <span
          v-if="noticeCount > 0"
          class="absolute -right-6px -top-4px min-w-14px h-14px rd-8px bg-red-500 c-white text-9px flex items-center justify-center"
        >
          {{ noticeCount }}
        </span>
      </div>
      <i
        i-solar-widget-5-bold-duotone
        class="mb-20px cursor-pointer w-20px h-20px"
        @click="handleSettingClick"
      ></i>

      <!-- 设置菜单 -->
      <div
        v-if="showSettingMenu"
        class="absolute left-[calc(100%+8px)] bottom-10px text-14px rounded-8px shadow-lg z-50 min-w-150px p-5px theme-bg color-[var(--text-primary)]"
      >
        <div class="menu-setting-item">
          <i i-solar-settings-bold-duotone class="menu-setting-icon"></i>
          <span>设置</span>
        </div>
        <div class="menu-setting-item" @click="handleCheckUpdate">
          <i i-solar-refresh-circle-bold-duotone class="menu-setting-icon"></i>
          <span>检查更新</span>
        </div>
        <div class="menu-setting-item" @click="handleLock">
          <i i-solar-lock-bold-duotone class="menu-setting-icon"></i>
          <span>锁定</span>
        </div>
        <div class="menu-setting-item">
          <i i-solar-palette-bold-duotone class="menu-setting-icon"></i>
          <span>调色</span>
        </div>
        <div class="menu-setting-item" @click="handleLogout">
          <i i-solar-logout-2-bold-duotone class="menu-setting-icon"></i>
          <span>退出登录</span>
        </div>
      </div>

      <!-- 消息 -->
      <n-scrollbar
        v-if="showNotices"
        class="absolute left-[calc(100%+8px)] bottom-10px text-14px rounded-8px bg-#fff shadow-lg z-50 min-w-250px h-200px"
      >
        <div class="p-10px h-full color-[var(--text-primary)] gap-10px flex flex-col pb-40px">
          <template v-if="notices.length">
            <div
              v-for="notice in notices"
              :key="notice.fromUserId"
              class="bg-[rgba(153,153,153,.2)] p-10px rd-10px cursor-pointer"
              @click="noticeClick(notice)"
            >
              <!-- 好友请求类型 -->
              <div v-if="notice.type === 'friendRequest'" @click="toUsers">
                <div class="flex items-center justify-between">
                  <span class="font-600 c-#333">好友请求</span>
                  <span class="text-12px text-gray-400">{{
                    new Date(notice.time).toLocaleString()
                  }}</span>
                </div>
                <div class="text-13px c-#666 relative">
                  您有来自 {{ notice.fromUserName }} 的好友请求
                  <span
                    v-if="!notice.isRead"
                    class="absolute -right-2px -bottom-2px w-6px h-6px rd-full bg-red-500"
                  ></span>
                </div>
                <div v-if="notice.desc" class="text-12px text-gray-400">
                  附言：{{ notice.desc }}
                </div>
              </div>
            </div>
          </template>
          <div v-else class="py-40px flex items-center justify-center text-gray-400">
            暂无新消息
          </div>
        </div>
        <div
          class="absolute bottom-0 left-0 flex justify-between w-100% px-20px py-5px bg-white text-12px"
        >
          <span class="cursor-pointer" @click="handleMarkAllRead">一键已读</span>
          <span class="cursor-pointer" @click="handleClearAll">清空</span>
        </div>
      </n-scrollbar>
    </div>

    <EditProfileDialog v-model="showEditDialog" />

    <!-- 设置锁定密码弹窗 -->
    <div v-if="showLockDialog" class="lock-dialog-overlay">
      <div class="lock-dialog">
        <div class="lock-dialog-header">
          <span>设置锁定密码</span>
          <i i-solar-close-circle-bold class="close-icon" @click="showLockDialog = false"></i>
        </div>
        <div class="lock-dialog-body">
          <input
            v-model="lockPassword"
            type="password"
            placeholder="请输入锁定密码（至少4位）"
            class="lock-input"
            @keyup.enter="setLockPassword"
          />
        </div>
        <div class="lock-dialog-footer">
          <button class="cancel-button" @click="showLockDialog = false">取消</button>
          <button class="confirm-button" @click="setLockPassword">确定并锁定</button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.menu {
  width: 64px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10px;
  user-select: none;
}

.avatar-container {
  width: 40px;
  height: 40px;
  margin-bottom: 20px;
  border-radius: 50%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.menu-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.menu-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  color: #666;
}

.menu-item:hover {
  background: #f5f7fa;
  color: var(--theme-color, #409eff);
}

.menu-item.active {
  background: var(--theme-color, #409eff);
  color: #fff;
}

.menu-icon {
  font-size: 20px;
  transform-origin: center;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.menu-item:hover .menu-icon {
  transform: scale(1.1);
}

.menu-item.active .menu-icon {
  transform: scale(1.1);
  animation: iconPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes iconPop {
  0% {
    transform: scale(0.3);
  }
  100% {
    transform: scale(1.1);
  }
}

.menu-setting-item {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 4px;
  color: var(--text-color);
}

.menu-setting-item:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--theme-color);
}

.menu-setting-icon {
  font-size: 16px;
}

.status-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--theme-bg);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top-color: var(--theme-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.grayscale {
  filter: grayscale(100%);
}

/* 锁定密码设置弹窗 */
.lock-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-dialog {
  background-color: white;
  border-radius: 12px;
  width: 400px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.lock-dialog-header {
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}

.lock-dialog-header span {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-icon {
  font-size: 20px;
  cursor: pointer;
  color: #999;
  transition: color 0.3s;
}

.close-icon:hover {
  color: var(--theme-color);
}

.lock-dialog-body {
  padding: 20px;
}

.lock-input {
  width: 100%;
  padding: 12px 15px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  font-size: 16px;
  outline: none;
  transition: all 0.3s;
}

.lock-input:focus {
  border-color: var(--theme-color);
  box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb), 0.2);
}

.lock-dialog-footer {
  padding: 15px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #f0f0f0;
}

.cancel-button {
  padding: 8px 16px;
  border-radius: 6px;
  background-color: #f5f5f5;
  color: #666;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-button:hover {
  background-color: #e0e0e0;
}

.confirm-button {
  padding: 8px 16px;
  border-radius: 6px;
  background-color: var(--theme-color);
  color: white;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
}

.confirm-button:hover {
  opacity: 0.9;
}
</style>
