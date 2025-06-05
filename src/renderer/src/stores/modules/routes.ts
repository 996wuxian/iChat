import { defineStore } from 'pinia'
import { reactive, toRefs } from 'vue'

import { asyncRoutes } from '@renderer/router'
import piniaPersistConfig from '@renderer/utils/persist'

const useRoutesStore = defineStore(
  'routes',
  () => {
    const state = reactive({
      routes: [] as any,
      route: [] as any
    })

    const setRoutes = async () => {
      const routes = asyncRoutes
      state.routes = routes
    }

    const setCurrentRoute = async (action: any) => {
      state.route = action.route
    }

    return {
      ...toRefs(state),
      setRoutes,
      setCurrentRoute
    }
  },
  {
    persist: piniaPersistConfig('routes', ['routes'])
  }
)

export default useRoutesStore
