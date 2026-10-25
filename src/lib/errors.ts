// Translate database rule violations into user-facing German messages
const CONSTRAINTS: Record<string, string> = {
  rag_reason_required: 'Bei Gelb und Rot ist eine Begründung Pflicht.',
  decision_question_required: 'Bei "Entscheid nötig" braucht es eine Frage an die GL.',
  dates_in_order: 'Das Due date darf nicht vor dem Start liegen.',
  amounts_not_negative: 'Beträge dürfen nicht negativ sein.',
}

export function errorText(e: { message: string; code?: string } | null): string | null {
  if (!e) return null
  for (const [name, text] of Object.entries(CONSTRAINTS)) if (e.message.includes(name)) return text
  if (e.code === '42501' || e.message.includes('row-level security')) return 'Keine Berechtigung für diese Änderung.'
  return `Speichern fehlgeschlagen: ${e.message}`
}
