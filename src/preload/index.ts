import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { ipcApi } from './ipcApi'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', ipcApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = ipcApi
}
