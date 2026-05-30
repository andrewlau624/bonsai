import { useEffect, useState, useCallback } from 'react'
import { applyTheme } from '../themes'
import { PrView } from './PrView'
import type { PullRequestDetail, PrComment } from '../../shared/types'

/** Standalone window showing a single pull request in full. */
export function PrWindow({ cwd, num }: { cwd: string; num: number }) {
  const [detail, setDetail] = useState<PullRequestDetail | null>(null)
  const [comments, setComments] = useState<PrComment[]>([])
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    const [d, c] = await Promise.all([
      window.bonsai.pr.view(cwd, num),
      window.bonsai.pr.comments(cwd, num).catch(() => [] as PrComment[]),
    ])
    setDetail(d)
    setComments(c)
  }, [cwd, num])

  useEffect(() => {
    void window.bonsai.config.get().then((c) =>
      applyTheme(c.theme, {
        density: c.density,
        uiFont: c.uiFont,
        corners: c.corners,
        animations: c.animations,
        accent: c.accent,
      }),
    )
    void reload()
  }, [reload])

  if (!detail) return <div className="cv-loading">Loading pull request…</div>

  return (
    <div className="pr-window">
      <PrView
        cwd={cwd}
        detail={detail}
        comments={comments}
        busy={busy}
        onSave={async (title, body) => {
          setBusy(true)
          try {
            await window.bonsai.pr.edit(cwd, num, { title, body })
            await reload()
          } finally {
            setBusy(false)
          }
        }}
        onComment={async (body) => {
          setBusy(true)
          try {
            await window.bonsai.pr.comment(cwd, num, body)
            setComments(await window.bonsai.pr.comments(cwd, num))
          } finally {
            setBusy(false)
          }
        }}
        onReview={async (event, body) => {
          setBusy(true)
          try {
            await window.bonsai.pr.review(cwd, num, event, body)
            setComments(await window.bonsai.pr.comments(cwd, num))
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}
