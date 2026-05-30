import { memo } from 'react'

interface Row {
  type: 'add' | 'del' | 'ctx' | 'hunk'
  oldNo: number | null
  newNo: number | null
  text: string
}

/** Parse unified `git diff` output into renderable rows with line numbers. */
function parseDiff(diff: string): Row[] {
  const rows: Row[] = []
  let oldNo = 0
  let newNo = 0
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) {
      const m = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
      if (m) {
        oldNo = parseInt(m[1], 10)
        newNo = parseInt(m[2], 10)
      }
      rows.push({ type: 'hunk', oldNo: null, newNo: null, text: line })
      continue
    }
    if (
      line.startsWith('diff ') ||
      line.startsWith('index ') ||
      line.startsWith('--- ') ||
      line.startsWith('+++ ') ||
      line.startsWith('new file') ||
      line.startsWith('deleted file') ||
      line.startsWith('similarity ') ||
      line.startsWith('rename ') ||
      line.startsWith('\\')
    ) {
      continue
    }
    if (line.startsWith('+')) {
      rows.push({ type: 'add', oldNo: null, newNo: newNo++, text: line.slice(1) })
    } else if (line.startsWith('-')) {
      rows.push({ type: 'del', oldNo: oldNo++, newNo: null, text: line.slice(1) })
    } else {
      rows.push({ type: 'ctx', oldNo: oldNo++, newNo: newNo++, text: line.slice(1) })
    }
  }
  if (rows.length && rows[rows.length - 1].text === '' && rows[rows.length - 1].type === 'ctx') {
    rows.pop()
  }
  return rows
}

export const DiffView = memo(function DiffView({ diff }: { diff: string }) {
  const rows = parseDiff(diff)
  if (rows.length === 0) return <div className="diff-empty">No textual changes.</div>

  return (
    <div className="diff">
      {rows.map((r, i) => (
        <div key={i} className={`diff-row ${r.type}`}>
          <span className="ln old">{r.oldNo ?? ''}</span>
          <span className="ln new">{r.newNo ?? ''}</span>
          <span className="sign">{r.type === 'add' ? '+' : r.type === 'del' ? '−' : ' '}</span>
          <span className="code">{r.text === '' ? ' ' : r.text}</span>
        </div>
      ))}
    </div>
  )
})
