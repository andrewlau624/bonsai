/// <reference types="vite/client" />
import type { BonsaiApi } from '../shared/types'

declare global {
  interface Window {
    bonsai: BonsaiApi
  }
  namespace JSX {
    interface IntrinsicElements {
      // Electron <webview> tag, used for the localhost preview.
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { src?: string; partition?: string; allowpopups?: string },
        HTMLElement
      >
    }
  }
}

export {}
