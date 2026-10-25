// Jira sync: refreshes the jira_link cache (summary, status, dates, epic progress)
// and takes the weekly snapshot.
//
// Auth: cron calls send x-cron-secret (checked against Vault),
//       manual calls send the user's JWT and must have role "pm".
// Jira tokens: one Edge Function secret per jira_source.secret_name.
import { createClient } from 'npm:@supabase/supabase-js@2'

type Link = { id: string; issue_key: string; kind: 'epic' | 'jpd'; source_id: string }
type Source = { id: string; name: string; base_url: string; auth_email: string; secret_name: string }
type Issue = { key: string; fields: Record<string, unknown> }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // --- auth
  let trigger: 'cron' | 'manual'
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret) {
    const { data: ok } = await admin.rpc('check_cron_secret', { candidate: cronSecret })
    if (!ok) return json({ error: 'unauthorized' }, 401)
    trigger = 'cron'
  } else {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: user } = await admin.auth.getUser(jwt)
    if (!user?.user) return json({ error: 'unauthorized' }, 401)
    const { data: appUser } = await admin.from('app_user').select('role').eq('user_id', user.user.id).maybeSingle()
    if (appUser?.role !== 'pm') return json({ error: 'forbidden' }, 403)
    trigger = 'manual'
  }

  const { data: run } = await admin.from('sync_run').insert({ trigger }).select('id').single()
  const errors: string[] = []

  try {
    const [{ data: links }, { data: sources }] = await Promise.all([
      admin.from('jira_link').select('id, issue_key, kind, source_id'),
      admin.from('jira_source').select('*').eq('active', true),
    ])

    for (const source of (sources ?? []) as Source[]) {
      const own = ((links ?? []) as Link[]).filter((l) => l.source_id === source.id)
      if (own.length === 0) continue
      const ids = own.map((l) => l.id)
      const token = Deno.env.get(source.secret_name)
      if (!token) {
        const msg = `Token fehlt (Secret ${source.secret_name})`
        errors.push(`${source.name}: ${msg}`)
        await admin.from('jira_link').update({ sync_error: msg }).in('id', ids)
        continue
      }
      try {
        await syncSource(admin, source, token, own)
      } catch (e) {
        const msg = `Jira nicht erreichbar: ${(e as Error).message}`.slice(0, 300)
        errors.push(`${source.name}: ${msg}`)
        // keep the last known cache, only flag the error
        await admin.from('jira_link').update({ sync_error: msg }).in('id', ids)
      }
    }

    // Weekly snapshot on Mondays (Zurich time), idempotent within the week
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Europe/Zurich' }).format(new Date())
    let snapshots = 0
    if (weekday === 'Mon') {
      const { data } = await admin.rpc('take_weekly_snapshot')
      snapshots = data ?? 0
    }

    await admin
      .from('sync_run')
      .update({ finished_at: new Date().toISOString(), ok: errors.length === 0, error: errors.join('; ') || null })
      .eq('id', run!.id)
    return json({ ok: errors.length === 0, errors, snapshots })
  } catch (e) {
    await admin
      .from('sync_run')
      .update({ finished_at: new Date().toISOString(), ok: false, error: (e as Error).message })
      .eq('id', run!.id)
    return json({ ok: false, error: (e as Error).message }, 500)
  }
})

async function syncSource(admin: ReturnType<typeof createClient>, source: Source, token: string, links: Link[]) {
  const auth = 'Basic ' + btoa(`${source.auth_email}:${token}`)
  const api = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${source.base_url}${path}`, {
      ...init,
      headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`)
    return res.json()
  }

  // "Start date" field id differs between Jira sites
  const fields = (await api('/rest/api/3/field')) as { id: string; name: string }[]
  const startField = fields.find((f) => f.name === 'Start date')?.id

  const search = async (jql: string, wanted: string[]) => {
    const out: Issue[] = []
    let next: string | undefined
    do {
      const page = await api('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({ jql, fields: wanted, maxResults: 100, nextPageToken: next }),
      })
      out.push(...page.issues)
      next = page.isLast ? undefined : page.nextPageToken
    } while (next)
    return out
  }

  const keys = [...new Set(links.map((l) => l.issue_key))]
  const wanted = ['summary', 'status', 'duedate', ...(startField ? [startField] : [])]
  let issues: Issue[]
  try {
    issues = await search(`key in (${keys.join(',')})`, wanted)
  } catch (e) {
    // Jira rejects the whole JQL if a single key is unknown: fall back to one query per key
    if (!(e as Error).message.startsWith('HTTP 400')) throw e
    issues = []
    for (const k of keys) {
      try {
        issues.push(...(await search(`key = ${k}`, wanted)))
      } catch (inner) {
        if (!(inner as Error).message.startsWith('HTTP 400')) throw inner
      }
    }
  }
  const byKey = new Map(issues.map((i) => [i.key, i]))

  // Epic progress: share of children with status category "done"
  const epicKeys = [...new Set(links.filter((l) => l.kind === 'epic').map((l) => l.issue_key))]
  const progress = new Map<string, { done: number; total: number }>()
  if (epicKeys.length > 0) {
    const children = await search(`parent in (${epicKeys.join(',')})`, ['parent', 'status'])
    for (const c of children) {
      const parent = (c.fields.parent as { key: string } | undefined)?.key
      if (!parent) continue
      const p = progress.get(parent) ?? { done: 0, total: 0 }
      p.total += 1
      if ((c.fields.status as { statusCategory?: { key: string } })?.statusCategory?.key === 'done') p.done += 1
      progress.set(parent, p)
    }
  }

  const now = new Date().toISOString()
  for (const l of links) {
    const issue = byKey.get(l.issue_key)
    if (!issue) {
      await admin.from('jira_link').update({ sync_error: 'Nicht gefunden oder kein Zugriff', last_synced_at: now }).eq('id', l.id)
      continue
    }
    const status = issue.fields.status as { name: string; statusCategory?: { key: string } } | undefined
    const p = progress.get(l.issue_key)
    await admin
      .from('jira_link')
      .update({
        summary: issue.fields.summary as string,
        status: status?.name ?? null,
        status_category: status?.statusCategory?.key ?? null,
        start_date: (startField ? (issue.fields[startField] as string | null) : null) ?? null,
        due_date: (issue.fields.duedate as string | null) ?? null,
        progress_pct: p && p.total > 0 ? Math.round((p.done / p.total) * 1000) / 10 : null,
        last_synced_at: now,
        sync_error: null,
      })
      .eq('id', l.id)
  }
}
