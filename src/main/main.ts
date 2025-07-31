import { app, BrowserWindow, dialog, ipcMain, Menu, Tray } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as mime from 'mime-types'
import { writeFile } from 'fs/promises'
import { electronStore } from './utils/storage'

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

  // 添加托盘相关处理

  let tray: Tray | null = null
  const getIconPath = () => {
    if (is.dev) {
      return join(__dirname, '../../resources/icon.png')
    } else {
      return join(process.resourcesPath, 'icon.png')
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

  // 添加账号存储相关的IPC处理器
  ipcMain.handle(
    'save-account',
    async (event, { username, password, autoLogin, rememberPassword }) => {
      try {
        electronStore.saveAccount(username, password, autoLogin, rememberPassword)
        return { success: true }
      } catch (error) {
        console.error('保存账号失败:', error)
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle('get-accounts', async () => {
    try {
      const accounts = electronStore.getAccounts()
      // 根据rememberPassword字段决定是否返回密码
      return accounts.map((acc) => ({
        username: acc.username,
        password: acc.rememberPassword ? acc.password : '', // 只有记住密码时才返回密码
        rememberPassword: acc.rememberPassword,
        autoLogin: acc.autoLogin,
        lastLoginTime: acc.lastLoginTime
      }))
    } catch (error) {
      console.error('获取账号列表失败:', error)
      return []
    }
  })

  ipcMain.handle('get-auto-login-account', async () => {
    try {
      return electronStore.getAutoLoginAccount()
    } catch (error) {
      console.error('获取自动登录账号失败:', error)
      return null
    }
  })

  ipcMain.handle('remove-account', async (event, username) => {
    try {
      electronStore.removeAccount(username)
      return { success: true }
    } catch (error) {
      console.error('删除账号失败:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('clear-auto-login', async () => {
    try {
      electronStore.clearAutoLogin()
      return { success: true }
    } catch (error) {
      console.error('清除自动登录失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 添加群聊面板展开
  ipcMain.on('expand-group-panel', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds()
      mainWindow.setSize(bounds.width + 300, bounds.height) // 宽度增大300，高度不变
    }
  })

  ipcMain.on('collapse-group-panel', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds()
      mainWindow.setSize(900, bounds.height) // 恢复原始宽度，高度不变
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
    mainWindow.setMinimumSize(330, 460)
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
