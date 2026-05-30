import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { registerIpc } from './ipc'
import { killAll } from './pty'

// vite-plugin-electron sets this in dev; undefined in a packaged build.
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

// dist-electron/main.js lives next to preload; dist/ holds the built renderer.
const DIST_ELECTRON = __dirname
const DIST_RENDERER = path.join(__dirname, '../dist')

let win: BrowserWindow | null = null

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 820,
    minHeight: 480,
    backgroundColor: '#0d1117',
    titleBarStyle: 'hiddenInset',
    title: 'Bonsai',
    webPreferences: {
      preload: path.join(DIST_ELECTRON, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (DEV_SERVER_URL) {
    win.loadURL(DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(DIST_RENDERER, 'index.html'))
  }

  win.on('closed', () => {
    win = null
  })
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  killAll()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => killAll())
