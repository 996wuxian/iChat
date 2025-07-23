import { clipboard, ipcRenderer } from 'electron'

export const ipcApi = {
  sendPing: () => {
    ipcRenderer.send('ping')
  },
  onPongReply: (callback: (data: string) => void) => {
    ipcRenderer.on('pong-reply', (_event, data) => {
      callback(data)
    })
  },
  loginSuccess: () => {
    ipcRenderer.send('login-success')
  },
  onLoginReply: (callback: (data: string) => void) => {
    ipcRenderer.on('login-reply', (_event, data) => {
      callback(data)
    })
  },
  copyText: (text: string) => {
    clipboard.writeText(text)
  },
  openSystemSettings: (url: string) => {
    ipcRenderer.send('open-system-settings', url)
  },
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectImage: () => ipcRenderer.invoke('select-image'),
  getFileInfo: (filePath: string) => ipcRenderer.invoke('get-file-info', filePath),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (params: { fileName: string; fileData: Blob }) => {
    return ipcRenderer.invoke('save-file', params)
  },
  openFile: (url: string) => {
    return ipcRenderer.invoke('open-file', url)
  },
  logout: () => {
    ipcRenderer.send('logout')
  },
  minimizeWindow: () => {
    ipcRenderer.send('minimize-window')
  },
  maximizeWindow: () => {
    ipcRenderer.send('maximize-window')
  },
  onWindowStateChanged: (callback: any) => {
    ipcRenderer.on('window-state-changed', (_event, isMaximized) => {
      callback(isMaximized)
    })
  },
  collapseWindow: () => {
    ipcRenderer.send('collapse-window')
  },
  expandWindow: () => {
    ipcRenderer.send('expand-window')
  },
  // 添加新方法监听窗口收缩状态
  onWindowCollapsed: (callback: (collapsed: boolean) => void) => {
    ipcRenderer.on('window-collapsed-state', (_event, collapsed) => {
      callback(collapsed)
    })
  },
  sendNotification: (
    title: string,
    body: string,
    senderId?: string,
    senderName?: string,
    contentIconUrl?: string
  ) => {
    return ipcRenderer.send('send-notification', {
      title,
      body,
      senderId,
      senderName,
      contentIconUrl
    })
  },
  onNotificationData: (callback: any) => {
    ipcRenderer.on('notification-data', (_event, data) => {
      callback(data)
    })
  },
  openMainWindow: () => {
    ipcRenderer.send('open-main-window')
  },
  hideToTray: () => {
    ipcRenderer.send('hide-to-tray')
  },
  // 账号存储相关的IPC方法
  saveAccount: (
    username: string,
    password: string,
    autoLogin: boolean,
    rememberPassword: boolean = false
  ) => {
    console.log(
      username,
      password,
      autoLogin,
      rememberPassword,
      'username, password, autoLogin, rememberPassword'
    )
    return ipcRenderer.invoke('save-account', { username, password, autoLogin, rememberPassword })
  },
  getAccounts: () => {
    return ipcRenderer.invoke('get-accounts')
  },
  getAutoLoginAccount: () => {
    return ipcRenderer.invoke('get-auto-login-account')
  },
  removeAccount: (username: string) => {
    return ipcRenderer.invoke('remove-account', username)
  },
  clearAutoLogin: () => {
    return ipcRenderer.invoke('clear-auto-login')
  },
  closeWindow: () => {
    ipcRenderer.send('close-window')
  }
}

export type IpcApi = typeof ipcApi
