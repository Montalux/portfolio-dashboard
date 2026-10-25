import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

// Triggers the jira-sync Edge Function (PM only, checked server-side)
export function SyncButton({ onDone }: { onDone: () => void }) {
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const run = async () => {
    setRunning(true)
    setMsg(null)
    const { data, error } = await supabase.functions.invoke<{ ok: boolean; errors?: string[] }>('jira-sync', { body: { trigger: 'manual' } })
    setRunning(false)
    if (error) setMsg('Sync fehlgeschlagen.')
    else if (!data?.ok) setMsg(`Sync mit Fehlern: ${data?.errors?.join('; ')}`)
    else setMsg('Jira aktualisiert.')
    onDone()
  }

  return (
    <span className="flex items-center gap-2">
      {msg && <span className="hidden max-w-64 truncate text-xs text-neutral-600 md:inline" title={msg}>{msg}</span>}
      <Button variant="outline" size="sm" onClick={run} disabled={running}>
        <RefreshCw className={`size-4 ${running ? 'animate-spin' : ''}`} aria-hidden />
        {running ? 'Aktualisiert …' : 'Jetzt aktualisieren'}
      </Button>
    </span>
  )
}
