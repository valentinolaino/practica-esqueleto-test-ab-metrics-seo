import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { isDatabaseConfigured, readCounts } from '@/lib/db'
import {
  HASH_EXAMPLE_ID,
  HASH_NAME,
  TEST_CASE,
  VARIANTS,
  assignVariant,
  conversionRate,
  emptyLog,
  formatCount,
  formatPoints,
  formatRate,
  rateGap,
  type ExperimentLog,
  type Variant,
} from '@/lib/experiment'

export const metadata: Metadata = {
  title: 'Bitácora',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const ROWS: Variant[] = ['a', 'b']

async function loadLive(): Promise<{ log: ExperimentLog; error: string | null }> {
  if (!isDatabaseConfigured()) {
    return { log: emptyLog(), error: 'Falta DATABASE_URL: los conteos reales se leen de la base.' }
  }
  try {
    return { log: await readCounts(), error: null }
  } catch (error) {
    console.error('[lab] no se pudo leer la bitácora', error)
    return { log: emptyLog(), error: 'No se pudo leer la base de eventos.' }
  }
}

function StatsTable({ log, caption }: { log: ExperimentLog; caption: string }) {
  return (
    <table className="w-full text-left text-sm">
      <caption className="mb-3 text-left text-muted-foreground">{caption}</caption>
      <thead>
        <tr className="border-b border-border">
          <th className="py-2 font-medium">Variante</th>
          <th className="py-2 font-medium">Impresiones</th>
          <th className="py-2 font-medium">Conversiones</th>
          <th className="py-2 font-medium">Tasa</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((variant) => (
          <tr key={variant} className="border-b border-border">
            <td className="py-3">
              {variant.toUpperCase()} · {VARIANTS[variant].name}
            </td>
            <td className="py-3 font-mono">{formatCount(log[variant].impressions)}</td>
            <td className="py-3 font-mono">{formatCount(log[variant].conversions)}</td>
            <td className="py-3 font-mono">{formatRate(conversionRate(log[variant]))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default async function BitacoraPage() {
  const { log: live, error } = await loadLive()
  const demoVariant = assignVariant(HASH_EXAMPLE_ID)

  return (
    <main id="contenido" className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 md:py-14">
      <p className="font-mono text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
        Bitácora del experimento
      </p>
      <h1 className="max-w-2xl font-serif text-4xl tracking-tight text-balance md:text-5xl">
        Conteos, tasa y diferencia. Sin ganador.
      </h1>
      <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
        La tasa es conversiones divididas por impresiones. Sin impresiones no hay tasa, así que se muestra
        Pendiente, no 0%. Una diferencia mayor no es una prueba.
      </p>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">Caso de prueba fijo</h2>
        <figure className="flex flex-col gap-2">
          <Image
            src="/caso-de-prueba.svg"
            alt="Gráfico de barras: la variante A convierte 7,50% y la B 13,14%. La diferencia es 5,64 puntos porcentuales."
            width={960}
            height={540}
            className="w-full rounded-lg border border-border"
            priority={false}
          />
          <figcaption className="text-sm text-muted-foreground">
            La tasa sale de la fórmula, no está escrita a mano: A 18/240 = 7,50%, B 31/236 = 13,14%, y la
            diferencia es 5,64 pp.
          </figcaption>
        </figure>
        <StatsTable
          log={TEST_CASE}
          caption="Cohorte fija. Tiene que dar A 7,50%, B 13,14% y la diferencia 5,64 pp, aunque nadie haya entrado."
        />
        <p className="font-mono text-sm">B − A = {formatPoints(rateGap(TEST_CASE))}</p>
        <p className="max-w-2xl text-sm text-muted-foreground">
          18 / 240 = 0,075 = 7,50%. 31 / 236 = 0,131355… = 13,14%. La diferencia, en puntos porcentuales, es
          5,64.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">Eventos reales</h2>
        <StatsTable
          log={live}
          caption="Impresiones y conversiones anotadas en la base. Una impresión por sesión de 30 minutos, una conversión por visitante."
        />
        <p className="font-mono text-sm">B − A = {formatPoints(rateGap(live))}</p>
        {error ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{error}</p>
        ) : (
          <p className="max-w-2xl text-sm text-muted-foreground">
            Estos conteos salen de Postgres, no del navegador.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-2xl">Asignación estable</h2>
        <p className="font-mono text-sm">
          {HASH_NAME} · assignVariant('{HASH_EXAMPLE_ID}') → {demoVariant.toUpperCase()}
        </p>
        <p className="max-w-2xl text-sm text-muted-foreground">
          El mismo identificador cae siempre en la misma variante: repetir el cálculo devuelve{' '}
          {demoVariant.toUpperCase()} otra vez.
        </p>
      </section>

      <Link href="/practica" className="text-sm text-muted-foreground underline">
        Volver a la landing
      </Link>
    </main>
  )
}
