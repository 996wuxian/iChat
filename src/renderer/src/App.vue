<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { zhCN, dateZhCN } from 'naive-ui'
import useUserStore from '@renderer/stores/modules/user'

const useUser = useUserStore()
const isCollapsed = ref(false)

// 添加鼠标移入事件处理函数
const handleMouseEnter = () => {
  if (isCollapsed.value) {
    window.api.expandWindow()
    isCollapsed.value = false
  }
}

// 添加鼠标移出事件处理函数
const handleMouseLeave = () => {
  // 可以添加一个延时，避免用户意外触发
  setTimeout(() => {
    if (!isCollapsed.value) {
      window.api.collapseWindow()
      isCollapsed.value = true
    }
  }, 500) // 500毫秒延时
}

// 监听窗口收缩状态变化
const setupWindowStateListeners = () => {
  // 监听窗口收缩状态
  window.api.onWindowCollapsed((collapsed) => {
    isCollapsed.value = collapsed
  })
}

onMounted(async () => {
  useUser.setTop({ type: 'isTop', value: '0' })
  setupWindowStateListeners()
})
</script>

<template>
  <div class="app-container" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
      <n-dialog-provider>
        <n-message-provider>
          <RouterView />
        </n-message-provider>
      </n-dialog-provider>
    </n-config-provider>
  </div>
</template>

<style scoped lang="scss">
.app-container {
  width: 100%;
  height: 100%;
}
body {
  user-select: none;
}
</style>
