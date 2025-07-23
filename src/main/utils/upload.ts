import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import axios from 'axios'
// 全局变量，用于存储主窗口引用
let mainWindow: BrowserWindow | null = null

// 版本信息接口地址
const VERSION_API_URL = 'http://socket.goodjob.cn:9004/api/version'

// 版本信息接口返回的数据结构
interface VersionInfo {
  current_version: string
  description: string
  download_url: string
  release_date: string
  update_available: boolean
}

/**
 * 设置主窗口引用
 * @param window 主窗口实例
 */
export function setMainWindow(window: BrowserWindow | null) {
  mainWindow = window
}

/**
 * 发送日志消息到渲染进程
 * @param type 消息类型
 * @param msg 消息内容
 */
function sendLogMessage(type: 'info' | 'success' | 'warning' | 'error', msg: string) {
  if (mainWindow) {
    mainWindow.webContents.send('log-message', { type, msg })
  }
}

/**
 * 设置自动更新
 */
export function setupAutoUpdater() {
  // 配置autoUpdater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  /**
   * 获取更新内容文本
   * @param updataUrl 基础URL
   * @returns 更新内容文本
   */
  async function fetchUpdateContent(updataUrl: string): Promise<string> {
    try {
      sendLogMessage('info', '正在获取更新内容: ' + updataUrl)

      const response = await axios.get(updataUrl)
      console.log('🚀 ~ fetchUpdateContent ~ response:', response)

      const content = response.data
      sendLogMessage('info', '成功获取更新内容')
      return content.trim()
    } catch (error) {
      sendLogMessage('error', '获取更新内容失败: ' + error.message)
      return ''
    }
  }

  // 检查更新
  ipcMain.handle('check-for-updates', async () => {
    try {
      sendLogMessage('info', '正在请求版本信息: ' + VERSION_API_URL)
      const response = await axios.post(
        VERSION_API_URL,
        {
          type: 'win10'
        },
        {
          method: 'post',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      sendLogMessage('info', '服务器响应状态: ' + response.status + ' ' + response.statusText)

      const versionInfo: VersionInfo = response.data
      const currentVersion = app.getVersion()
      sendLogMessage('info', '当前版本: ' + currentVersion)

      // 获取更新内容
      let updateContent = ''
      if (versionInfo.update_available) {
        const updataUrl = versionInfo.release_date

        updateContent = await fetchUpdateContent(updataUrl)
      }

      // 构造与electron-updater兼容的返回格式
      const updateInfo = {
        version: versionInfo.current_version,
        releaseNotes: versionInfo.description ? [versionInfo.description] : [],
        releaseDate: versionInfo.release_date,
        updateAvailable: versionInfo.update_available,
        updateContent: updateContent
      }

      if (versionInfo.update_available) {
        // 配置autoUpdater的下载URL
        if (versionInfo.download_url) {
          const baseUrl = versionInfo.download_url.substring(
            0,
            versionInfo.download_url.lastIndexOf('/')
          )

          sendLogMessage('info', '设置下载基础URL: ' + baseUrl)

          // 测试latest.yml是否可访问
          try {
            const testYmlUrl = `${baseUrl}/latest.yml`
            sendLogMessage('info', '测试latest.yml URL: ' + testYmlUrl)
            axios
              .head(testYmlUrl, { method: 'HEAD' })
              .then((response) => {
                if (response.status === 200) {
                  sendLogMessage('info', 'latest.yml可访问，状态码: ' + response.status)
                } else {
                  sendLogMessage('warning', 'latest.yml不可访问，状态码: ' + response.status)
                }
              })
              .catch((err) => {
                sendLogMessage('error', '测试latest.yml失败: ' + err.message)
              })
          } catch (testError) {
            sendLogMessage('error', '测试latest.yml出错: ' + testError.message)
          }

          autoUpdater.setFeedURL({
            provider: 'generic',
            url: baseUrl
          })
        } else {
          // 使用默认下载URL
          autoUpdater.setFeedURL({
            provider: 'generic',
            url: 'https://jczm-1251308112.cos.ap-guangzhou.myqcloud.com/win10'
          })
        }

        // 通知渲染进程有可用更新
        if (mainWindow) {
          mainWindow.webContents.send('update-available', updateInfo)
        }
      }

      return { updateInfo }
    } catch (error) {
      sendLogMessage('error', '检查更新失败: ' + error.message)
      return { error: error.message }
    }
  })

  // 添加获取应用版本号的处理程序
  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  // 添加下载更新处理程序
  ipcMain.handle('download-update', async () => {
    try {
      // 清除之前的所有监听器，避免重复
      autoUpdater.removeAllListeners()
      // 记录当前的下载URL配置
      sendLogMessage('info', '开始准备下载更新...')
      // 设置下载进度监听
      autoUpdater.on('download-progress', (progressObj) => {
        sendLogMessage('info', '下载进度: ' + progressObj.percent + '%')
        if (mainWindow) {
          mainWindow.webContents.send('download-progress', { percent: progressObj.percent })
        }
      })

      // 设置下载完成监听
      autoUpdater.on('update-downloaded', (info) => {
        sendLogMessage('success', '更新下载完成: ' + info.version)
        if (mainWindow) {
          mainWindow.webContents.send('update-downloaded', {
            version: info.version,
            releaseDate: info.releaseDate
          })
        }
      })

      // 添加错误监听
      autoUpdater.on('error', (error) => {
        sendLogMessage('error', '更新下载错误: ' + error.message)
        // 将错误信息发送到渲染进程
        if (mainWindow) {
          mainWindow.webContents.send('update-error', { message: error.message })
        }
      })

      // 添加日志监听
      autoUpdater.logger = log
      autoUpdater.logger.transports.file.level = 'debug'

      // 开始下载
      sendLogMessage('info', '开始下载更新...')
      // 尝试手动检查更新文件
      try {
        const url = 'https://jczm-1251308112.cos.ap-guangzhou.myqcloud.com/win10'
        const latestYmlUrl = `${url}/latest.yml`
        sendLogMessage('info', '尝试获取latest.yml: ' + latestYmlUrl)
        const response = await axios.get(latestYmlUrl)

        if (response.status === 200) {
          const ymlContent = await response.data
          sendLogMessage('info', `latest.yml内容前100字符: ${ymlContent.substring(0, 100)}...`)
          // 验证yml内容是否包含必要的字段
          if (!ymlContent.includes('path:') || !ymlContent.includes('sha512:')) {
            sendLogMessage('error', 'latest.yml格式不正确，缺少必要字段')
            throw new Error('latest.yml格式不正确，缺少必要字段')
          }
        } else {
          sendLogMessage('warning', `无法获取latest.yml，状态码: ${response.status}`)
          throw new Error(`无法获取latest.yml，状态码: ${response.status}`)
        }
      } catch (checkError) {
        sendLogMessage('error', `检查latest.yml失败: ${checkError.message}`)
        return { error: checkError.message }
      }

      // 确保autoUpdater配置正确
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: 'https://jczm-1251308112.cos.ap-guangzhou.myqcloud.com/win10'
      })

      // 添加这一行：先检查更新
      sendLogMessage('info', '检查更新...')
      await autoUpdater.checkForUpdates()

      autoUpdater.downloadUpdate().catch((err) => {
        sendLogMessage('error', `下载更新失败: ${err.message}`)
        if (mainWindow) {
          mainWindow.webContents.send('update-error', { message: err.message })
        }
        throw err
      })

      return { success: true }
    } catch (error) {
      sendLogMessage('error', '下载更新失败: ' + error.message)
      return { error: error.message }
    }
  })

  // 添加安装并重启应用处理程序
  ipcMain.on('install-and-restart', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}
