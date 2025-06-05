/**
 * @description 路由守卫，目前两种模式：all模式与intelligence模式
 */
import { Session } from '@renderer/utils/storage'
import type { Router } from 'vue-router'
import useRoutesStore from '@renderer/stores/modules/routes'
export function setupPermissions(router: Router) {
  router.beforeEach(async (to: any, _: any, next: any) => {
    const useRouter = useRoutesStore()
    const token = Session.get('token')
    // 白名单路由，不需要验证token
    const whiteList = ['/login', '/403', '/404']
    if (token) {
      if (to.path === '/login') {
        next({ path: '/' })
      } else {
        if (useRouter.routes.length === 0) {
          await useRouter.setRoutes()
          next({ ...to, replace: true })
        } else {
          next()
        }
      }
    } else {
      if (whiteList.includes(to.path)) {
        // 未登录但在白名单内，放行
        next()
      } else {
        // 未登录且不在白名单内，重定向到登录页
        next('/login')
      }
    }
  })
}
