import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Database } from '@/lib/database.types'
import type { Initiative } from '@/lib/portfolio'

type Update = Database['public']['Tables']['initiative']['Update']

const selectCls =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

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
    <form onSubmit={submit} className="space-y-6">
      <Fieldset title="Initiative">
        <Field label="Titel" id="title" wide>
          <Input id="title" required value={v.title} onChange={set('title')} />
        </Field>
        <Field label="Status" id="status">
          <select id="status" className={selectCls} value={v.status} onChange={set('status')}>
            <option value="geplant">Geplant</option>
            <option value="laufend">Laufend</option>
            <option value="abgeschlossen">Abgeschlossen</option>
            <option value="abgebrochen">Abgebrochen</option>
          </select>
        </Field>
        <Field label="Start" id="start">
          <Input id="start" type="date" value={v.start_date} onChange={set('start_date')} />
        </Field>
        <Field label="Due date" id="due">
          <Input id="due" type="date" value={v.due_date} onChange={set('due_date')} />
        </Field>
        <Field label="Beschreibung" id="desc" wide>
          <Textarea id="desc" rows={5} value={v.description} onChange={set('description')} />
        </Field>
      </Fieldset>

      <Fieldset title="Status (RAG)">
        <Field label="Ampel" id="rag">
          <select id="rag" className={selectCls} value={v.rag} onChange={set('rag')}>
            <option value="">Kein Status</option>
            <option value="gruen">Grün: im Plan</option>
            <option value="gelb">Gelb: Abweichung, Team löst</option>
            <option value="rot">Rot: Ziel gefährdet</option>
          </select>
        </Field>
        <Field label={needsReason ? 'Begründung (Pflicht)' : 'Begründung'} id="reason" wide>
          <Input id="reason" required={needsReason} value={v.rag_reason} onChange={set('rag_reason')} placeholder="Eine Zeile, z.B. Verzug Vendor bei Code-Übergabe" />
        </Field>
        <p className="text-xs text-neutral-500 md:col-span-2">
          Termin: Gelb bis 4 Wochen Verzug, Rot darüber. Budget-Prognose: Gelb +10 bis 20 %, Rot über 20 %. Scope: Gelb bei Abstrichen, Rot wenn das Kernziel gefährdet ist.
        </p>
      </Fieldset>

      <Fieldset title="Entscheid">
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={v.decision_needed} onChange={(e) => setV({ ...v, decision_needed: e.target.checked })} />
          Entscheid der GL nötig
        </label>
        {v.decision_needed && (
          <Field label="Frage an die GL (Pflicht)" id="question" wide>
            <Input id="question" required value={v.decision_question} onChange={set('decision_question')} placeholder="z.B. Zusatzbudget CHF 8'000 freigeben?" />
          </Field>
        )}
      </Fieldset>

      <Fieldset title="Budget (aus dem Controlling-Excel)">
        <Field label="Budget CHF" id="budget">
          <Input id="budget" inputMode="decimal" value={v.budget_chf} onChange={set('budget_chf')} />
        </Field>
        <Field label="Budget-Status" id="bstatus">
          <select id="bstatus" className={selectCls} value={v.budget_status} onChange={set('budget_status')}>
            <option value="platzhalter">Platzhalter</option>
            <option value="beantragt">Beantragt</option>
            <option value="bewilligt">Bewilligt</option>
          </select>
        </Field>
        <Field label="Ist verrechnet CHF" id="actual">
          <Input id="actual" inputMode="decimal" value={v.actual_chf} onChange={set('actual_chf')} />
        </Field>
        <Field label="Prognose total CHF" id="forecast">
          <Input id="forecast" inputMode="decimal" value={v.forecast_chf} onChange={set('forecast_chf')} />
        </Field>
      </Fieldset>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? 'Speichert …' : 'Speichern'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Abbrechen</Button>
      </div>
    </form>
  )
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-neutral-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  )
}

function Field({ label, id, wide, children }: { label: string; id: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${wide ? 'md:col-span-2' : ''}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
