import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleHelp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Tables } from '@/lib/database.types'
import {
  budgetTotals,
  fmtDate,
  portfolioRag,
  tileInitiatives,
  timelineInitiatives,
  upcoming,
  type Initiative,
  type JiraLink,
  type Milestone,
} from '@/lib/portfolio'
import { Button } from '@/components/ui/button'
import { RagBadge } from '@/components/RagBadge'
import { InitiativeCard } from '@/components/InitiativeCard'
import { BudgetSummary } from '@/components/BudgetSummary'
import { UpcomingList } from '@/components/UpcomingList'
import { Timeline } from '@/components/Timeline'
import { SyncButton } from '@/components/SyncButton'

export type Data = {
  initiatives: Initiative[]
  milestones: Milestone[]
  links: JiraLink[]
  lastSync: Tables<'sync_run'> | null
  lastRun?: Tables<'sync_run'> | null
}

export default function Start() {
  const { appUser } = useAuth()
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [i, m, l, s, r] = await Promise.all([
      supabase.from('initiative').select('*').is('archived_at', null),
      supabase.from('milestone').select('*'),
      supabase.from('jira_link').select('*'),
      supabase.from('sync_run').select('*').eq('ok', true).order('finished_at', { ascending: false }).limit(1),
      supabase.from('sync_run').select('*').not('finished_at', 'is', null).order('finished_at', { ascending: false }).limit(1),
    ])
    const err = i.error ?? m.error ?? l.error ?? s.error ?? r.error
    if (err) return setError(err.message)
    setData({
      initiatives: i.data ?? [],
      milestones: m.data ?? [],
      links: l.data ?? [],
      lastSync: s.data?.[0] ?? null,
      lastRun: r.data?.[0] ?? null,
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const header = (
    <header className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-xl font-semibold">Portfolio-Dashboard</h1>
      <div className="flex items-center gap-3 text-sm">
        {appUser?.role === 'pm' && <SyncButton onDone={load} />}
        {appUser?.role === 'pm' && (
          <Button asChild size="sm">
            <Link to="/neu">Neue Initiative</Link>
          </Button>
        )}
        <span className="hidden sm:inline">{appUser?.display_name}</span>
        <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>Abmelden</Button>
      </div>
    </header>
  )

  if (error) return <Shell>{header}<p className="text-sm text-red-700">Daten konnten nicht geladen werden: {error}</p></Shell>
  if (!data) return <Shell>{header}<p className="text-sm text-neutral-500">Lade Daten …</p></Shell>

  return <StartView data={data} header={header} />
}

export function StartView({ data, header }: { data: Data; header: React.ReactNode }) {
  const { initiatives, milestones, links, lastSync, lastRun } = data
  const decisions = initiatives.filter((i) => i.decision_needed)
  const tiles = tileInitiatives(initiatives)
  const linksOf = (id: string) => links.filter((l) => l.initiative_id === id)
  const lastChange = initiatives.map((i) => i.updated_at).sort().at(-1) ?? null
  const asOf = lastSync?.finished_at ?? lastChange

  return (
    <Shell>
      {header}

      {/* 1. Headline */}
      <section className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-600">Portfolio</span>
          <RagBadge state={portfolioRag(initiatives)} size="lg" />
        </div>
        <span className="text-sm text-neutral-600">
          {decisions.length === 0 ? 'Keine offenen Entscheide' : `${decisions.length} ${decisions.length === 1 ? 'Entscheid' : 'Entscheide'} offen`}
        </span>
        <span className="text-sm text-neutral-600">
          {initiatives.filter((i) => i.status === 'laufend').length} laufend · {initiatives.filter((i) => i.status === 'geplant').length} geplant
        </span>
        <span className="ml-auto text-right text-xs text-neutral-500">
          Datenstand {asOf ? fmtDate(new Date(asOf)) : '-'}
          {lastRun && !lastRun.ok && <span className="block">Letzter Jira-Sync mit Fehlern ({fmtDate(new Date(lastRun.finished_at!))})</span>}
        </span>
      </section>

      {/* 2. Decisions (hidden when empty) */}
      {decisions.length > 0 && (
        <Section title="Entscheid nötig">
          <ul className="space-y-2">
            {decisions.map((i) => (
              <li key={i.id} className="flex gap-3 rounded-xl border border-neutral-300 bg-white p-4">
                <CircleHelp className="mt-0.5 size-5 shrink-0 text-neutral-700" aria-hidden />
                <div>
                  <Link to={`/initiative/${i.key}`} className="text-xs text-neutral-500 hover:underline">{i.key} · {i.title}</Link>
                  <p className="font-medium">{i.decision_question}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 3. Tiles */}
      <Section title="Laufende und nächste Initiativen">
        {tiles.length === 0 ? (
          <p className="text-sm text-neutral-500">Keine laufenden Initiativen.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tiles.map((i) => <InitiativeCard key={i.id} i={i} links={linksOf(i.id)} />)}
          </div>
        )}
      </Section>

      {/* 4. Budget */}
      <Section title="Budget">
        <BudgetSummary t={budgetTotals(initiatives)} />
      </Section>

      {/* 5. Upcoming */}
      <Section title="Nächste Termine (8 Wochen)">
        <UpcomingList items={upcoming(initiatives, milestones, links)} />
      </Section>

      {/* 6. Timeline */}
      <Section title="Timeline">
        <Timeline items={timelineInitiatives(initiatives)} milestones={milestones} links={links} />
      </Section>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-600">{title}</h2>
      {children}
    </section>
  )
}
