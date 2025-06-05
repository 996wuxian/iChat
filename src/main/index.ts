import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { initWindows } from './main'

app.whenReady().then(() => {
  electronApp.setAppUserModelId('iChat')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', (event) => {
    console.log('pong')
    event.reply('pong-reply', '这是来自主进程的回复')
  })

  console.log('app ready')
  // 初始化窗口
  initWindows()

  app.on('activate', function () {
    console.log('app activate')
    if (BrowserWindow.getAllWindows().length === 0) {
      initWindows()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
