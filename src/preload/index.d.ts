import { ElectronAPI } from '@electron-toolkit/preload'
import { IpcApi } from './ipcApi'

declare global {
  interface Window {
    electron: ElectronAPI
    api: IpcApi
  }
}
