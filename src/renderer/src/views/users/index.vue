<script setup lang="ts">
import { ref, onBeforeMount } from 'vue'
import List from './components/list.vue'
import NoticeContent from './components/notice-content.vue'
import FriendContent from './components/friend-content.vue'
import BlackContent from './components/black-content.vue'
import GroupContent from './components/group-content.vue'
import { useUsersStore } from './store'
const { getFriendList } = useUsersStore()

// 控制显示内容
const showContent = ref<'notice' | 'group' | 'black' | 'friend' | 'groupDetail'>('notice')

const select = (type: 'notice' | 'group' | 'black' | 'friend' | 'groupDetail') => {
  showContent.value = type
  console.log('🚀 ~ select ~ showContent.value:', showContent.value)
}

onBeforeMount(async () => {
  await getFriendList()
})
</script>

<template>
  <div class="chat-container">
    <List @select="select" />

    <NoticeContent v-if="showContent === 'notice' || showContent === 'group'" :type="showContent" />
    <FriendContent v-else-if="showContent === 'friend'" />
    <BlackContent v-else-if="showContent === 'black'" />
    <GroupContent v-else-if="showContent === 'groupDetail'" />
  </div>
</template>

<style scoped lang="scss">
.chat-container {
  height: 100%;
  display: flex;
  position: relative;
  background: #fff;
}
</style>
