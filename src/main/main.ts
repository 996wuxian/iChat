import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  Tray,
  Notification,
  nativeImage
} from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as mime from 'mime-types'
import { writeFile } from 'fs/promises'
const icon = join(__dirname, '../../resources/icon.png')

let mainWindow: BrowserWindow | null = null
let isLoginProcessing = false

function createMainWindow(): void {
  if (mainWindow) return

  // 创建一个窗口，初始为登录窗口大小
  mainWindow = new BrowserWindow({
    width: 330,
    height: 460,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false, // 添加此行以禁用 web 安全策略
      // 添加以下配置来设置 CSP
      additionalArguments: [`--disable-site-isolation-trials`, `--disable-web-security`]
    },
    frame: false,
    resizable: false,
    transparent: true
  })

  // // 设置 CSP 头
  // mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  //   callback({
  //     responseHeaders: {
  //       ...details.responseHeaders,
  //       'Content-Security-Policy': [
  //         "default-src 'self' http://localhost:9528; connect-src 'self' http://localhost:9528"
  //       ]
  //     }
  //   })
  // })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.webContents.openDevTools()
  })

  // 初始加载登录页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/login')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '/login'
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    isLoginProcessing = false
  })

  ipcMain.on('minimize-window', () => {
    if (mainWindow) {
      mainWindow.minimize()
    }
  })

  // 添加一个变量来跟踪窗口状态
  let isWindowMaximized = false
  let windowPreviousBounds: Electron.Rectangle

  ipcMain.on('maximize-window', () => {
    if (mainWindow) {
      if (isWindowMaximized) {
        // 还原窗口
        if (windowPreviousBounds) {
          mainWindow.setBounds(windowPreviousBounds)
        } else {
          mainWindow.unmaximize()
        }
        isWindowMaximized = false
      } else {
        // 最大化窗口
        windowPreviousBounds = mainWindow.getBounds()
        mainWindow.maximize()
        isWindowMaximized = true
      }
      // 将当前状态发送回渲染进程
      mainWindow.webContents.send('window-state-changed', isWindowMaximized)
    }
  })

  // 在main.ts文件中添加通知模板
  const notificationTemplate = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: rgba(49, 49, 49, 0.9);
        color: white;
        border-radius: 5px;
        overflow: hidden;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background-color: rgba(30, 30, 30, 0.9);
        padding: 5px 10px;
        border-bottom: 1px solid rgba(80, 80, 80, 0.5);
      }
      .header-left {
        display: flex;
        align-items: center;
      }
      .app-icon {
        width: 16px;
        height: 16px;
        margin-right: 5px;
      }
      .app-name {
        font-size: 12px;
        font-weight: bold;
      }
      .close-button {
        cursor: pointer;
        font-size: 14px;
        color: #aaa;
        transition: color 0.2s;
      }
      .close-button:hover {
        color: white;
      }
      .container {
        display: flex;
        align-items: flex-start;
        padding: 10px;
      }
      .content-icon {
        width: 40px;
        height: 40px;
        margin-right: 10px;
        border-radius: 50%;
      }
      .content {
        flex: 1;
      }
      h3 {
        margin: 0 0 5px 0;
        font-size: 14px;
      }
      .content_text {
        margin: 0;
        font-size: 12px;
        display: -webkit-box; /* 必须结合 */
        -webkit-box-orient: vertical; /* 设置盒子方向为垂直 */
        -webkit-line-clamp: 3; /* 限制显示的行数 */
        overflow: hidden; /* 隐藏超出的内容 */
        text-overflow: ellipsis; /* 添加省略号 */
        max-height: 45px;
        word-break:break-all;
      }
    </style>
  </head>
 <body>
   <div class="header">
     <div class="header-left">
       <img class="app-icon" id="appIcon" />
       <div class="app-name">iChat</div>
     </div>
     <div class="close-button" id="closeButton">×</div>
   </div>
   <div class="container">
     <img class="content-icon" id="contentIcon" />
     <div class="content">
       <h3 id="notificationTitle"></h3>
       <div id="notificationBody" class="content_text"></div>
     </div>
   </div>
   <script>
     // 设置自动关闭
     setTimeout(() => window.close(), 30000);

     // 关闭按钮点击事件
     document.getElementById('closeButton').addEventListener('click', () => {
       window.close();
     });

     // 点击通知内容区域打开主窗口
     document.querySelector('.container').addEventListener('click', () => {
       window.api.openMainWindow();
       window.close();
     });

     // 监听来自主进程的消息
     window.api.onNotificationData((data) => {
       document.getElementById('appIcon').src = data.appIconPath;
       document.getElementById('contentIcon').src = data.contentIconUrl;
       document.getElementById('notificationTitle').textContent = data.title;

       // 处理通知内容
       const bodyElement = document.getElementById('notificationBody');
       bodyElement.textContent = data.body;
     });
   </script>
 </body>
 </html>
 `

  // 添加通知管理系统
  let notificationWindows = []
  const notificationQueue = []
  const NOTIFICATION_HEIGHT = 120 // 通知窗口高度
  const NOTIFICATION_GAP = 10 // 通知窗口之间的间距
  const MAX_NOTIFICATIONS = 5 // 最大同时显示的通知数量

  // 添加用户通知映射表，用于跟踪每个用户的通知窗口
  const userNotifications = new Map()
  // 添加多用户通知窗口引用
  let multiUserNotificationWindow = null
  // 跟踪未读消息的用户
  const pendingUsers = new Set()
  // 创建自定义通知窗口的函数
  function createCustomNotification(
    title,
    body,
    contentIconUrl = 'https://img.pl520.com/up/allimg/tx34/03191019033922906.jpg',
    senderId,
    senderName
  ) {
    // 检查主窗口状态，如果不是最小化或隐藏状态，则不显示通知
    if (mainWindow && !mainWindow.isMinimized() && mainWindow.isVisible()) {
      return null
    }

    // 如果有发送者ID，检查是否已有该用户的通知窗口
    if (senderId) {
      // 如果已有该用户的通知窗口，更新内容
      if (userNotifications.has(senderId)) {
        const existingWindow = userNotifications.get(senderId)
        if (!existingWindow.isDestroyed()) {
          // 更新现有窗口的内容
          existingWindow.webContents.send('notification-data', {
            appIconPath: getIconBase64(),
            contentIconUrl: contentIconUrl,
            title: title,
            body: body
          })

          // 重置自动关闭计时器
          if (existingWindow.closeTimeout) {
            clearTimeout(existingWindow.closeTimeout)
          }
          existingWindow.closeTimeout = setTimeout(() => {
            if (!existingWindow.isDestroyed()) {
              existingWindow.close()
            }
          }, 30000)

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

          // 重置自动关闭计时器
          if (multiUserNotificationWindow.closeTimeout) {
            clearTimeout(multiUserNotificationWindow.closeTimeout)
          }
          multiUserNotificationWindow.closeTimeout = setTimeout(() => {
            if (!multiUserNotificationWindow.isDestroyed()) {
              multiUserNotificationWindow.close()
            }
          }, 30000)

          // 关闭所有单用户通知窗口
          closeAllSingleUserNotifications()

          return multiUserNotificationWindow
        } else {
          // 需要创建新的多用户通知窗口，先关闭所有单用户通知窗口
          closeAllSingleUserNotifications()
        }
      }
    }

    // 关闭所有单用户通知窗口
    function closeAllSingleUserNotifications() {
      // 遍历所有用户通知窗口并关闭
      for (const [userId, window] of userNotifications.entries()) {
        if (!window.isDestroyed()) {
          // 清除窗口的自动关闭定时器
          if (window.closeTimeout) {
            clearTimeout(window.closeTimeout)
            window.closeTimeout = null
          }
          window.close()
        }
      }
      // 清空用户通知映射表
      userNotifications.clear()
    }

    const notificationWindow = new BrowserWindow({
      width: 300,
      height: NOTIFICATION_HEIGHT,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      },
      resizable: false,
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
        body: finalBody
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
      if (notificationWindow.closeTimeout) {
        clearTimeout(notificationWindow.closeTimeout)
        notificationWindow.closeTimeout = null
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
    const closeTimeout = setTimeout(() => {
      if (!notificationWindow.isDestroyed()) {
        notificationWindow.close()
      }
    }, 30000)

    // 将定时器引用保存到窗口对象上
    notificationWindow.closeTimeout = closeTimeout

    return notificationWindow
  }

  // 重新定位所有通知窗口，实现堆叠效果
  function repositionNotifications() {
    const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize
    const startX = width - 310

    notificationWindows.forEach((window, index) => {
      if (!window.isDestroyed()) {
        // 计算Y坐标，实现从下到上的堆叠效果
        const startY = height - (index + 1) * (NOTIFICATION_HEIGHT + NOTIFICATION_GAP)
        window.setPosition(startX, startY)
      }
    })
  }

  // 处理通知队列
  function processNotificationQueue() {
    // 如果当前显示的通知数量已达上限，则不处理队列
    if (notificationWindows.length >= MAX_NOTIFICATIONS) {
      return
    }

    // 从队列中取出一个通知并显示
    if (notificationQueue.length > 0) {
      const notification = notificationQueue.shift()
      createCustomNotification(notification.title, notification.body, notification.contentIconUrl)
    }
  }

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
      notificationWindows.forEach((window) => {
        if (!window.isDestroyed()) {
          // 清除窗口的自动关闭定时器
          if (window.closeTimeout) {
            clearTimeout(window.closeTimeout)
            window.closeTimeout = null
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
  })

  // ipcMain.on('send-notification', (_event, { title, body }) => {
  //   const notification = new Notification({
  //     title,
  //     body,
  //     icon: nativeImage.createFromPath(getIconPath()),
  //     silent: false // 是否播放声音
  //   })

  //   notification.on('click', () => {
  //     // 点击通知时显示主窗口
  //     if (mainWindow) {
  //       if (mainWindow.isMinimized()) mainWindow.restore()
  //       mainWindow.show()
  //       mainWindow.focus()
  //     }
  //   })

  //   notification.show()
  //   return true
  // })

  // 添加托盘相关处理

  let tray: Tray | null = null
  const getIconPath = () => {
    if (is.dev) {
      return join(__dirname, '../../resources/icon.png')
    } else {
      return join(process.resourcesPath, 'icon.png')
    }
  }

  // 添加一个函数来获取图标的 Base64 编码
  function getIconBase64() {
    const iconPath = getIconPath()
    try {
      const iconData = fs.readFileSync(iconPath)
      return `data:image/png;base64,${iconData.toString('base64')}`
    } catch (error) {
      console.error('读取图标文件失败:', error)
      return '' // 返回空字符串或默认图标
    }
  }
  // 创建托盘
  function createTray() {
    if (!tray) {
      const trayIconPath = getIconPath()
      tray = new Tray(trayIconPath) // 替换为你的托盘图标路径
      const contextMenu = Menu.buildFromTemplate([
        {
          label: '显示主窗口',
          click: () => {
            mainWindow?.show()
          }
        },
        {
          label: '退出',
          click: () => {
            app.quit()
          }
        }
      ])
      tray.setToolTip('iChat')
      tray.setContextMenu(contextMenu)

      // 点击托盘图标显示主窗口
      tray.on('click', () => {
        mainWindow?.show()
      })
    }
  }

  // 添加隐藏到托盘的 IPC 处理
  ipcMain.on('hide-to-tray', () => {
    if (!tray) {
      createTray()
    }
    mainWindow?.hide()
  })

  ipcMain.on('close-window', () => {
    mainWindow?.close()
  })

  ipcMain.on('open-system-settings', (_event, url) => {
    shell.openExternal(url)
  })
  // 选择文件
  ipcMain.handle('select-file', async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Documents', extensions: ['doc', 'docx', 'xls', 'xlsx', 'txt', 'pdf'] },
          { name: 'Videos', extensions: ['mp4', 'avi', 'mov'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      return filePaths[0] || null
    } catch (error) {
      console.error('选择文件失败:', error)
      return null
    }
  })

  // 选择图片
  ipcMain.handle('select-image', async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }]
      })
      return filePaths[0] || null
    } catch (error) {
      console.error('选择图片失败:', error)
      return null
    }
  })

  // 获取文件信息
  ipcMain.handle('get-file-info', async (event, filePath) => {
    try {
      const stats = await fs.promises.stat(filePath)
      const mimeType = mime.lookup(filePath) || 'application/octet-stream'
      return {
        name: path.basename(filePath),
        size: stats.size,
        type: mimeType
      }
    } catch (error) {
      console.error('获取文件信息失败:', error)
      return null
    }
  })

  // 读取文件内容
  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      return await fs.promises.readFile(filePath)
    } catch (error) {
      console.error('读取文件失败:', error)
      return null
    }
  })

  ipcMain.handle('save-file', async (_event, params: { fileName: string; fileData: Buffer }) => {
    try {
      const desktopPath = app.getPath('desktop')
      const filePath = join(desktopPath, params.fileName)
      // 确保 fileData 是 Buffer 类型
      const buffer = Buffer.isBuffer(params.fileData)
        ? params.fileData
        : Buffer.from(new Uint8Array(params.fileData))
      await writeFile(filePath, buffer)
      return filePath
    } catch (error) {
      console.error('保存文件失败:', error)
      throw error
    }
  })

  ipcMain.handle('open-file', async (_event, url) => {
    try {
      const res = await shell.openPath(url)
      if (res !== '') {
        throw new Error(res)
      }
    } catch (error) {
      console.error('打开文件失败:', error)
      throw error
    }
  })
}

export function initWindows(): void {
  ipcMain.removeAllListeners('login-success')
  createMainWindow()

  // 监听登录成功事件
  ipcMain.on('login-success', (event) => {
    if (!mainWindow || isLoginProcessing) return

    console.log('login-success')
    isLoginProcessing = true

    // 先调整窗口大小，但保持窗口可见
    mainWindow.setResizable(true)
    mainWindow.setSize(900, 670)
    mainWindow.setMinimumSize(370, 640)
    mainWindow.center()

    // 加载主页面
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/')
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: '/'
      })
    }

    // 等待页面完全加载后再处理
    mainWindow.webContents.once('did-finish-load', () => {
      if (!mainWindow) return

      console.log('page-load')
      event.reply('login-reply', 'success')
      isLoginProcessing = false
    })
  })

  ipcMain.on('logout', () => {
    if (!mainWindow) return

    isLoginProcessing = false

    // 先调整窗口大小为登录窗口大小
    mainWindow.setResizable(true)
    mainWindow.setSize(330, 460)
    mainWindow.center()
    mainWindow.setResizable(false)

    // 加载登录页面
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/login')
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: '/login'
      })
    }
  })
}
