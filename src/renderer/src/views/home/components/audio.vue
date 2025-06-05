<template>
  <div class="voice-record-content">
    <div
      class="voice-wave-animation"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    >
      <i i-solar-microphone-large-bold></i>
    </div>
    <div class="voice-tip">
      鼠标长按或按住空格键开始说话，按Esc键或点击<span
        class="c-blue cursor-pointer"
        @click="
          () => {
            stopRecording(false)
            recordVisible = false
          }
        "
        >退出</span
      >
    </div>
    <div v-if="isRecording" class="voice-time">{{ recordTime }}s</div>
  </div>
</template>

<script setup lang="ts">
import { uploadFile } from '@renderer/service/api/upload'
import { useHomeStore } from '../store/index'
import { $msg } from '@renderer/config/interaction.config'
const { isRecording, selectedChat, imStore, recordVisible } = useHomeStore()
const recordTime = ref(0)
let recordTimer: NodeJS.Timeout | null = null
let mediaRecorder: MediaRecorder | null = null
let recordStream: MediaStream | null = null
let audioChunks: BlobPart[] = []
// 鼠标按下事件处理
const handleMouseDown = async () => {
  if (!isRecording.value) {
    await startRecording()
  }
}

// 鼠标抬起事件处理
const handleMouseUp = () => {
  if (isRecording.value) {
    stopRecording()
  }
}

let shouldProcessRecording = true

// 处理语音录制开始
const startRecording = async () => {
  try {
    shouldProcessRecording = true
    // 获取麦克风权限
    recordStream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // 创建 MediaRecorder 实例
    mediaRecorder = new MediaRecorder(recordStream)

    // 开始录音
    mediaRecorder.start()

    // 收集录音数据
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && shouldProcessRecording) {
        audioChunks.push(event.data)
      }
    }

    // 录音结束时的处理
    mediaRecorder.onstop = async () => {
      if (!shouldProcessRecording) {
        audioChunks = []
        return
      }

      // 创建音频 Blob
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })

      // 创建 File 对象
      const audioFile = new File([audioBlob], 'voice_message.wav', { type: 'audio/wav' })

      try {
        // 上传音频文件
        const form = new FormData()
        form.append('type', 'audio')
        form.append('file', audioFile)
        const response = await uploadFile(form)

        if (selectedChat.value?.id) {
          // 创建音频卡片内容
          const audioCardContent = {
            type: 'audio',
            url: response.data.url, // 假设上传接口返回的数据中包含 url
            duration: recordTime.value // 录音时长（秒）
          }

          // 发送音频卡片消息
          await imStore.sendCardMsg(selectedChat.value.id, '[语音消息]', audioCardContent)
        }
      } catch (error) {
        console.error('录音上传失败:', error)
        $msg({
          type: 'error',
          msg: '录音上传失败'
        })
      }

      // 清理数据，准备下次录音
      audioChunks = []
    }

    isRecording.value = true
    recordTime.value = 0

    // 开始计时
    recordTimer = setInterval(() => {
      recordTime.value++
    }, 1000)
  } catch (err) {
    console.error('录音失败:', err)
    $msg({
      type: 'error',
      msg: '录音失败，请检查麦克风权限'
    })

    window.api.openSystemSettings('ms-settings:privacy-microphone')
  }
}

// 处理语音录制结束
const stopRecording = (shouldSend = true) => {
  shouldProcessRecording = shouldSend

  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
    isRecording.value = false
  }

  // 停止计时
  if (recordTimer) {
    clearInterval(recordTimer)
    recordTimer = null
  }

  // 关闭音频流
  if (recordStream) {
    recordStream.getTracks().forEach((track) => track.stop())
    recordStream = null
  }

  if (!shouldSend) {
    audioChunks = []
    recordVisible.value = false
  }
}

// 键盘事件处理
const handleKeyDown = async (e: KeyboardEvent) => {
  if (e.code === 'Space' && !isRecording.value && recordVisible.value) {
    e.preventDefault()
    await startRecording()
  } else if (e.code === 'Escape' && isRecording.value) {
    stopRecording(false)
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.code === 'Space' && isRecording.value && recordVisible.value) {
    stopRecording()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
})
</script>

<style lang="scss" scoped>
.voice-record-content {
  text-align: center;
}

.voice-wave-animation {
  width: 55px;
  height: 55px;
  border-radius: 50%;
  background: var(--theme-color);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
  position: relative;
  color: #fff;
  font-size: 25px;
  animation: wave 1s infinite linear;
  cursor: pointer;
}

.voice-tip {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.voice-time {
  font-size: 12px;
  color: #999;
}
</style>
