'use server'

import { cookies } from 'next/headers'
import { recordConversion as insertConversion } from '@/lib/db'
import { COOKIE, isVariant } from '@/lib/experiment'

export type ConversionStatus = 'recorded' | 'duplicate' | 'unassigned' | 'error'

export type ConversionResult = { status: ConversionStatus }

/**
 * Única puerta de entrada de una conversión: la dispara el CTA.
 * Una por visitante, garantizada por la base además de por la cookie.
 */
export async function recordConversion(): Promise<ConversionResult> {
  const store = await cookies()
  const visitorId = store.get(COOKIE.visitor)?.value
  const variant = store.get(COOKIE.variant)?.value

  if (!visitorId || !isVariant(variant)) {
    return { status: 'unassigned' }
  }

  try {
    const inserted = await insertConversion(visitorId, variant)
    return { status: inserted ? 'recorded' : 'duplicate' }
  } catch (error) {
    console.error('[lab] no se pudo anotar la conversión', error)
    return { status: 'error' }
  }
}
