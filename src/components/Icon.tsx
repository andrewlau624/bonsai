// Lightweight inline SVG icons (no dependency, CSP-safe). Stroke-based,
// 24px viewBox, inherit currentColor. Keeps the UI crisp and modern.

type IconName =
  | 'leaf'
  | 'repo'
  | 'branch'
  | 'terminal'
  | 'chevron'
  | 'plus'
  | 'trash'
  | 'search'
  | 'commit'
  | 'push'
  | 'pull'
  | 'fetch'
  | 'check'
  | 'close'
  | 'file'
  | 'folder'
  | 'diff'
  | 'back'
  | 'dot'
  | 'sync'

const PATHS: Record<IconName, JSX.Element> = {
  leaf: (
    <path d="M11 3C6 4 4 8 4 12c0 3 1 6 4 8 0-5 3-9 9-11-4 3-6 7-6 11 5-1 9-5 9-12 0-3-2-5-5-5-2 0-4 0-7 0z" />
  ),
  repo: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v13" />
      <path d="M6 17h12v3H6a2 2 0 0 1 0-4h12" />
    </>
  ),
  branch: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="8" r="2.5" />
      <path d="M6 8.5v7M8.5 6.5H14a3 3 0 0 1 0 0M18 10.5c0 4-4 4-12 5" />
    </>
  ),
  terminal: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9l3 3-3 3M13 15h4" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  commit: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M3 12h5M16 12h5" />
    </>
  ),
  push: <path d="M12 20V6M6 12l6-6 6 6" />,
  pull: <path d="M12 4v14M6 12l6 6 6-6" />,
  fetch: (
    <>
      <path d="M20 11a8 8 0 1 0-2 5.3" />
      <path d="M20 4v5h-5" />
    </>
  ),
  sync: (
    <>
      <path d="M4 12a8 8 0 0 1 13.7-5.7L20 8" />
      <path d="M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.7L4 16" />
      <path d="M4 20v-4h4" />
    </>
  ),
  check: <path d="M5 13l4 4 10-11" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  file: (
    <>
      <path d="M6 3h8l5 5v13a0 0 0 0 1 0 0H6a0 0 0 0 1 0 0V3z" />
      <path d="M14 3v5h5" />
    </>
  ),
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />,
  diff: (
    <>
      <path d="M12 4v6M9 7h6" />
      <path d="M9 17h6" />
    </>
  ),
  back: <path d="M15 6l-6 6 6 6" />,
  dot: <circle cx="12" cy="12" r="4" />,
}

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: IconName
  size?: number
  className?: string
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}

export type { IconName }
