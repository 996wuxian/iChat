<script lang="ts" setup>
import { onMounted } from 'vue'
import Aside from './aside/index.vue'
import Header from './header/index.vue'
import { GetUserInfo } from '@renderer/service/api/user'
import useUserStore from '@renderer/stores/modules/user'

const userStore = useUserStore()
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
</style>
