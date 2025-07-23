import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { is } from '@electron-toolkit/utils'

// 通知管理变量
let notificationWindows: BrowserWindow[] = []
const notificationQueue: any[] = []
const NOTIFICATION_HEIGHT = 120 // 通知窗口高度
const NOTIFICATION_GAP = 10 // 通知窗口之间的间距
const MAX_NOTIFICATIONS = 5 // 最大同时显示的通知数量

// 添加用户通知映射表，用于跟踪每个用户的通知窗口
const userNotifications = new Map<string, BrowserWindow>()
// 添加多用户通知窗口引用
let multiUserNotificationWindow: BrowserWindow | null = null
// 跟踪未读消息的用户
const pendingUsers = new Set<string>()

// 主窗口引用
let mainWindow: BrowserWindow | null = null

// 通知模板
const notificationTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * {
      box-sizing: border-box;
    }

    html {
      background: transparent;
    }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: transparent;
      color: white;
      overflow: hidden;
      position: relative;
      min-height: 100px;
    }

    /* 主容器样式 */
    .notification-wrapper {
      background: linear-gradient(135deg,
        rgba(45, 45, 45, 0.98) 0%,
        rgba(35, 35, 35, 0.98) 50%,
        rgba(25, 25, 25, 0.98) 100%);
      border-radius: 16px;
      backdrop-filter: blur(20px) saturate(1.2);
      animation: slideInBounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      position: relative;
      overflow: hidden;
      max-width: 290px;
      margin: 0 auto;
    }

    /* 顶部装饰条 */
    .notification-wrapper::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg,
        #667eea 0%,
        #764ba2 25%,
        #f093fb 50%,
        #f5576c 75%,
        #4facfe 100%);
      background-size: 200% 100%;
      animation: gradientShift 3s ease-in-out infinite;
      z-index: 1;
    }

    @keyframes gradientShift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    @keyframes slideInBounce {
      0% {
        transform: translateX(120%) scale(0.8);
        opacity: 0;
      }
      60% {
        transform: translateX(-5%) scale(1.02);
        opacity: 0.9;
      }
      100% {
        transform: translateX(0) scale(1);
        opacity: 1;
      }
    }

    @keyframes slideOutBounce {
      0% {
        transform: translateX(0) scale(1);
        opacity: 1;
      }
      100% {
        transform: translateX(120%) scale(0.8);
        opacity: 0;
      }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    @keyframes glow {
      0%, 100% { box-shadow: 0 0 5px rgba(102, 126, 234, 0.3); }
      50% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.6), 0 0 30px rgba(102, 126, 234, 0.4); }
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg,
        rgba(20, 20, 20, 0.95) 0%,
        rgba(15, 15, 15, 0.95) 100%);
      padding: 10px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px 16px 0 0;
      position: relative;
    }

    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.2) 50%,
        transparent 100%);
    }

    .header-left {
      display: flex;
      align-items: center;
    }

    .app-icon {
      width: 20px;
      height: 20px;
      margin-right: 10px;
      border-radius: 6px;
      filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
      animation: glow 2s ease-in-out infinite;
    }

    .app-name {
      font-size: 13px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.95);
      letter-spacing: 0.5px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .close-button {
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .close-button::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
      border-radius: 50%;
      transition: all 0.3s ease;
      transform: translate(-50%, -50%);
    }

    .close-button:hover::before {
      width: 40px;
      height: 40px;
    }

    .close-button:hover {
      background: linear-gradient(135deg, rgba(255, 59, 48, 0.2) 0%, rgba(255, 69, 58, 0.2) 100%);
      transform: scale(1.1) rotate(90deg);
      box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3);
    }

    .close-button:active {
      transform: scale(0.95) rotate(90deg);
    }

    .close-button img {
      width: 16px;
      height: 16px;
      opacity: 0.8;
      transition: all 0.3s ease;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
    }

    .close-button:hover img {
      opacity: 1;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
    }

    .container {
      display: flex;
      align-items: flex-start;
      padding: 16px 18px 18px 18px;
      background: linear-gradient(135deg,
        rgba(55, 55, 55, 0.4) 0%,
        rgba(45, 45, 45, 0.4) 50%,
        rgba(35, 35, 35, 0.4) 100%);
      position: relative;
      transition: all 0.3s ease;
    }

    .container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg,
        rgba(255, 255, 255, 0.02) 0%,
        rgba(255, 255, 255, 0.05) 50%,
        rgba(255, 255, 255, 0.02) 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }

    .container:hover::before {
      opacity: 1;
    }

    .container:hover {
      background: linear-gradient(135deg,
        rgba(60, 60, 60, 0.5) 0%,
        rgba(50, 50, 50, 0.5) 50%,
        rgba(40, 40, 40, 0.5) 100%);
      cursor: pointer;
      transform: translateY(-1px);
    }

    .content-icon {
      width: 48px;
      height: 48px;
      margin-right: 14px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.15);
      box-shadow:
        0 6px 16px rgba(0, 0, 0, 0.3),
        0 2px 4px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      object-fit: cover;
      background: linear-gradient(135deg,
        rgba(255, 255, 255, 0.1) 0%,
        rgba(255, 255, 255, 0.05) 100%);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .content-icon::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(45deg,
        transparent 30%,
        rgba(255, 255, 255, 0.1) 50%,
        transparent 70%);
      transform: rotate(45deg);
      transition: transform 0.6s ease;
    }

    .content-icon:hover::before {
      transform: rotate(45deg) translateX(100%);
    }

    .content-icon:hover {
      transform: scale(1.08) rotate(2deg);
      border-color: rgba(102, 126, 234, 0.4);
      box-shadow:
        0 8px 20px rgba(0, 0, 0, 0.4),
        0 4px 8px rgba(0, 0, 0, 0.3),
        0 0 0 3px rgba(102, 126, 234, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }

    .content {
      flex: 1;
      min-width: 0;
      position: relative;
    }

    h3 {
      margin: 0 0 8px 0;
      font-size: 15px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.98);
      line-height: 1.3;
      letter-spacing: 0.3px;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      background: linear-gradient(135deg,
        rgba(255, 255, 255, 0.98) 0%,
        rgba(255, 255, 255, 0.85) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .content_text {
      margin: 0;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.85);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow: hidden;
      text-overflow: ellipsis;
      max-height: 58px;
      word-break: break-word;
      letter-spacing: 0.2px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      position: relative;
    }

    .content_text::after {
      content: '';
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      background: linear-gradient(45deg, transparent 0%, rgba(45, 45, 45, 0.8) 100%);
      pointer-events: none;
    }

    /* 响应式设计 */
    @media (max-width: 320px) {
      .container {
        padding: 14px;
      }
      .content-icon {
        width: 40px;
        height: 40px;
      }
      h3 {
        font-size: 14px;
      }
      .content_text {
        font-size: 12px;
      }
    }

    /* 加载状态优化 */
    .content-icon[src=""], .content-icon:not([src]) {
      background: linear-gradient(135deg,
        rgba(102, 126, 234, 0.2) 0%,
        rgba(118, 75, 162, 0.2) 100%);
      position: relative;
      animation: pulse 2s ease-in-out infinite;
    }

    .content-icon[src=""]::after, .content-icon:not([src])::after {
      content: "👤";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 22px;
      opacity: 0.7;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }

    /* 微交互动画 */
    .container:active {
      transform: translateY(1px) scale(0.98);
    }

    /* 滚动条美化 */
    ::-webkit-scrollbar {
      width: 4px;
    }

    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 2px;
    }

    ::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg,
        rgba(102, 126, 234, 0.6) 0%,
        rgba(118, 75, 162, 0.6) 100%);
      border-radius: 2px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(135deg,
        rgba(102, 126, 234, 0.8) 0%,
        rgba(118, 75, 162, 0.8) 100%);
    }
  </style>
