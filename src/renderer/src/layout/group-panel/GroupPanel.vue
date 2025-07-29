<template>
  <div class="group-panel">
    <div class="announcement">
      <h3>群公告</h3>
      <p>{{ announcement }}</p>
    </div>
    <div class="members">
      <h3>群员列表</h3>
      <ul>
        <li v-for="member in members" :key="member.id">{{ member.username }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGroupStore } from '@renderer/stores/modules/group'
import { storeToRefs } from 'pinia'

const groupStore = useGroupStore()
const { announcement, members } = storeToRefs(groupStore)
</script>

<style scoped>
.group-panel {
  width: 300px;
  height: 100%;
  background: #f0f0f0;
  padding: 10px;
}
</style>
