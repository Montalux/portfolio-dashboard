import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { RagBadge } from './RagBadge'
import { BudgetBar } from './BudgetBar'
import { STATUS_LABEL, fmtDate, ragState, warnings, type Initiative, type JiraLink } from '@/lib/portfolio'

export function InitiativeCard({ i, links }: { i: Initiative; links: JiraLink[] }) {
  const warn = warnings(i, links)
  return (
    <Link
      to={`/initiative/${i.key}`}
      className="group block rounded-xl text-inherit no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mono-accent"
    >
      <article className="box-border flex h-full min-h-[232px] flex-col gap-4 rounded-xl border border-mono-line bg-white p-8 transition-shadow group-hover:shadow-[0_6px_20px_rgba(23,30,38,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-mono-muted">{i.key} · {STATUS_LABEL[i.status]}</span>
          <RagBadge state={ragState(i)} />
        </div>
        <h3 className="m-0 text-2xl leading-[1.15] font-bold">{i.title}</h3>
        {i.rag_reason && <p className="m-0 text-[15px] leading-[1.4] text-mono-muted">{i.rag_reason}</p>}
        {i.decision_needed && <p className="m-0 text-[15px] leading-[1.4] font-bold">Entscheid nötig: {i.decision_question}</p>}
        {warn.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {warn.map((w) => (
              <li key={w.kind + w.text} className="flex items-center gap-2 text-sm text-mono-muted">
                <TriangleAlert className="size-4 shrink-0 text-mono-accent" aria-hidden />
                {w.text}
              </li>
            ))}
          </ul>
        )}
        <div className="grow" />
        <div className="text-sm text-mono-muted">{fmtDate(i.start_date)} bis {fmtDate(i.due_date)}</div>
        <BudgetBar i={i} />
      </article>
    </Link>
  )
}
