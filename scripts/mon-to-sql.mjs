// One-time import of the Jira project MON into the dashboard.
//
// Input:  JSON file from the Jira search API (issues with fields "*all"),
//         shape { issues: { nodes: [...] } } or { issues: [...] }
// Output: stdout = review table (dry run)
//         --sql <file> = SQL file with inserts, to be run once on the database
//
// Usage:  node scripts/mon-to-sql.mjs <export.json> [--sql import.sql]
//
// Data stays local: neither the export nor the generated SQL belongs in this repo.

import { readFileSync, writeFileSync } from 'node:fs'

const [input, flag, sqlPath] = process.argv.slice(2)
if (!input) {
  console.error('Usage: node scripts/mon-to-sql.mjs <export.json> [--sql import.sql]')
  process.exit(1)
}

const raw = JSON.parse(readFileSync(input, 'utf8'))
const nodes = raw.issues?.nodes ?? raw.issues ?? []

const STATUS = { 'To Do': 'geplant', 'In progress': 'laufend', Done: 'abgeschlossen' }
const JPD_PROJECTS = ['STRPD', 'PRO']

const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replaceAll("'", "''")}'`)
const n = (v) => (v === null || v === undefined ? 'null' : String(Number(v)))

const initiatives = []
const deps = []
const jpdLinks = []
const notes = []

for (const issue of nodes) {
  const f = issue.fields
  if (f.issuetype?.name !== 'Project-Initiative') continue
  const labels = f.labels ?? []
  const budget = f.customfield_10750 ?? null
  const status = STATUS[f.status?.name]
  if (!status) notes.push(`${issue.key}: unbekannter Status "${f.status?.name}", als geplant übernommen`)

  initiatives.push({
    key: issue.key,
    title: f.summary,
    description: typeof f.description === 'string' ? f.description : null,
    status: status ?? 'geplant',
    start_date: f.customfield_10015 ?? null,
    due_date: f.duedate ?? null,
    budget_chf: budget,
    budget_status: labels.includes('budget-platzhalter') || budget === null ? 'platzhalter' : 'bewilligt',
  })

  if (labels.includes('blockiert')) notes.push(`${issue.key}: Label "blockiert", RAG und Begründung nach dem Import setzen`)
  if (budget === null) notes.push(`${issue.key}: kein Budget`)
  else if (budget <= 500) notes.push(`${issue.key}: Budget nur CHF ${budget}, prüfen`)

  for (const l of f.issuelinks ?? []) {
    const other = l.outwardIssue ?? l.inwardIssue
    const otherKey = other?.key ?? ''
    const project = otherKey.split('-')[0]
    if (l.type?.name === 'Blocks' && project === 'MON') {
      // outwardIssue: this issue blocks the other one
      if (l.outwardIssue) deps.push([issue.key, otherKey])
    } else if (JPD_PROJECTS.includes(project)) {
      jpdLinks.push([issue.key, otherKey])
    }
  }
}

initiatives.sort((a, b) => Number(a.key.split('-')[1]) - Number(b.key.split('-')[1]))
const uniq = (arr) => [...new Map(arr.map((x) => [x.join('|'), x])).values()]
const depsU = uniq(deps)
const jpdU = uniq(jpdLinks)

// Review output
const chf = (v) => (v === null ? '-' : `CHF ${Number(v).toLocaleString('de-CH').replaceAll('’', "'")}`)
console.log('Key     | Status        | Start      | Due        | Budget       | Budget-Status | Titel')
for (const i of initiatives) {
  console.log(
    `${i.key.padEnd(7)} | ${i.status.padEnd(13)} | ${(i.start_date ?? '-').padEnd(10)} | ${(i.due_date ?? '-').padEnd(10)} | ${chf(i.budget_chf).padEnd(12)} | ${i.budget_status.padEnd(13)} | ${i.title}`,
  )
}
const total = initiatives.reduce((s, i) => s + Number(i.budget_chf ?? 0), 0)
console.log(`\n${initiatives.length} Initiativen, Budget total ${chf(total)}`)
console.log(`Abhängigkeiten (blockiert): ${depsU.map(([a, b]) => `${a} -> ${b}`).join(', ') || '-'}`)
console.log(`JPD-Links: ${jpdU.map(([a, b]) => `${a} -> ${b}`).join(', ') || '-'}`)
console.log(`\nZu prüfen:\n${notes.map((x) => `- ${x}`).join('\n')}`)

if (flag === '--sql' && sqlPath) {
  const lines = ['begin;', '']
  for (const i of initiatives) {
    lines.push(
      `insert into initiative (key, title, description, status, start_date, due_date, budget_chf, budget_status) values (${q(i.key)}, ${q(i.title)}, ${q(i.description)}, ${q(i.status)}, ${q(i.start_date)}, ${q(i.due_date)}, ${n(i.budget_chf)}, ${q(i.budget_status)});`,
    )
  }
  lines.push('')
  for (const [a, b] of depsU) {
    lines.push(
      `insert into dependency (initiative_id, blocks_initiative_id) select a.id, b.id from initiative a, initiative b where a.key = ${q(a)} and b.key = ${q(b)};`,
    )
  }
  lines.push('')
  for (const [a, b] of jpdU) {
    lines.push(
      `insert into jira_link (initiative_id, source_id, issue_key, kind) select i.id, s.id, ${q(b)}, 'jpd' from initiative i, jira_source s where i.key = ${q(a)} and s.name = 'montalux';`,
    )
  }
  lines.push('', 'commit;', '')
  writeFileSync(sqlPath, lines.join('\n'))
  console.log(`\nSQL geschrieben: ${sqlPath}`)
}
