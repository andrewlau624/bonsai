// Branch color palette. A user can tag a branch with one of these so its tab
// group and sidebar row are easy to tell apart at a glance. Color ids (not
// hexes) are persisted, so the palette can be retuned without migrating data.

export interface BranchColor {
  id: string
  label: string
  hex: string
}

// Order matters: branches are auto-assigned a default color by their position
// in a repo's branch list, cycling through this palette. Sequenced so adjacent
// entries sit far apart on the color wheel — no two consecutive branches look
// alike. Leads with green (first branch in every repo is green).
export const BRANCH_COLORS: BranchColor[] = [
  { id: 'green', label: 'Green', hex: '#5cc98a' }, // ~145°
  { id: 'purple', label: 'Purple', hex: '#b08cff' }, // ~265°
  { id: 'orange', label: 'Orange', hex: '#e8a13a' }, // ~37°
  { id: 'blue', label: 'Blue', hex: '#5b9cff' }, // ~221°
  { id: 'pink', label: 'Pink', hex: '#f06fb0' }, // ~330°
  { id: 'yellow', label: 'Yellow', hex: '#d9c04a' }, // ~50°
  { id: 'teal', label: 'Teal', hex: '#3fc1c9' }, // ~183°
  { id: 'red', label: 'Red', hex: '#f47174' }, // ~0°
]

/** Resolve a stored color id to a hex value, or undefined when unset/unknown. */
export function branchColorHex(id?: string): string | undefined {
  return id ? BRANCH_COLORS.find((c) => c.id === id)?.hex : undefined
}

/** Default color for the branch at `index` in its repo — same mapping for every
 * repo, so "first branch" is always green, etc. */
export function defaultBranchColorHex(index: number): string {
  const i = index < 0 ? 0 : index % BRANCH_COLORS.length
  return BRANCH_COLORS[i].hex
}

/** A branch's effective color: its manual override if set, else the order-based
 * default. Always returns a hex. */
export function resolveBranchColor(explicitId: string | undefined, index: number): string {
  return branchColorHex(explicitId) ?? defaultBranchColorHex(index)
}