</head>
<body>
  <div class="notification-wrapper">
    <div class="header">
      <div class="header-left">
        <img class="app-icon" id="appIcon" />
        <div class="app-name">俊才桌面端 - 新消息通知</div>
      </div>
      <div class="close-button" id="closeButton">
        <img src="https://image.goodjob.cn/image/jcNewChat/close.png" />
      </div>
    </div>
    <div class="container">
      <img class="content-icon" id="contentIcon" />
      <div class="content">
        <h3 id="notificationTitle"></h3>
        <div id="notificationBody" class="content_text"></div>
      </div>
    </div>
  </div>
 <script>
   // 设置自动关闭
  //  setTimeout(() => {
  //    document.body.style.animation = 'slideOutBounce 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards';
  //    setTimeout(() => window.close(), 400);
  //  }, 30000);

   // 关闭按钮点击事件
   document.getElementById('closeButton').addEventListener('click', (e) => {
     e.stopPropagation();
     document.body.style.animation = 'slideOutBounce 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards';
     setTimeout(() => window.close(), 400);
   });

   // 点击通知内容区域打开主窗口
   document.querySelector('.container').addEventListener('click', () => {
     // 添加点击反馈
     document.querySelector('.container').style.transform = 'translateY(2px) scale(0.98)';
     setTimeout(() => {
       // 传递用户ID信息到主进程
       window.api.openMainWindowWithUser(window.notificationData?.senderId);
       document.body.style.animation = 'slideOutBounce 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards';
       setTimeout(() => window.close(), 400);
     }, 100);
   });

   // 监听来自主进程的消息
   window.api.onNotificationData((data) => {
     // 保存通知数据到全局变量
     window.notificationData = data;

     document.getElementById('appIcon').src = data.appIconPath;

     const contentIcon = document.getElementById('contentIcon');
     contentIcon.src = data.contentIconUrl;

     // 图片加载错误处理
     contentIcon.onerror = function() {
       this.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)';
       this.removeAttribute('src');
     };

     document.getElementById('notificationTitle').textContent = data.title;
     document.getElementById('notificationBody').textContent = data.body;

     // 添加入场动画延迟
     setTimeout(() => {
       document.body.style.opacity = '1';
     }, 50);
   });

   // 鼠标悬停效果
   document.body.addEventListener('mouseenter', () => {
     document.querySelector('.content-icon').style.animationPlayState = 'paused';
   });

   document.body.addEventListener('mouseleave', () => {
     document.querySelector('.content-icon').style.animationPlayState = 'running';
   });
 </script>
