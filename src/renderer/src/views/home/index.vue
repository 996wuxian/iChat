<script setup lang="ts">
import Menu from './components/menu.vue'
import List from './components/list.vue'
import Content from './components/content.vue'
</script>

<template>
  <div class="chat-container">
    <List />
    <div class="content flex-1 h-full">
      <Content />
    </div>
  </div>

  <Menu />
</template>

<style scoped lang="scss">
.chat-container {
  height: 100%;
  display: flex;
  position: relative;
  background: #fff;
}

@media screen and (max-width: 570px) {
  .content {
    display: none;
  }
}
</style>
