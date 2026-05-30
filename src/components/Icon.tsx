import {
  Sprout,
  FolderGit2,
  GitBranch,
  SquareTerminal,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Search,
  GitCommitHorizontal,
  ArrowUpToLine,
  ArrowDownToLine,
  RefreshCw,
  Check,
  X,
  File as FileIcon,
  Folder,
  FileDiff,
  ArrowLeft,
  Circle,
  Settings,
  Palette,
  SlidersHorizontal,
  Layers,
  Braces,
  FolderOpen,
  type LucideIcon,
} from 'lucide-react'

// Single icon surface for the whole app, backed by lucide-react. Keeping this
// indirection means call sites use stable semantic names and the underlying
// icon set can change in one place.
const MAP = {
  leaf: Sprout,
  repo: FolderGit2,
  branch: GitBranch,
  terminal: SquareTerminal,
  chevron: ChevronRight,
  'chevron-down': ChevronDown,
  plus: Plus,
  trash: Trash2,
  search: Search,
  commit: GitCommitHorizontal,
  push: ArrowUpToLine,
  pull: ArrowDownToLine,
  fetch: RefreshCw,
  sync: RefreshCw,
  check: Check,
  close: X,
  file: FileIcon,
  folder: Folder,
  diff: FileDiff,
  back: ArrowLeft,
  dot: Circle,
  settings: Settings,
  palette: Palette,
  sliders: SlidersHorizontal,
  layers: Layers,
  config: Braces,
  reveal: FolderOpen,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof MAP

export function Icon({
  name,
  size = 16,
  className,
  strokeWidth = 2,
}: {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
}) {
  const Cmp = MAP[name]
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} aria-hidden />
}
