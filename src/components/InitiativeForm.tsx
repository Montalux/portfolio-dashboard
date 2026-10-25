import { useState, type FormEvent } from 'react'
import { ErrorNote, btnOutline, btnSolid, inputCls, selectCls, textareaCls } from '@/components/mono'
import type { Database } from '@/lib/database.types'
import type { Initiative } from '@/lib/portfolio'

type Update = Database['public']['Tables']['initiative']['Update']

// Parse Swiss formatted amounts like "12'000" or "12 000.50"
const parseAmount = (s: string) => {
  const v = s.replace(/['’\s]/g, '').replace(',', '.')
  return v === '' ? null : Number(v)
}
const showAmount = (v: number | null) => (v === null ? '' : String(v))

export function InitiativeForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<Initiative>
  onSave: (values: Update) => Promise<string | null>
  onCancel: () => void
}) {
  const [v, setV] = useState({
    title: initial.title ?? '',
    description: initial.description ?? '',
    status: initial.status ?? 'geplant',
    start_date: initial.start_date ?? '',
    due_date: initial.due_date ?? '',
    rag: initial.rag ?? '',
    rag_reason: initial.rag_reason ?? '',
    decision_needed: initial.decision_needed ?? false,
    decision_question: initial.decision_question ?? '',
    budget_chf: showAmount(initial.budget_chf ?? null),
    budget_status: initial.budget_status ?? 'platzhalter',
    actual_chf: showAmount(initial.actual_chf ?? null),
    forecast_chf: showAmount(initial.forecast_chf ?? null),
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })

  const amounts = [v.budget_chf, v.actual_chf, v.forecast_chf].map(parseAmount)
  const amountInvalid = amounts.some((a) => a !== null && Number.isNaN(a))
  const needsReason = v.rag === 'gelb' || v.rag === 'rot'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (amountInvalid) return setError('Beträge bitte als Zahl erfassen, z.B. 12\'000.')
    setSaving(true)
    const err = await onSave({
      title: v.title.trim(),
      description: v.description.trim() || null,
      status: v.status as Initiative['status'],
      start_date: v.start_date || null,
      due_date: v.due_date || null,
      rag: (v.rag || null) as Initiative['rag'],
      rag_reason: v.rag_reason.trim() || null,
      decision_needed: v.decision_needed,
      decision_question: v.decision_question.trim() || null,
      budget_chf: amounts[0],
      budget_status: v.budget_status as Initiative['budget_status'],
      actual_chf: amounts[1],
      forecast_chf: amounts[2],
    })
    setSaving(false)
    setError(err)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-12">
      <Fieldset title="Initiative">
        <Field label="Titel" id="title">
          <input id="title" className={inputCls} required value={v.title} onChange={set('title')} />
        </Field>
        <Grid min={260}>
          <Field label="Status" id="status">
            <select id="status" className={selectCls} value={v.status} onChange={set('status')}>
              <option value="geplant">Geplant</option>
              <option value="laufend">Laufend</option>
              <option value="abgeschlossen">Abgeschlossen</option>
              <option value="abgebrochen">Abgebrochen</option>
            </select>
          </Field>
          <Field label="Start" id="start">
            <input id="start" type="date" className={inputCls} value={v.start_date} onChange={set('start_date')} />
          </Field>
          <Field label="Due date" id="due">
            <input id="due" type="date" className={inputCls} value={v.due_date} onChange={set('due_date')} />
          </Field>
        </Grid>
        <Field label="Beschreibung" id="desc">
          <textarea id="desc" rows={6} className={`${textareaCls} resize-y`} value={v.description} onChange={set('description')} />
        </Field>
      </Fieldset>

      <Fieldset title="Status (RAG)">
        <Field label="Ampel" id="rag" className="max-w-[560px]">
          <select id="rag" className={selectCls} value={v.rag} onChange={set('rag')}>
            <option value="">Kein Status</option>
            <option value="gruen">Grün: im Plan</option>
            <option value="gelb">Gelb: Abweichung</option>
            <option value="rot">Rot: kritisch</option>
          </select>
        </Field>
        <Field label={needsReason ? 'Begründung (Pflicht)' : 'Begründung'} id="reason">
          <input id="reason" className={inputCls} required={needsReason} value={v.rag_reason} onChange={set('rag_reason')} placeholder="Eine Zeile, z.B. Verzug Vendor bei Code-Übergabe" />
        </Field>
        <p className="m-0 text-sm leading-[1.45] text-mono-muted">
          Termin: Gelb bis 4 Wochen Verzug, Rot darüber. Budget-Prognose: Gelb +10 bis 20 %, Rot über 20 %. Scope: Gelb bei Abstrichen, Rot wenn das Kernziel gefährdet ist.
        </p>
      </Fieldset>

      <Fieldset title="Entscheid">
        <label className="inline-flex min-h-11 items-center gap-3 text-base">
          <input type="checkbox" className="m-0 size-5 accent-mono-accent" checked={v.decision_needed} onChange={(e) => setV({ ...v, decision_needed: e.target.checked })} />
          Entscheid der GL nötig
        </label>
        {v.decision_needed && (
          <Field label="Frage an die GL (Pflicht)" id="question">
            <input id="question" className={inputCls} required value={v.decision_question} onChange={set('decision_question')} placeholder="z.B. Zusatzbudget CHF 8'000 freigeben?" />
          </Field>
        )}
      </Fieldset>

      <Fieldset title="Budget (aus dem Controlling-Excel)">
        <Grid min={300}>
          <Field label="Budget CHF" id="budget">
            <input id="budget" type="text" inputMode="numeric" className={inputCls} value={v.budget_chf} onChange={set('budget_chf')} />
          </Field>
          <Field label="Budget-Status" id="bstatus">
            <select id="bstatus" className={selectCls} value={v.budget_status} onChange={set('budget_status')}>
              <option value="platzhalter">Platzhalter</option>
              <option value="beantragt">Beantragt</option>
              <option value="bewilligt">Bewilligt</option>
            </select>
          </Field>
          <Field label="Ist verrechnet CHF" id="actual">
            <input id="actual" type="text" inputMode="numeric" className={inputCls} value={v.actual_chf} onChange={set('actual_chf')} />
          </Field>
          <Field label="Prognose total CHF" id="forecast">
            <input id="forecast" type="text" inputMode="numeric" className={inputCls} value={v.forecast_chf} onChange={set('forecast_chf')} />
          </Field>
        </Grid>
      </Fieldset>

      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={btnSolid} disabled={saving}>{saving ? 'Speichert …' : 'Speichern'}</button>
        <button type="button" className={btnOutline} onClick={onCancel}>Abbrechen</button>
      </div>
    </form>
  )
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 rounded-xl border border-mono-line bg-white px-10 pt-9 pb-10">
      <legend className="float-left m-0 mb-6 w-full p-0 text-2xl font-bold">{title}</legend>
      <div className="clear-both flex flex-col gap-7">{children}</div>
    </fieldset>
  )
}

function Grid({ min, children }: { min: number; children: React.ReactNode }) {
  return <div className="grid gap-7" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))` }}>{children}</div>
}

function Field({ label, id, className = '', children }: { label: string; id: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-base font-medium">{label}</label>
      {children}
    </div>
  )
}