</body>
</html>
`

// 获取图标路径
function getIconPath(): string {
  const possiblePaths = [
    is.dev ? join(__dirname, '../../resources/icon.png') : join(process.resourcesPath, 'icon.png'),
    join(__dirname, '../../build/icon.png'),
    join(__dirname, '../../../resources/icon.png'),
    join(process.cwd(), 'resources/icon.png')
  ]

  for (const iconPath of possiblePaths) {
    if (fs.existsSync(iconPath)) {
      return iconPath
    }
  }

  console.error('未找到图标文件，使用默认路径')
  return possiblePaths[0]
}

// 获取图标的 Base64 编码
function getIconBase64(): string {
  const iconPath = getIconPath()
  try {
    const iconData = fs.readFileSync(iconPath)
    return `data:image/png;base64,${iconData.toString('base64')}`
  } catch (error) {
    console.error('读取图标文件失败:', error)
    return '' // 返回空字符串或默认图标
  }
}

// 关闭所有单用户通知窗口
function closeAllSingleUserNotifications(): void {
  // 遍历所有用户通知窗口并关闭
  for (const [userId, window] of userNotifications.entries()) {
    if (!window.isDestroyed()) {
      // 清除窗口的自动关闭定时器
      if ((window as any).closeTimeout) {
        clearTimeout((window as any).closeTimeout)
        ;(window as any).closeTimeout = null
      }
      window.close()
    }
  }
  // 清空用户通知映射表
  userNotifications.clear()
}

// 重新定位所有通知窗口，实现堆叠效果
function repositionNotifications(): void {
  // 获取主窗口所在的屏幕，如果主窗口不存在则使用主屏幕
  let targetDisplay
  if (mainWindow && !mainWindow.isDestroyed()) {
    // 获取主窗口的位置
    const windowBounds = mainWindow.getBounds()
    // 根据主窗口位置获取对应的屏幕
    targetDisplay = screen.getDisplayMatching(windowBounds)
  } else {
    // 如果主窗口不存在，使用主屏幕
    targetDisplay = screen.getPrimaryDisplay()
  }

  const { width, height, x: displayX, y: displayY } = targetDisplay.workArea
  const startX = displayX + width - 310

  notificationWindows.forEach((window, index) => {
    if (!window.isDestroyed()) {
      // 计算Y坐标，实现从下到上的堆叠效果
      const startY = displayY + height - (index + 1) * (NOTIFICATION_HEIGHT + NOTIFICATION_GAP)
      window.setPosition(startX, startY)
    }
  })
}

// 处理通知队列
function processNotificationQueue(): void {
  // 如果当前显示的通知数量已达上限，则不处理队列
  if (notificationWindows.length >= MAX_NOTIFICATIONS) {
    return
  }

  // 从队列中取出一个通知并显示
  if (notificationQueue.length > 0) {
    const notification = notificationQueue.shift()
    createCustomNotification(
      notification.title,
      notification.body,
      notification.contentIconUrl,
      notification.senderId,
      notification.senderName
    )
  }
}

// 创建自定义通知窗口的函数
function createCustomNotification(
  title: string,
  body: string,
  contentIconUrl: string = 'https://img.pl520.com/up/allimg/tx34/03191019033922906.jpg',
  senderId?: string,
  senderName?: string
): BrowserWindow | null {
  // 检查主窗口状态，如果不是最小化或隐藏状态，则不显示通知
  if (mainWindow && !mainWindow.isMinimized() && mainWindow.isVisible()) {
    return null
  }

  // 如果有发送者ID，检查是否已有该用户的通知窗口
  if (senderId) {
    // 如果已有该用户的通知窗口，更新内容
    if (userNotifications.has(senderId)) {
      const existingWindow = userNotifications.get(senderId)!
      if (!existingWindow.isDestroyed()) {
        // 更新现有窗口的内容
        existingWindow.webContents.send('notification-data', {
          appIconPath: getIconBase64(),
          contentIconUrl: contentIconUrl,
          title: title,
          body: body
        })

        // 重置自动关闭计时器
        // if ((existingWindow as any).closeTimeout) {
        //   clearTimeout((existingWindow as any).closeTimeout)
        // }
        // ;(existingWindow as any).closeTimeout = setTimeout(() => {
        //   if (!existingWindow.isDestroyed()) {
        //     existingWindow.close()
        //   }
        // }, 30000)

        return existingWindow
      } else {
        // 如果窗口已销毁，从映射表中移除
        userNotifications.delete(senderId)
      }
    }
  }

  // 检查是否有多个用户发送消息
  if (senderId && senderName) {
    // 添加到待处理用户集合
    pendingUsers.add(senderName)

    // 如果有多个用户
    if (pendingUsers.size > 1) {
      // 如果已有多用户通知窗口，更新它
      if (multiUserNotificationWindow && !multiUserNotificationWindow.isDestroyed()) {
        // 更新多用户通知窗口
        const userCount = pendingUsers.size
        multiUserNotificationWindow.webContents.send('notification-data', {
          appIconPath: getIconBase64(),
          contentIconUrl: contentIconUrl,
          title: `${userCount}个用户发来新消息`,
          body: `您有来自${Array.from(pendingUsers).join(', ')}的新消息`
        })

        // // 重置自动关闭计时器
        // if ((multiUserNotificationWindow as any).closeTimeout) {
        //   clearTimeout((multiUserNotificationWindow as any).closeTimeout)
        // }
        // ;(multiUserNotificationWindow as any).closeTimeout = setTimeout(() => {
        //   if (!multiUserNotificationWindow!.isDestroyed()) {
        //     multiUserNotificationWindow!.close()
        //   }
        // }, 30000)

        // 关闭所有单用户通知窗口
        closeAllSingleUserNotifications()

        return multiUserNotificationWindow
      } else {
        // 需要创建新的多用户通知窗口，先关闭所有单用户通知窗口
        closeAllSingleUserNotifications()
      }
    }
  }

  const notificationWindow = new BrowserWindow({
    width: 300,
    height: NOTIFICATION_HEIGHT,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false, // 添加此行以禁用 web 安全策略
      // 添加以下配置来设置 CSP
      additionalArguments: [`--disable-site-isolation-trials`, `--disable-web-security`]
    },
    resizable: false,
    transparent: true,
    show: false // 初始不显示，等待定位后再显示
  })

  // 使用data URL加载HTML内容
  notificationWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(notificationTemplate)}`
  )

  // 等待页面加载完成后发送数据
  notificationWindow.webContents.on('did-finish-load', () => {
    // 如果有多个用户，更新标题
    let finalTitle = title
    let finalBody = body

    if (pendingUsers.size > 1) {
      finalTitle = `${pendingUsers.size}个用户发来新消息`
      finalBody = `您有来自${Array.from(pendingUsers).join(', ')}的新消息`
      multiUserNotificationWindow = notificationWindow
      // 关闭所有单用户通知窗口
      closeAllSingleUserNotifications()
    }

    notificationWindow.webContents.send('notification-data', {
      appIconPath: getIconBase64(),
      contentIconUrl: contentIconUrl,
      title: finalTitle,
      body: finalBody,
      senderId: senderId
    })

    // 如果是单个用户的通知，添加到用户通知映射表
    if (senderId && pendingUsers.size <= 1) {
      userNotifications.set(senderId, notificationWindow)
    }

    // 添加到通知窗口数组
    notificationWindows.push(notificationWindow)

    // 重新排列所有通知窗口
    repositionNotifications()

    // 显示窗口
    notificationWindow.show()
  })

  // 监听窗口关闭事件
  notificationWindow.on('closed', () => {
    // 清除自动关闭定时器
    if ((notificationWindow as any).closeTimeout) {
      clearTimeout((notificationWindow as any).closeTimeout)
      ;(notificationWindow as any).closeTimeout = null
    }

    // 从数组中移除已关闭的窗口
    const index = notificationWindows.indexOf(notificationWindow)
    if (index !== -1) {
      notificationWindows.splice(index, 1)
      // 重新排列剩余的通知窗口
      repositionNotifications()
    }

    // 如果是多用户通知窗口，清空待处理用户集合
    if (notificationWindow === multiUserNotificationWindow) {
      multiUserNotificationWindow = null
      pendingUsers.clear()
    }

    // 从用户通知映射表中移除
    for (const [userId, window] of userNotifications.entries()) {
      if (window === notificationWindow) {
        userNotifications.delete(userId)
        break
      }
    }

    // 处理队列中的下一个通知
    processNotificationQueue()
  })

  // 自动关闭
  // 保存定时器引用，以便后续清除
  // const closeTimeout = setTimeout(() => {
  //   if (!notificationWindow.isDestroyed()) {
  //     notificationWindow.close()
  //   }
  // }, 30000)

  // 将定时器引用保存到窗口对象上
  // ;(notificationWindow as any).closeTimeout = closeTimeout

  return notificationWindow
}

