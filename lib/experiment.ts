export type Variant = 'a' | 'b'

export type VariantStats = {
  impressions: number
  conversions: number
}

export type ExperimentLog = Record<Variant, VariantStats>

export const COOKIE = {
  visitor: 'lab_visitor',
  variant: 'lab_variant',
  log: 'lab_log',
  impressed: 'lab_impressed',
  converted: 'lab_converted',
} as const

/** Nombre del hash, para documentar la asignación en la bitácora y el informe. */
export const HASH_NAME = 'FNV-1a de 32 bits'

/** Headers que el proxy usa para pasar visitante y variante al render del mismo request. */
export const HEADER = {
  visitor: 'x-lab-visitor',
  variant: 'x-lab-variant',
} as const

export const THIRTY_DAYS = 60 * 60 * 24 * 30
export const SESSION_WINDOW = 60 * 30
export const CANONICAL_PATH = '/practica'
export const TITLE_RANGE = { min: 50, max: 60 }
export const DESCRIPTION_RANGE = { min: 140, max: 160 }

export const OFFER = [
  { label: 'Inicio', value: '14 de abril' },
  { label: 'Duración', value: '8 semanas' },
  { label: 'Cupo', value: '12 personas' },
  { label: 'Oficios', value: 'Carpintería, electricidad, cocina' },
] as const

export const VARIANTS = {
  a: {
    id: 'a',
    name: 'Control',
    seoTitle: 'Cursos de oficio en ocho semanas, con salida laboral',
    seoDescription:
      'Aprendé carpintería, electricidad o cocina en ocho semanas. Grupos de doce personas y práctica real, con una salida laboral que se puede cobrar.',
    headline: 'Ocho semanas para un oficio que se puede cobrar.',
    emphasis: null,
    lede: 'La práctica empieza en la primera clase. El mensaje de esta variante habla del método, no de la escasez.',
    cta: 'Ver cupos de abril',
  },
  b: {
    id: 'b',
    name: 'Tratamiento',
    seoTitle: 'Abril abre cupos: cursos de oficio en grupos de 12',
    seoDescription:
      'El 14 de abril empiezan grupos de doce. En la cohorte anterior, ocho de cada diez consiguieron trabajo en el rubro antes de los noventa días.',
    headline: 'El curso empieza el 14 de abril.',
    emphasis: 'El cupo, no.',
    lede: 'Doce lugares y una fecha. El mensaje de esta variante apura la decisión, sin cambiar la oferta.',
    cta: 'Reservar mi lugar',
  },
} as const

export const TEST_CASE: ExperimentLog = {
  a: { impressions: 240, conversions: 18 },
  b: { impressions: 236, conversions: 31 },
}

export const HASH_EXAMPLE_ID = 'lab-visitor-demo-01'

export function isVariant(value: string | null | undefined): value is Variant {
  return value === 'a' || value === 'b'
}

export function emptyLog(): ExperimentLog {
  return {
    a: { impressions: 0, conversions: 0 },
    b: { impressions: 0, conversions: 0 },
  }
}

/**
 * FNV-1a de 32 bits. Determinístico y sin dependencias: el mismo id devuelve
 * siempre el mismo entero, en cualquier proceso y en cualquier máquina.
 * Se usa para derivar la variante del visitante (ver assignVariant).
 */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * Asignación estable: la variante sale del hash del visitante, nunca de un
 * sorteo por render. Repetir el id cae siempre en la misma variante.
 * Reparto 50/50 sobre el bit menos significativo del hash.
 */
export function assignVariant(visitorId: string): Variant {
  return fnv1a(visitorId) % 2 === 0 ? 'a' : 'b'
}

export function conversionRate(stats: VariantStats): number | null {
  if (!Number.isFinite(stats.impressions) || stats.impressions <= 0) return null
  if (!Number.isFinite(stats.conversions) || stats.conversions < 0) return null
  return stats.conversions / stats.impressions
}

export function rateGap(log: ExperimentLog): number | null {
  const control = conversionRate(log.a)
  const treatment = conversionRate(log.b)
  if (control === null || treatment === null) return null
  return (treatment - control) * 100
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

/**
 * Valida un valor ya deserializado contra la forma del log. Si cualquier
 * variante no trae impresiones y conversiones enteras no negativas, se
 * descarta todo y se devuelve un log vacío.
 */
export function validateLog(value: unknown): ExperimentLog {
  if (typeof value !== 'object' || value === null) return emptyLog()
  const record = value as Record<string, unknown>
  const log = emptyLog()
  for (const variant of ['a', 'b'] as const) {
    const stats = record[variant]
    if (typeof stats !== 'object' || stats === null) return emptyLog()
    const { impressions, conversions } = stats as Record<string, unknown>
    if (!isNonNegativeInteger(impressions) || !isNonNegativeInteger(conversions)) return emptyLog()
    log[variant] = { impressions, conversions }
  }
  return log
}

export function parseLog(raw: string | undefined): ExperimentLog {
  if (!raw) return emptyLog()
  try {
    return validateLog(JSON.parse(raw))
  } catch {
    return emptyLog()
  }
}

export function serializeLog(log: ExperimentLog): string {
  return JSON.stringify(log)
}

const numberFormat = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const integerFormat = new Intl.NumberFormat('es-AR')

export function formatCount(value: number): string {
  return integerFormat.format(value)
}

export function formatRate(rate: number | null): string {
  if (rate === null) return 'Pendiente'
  return `${numberFormat.format(rate * 100)}%`
}

export function formatPoints(value: number | null): string {
  if (value === null) return 'Pendiente'
  return `${numberFormat.format(value)} pp`
}

export function characterCount(value: string): number {
  return Array.from(value).length
}

export function inRange(length: number, range: { min: number; max: number }): boolean {
  return length >= range.min && length <= range.max
}

export function cookieOptions(secure: boolean, maxAge?: number) {
  // El preview corre en un iframe: la cookie tiene que ser Secure y SameSite=None.
  return {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: secure ? ('none' as const) : ('lax' as const),
    partitioned: secure,
    ...(typeof maxAge === 'number' ? { maxAge } : {}),
  }
}
