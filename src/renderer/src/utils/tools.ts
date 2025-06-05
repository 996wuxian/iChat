import { $msg } from '@renderer/config/interaction.config'

// 数组转树形结构
export const arrayToTree = <T extends Record<string, any>>(
  list: T[],
  id: keyof T = 'id',
  parentId: keyof T = 'parentId',
  children: keyof T = 'children'
) => {
  const treeList: T[] = []
  const map: Record<string, T> = {}

  list.forEach((item) => {
    if (!item[children]) item[children] = [] as any
    map[item[id]] = item
  })
  list.forEach((item) => {
    const parent = map[item[parentId]]
    if (parent) parent[children].push(item)
    else treeList.push(item)
  })
  return treeList
}

// 树形转数组结构
export const treeToArray = <T extends Record<string, any>>(
  tree: T[],
  children = 'children',
  callback?: (item?: T, parentNode?: T, level?: number) => T,
  level = 1,
  parentNode?: T,
  temp: T[] = []
) => {
  tree.forEach((item) => {
    if (callback) item = callback(item, parentNode, level) ?? item
    if (item[children] && (item[children] as T[]).length > 0)
      temp.push(...treeToArray<T>(item[children] as T[], children, callback, level + 1, item))
    delete temp[temp.push(item) - 1][children]
  })
  return temp
}

// 过滤树形节点
export const treeFilter = <T extends Record<string, any>>(
  tree: T[],
  callback: (item: T, level?: number) => boolean,
  children: keyof T = 'children',
  temp: T[] = [],
  level = 1
): T[] => {
  tree.forEach((item, index) => {
    if (!callback(item, level)) return
    const length = temp.push(item)
    if (tree[index][children]?.length > 0) {
      temp[length - 1][children] = treeFilter<T>(
        tree[index][children] as T[],
        callback,
        children,
        [],
        level + 1
      ) as T[keyof T]
    }
  })
  return temp
}

// 查找指定树形节点
export const treeFind = <T extends Record<string, any>>(
  tree: T[],
  callback: (item: T, level?: number) => boolean,
  children = 'children',
  level = 1
) => {
  for (const item of tree) {
    if (callback(item, level)) return item
    let result: T
    if (item[children]?.length > 0) {
      result = treeFind<T>(item[children], callback, children, level + 1) as any
      if (result) return result
    }
  }
  return null
}

// 休眠
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// 数字转中文
export const numToChinese = (num: number) => {
  const chineseNum = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  const chineseUnit = ['', '十', '百', '千', '万', '亿']
  const str = num.toString()
  let result = ''
  for (let i = 0; i < str.length; i++) {
    const n = str[i]
    const unit = chineseUnit[str.length - 1 - i]
    if (n === '0') {
      if (result.endsWith('零')) {
        continue
      } else {
        if (unit !== '十' && i !== str.length - 1 && str[i + 1] !== '0') {
          result += '零'
        }
      }
    } else {
      result += chineseNum[n] + unit
    }
  }
  return result
}

// 获取样式
export const getStyle = () => {
  let str = ''
  const styles = document.querySelectorAll('style,link')
  for (let i = 0; i < styles.length; i++) {
    str += styles[i].outerHTML
  }
  return str
}

// 选择文件
export const selectFile = async (multiple = false, accept = ''): Promise<File[]> => {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.click()
    input.onchange = function (this: any) {
      resolve([...this.files])
      input.remove()
    }
    input.oncancel = function () {
      input.remove()
      resolve([])
    }
  })
}

// 下载文件
export const downloadFile = (url: string, filename = '') => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  link.remove()
}

export const formatTime = (dateString: string) => {
  if (!dateString) return ''

  // 将传入的日期字符串转换为 Date 对象
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString // 检查日期是否有效

  // 获取当前日期
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  // 计算本周的起始日期（周一）
  const dayOfWeek = today.getDay()
  const startOfWeek = new Date(todayStart)
  startOfWeek.setDate(todayStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

  // 计算本周的结束日期（周日）
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

  // 判断是否是今天
  if (dateStart.getTime() === todayStart.getTime()) {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `今天 ${hours}:${minutes}`
  }

  // 判断是否在本周内
  if (dateStart >= startOfWeek && dateStart <= endOfWeek) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return days[date.getDay()]
  }

  // 不在本周内，返回年月日
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 复制图片到剪贴板
export const copyImageToClipboard = async (imageUrl: string) => {
  try {
    // 创建一个图片元素
    const img = new Image()
    img.crossOrigin = 'anonymous' // 处理跨域问题

    // 加载图片
    img.onload = () => {
      // 创建canvas
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height

      // 绘制图片到canvas
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0)

      // 将canvas转换为blob
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            // 创建ClipboardItem并写入剪贴板
            const item = new ClipboardItem({ 'image/png': blob })
            await navigator.clipboard.write([item])
            $msg({
              type: 'success',
              msg: '图片已复制到剪贴板'
            })
          } catch (error) {
            console.error('复制图片到剪贴板失败:', error)
            $msg({
              type: 'error',
              msg: '复制图片失败，请重试'
            })
          }
        }
      }, 'image/png')
    }

    // 设置图片源
    img.src = imageUrl

    // 处理加载错误
    img.onerror = () => {
      $msg({
        type: 'error',
        msg: '图片加载失败，无法复制'
      })
    }
  } catch (error) {
    console.error('复制图片过程中出错:', error)
    $msg({
      type: 'error',
      msg: '复制图片失败'
    })
  }
}

// 节流函数
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastTime = 0
  let timer: NodeJS.Timeout | null = null

  return function (...args: Parameters<T>) {
    const now = Date.now()

    // 如果距离上次执行超过延迟时间，立即执行
    if (now - lastTime >= delay) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      fn.apply(this, args)
      lastTime = now
    } else if (!timer) {
      // 设置定时器，确保最后一次调用也能执行
      timer = setTimeout(() => {
        fn.apply(this, args)
        lastTime = Date.now()
        timer = null
      }, delay)
    }
  }
}

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)}${units[unitIndex]}`
}
