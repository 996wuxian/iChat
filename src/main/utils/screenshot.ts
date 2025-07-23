import { BrowserWindow, ipcMain, screen, desktopCapturer, clipboard, nativeImage } from 'electron'
import { join } from 'path'

// 截图窗口引用
let screenshotWindow: BrowserWindow | null = null

// 截图HTML模板
const screenshotTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: transparent;
      cursor: crosshair;
    }

    #screenshot-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
    }

    #screenshot-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      pointer-events: none;
    }

    #selection-box {
      position: absolute;
      border: 2px solid #007acc;
      background: rgba(0, 122, 204, 0.1);
      display: none;
      pointer-events: none;
    }

    #toolbar {
      position: absolute;
      background: rgba(40, 40, 40, 0.95);
      border-radius: 6px;
      padding: 8px;
      display: none;
      gap: 8px;
      backdrop-filter: blur(10px);
    }

    .toolbar-btn {
      padding: 6px 12px;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
    }

    .toolbar-btn:hover {
      background: #005a9e;
    }

    .toolbar-btn.cancel {
      background: #666;
    }

    .toolbar-btn.cancel:hover {
      background: #555;
    }

    #instructions {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      background: rgba(0, 0, 0, 0.7);
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      backdrop-filter: blur(10px);
    }
  </style>
</head>
<body>
  <div id="screenshot-container">
    <img id="screenshot-image" />
    <div id="selection-box"></div>
    <div id="toolbar">
      <button class="toolbar-btn" id="copy-btn">复制</button>
      <button class="toolbar-btn cancel" id="cancel-btn">取消</button>
    </div>
    <div id="instructions">拖拽选择截图区域，按ESC键取消</div>
  </div>

  <script>
    let isSelecting = false;
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;
    let screenshotData = null;

    const container = document.getElementById('screenshot-container');
    const selectionBox = document.getElementById('selection-box');
    const toolbar = document.getElementById('toolbar');
    const instructions = document.getElementById('instructions');
    const screenshotImage = document.getElementById('screenshot-image');

    // 监听来自主进程的截图数据
    window.api.onScreenshotData((data) => {
      screenshotData = data;
      screenshotImage.src = data.dataURL;
      // 隐藏说明文字
      setTimeout(() => {
        instructions.style.display = 'none';
      }, 2000);
    });

    // 鼠标按下开始选择
    container.addEventListener('mousedown', (e) => {
      if (e.target === screenshotImage || e.target === container) {
        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;
        endX = startX;
        endY = startY;

        selectionBox.style.display = 'block';
        selectionBox.style.left = startX + 'px';
        selectionBox.style.top = startY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';

        toolbar.style.display = 'none';
      }
    });

    // 鼠标移动更新选择框
    container.addEventListener('mousemove', (e) => {
      if (isSelecting) {
        endX = e.clientX;
        endY = e.clientY;

        const left = Math.min(startX, endX);
        const top = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);

        selectionBox.style.left = left + 'px';
        selectionBox.style.top = top + 'px';
        selectionBox.style.width = width + 'px';
        selectionBox.style.height = height + 'px';
      }
    });

    // 鼠标抬起完成选择
    container.addEventListener('mouseup', (e) => {
      if (isSelecting) {
        isSelecting = false;

        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);

        if (width > 10 && height > 10) {
          // 显示工具栏
          const toolbarX = Math.min(startX, endX) + width / 2 - 50;
          const toolbarY = Math.max(startY, endY) + 10;

          toolbar.style.left = toolbarX + 'px';
          toolbar.style.top = toolbarY + 'px';
          toolbar.style.display = 'flex';
        } else {
          // 选择区域太小，隐藏选择框
          selectionBox.style.display = 'none';
        }
      }
    });

    // 复制按钮
    document.getElementById('copy-btn').addEventListener('click', () => {
      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      if (width > 0 && height > 0) {
        // 发送截图区域到主进程
        window.api.captureScreenArea({
          x: left,
          y: top,
          width: width,
          height: height,
          scaleFactor: window.devicePixelRatio
        });
      }
    });

    // 取消按钮
    document.getElementById('cancel-btn').addEventListener('click', () => {
      window.api.closeScreenshotWindow();
    });

    // ESC键取消
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.api.closeScreenshotWindow();
      }
    });

    // 防止右键菜单
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  </script>
</body>
</html>
`

// 创建截图窗口
export function createScreenshotWindow(): void {
  if (screenshotWindow && !screenshotWindow.isDestroyed()) {
    screenshotWindow.focus()
    return
  }

  // 获取主屏幕信息
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.bounds

  screenshotWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreen: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false
    }
  })

  // 加载HTML模板
  screenshotWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(screenshotTemplate)}`)

  // 窗口加载完成后获取桌面截图
  screenshotWindow.webContents.once('did-finish-load', async () => {
    try {
      // 获取桌面源
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: width, height: height }
      })

      if (sources.length > 0) {
        // 选择整个屏幕
        const screenSource =
          sources.find(
            (source) =>
              source.name.includes('Entire screen') ||
              source.name.includes('Screen') ||
              source.name === 'Screen 1'
          ) || sources[0]

        // 发送截图数据到渲染进程
        screenshotWindow?.webContents.send('screenshot-data', {
          dataURL: screenSource.thumbnail.toDataURL(),
          width: width,
          height: height
        })
      }
    } catch (error) {
      console.error('获取桌面截图失败:', error)
      closeScreenshotWindow()
    }
  })

  // 窗口关闭事件
  screenshotWindow.on('closed', () => {
    screenshotWindow = null
  })

  screenshotWindow.show()
  screenshotWindow.focus()
}

