import { useState, type FormEvent } from 'react'
import { ExternalLink, Trash2 } from 'lucide-react'
import { ErrorNote, btnSmall, inputCls, selectCls } from '@/components/mono'
import { fmtDate, type JiraLink } from '@/lib/portfolio'

export type LinkWithSource = JiraLink & { jira_source: { base_url: string } | null }
export type SourceOption = { id: string; name: string }
export type LinkActions = {
  sources: SourceOption[]
  add: (sourceId: string, key: string, kind: 'epic' | 'jpd') => Promise<string | null>
  remove: (l: LinkWithSource) => Promise<string | null>
}

export function JiraLinkList({ links, canEdit, actions }: { links: LinkWithSource[]; canEdit: boolean; actions?: LinkActions }) {
  const [sourceId, setSourceId] = useState(actions?.sources[0]?.id ?? '')
  const [key, setKey] = useState('')
  const [kind, setKind] = useState<'epic' | 'jpd'>('epic')
  const [error, setError] = useState<string | null>(null)

  const groups: [string, LinkWithSource[]][] = [
    ['Epics', links.filter((l) => l.kind === 'epic')],
    ['Discovery (JPD)', links.filter((l) => l.kind === 'jpd')],
  ]

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!actions) return
    const err = await actions.add(sourceId, key.trim().toUpperCase(), kind)
    setError(err)
    if (!err) setKey('')
  }

  return (
    <div className="flex flex-col gap-5">
      {links.length === 0 && <p className="m-0 border-b border-mono-rule pb-3.5 text-base text-mono-muted">Keine verknüpften Items.</p>}
      {groups.map(([label, list]) =>
        list.length > 0 ? (
          <div key={label} className="flex flex-col gap-2">
            <p className="m-0 text-sm text-mono-muted">{label}</p>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-base">
              {list.map((l) => (
                <li key={l.id} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 break-words">
                    <a
                      className="inline-flex items-center gap-1 font-medium text-mono-accent underline"
                      href={l.jira_source ? `${l.jira_source.base_url}/browse/${l.issue_key}` : undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {l.issue_key}<ExternalLink className="size-3.5" aria-hidden />
                    </a>
                    {l.summary && <span> {l.summary}</span>}
                    {l.status && <span className="text-mono-muted"> · {l.status}</span>}
                    {l.progress_pct !== null && <span className="text-mono-muted"> · {Math.round(l.progress_pct)} % erledigt</span>}
                    {l.due_date && <span className="text-mono-muted"> · bis {fmtDate(l.due_date)}</span>}
                    {l.sync_error && <p className="m-0 text-sm text-mono-muted">Sync: {l.sync_error}</p>}
                  </div>
                  {canEdit && actions && (
                    <button
                      type="button"
                      className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-mono-muted focus-visible:outline-2 focus-visible:outline-mono-accent"
                      aria-label={`${l.issue_key} entfernen`}
                      onClick={async () => window.confirm(`Verknüpfung ${l.issue_key} entfernen?`) && setError(await actions.remove(l))}
                    >
                      <Trash2 className="size-[18px]" aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
      {canEdit && actions && actions.sources.length > 0 && (
        <form onSubmit={submit} className="flex flex-col items-start gap-3">
          <div className="flex w-full flex-wrap gap-3">
            <select aria-label="Jira-Instanz" className={`${selectCls} !w-auto`} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              {actions.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select aria-label="Typ" className={`${selectCls} !w-auto`} value={kind} onChange={(e) => setKind(e.target.value as 'epic' | 'jpd')}>
              <option value="epic">Epic</option>
              <option value="jpd">JPD</option>
            </select>
            <input
              type="text"
              aria-label="Jira-Key"
              className={`${inputCls} min-w-0 flex-[1_1_120px] !w-auto`}
              required
              placeholder="DEV-5"
              pattern="[A-Za-z][A-Za-z0-9]+-[0-9]+"
              title="Jira-Key, z.B. DEV-5"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>
          <button type="submit" className={btnSmall}>Verknüpfen</button>
          <p className="m-0 text-sm leading-[1.45] text-mono-muted">Titel, Status und Termine kommen mit dem nächsten Sync.</p>
        </form>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  )
}
