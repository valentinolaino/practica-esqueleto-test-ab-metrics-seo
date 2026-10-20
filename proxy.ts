import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { isDatabaseConfigured, recordImpression } from '@/lib/db'
import {
  COOKIE,
  HEADER,
  SESSION_WINDOW,
  THIRTY_DAYS,
  assignVariant,
  cookieOptions,
  isVariant,
} from '@/lib/experiment'

/** El prefetch del router no es una visita real: no debe inflar impresiones. */
function isPrefetch(request: NextRequest): boolean {
  return (
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch'
  )
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  // ?preview=a|b es un instrumento de revisión: no asigna, no escribe cookies
  // y no cuenta como visita del experimento.
  if (isVariant(request.nextUrl.searchParams.get('preview'))) {
    return NextResponse.next()
  }

  const secure = request.nextUrl.protocol === 'https:'
  const headers = new Headers(request.headers)

  let visitorId = request.cookies.get(COOKIE.visitor)?.value
  let variant = request.cookies.get(COOKIE.variant)?.value
  const assigned = Boolean(visitorId) && isVariant(variant)

  // Primer request sin cookie, o cookie inconsistente: se asigna una sola vez.
  if (!assigned) {
    visitorId = crypto.randomUUID()
    variant = assignVariant(visitorId)
  }

  // La cookie se persiste para los próximos requests; los headers permiten que
  // este mismo render (page + generateMetadata) vea la variante recién asignada.
  headers.set(HEADER.visitor, visitorId as string)
  headers.set(HEADER.variant, variant as 'a' | 'b')

  const response = NextResponse.next({ request: { headers } })

  if (!assigned) {
    response.cookies.set(COOKIE.visitor, visitorId as string, cookieOptions(secure, THIRTY_DAYS))
    response.cookies.set(COOKIE.variant, variant as 'a' | 'b', cookieOptions(secure, THIRTY_DAYS))
  }

  // Una impresión por sesión de 30 minutos. Recargar dentro de la ventana no suma.
  const impressedAt = Number(request.cookies.get(COOKIE.impressed)?.value)
  const withinWindow =
    Number.isFinite(impressedAt) &&
    impressedAt > 0 &&
    Date.now() - impressedAt < SESSION_WINDOW * 1000
  const countsAsView = request.method === 'GET' && !isPrefetch(request)

  if (countsAsView && !withinWindow) {
    response.cookies.set(COOKIE.impressed, String(Date.now()), cookieOptions(secure, SESSION_WINDOW))
    if (isDatabaseConfigured()) {
      event.waitUntil(
        recordImpression(visitorId as string, variant as 'a' | 'b').catch((error) => {
          console.error('[lab] no se pudo anotar la impresión', error)
        }),
      )
    }
  }

  return response
}

export const config = {
  matcher: ['/practica'],
}
