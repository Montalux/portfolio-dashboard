import { useState, type FormEvent } from 'react'
import { ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fmtDate, type JiraLink } from '@/lib/portfolio'

export type LinkWithSource = JiraLink & { jira_source: { base_url: string } | null }
export type SourceOption = { id: string; name: string }
export type LinkActions = {
  sources: SourceOption[]
  add: (sourceId: string, key: string, kind: 'epic' | 'jpd') => Promise<string | null>
  remove: (l: LinkWithSource) => Promise<string | null>
}

const selectCls = 'h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs'

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
    <div>
      {links.length === 0 && <p className="mb-3 text-sm text-neutral-500">Keine verknüpften Items.</p>}
      {groups.map(([label, list]) =>
        list.length > 0 ? (
          <div key={label} className="mb-3">
            <p className="mb-1 text-xs text-neutral-500">{label}</p>
            <ul className="space-y-1.5 text-sm">
              {list.map((l) => (
                <li key={l.id} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <a
                      className="inline-flex items-center gap-1 text-[#2a78d6] hover:underline"
                      href={l.jira_source ? `${l.jira_source.base_url}/browse/${l.issue_key}` : undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {l.issue_key}<ExternalLink className="size-3" aria-hidden />
                    </a>
                    {l.summary && <span className="text-neutral-700"> {l.summary}</span>}
                    {l.status && <span className="text-neutral-500"> · {l.status}</span>}
                    {l.progress_pct !== null && <span className="text-neutral-500"> · {Math.round(l.progress_pct)} % erledigt</span>}
                    {l.due_date && <span className="text-neutral-500"> · bis {fmtDate(l.due_date)}</span>}
                    {l.sync_error && <p className="text-xs text-neutral-500">Sync: {l.sync_error}</p>}
                  </div>
                  {canEdit && actions && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`${l.issue_key} entfernen`}
                      onClick={async () => window.confirm(`Verknüpfung ${l.issue_key} entfernen?`) && setError(await actions.remove(l))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
      {canEdit && actions && actions.sources.length > 0 && (
        <form onSubmit={submit} className="mt-2 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
          <select aria-label="Jira-Quelle" className={selectCls} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            {actions.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select aria-label="Art" className={selectCls} value={kind} onChange={(e) => setKind(e.target.value as 'epic' | 'jpd')}>
            <option value="epic">Epic</option>
            <option value="jpd">JPD</option>
          </select>
          <Input
            className="w-32"
            required
            placeholder="DEV-5"
            pattern="[A-Za-z][A-Za-z0-9]+-[0-9]+"
            title="Jira-Key, z.B. DEV-5"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <Button type="submit" variant="outline">Verknüpfen</Button>
          <p className="w-full text-xs text-neutral-500">Titel, Status und Termine kommen mit dem nächsten Sync.</p>
        </form>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
