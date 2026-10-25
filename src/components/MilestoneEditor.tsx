import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    <div className="space-y-3">
      {sorted.length === 0 && <p className="text-sm text-neutral-500">Keine Meilensteine.</p>}
      <ul className="divide-y divide-neutral-100">
        {sorted.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
            {canEdit ? (
              <input type="checkbox" aria-label="Erledigt" checked={m.done} onChange={() => actions && run(actions.toggle(m))} />
            ) : (
              <span className="w-4 text-center">{m.done ? '✓' : ''}</span>
            )}
            <span className="w-24 shrink-0 tabular-nums text-neutral-600">{fmtDate(m.due_date)}</span>
            <span className={`flex-1 ${m.done ? 'text-neutral-500 line-through' : ''}`}>{m.title}</span>
            {canEdit && actions && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Meilenstein löschen"
                onClick={() => window.confirm(`Meilenstein "${m.title}" löschen?`) && run(actions.remove(m))}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {canEdit && actions && (
        <form onSubmit={submit} className="flex flex-wrap gap-2">
          <Input className="min-w-48 flex-1" required placeholder="Neuer Meilenstein" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input className="w-40" type="date" required value={due} onChange={(e) => setDue(e.target.value)} />
          <Button type="submit" variant="outline">Hinzufügen</Button>
        </form>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
