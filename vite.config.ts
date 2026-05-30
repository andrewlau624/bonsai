import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

// Electron + Vite + React.
// - electron/main.ts   -> main process (node-pty, git, env vault) -> dist-electron/main.js
// - electron/preload.ts -> contextBridge IPC surface             -> dist-electron/preload.mjs
// - src/                -> renderer (React + xterm.js)
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              // Native + node-only deps must stay external (not bundled).
              external: ['node-pty', 'electron-store'],
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
      },
      // No `renderer` option: the renderer never touches node directly —
      // everything goes through the preload contextBridge.
    }),
  ],
})
