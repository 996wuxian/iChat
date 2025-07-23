<script setup lang="ts">
import { ref, computed } from 'vue'
import useUserStore from '@renderer/stores/modules/user'
import defaultAvatar from '@renderer/assets/imgs/default-avatar.png'
import { UpdateUserInfo, GetUserInfo } from '@renderer/service/api/user'
import { uploadFile } from '@renderer/service/api/upload'
import { $msg } from '@renderer/config/interaction.config'
defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)

// 表单数据
const formData = ref({
  avatar: userInfo.value?.avatar || defaultAvatar,
  nickname: userInfo.value?.nickname || '',
  phone: userInfo.value?.phone || '',
  gender: userInfo.value?.gender || 1, // 1-男 2-女
  email: userInfo.value?.email || '',
  address: userInfo.value?.address || '',
  desc: userInfo.value?.desc || ''
})

// 处理头像上传
const handleAvatarClick = () => {
  // 触发文件选择
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      try {
        // 上传文件
        const form = new FormData()
        form.append('file', file)
        const res = await uploadFile(form)

        if (res.code === 200) {
          // 更新头像地址
          formData.value.avatar = res.data.url
          console.log('🚀 ~ input.onchange= ~ res.data.url:', res.data.url)
          $msg({
            type: 'success',
            msg: '头像上传成功'
          })
        } else {
          $msg({
            type: 'error',
            msg: res.msg || '头像上传失败'
          })
        }
      } catch (error) {
        console.error('头像上传失败:', error)
        $msg({
          type: 'error',
          msg: '头像上传失败'
        })
      }
    }
  }
  input.click()
}

// 处理保存
const handleSave = async () => {
  try {
    const res = await UpdateUserInfo(userInfo.value.id as number, formData.value)
    if (res.code === 200) {
      const userRes = await GetUserInfo(userInfo.value.id as number)
      if (userRes.code === 200) {
        // 更新store中的用户信息
        await userStore.setUserInfo({ userInfo: userRes.data })
        $msg({
          type: 'success',
          msg: '修改成功'
        })
        handleClose()
      }
    } else {
      $msg({
        type: 'error',
        msg: res.msg || '修改失败'
      })
    }
  } catch (error) {
    console.error('更新失败:', error)
    $msg({
      type: 'error',
      msg: '更新失败'
    })
  }
}

// 处理关闭
const handleClose = () => {
  emit('update:modelValue', false)
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
    <div class="bg-white rounded-lg w-400px overflow-hidden">
      <!-- 头部 -->
      <div class="p-10px border-b border-gray-100 flex items-center justify-between">
        <h3 class="text-14px font-400">编辑个人资料</h3>
        <i i-solar-close-circle-outline class="text-18px cursor-pointer" @click="handleClose" />
      </div>

      <!-- 内容区 -->
      <div class="p-20px">
        <!-- 头像上传 -->
        <div class="flex flex-col items-center mb-20px">
          <div
            class="w-80px h-80px rounded-full border-2 border-gray-200 overflow-hidden cursor-pointer hover:border-primary transition-colors relative group"
            @click="handleAvatarClick"
          >
            <img :src="formData.avatar" class="w-full h-full object-cover" alt="avatar" />
            <div
              class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <i i-solar-camera-bold-duotone class="text-24px text-white" />
            </div>
          </div>
          <div class="mt-10px text-14px text-gray-500">点击更换头像</div>
        </div>

        <!-- 表单 -->
        <div class="space-y-15px">
          <div class="flex items-center">
            <span class="w-60px text-14px text-gray-600">昵称：</span>
            <input
              v-model="formData.nickname"
              type="text"
              class="flex-1 h-35px px-10px rounded-6px border b-#E5E7EB b-solid outline-none"
              placeholder="请输入昵称"
            />
          </div>

          <div class="flex items-center">
            <span class="w-60px text-14px text-gray-600">性别：</span>
            <div class="flex gap-20px">
              <label class="flex items-center cursor-pointer">
                <input
                  v-model="formData.gender"
                  type="radio"
                  value="1"
                  class="w-16px h-16px accent-primary mr-5px"
                />
                <span class="text-14px">男</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input
                  v-model="formData.gender"
                  type="radio"
                  value="0"
                  class="w-16px h-16px accent-primary mr-5px"
                />
                <span class="text-14px">女</span>
              </label>
            </div>
          </div>

          <div class="flex items-center">
            <span class="w-60px text-14px text-gray-600">手机：</span>
            <input
              v-model="formData.phone"
              type="text"
              class="flex-1 h-35px px-10px rounded-6px border b-#E5E7EB b-solid outline-none"
              placeholder="请输入手机号码"
            />
          </div>

          <div class="flex items-center">
            <span class="w-60px text-14px text-gray-600">邮箱：</span>
            <input
              v-model="formData.email"
              type="email"
              class="flex-1 h-35px px-10px rounded-6px border b-#E5E7EB b-solid outline-none"
              placeholder="请输入邮箱"
            />
          </div>

          <div class="flex items-center">
            <span class="w-60px text-14px text-gray-600">地址：</span>
            <input
              v-model="formData.address"
              type="text"
              class="flex-1 h-35px px-10px rounded-6px border b-#E5E7EB b-solid outline-none"
              placeholder="请输入地址"
            />
          </div>

          <div class="flex items-start">
            <span class="w-60px text-14px text-gray-600">个签：</span>
            <textarea
              v-model="formData.desc"
              class="flex-1 h-80px px-10px py-8px rounded-6px border border-gray-200 outline-none resize-none font-['微软雅黑']"
              placeholder="介绍一下自己吧~"
            />
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="p-20px border-t border-gray-100 flex justify-end gap-10px">
        <div
          class="px-15px h-32px rounded-6px bg-gray-100 text-14px hover:bg-gray-200 transition-colors flex-center cursor-pointer"
          @click="handleClose"
        >
          取消
        </div>
        <div
          class="px-15px h-32px rounded-6px bg-[var(--theme-color)] text-white text-14px transition-colors flex-center cursor-pointer"
          @click="handleSave"
        >
          保存
        </div>
      </div>
    </div>
  </div>
</template>
