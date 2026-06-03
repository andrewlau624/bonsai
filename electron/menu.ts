import { app, Menu, shell, BrowserWindow } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { getMainWindow } from './main'
import { checkForUpdates } from './updater'

// Native application menu (the macOS top bar). The Settings item (⌘,) tells the
// renderer to open the in-app Settings panel.
export function buildMenu(): void {
  const isMac = process.platform === 'darwin'
  const openSettings = () => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('menu:open-settings')
  }

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: 'Check for Updates…',
                click: () => void checkForUpdates(),
              },
              {
                label: 'Settings…',
                accelerator: 'CmdOrCtrl+,',
                click: openSettings,
              },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings…',
          accelerator: 'CmdOrCtrl+,',
          click: openSettings,
        },
        { type: 'separator' as const },
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },
    {
      label: 'View',
      submenu: [
        // App reload is intentionally omitted (it would orphan terminals). ⌘R
        // reloads only the active localhost preview.
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            const focused = BrowserWindow.getFocusedWindow()
            if (!focused) return
            // Main app: reload only the active in-app preview. Any pop-out
            // window (browser/code/PR/diff): reload that window directly.
            if (focused === getMainWindow()) focused.webContents.send('menu:reload-preview')
            else focused.webContents.reload()
          },
        },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' as const }, { role: 'zoom' as const }],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Bonsai on GitHub',
          click: () => shell.openExternal('https://github.com/andrewlau624/bonsai'),
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
