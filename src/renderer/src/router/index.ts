import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import Layout from '@renderer/layout/index.vue'
import { setupPermissions } from './permissions'

const constantRoutes = [
  {
    path: '/login',
    name: 'Login',
    meta: {
      hide: true
    },
    component: () => import('@renderer/views/login/index.vue')
  }
]

export const asyncRoutes = [
  {
    path: '/',
    name: 'Root',
    component: Layout,
    redirect: '/home',
    children: [
      {
        path: '/home',
        name: 'Home',
        component: () => import('@renderer/views/home/index.vue'),
        meta: {
          title: '消息',
          icon: 'i-solar-chat-square-bold-duotone'
        }
      },
      {
        path: '/users',
        name: 'Users',
        component: () => import('@renderer/views/users/index.vue'),
        meta: {
          title: '用户列表',
          icon: 'i-solar-user-circle-bold-duotone'
        }
      },
      {
        path: '/collect',
        name: 'Collect',
        component: () => import('@renderer/views/collect/index.vue'),
        meta: {
          title: '收藏',
          icon: 'i-solar-star-bold-duotone'
        }
      },
      {
        path: '/dynamic',
        name: 'Dynamic',
        component: () => import('@renderer/views/dynamic/index.vue'),
        meta: {
          title: '动态',
          icon: 'i-solar-planet-bold'
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NoFound',
    redirect: '/404',
    meta: {
      hide: true
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes: constantRoutes as RouteRecordRaw[]
})

export const addRouter = (routes: any) => {
  routes.forEach((route: any) => {
    if (!router.hasRoute(route.name)) router.addRoute(route as RouteRecordRaw)
    if (route.children) addRouter(route.children)
  })
}

export function setupRouter(app: any) {
  // 开发路由
  addRouter(asyncRoutes)
  // 路由权限
  setupPermissions(router)
  app.use(router)
  return router
}

export default router
