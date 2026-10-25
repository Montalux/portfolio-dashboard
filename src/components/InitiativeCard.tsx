import { TriangleAlert } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { RagBadge } from './RagBadge'
import { BudgetBar } from './BudgetBar'
import { fmtDate, ragState, warnings, type Initiative, type JiraLink } from '@/lib/portfolio'

const STATUS_LABEL = { geplant: 'Geplant', laufend: 'Laufend', abgeschlossen: 'Abgeschlossen', abgebrochen: 'Abgebrochen' }

export function InitiativeCard({ i, links }: { i: Initiative; links: JiraLink[] }) {
  const warn = warnings(i, links)
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-neutral-500">{i.key} · {STATUS_LABEL[i.status]}</p>
            <h3 className="font-medium leading-snug">{i.title}</h3>
          </div>
          <RagBadge state={ragState(i)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        {i.rag_reason && <p className="text-sm text-neutral-700">{i.rag_reason}</p>}
        <p className="text-xs text-neutral-600">
          {fmtDate(i.start_date)} bis {fmtDate(i.due_date)}
        </p>
        <BudgetBar i={i} />
        {warn.length > 0 && (
          <ul className="space-y-1">
            {warn.map((w) => (
              <li key={w.kind + w.text} className="flex items-center gap-1.5 text-xs text-neutral-800">
                <TriangleAlert className="size-3.5 shrink-0 text-[#c27c00]" aria-hidden />
                {w.text}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