// 关闭截图窗口
export function closeScreenshotWindow(): void {
  if (screenshotWindow && !screenshotWindow.isDestroyed()) {
    screenshotWindow.close()
  }
  screenshotWindow = null
}

// 处理截图区域捕获
export async function captureScreenArea(area: {
  x: number
  y: number
  width: number
  height: number
  scaleFactor: number
}): Promise<void> {
  try {
    // 获取主屏幕信息
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = primaryDisplay.bounds

    // 限制thumbnailSize的最大值，避免参数错误
    const maxThumbnailSize = 4096 // 限制最大尺寸
    const thumbnailWidth = Math.min(screenWidth, maxThumbnailSize)
    const thumbnailHeight = Math.min(screenHeight, maxThumbnailSize)

    // 重新获取桌面截图，使用安全的尺寸参数
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: thumbnailWidth,
        height: thumbnailHeight
      }
    })

    if (sources.length > 0) {
      const screenSource =
        sources.find(
          (source) =>
            source.name.includes('Entire screen') ||
            source.name.includes('Screen') ||
            source.name === 'Screen 1'
        ) || sources[0]

      // 获取原始图片
      const originalImage = screenSource.thumbnail

      // 计算实际的缩放比例
      const actualScaleX = originalImage.getSize().width / screenWidth
      const actualScaleY = originalImage.getSize().height / screenHeight

      // 计算裁剪区域，确保坐标和尺寸都是整数
      const cropX = Math.round(area.x * actualScaleX)
      const cropY = Math.round(area.y * actualScaleY)
      const cropWidth = Math.round(area.width * actualScaleX)
      const cropHeight = Math.round(area.height * actualScaleY)

      // 确保裁剪区域在图片范围内
      const imageSize = originalImage.getSize()
      const safeCropX = Math.max(0, Math.min(cropX, imageSize.width - 1))
      const safeCropY = Math.max(0, Math.min(cropY, imageSize.height - 1))
      const safeCropWidth = Math.max(1, Math.min(cropWidth, imageSize.width - safeCropX))
      const safeCropHeight = Math.max(1, Math.min(cropHeight, imageSize.height - safeCropY))

      // 裁剪图片
      const croppedImage = originalImage.crop({
        x: safeCropX,
        y: safeCropY,
        width: safeCropWidth,
        height: safeCropHeight
      })

      // 复制到剪贴板
      clipboard.writeImage(croppedImage)
      console.log('截图已复制到剪贴板，区域:', {
        原始区域: area,
        裁剪区域: { x: safeCropX, y: safeCropY, width: safeCropWidth, height: safeCropHeight },
        图片尺寸: imageSize
      })

      // 关闭截图窗口
      closeScreenshotWindow()
    } else {
      throw new Error('无法获取屏幕截图源')
    }
  } catch (error) {
    console.error('处理截图失败:', error)
    closeScreenshotWindow()
  }
}
// 初始化截图系统
export function initScreenshotSystem(): void {
  // 注册IPC处理程序
  ipcMain.handle('create-screenshot-window', () => {
    try {
      createScreenshotWindow()
      return { success: true }
    } catch (error) {
      console.error('创建截图窗口失败:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('close-screenshot-window', () => {
    try {
      closeScreenshotWindow()
      return { success: true }
    } catch (error) {
      console.error('关闭截图窗口失败:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('capture-screen-area', async (_event, area) => {
    try {
      await captureScreenArea(area)
      return { success: true }
    } catch (error) {
      console.error('捕获截图区域失败:', error)
      return { success: false, error: error.message }
    }
  })
}
