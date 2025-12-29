const { app, BrowserWindow, Menu, protocol, net } = require('electron')
const path = require('path')
const fs = require('fs')
const url = require('url')

// 禁用硬件加速（解决某些 Windows 显示问题）
// app.disableHardwareAcceleration()

// 说明：主进程兜底错误捕获，避免出现“闪退无提示”
process.on('uncaughtException', (err) => {
  console.error('[主进程未捕获异常]', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[主进程未处理 Promise Rejection]', reason)
})

let mainWindow

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
const DIST_INDEX_PATH = path.join(__dirname, '../dist/index.html')
const DIST_DIR_PATH = path.dirname(DIST_INDEX_PATH)

// 自定义协议名称（用于解决 file:// 协议下 ES modules 的 CORS 问题）
const PROTOCOL_SCHEME = 'app'

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
}

// 注册自定义协议（必须在 app ready 之前调用）
protocol.registerSchemesAsPrivileged([
  {
    scheme: PROTOCOL_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
])

function fileUrlToPath(url) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'file:') return null

    // 说明：Windows 下 file URL 的 pathname 形如 /C:/xxx，需要去掉开头的 / 才能转成磁盘路径。
    const pathname = decodeURIComponent(parsed.pathname).replace(/^\/([A-Za-z]:)/, '$1')
    return path.normalize(pathname)
  } catch {
    return null
  }
}

function isAllowedNavigation(targetUrl) {
  // 说明：打印窗口使用 about:blank / blob:，这里放行。
  if (targetUrl.startsWith('about:blank')) return true
  if (targetUrl.startsWith('blob:')) return true

  // 允许自定义协议
  if (targetUrl.startsWith(`${PROTOCOL_SCHEME}://`)) return true

  // 开发环境允许访问本地 dev server
  if (!app.isPackaged && targetUrl.startsWith(DEV_SERVER_URL)) return true

  const targetPath = fileUrlToPath(targetUrl)
  if (!targetPath) return false

  // 说明：生产环境只允许在 dist 目录内导航，避免被带到任意本地 file:// 地址。
  const distDir = path.resolve(DIST_DIR_PATH)
  const resolvedTarget = path.resolve(targetPath)
  return resolvedTarget === distDir || resolvedTarget.startsWith(distDir + path.sep)
}

// 设置自定义协议处理器
function setupProtocolHandler() {
  protocol.handle(PROTOCOL_SCHEME, (request) => {
    try {
      const requestUrl = new URL(request.url)
      let pathname = decodeURIComponent(requestUrl.pathname)

      // 处理根路径
      if (pathname === '/' || pathname === '') {
        pathname = '/index.html'
      }

      // 移除开头的斜杠以构建正确的文件路径
      const relativePath = pathname.startsWith('/') ? pathname.slice(1) : pathname

      // 构建文件路径
      const filePath = path.join(DIST_DIR_PATH, relativePath)

      // 安全检查：确保路径在 dist 目录内
      const resolvedPath = path.resolve(filePath)
      const resolvedDist = path.resolve(DIST_DIR_PATH)
      // 说明：不能直接用 startsWith(resolvedDist)，否则像 "C:\\distmalicious" 也会误判为在 "C:\\dist" 下。
      // 这里使用 “相等 或 以 dist\\ 为前缀” 的判断，避免路径穿越与前缀碰撞。
      if (resolvedPath !== resolvedDist && !resolvedPath.startsWith(resolvedDist + path.sep)) {
        return new Response('Forbidden', { status: 403 })
      }

      // 检查文件是否存在
      if (!fs.existsSync(resolvedPath)) {
        // 对于 SPA，未找到的路径返回 index.html
        const indexPath = path.join(DIST_DIR_PATH, 'index.html')
        if (fs.existsSync(indexPath)) {
          return net.fetch(url.pathToFileURL(indexPath).href)
        }
        return new Response('Not Found', { status: 404 })
      }

      // 使用 net.fetch 读取文件（Electron 推荐方式）
      return net.fetch(url.pathToFileURL(resolvedPath).href)
    } catch (error) {
      console.error('[Protocol Handler Error]', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  })
}

function createWindow() {
  // 创建浏览器窗口，模拟网页尺寸
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: '物料与条码管理系统',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // 启用 sandbox 进一步收紧渲染进程权限（生产环境建议开启）
      sandbox: true,
      webSecurity: true,
      // 生产环境禁用 DevTools，减少被调试/注入的风险
      devTools: !app.isPackaged,
      // 显式禁用 <webview>（大多数业务不需要，且是常见攻击面）
      webviewTag: false
    },
    // 窗口样式
    frame: true,
    autoHideMenuBar: true, // 自动隐藏菜单栏，按 Alt 可显示
    backgroundColor: '#f3f4f6'
  })

  // 加载渲染进程页面：优先 dev server，失败则回退到 dist（便于本地预览 build 后效果）
  const loadRenderer = async () => {
    if (app.isPackaged) {
      // 生产环境使用自定义协议加载（解决 ES modules CORS 问题）
      await mainWindow.loadURL(`${PROTOCOL_SCHEME}://localhost/index.html`)
      return
    }

    try {
      await mainWindow.loadURL(DEV_SERVER_URL)
      // 打开开发者工具（仅开发环境）
      mainWindow.webContents.openDevTools()
    } catch {
      // 说明：用于 `pnpm electron:preview`（未启动 Vite dev server）时也能直接打开 dist。
      // 非打包模式也使用自定义协议
      await mainWindow.loadURL(`${PROTOCOL_SCHEME}://localhost/index.html`)
    }
  }
  loadRenderer()

  // 窗口关闭时清理引用
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 处理新窗口打开请求（如打印）
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 允许打印窗口
    if (url === 'about:blank' || url.startsWith('blob:')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 800,
          height: 600,
          title: '打印预览',
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            // 生产环境禁用 DevTools，减少被调试/注入的风险
            devTools: !app.isPackaged,
            webviewTag: false
          }
        }
      }
    }
    return { action: 'deny' }
  })
}

// 创建简洁的应用菜单
function createMenu() {
  const isProd = app.isPackaged

  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '刷新',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload()
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        {
          label: '全屏',
          accelerator: 'F11',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen())
            }
          }
        },
        // 生产环境默认隐藏开发者工具入口
        ...(!isProd ? [{
          label: '开发者工具',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools()
          }
        }] : [])
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            const { dialog } = require('electron')
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: '物料与条码管理系统',
              detail: `版本: ${app.getVersion()}\n基于 Electron + React + Vite 构建`
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 额外的 WebContents 安全加固：禁止 webview 注入
app.on('web-contents-created', (_event, contents) => {
  // 说明：禁止 <webview>，避免引入额外攻击面。
  contents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })

  // 说明：默认禁止随意打开新窗口；主窗口会显式放行打印窗口。
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))

  // 说明：禁止导航到非白名单地址（防止被恶意链接带离应用页面，或跳转到任意 file://）。
  contents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault()
    }
  })
})

// Electron 初始化完成后创建窗口
app.whenReady().then(() => {
  // 设置自定义协议处理器（必须在创建窗口之前）
  setupProtocolHandler()

  createMenu()
  createWindow()

  // macOS 点击 dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出应用（Windows/Linux）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 处理证书错误（开发环境）
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (!app.isPackaged) {
    event.preventDefault()
    callback(true)
  } else {
    callback(false)
  }
})
