import { Pool } from 'pg'
import {
  SESSION_WINDOW,
  emptyLog,
  validateLog,
  type ExperimentLog,
  type Variant,
} from '@/lib/experiment'

/**
 * Persistencia del experimento.
 *
 * Visitante y variante viven en la cookie. Los eventos (impresión y
 * conversión) NO: se guardan acá, en Postgres, y los conteos se calculan
 * con una consulta. La tabla es append-only.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS experiment_events (
  id BIGSERIAL PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('a', 'b')),
  kind TEXT NOT NULL CHECK (kind IN ('impression', 'conversion')),
  session_bucket BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Una conversión por visitante: la base rechaza la segunda.
CREATE UNIQUE INDEX IF NOT EXISTS experiment_events_conversion_once
  ON experiment_events (visitor_id)
  WHERE kind = 'conversion';

-- Una impresión por visitante y por ventana de 30 minutos.
CREATE UNIQUE INDEX IF NOT EXISTS experiment_events_impression_session
  ON experiment_events (visitor_id, session_bucket)
  WHERE kind = 'impression';
`

type GlobalWithPool = typeof globalThis & { __labPool?: Pool; __labSchemaReady?: Promise<void> }

const globalForDb = globalThis as GlobalWithPool

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

function getPool(): Pool {
  if (!globalForDb.__labPool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('Falta DATABASE_URL: el log de eventos necesita una base.')
    }
    const needsSsl = process.env.DATABASE_SSL === 'true' || /sslmode=require/.test(connectionString)
    globalForDb.__labPool = new Pool({
      connectionString,
      max: 5,
      ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    })
  }
  return globalForDb.__labPool
}

/** Crea la tabla y los índices una sola vez por proceso. */
function ensureSchema(): Promise<void> {
  if (!globalForDb.__labSchemaReady) {
    globalForDb.__labSchemaReady = getPool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((error) => {
        globalForDb.__labSchemaReady = undefined
        throw error
      })
  }
  return globalForDb.__labSchemaReady
}

/**
 * Anota una impresión. La ventana de 30 minutos arranca con la primera
 * impresión; el índice único descarta reintentos dentro de la misma ventana.
 */
export async function recordImpression(visitorId: string, variant: Variant): Promise<void> {
  await ensureSchema()
  await getPool().query(
    `INSERT INTO experiment_events (visitor_id, variant, kind, session_bucket)
     VALUES ($1, $2, 'impression', floor(extract(epoch from now()) / $3))
     ON CONFLICT DO NOTHING`,
    [visitorId, variant, SESSION_WINDOW],
  )
}

/**
 * Anota una conversión disparada por el CTA. Devuelve `true` si se insertó y
 * `false` si el visitante ya tenía una (una por visitante).
 */
export async function recordConversion(visitorId: string, variant: Variant): Promise<boolean> {
  await ensureSchema()
  const result = await getPool().query(
    `INSERT INTO experiment_events (visitor_id, variant, kind)
     VALUES ($1, $2, 'conversion')
     ON CONFLICT DO NOTHING`,
    [visitorId, variant],
  )
  return result.rowCount === 1
}

/** Conteos agregados desde la base. Si no hay base configurada, log vacío. */
export async function readCounts(): Promise<ExperimentLog> {
  if (!isDatabaseConfigured()) return emptyLog()
  await ensureSchema()
  const { rows } = await getPool().query<{ variant: Variant; kind: string; total: string }>(
    `SELECT variant, kind, count(*)::text AS total
     FROM experiment_events
     GROUP BY variant, kind`,
  )
  const log = emptyLog()
  for (const row of rows) {
    if (row.variant !== 'a' && row.variant !== 'b') continue
    if (row.kind === 'impression') log[row.variant].impressions = Number(row.total)
    if (row.kind === 'conversion') log[row.variant].conversions = Number(row.total)
  }
  // Validamos lo que leímos antes de usarlo.
  return validateLog(log)
}
