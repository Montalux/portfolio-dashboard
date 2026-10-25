import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { ErrorNote, btnSmall, inputCls } from '@/components/mono'
import { fmtDate, type Milestone } from '@/lib/portfolio'

export type MilestoneActions = {
  add: (title: string, due: string) => Promise<string | null>
  toggle: (m: Milestone) => Promise<string | null>
  remove: (m: Milestone) => Promise<string | null>
}

export function MilestoneList({ items, canEdit, actions }: { items: Milestone[]; canEdit: boolean; actions?: MilestoneActions }) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const sorted = [...items].sort((a, b) => a.due_date.localeCompare(b.due_date))

  const run = async (p: Promise<string | null>) => setError(await p)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!actions) return
    const err = await actions.add(title.trim(), due)
    setError(err)
    if (!err) {
      setTitle('')
      setDue('')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {sorted.length === 0 && <p className="m-0 text-base text-mono-muted">Keine Meilensteine.</p>}
      {sorted.length > 0 && (
        <ul className="m-0 list-none p-0">
          {sorted.map((m) => (
            <li key={m.id} className="flex items-center gap-3 border-b border-mono-rule py-2 text-base last:border-b-0">
              {canEdit ? (
                <input
                  type="checkbox"
                  aria-label="Erledigt"
                  className="m-0 size-5 accent-mono-accent"
                  checked={m.done}
                  onChange={() => actions && run(actions.toggle(m))}
                />
              ) : (
                <span className="w-5 text-center">{m.done ? '✓' : ''}</span>
              )}
              <span className="w-28 shrink-0 font-bold tabular-nums">{fmtDate(m.due_date)}</span>
              <span className={`flex-1 ${m.done ? 'text-mono-muted line-through' : ''}`}>{m.title}</span>
              {canEdit && actions && (
                <button
                  type="button"
                  className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-mono-muted focus-visible:outline-2 focus-visible:outline-mono-accent"
                  aria-label="Meilenstein löschen"
                  onClick={() => window.confirm(`Meilenstein "${m.title}" löschen?`) && run(actions.remove(m))}
                >
                  <Trash2 className="size-[18px]" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && actions && (
        <form onSubmit={submit} className="flex flex-wrap gap-3">
          <input type="text" aria-label="Neuer Meilenstein" className={`${inputCls} min-w-0 flex-[1_1_220px] !w-auto`} required placeholder="Neuer Meilenstein" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input type="date" aria-label="Datum" className={`${inputCls} !w-auto flex-none`} required value={due} onChange={(e) => setDue(e.target.value)} />
          <button type="submit" className={btnSmall}>Hinzufügen</button>
        </form>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  )
}
