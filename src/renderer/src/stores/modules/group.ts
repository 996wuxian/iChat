import { defineStore } from 'pinia'

export const useGroupStore = defineStore('group', {
  state: () => ({
    announcement: '',
    members: [] as { id: string; username: string }[],
    currentGroupId: ''
  }),
  actions: {
    setGroupData(groupId: string, announcement: string, members: any[]) {
      this.currentGroupId = groupId
      this.announcement = announcement
      this.members = members
    }
  }
})