// 清除所有通知
export function clearAllNotifications(): void {
  // 关闭所有通知窗口
  notificationWindows.forEach((window) => {
    if (!window.isDestroyed()) {
      // 清除窗口的自动关闭定时器
      if ((window as any).closeTimeout) {
        clearTimeout((window as any).closeTimeout)
        ;(window as any).closeTimeout = null
      }
      window.close()
    }
  })

  // 清空通知窗口数组
  notificationWindows = []

  // 清空用户通知映射表
  userNotifications.clear()

  // 清空待处理用户集合
  pendingUsers.clear()

  // 重置多用户通知窗口引用
  multiUserNotificationWindow = null
}

// 当主窗口显示时关闭所有通知
export function closeNotificationsOnMainWindowShow(): void {
  clearAllNotifications()
}

// 设置主窗口引用
export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window

  // 如果设置了主窗口，添加显示事件监听
  if (window) {
    // 监听窗口显示事件
    window.on('show', () => {
      // 当主窗口显示时，关闭所有通知弹窗
      clearAllNotifications()
    })

    // 监听窗口从最小化恢复事件
    window.on('restore', () => {
      // 当主窗口从最小化恢复时，关闭所有通知弹窗
      clearAllNotifications()
    })
  }
}

// 初始化通知系统
export function initNotificationSystem(): void {
  // 替换原来的通知处理
  ipcMain.on(
    'send-notification',
    (_event, { title, body, contentIconUrl, senderId, senderName }) => {
      // 如果当前显示的通知数量已达上限，则加入队列
      if (notificationWindows.length >= MAX_NOTIFICATIONS) {
        notificationQueue.push({ title, body, contentIconUrl, senderId, senderName })
        return
      }

      // 创建并显示通知
      const notificationWindow = createCustomNotification(
        title,
        body,
        contentIconUrl,
        senderId,
        senderName
      )

      // 如果返回null（主窗口可见），则不显示通知
      if (!notificationWindow) {
        return
      }
    }
  )

  // 处理打开主窗口的请求
  ipcMain.on('open-main-window', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()

      // 关闭所有通知窗口
      clearAllNotifications()
    }
  })
}
