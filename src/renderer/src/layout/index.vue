<script lang="ts" setup>
import { onMounted } from 'vue'
import Aside from './aside/index.vue'
import Header from './header/index.vue'
import { GetUserInfo } from '@renderer/service/api/user'
import useUserStore from '@renderer/stores/modules/user'
import { useLayoutStore } from './store'
import GroupPanel from './group-panel/GroupPanel.vue'
import { useGroupStore } from '@renderer/stores/modules/group'
const { isLocked, unlockPassword, passwordError, handleUnlock } = useLayoutStore()

const userStore = useUserStore()
const groupStore = useGroupStore()
const showGroupPanel = computed(() => groupStore.currentGroupId)

// 获取用户信息
const fetchUserInfo = async () => {
  try {
    const res = await GetUserInfo(userStore.userInfo.id as number)
    if (res.code === 200) {
      userStore.setUserInfo({ userInfo: res.data })
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

onMounted(() => {
  if (userStore.userInfo.id) {
    fetchUserInfo()
  }
})
</script>

<template>
  <div class="layout-container">
    <div class="layout-drag-header drag"></div>
    <aside class="layout-aside">
      <Aside />
    </aside>
    <main class="layout-main">
      <Header />

      <router-view></router-view>
    </main>

    <group-panel v-if="showGroupPanel" />
  </div>

  <!-- 锁定遮罩 -->
  <div v-if="isLocked" class="lock-overlay">
    <div class="lock-container">
      <div class="lock-icon">
        <i i-solar-lock-bold-duotone class="text-40px text-primary mb-20px"></i>
      </div>
      <div class="lock-title flex-col gap-10px">
        <i i-solar-lock-keyhole-bold-duotone></i>
        <div class="text-14px c-gray text-center">已锁定</div>
      </div>
      <div class="unlock-form">
        <input
          v-model="unlockPassword"
          type="password"
          placeholder="请输入解锁密码"
          class="unlock-input"
          :class="{ 'input-error': passwordError }"
          @keyup.enter="handleUnlock"
        />
        <button class="unlock-button" @click="handleUnlock">解锁</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout-container {
  display: flex;
  border-radius: 10px;
  background-color: #f5f7fa;
  overflow: auto;
  height: calc(100vh - 5px);
  width: calc(100vw - 5px);
  margin: auto;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.layout-drag-header {
  width: 100%;
  height: 30px;
  background-color: transparent;
  position: absolute;
}

.layout-aside {
  border-right: 1px solid #ddd;
  background-color: #fff;
}

.layout-main {
  flex: 1;
  background-color: #f5f7fa;
}

/* 锁定相关样式 */
.lock-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(5px);
  z-index: 99999999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  border-radius: 12px;
  background-color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 350px;
}

.lock-title {
  display: flex;
  font-size: 40px;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.unlock-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.unlock-input {
  padding: 12px 15px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  font-size: 16px;
  outline: none;
  transition: all 0.3s;
}

.unlock-input:focus {
  border-color: var(--theme-color);
  box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb), 0.2);
}

.input-error {
  border-color: #ff4d4f;
  animation: shake 0.5s;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-5px);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(5px);
  }
}

.unlock-button {
  padding: 8px;
  border-radius: 8px;
  background-color: var(--theme-color);
  color: white;
  font-size: 16px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
}

.unlock-button:hover {
  opacity: 0.9;
}
</style>
