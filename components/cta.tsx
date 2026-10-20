'use client'

import { useState, useTransition } from 'react'
import { recordConversion, type ConversionStatus } from '@/app/practica/actions'

const MESSAGES: Record<ConversionStatus, string> = {
  recorded: 'Anotada. El segundo clic no suma otra: es una por visitante.',
  duplicate: 'Este visitante ya tenía su conversión anotada.',
  unassigned: 'Sin variante asignada, la conversión no se anota.',
  error: 'No se pudo anotar la conversión. Revisá la conexión con la base.',
}

const IDLE_MESSAGE = 'La conversión se anota solo acá. Cargar la página no cuenta.'

export function Cta({ label }: { label: string }) {
  const [status, setStatus] = useState<ConversionStatus | null>(null)
  const [pending, startTransition] = useTransition()

  const done = status === 'recorded' || status === 'duplicate'

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pending || done}
        onClick={() => {
          startTransition(async () => {
            const result = await recordConversion()
            setStatus(result.status)
          })
        }}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {label}
      </button>
      <p className="max-w-md text-sm text-muted-foreground" aria-live="polite">
        {status ? MESSAGES[status] : IDLE_MESSAGE}
      </p>
    </div>
  )
}
