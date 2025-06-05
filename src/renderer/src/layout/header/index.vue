<template>
  <div
    class="absolute right-20px top-10px z-99999 no-drag flex cursor-pointer gap-15px text-18px c-#000"
  >
    <i i-solar-screen-share-line-duotone title="上滑收缩" @click="collapseWindow"></i>
    <i i-solar-minimize-square-3-line-duotone title="最小化" @click="minimizeWindow"></i>
    <i
      v-if="!isMaximized"
      i-solar-maximize-square-minimalistic-line-duotone
      title="全屏"
      @click="maximizeWindow"
    ></i>
    <i
      v-else
      i-solar-minimize-square-minimalistic-line-duotone
      title="还原"
      @click="maximizeWindow"
    ></i>
    <i i-solar-close-circle-outline title="关闭" @click="closeWindow"></i>
  </div>
</template>

<script setup lang="ts">
import { useDialog } from 'naive-ui'

const dialog = useDialog()
const isMaximized = ref(false)

// 关闭窗口
const closeWindow = () => {
  const d = dialog.warning({
    title: '关闭确认',
    content: '是否要完全退出应用？',
    positiveText: '退出应用',
    negativeText: '最小化到托盘',
    onPositiveClick: () => {
      window.api.closeWindow()
      d.destroy() // 关闭弹窗
    },
    onNegativeClick: async () => {
      await window.api.hideToTray()
      d.destroy() // 关闭弹窗
    }
  })
}

// 最小化窗口
const minimizeWindow = () => {
  window.api.minimizeWindow()
}

// 最大化/还原窗口
const maximizeWindow = () => {
  window.api.maximizeWindow()
}

// 上滑收缩窗口
const collapseWindow = () => {
  window.api.collapseWindow()
}

// 监听键盘快捷键
const handleKeyDown = (e: KeyboardEvent) => {
  // Esc 键退出全屏
  if (e.key === 'Escape') {
    window.api.maximizeWindow()
  }
}

onMounted(() => {
  window.api.onWindowStateChanged((state: boolean) => {
    isMaximized.value = state
  })
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped></style>
