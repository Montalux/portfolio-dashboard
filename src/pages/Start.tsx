import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { BandInner, Content, Page, btnDarkGhost, btnDarkSolid } from '@/components/mono'
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

  const isPm = appUser?.role === 'pm'
  const actions = (
    <>
      {isPm && <SyncButton onDone={load} />}
      {isPm && <Link to="/neu" className={btnDarkSolid}>Neue Initiative</Link>}
    </>
  )
  const account = (
    <>
      <span className="text-[15px] text-mono-muted-dark">{appUser?.display_name}</span>
      <button type="button" className={btnDarkGhost} onClick={() => supabase.auth.signOut()}>Abmelden</button>
    </>
  )

  if (error || !data) {
    return (
      <Frame actions={actions} account={account}>
        <Content wide>
          <p className="m-0 text-base text-mono-muted">{error ? `Daten konnten nicht geladen werden: ${error}` : 'Lade Daten …'}</p>
        </Content>
      </Frame>
    )
  }

  return <StartView data={data} actions={actions} account={account} />
}

export function StartView({ data, actions, account }: { data: Data; actions?: React.ReactNode; account?: React.ReactNode }) {
  const { initiatives, milestones, links, lastSync, lastRun } = data
  const decisions = initiatives.filter((i) => i.decision_needed)
  const linksOf = (id: string) => links.filter((l) => l.initiative_id === id)
  const lastChange = initiatives.map((i) => i.updated_at).sort().at(-1) ?? null
  const asOf = lastSync?.finished_at ?? lastChange
  const tiles = tileInitiatives(initiatives)

  const band = (
    <>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2.5 text-base text-mono-muted-dark">
        <span className="inline-flex items-center gap-3">
          <span>Portfolio</span>
          <RagBadge state={portfolioRag(initiatives)} size={22} />
        </span>
        <span className={decisions.length > 0 ? 'font-bold text-mono-bg' : ''}>
          {decisions.length === 0 ? 'Keine offenen Entscheide' : `${decisions.length} ${decisions.length === 1 ? 'Entscheid' : 'Entscheide'} offen`}
        </span>
        <span className="font-medium text-mono-bg">
          {initiatives.filter((i) => i.status === 'laufend').length} laufend · {initiatives.filter((i) => i.status === 'geplant').length} geplant
        </span>
        <span className="grow" />
        <span className="text-sm text-mono-subtle-dark">
          Datenstand {asOf ? fmtDate(new Date(asOf)) : '-'}
          {lastRun && !lastRun.ok && ` · Letzter Jira-Sync mit Fehlern (${fmtDate(new Date(lastRun.finished_at!))})`}
        </span>
      </div>
      <BudgetSummary t={budgetTotals(initiatives)} />
    </>
  )

  return (
    <Frame actions={actions} account={account} band={band}>
      <Content wide>
        <Section title="Initiativen">
          {tiles.length === 0 ? (
            <p className="m-0 text-base text-mono-muted">Keine laufenden Initiativen.</p>
          ) : (
            <div className="grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
              {tiles.map((i) => <InitiativeCard key={i.id} i={i} links={linksOf(i.id)} />)}
            </div>
          )}
        </Section>
        <Section title="Timeline">
          <Timeline items={timelineInitiatives(initiatives)} milestones={milestones} />
        </Section>
        <Section title="Nächste Termine (8 Wochen)">
          <UpcomingList items={upcoming(initiatives, milestones, links)} />
        </Section>
      </Content>
    </Frame>
  )
}

// Navy band with title and actions, then the content
function Frame({ actions, account, band, children }: { actions?: React.ReactNode; account?: React.ReactNode; band?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Page>
      <BandInner wide className="gap-10 pt-8 pb-[72px]">
        <div className="flex items-center justify-between gap-4">
          <img src={`${import.meta.env.BASE_URL}montalux-logo.svg`} alt="Montalux" className="h-8 w-auto" />
          <div className="flex flex-wrap items-center justify-end gap-3">
            {actions}
            {account}
          </div>
        </div>
        <h1 className="m-0 text-[clamp(32px,6vw,44px)] leading-[1.05] font-bold">Portfolio-Dashboard</h1>
        {band}
      </BandInner>
      {children}
    </Page>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-8">
      <h2 className="m-0 text-[32px] leading-[1.1] font-bold">{title}</h2>
      {children}
    </section>
  )
}
