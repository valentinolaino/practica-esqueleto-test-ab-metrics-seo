import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { Landing } from '@/components/landing'
import {
  CANONICAL_PATH,
  COOKIE,
  DESCRIPTION_RANGE,
  HEADER,
  TITLE_RANGE,
  VARIANTS,
  characterCount,
  inRange,
  isVariant,
  type Variant,
} from '@/lib/experiment'

type PracticaPageProps = {
  searchParams: Promise<{ preview?: string | string[] }>
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/**
 * La variante sale del proxy (header en el primer request, cookie después).
 * El query ?preview= manda solo para dibujar la pieza: no es la asignación.
 */
async function resolveVariant(
  searchParams: PracticaPageProps['searchParams'],
): Promise<{ variant: Variant; preview: boolean }> {
  const params = await searchParams
  const requested = firstParam(params.preview)
  if (isVariant(requested)) {
    return { variant: requested, preview: true }
  }

  const headerStore = await headers()
  const fromHeader = headerStore.get(HEADER.variant)
  if (isVariant(fromHeader)) {
    return { variant: fromHeader, preview: false }
  }

  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(COOKIE.variant)?.value
  return { variant: isVariant(fromCookie) ? fromCookie : 'a', preview: false }
}

export async function generateMetadata({ searchParams }: PracticaPageProps): Promise<Metadata> {
  const { variant, preview } = await resolveVariant(searchParams)
  const copy = VARIANTS[variant]

  return {
    // `absolute` evita el sufijo del template del layout: el crawler ve el
    // title exacto de la variante.
    title: { absolute: copy.seoTitle },
    description: copy.seoDescription,
    // Canonical único y sin query: las dos variantes son la misma página.
    alternates: { canonical: CANONICAL_PATH },
    // El preview es un instrumento: no se indexa.
    robots: preview ? { index: false, follow: false } : { index: true, follow: true },
  }
}

export default async function PracticaPage({ searchParams }: PracticaPageProps) {
  const params = await searchParams
  const { variant, preview } = await resolveVariant(searchParams)
  const requestedPreview = firstParam(params.preview) ?? variant
  const copy = VARIANTS[variant]
  const titleLength = characterCount(copy.seoTitle)
  const descriptionLength = characterCount(copy.seoDescription)

  return (
    <main id="contenido" className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 md:py-14">
      <p className="font-mono text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
        Taller Norte · experimento A/B
      </p>
      <p className="border-b border-border pb-4 text-sm text-muted-foreground">
        {preview
          ? `Estás viendo el copy ${requestedPreview.toUpperCase()} por query. Es un preview: no pisa la cookie, no cuenta como visita y lleva noindex.`
          : `Variante ${variant.toUpperCase()} · ${copy.name}, asignada por cookie. Recargar no la cambia.`}
      </p>
      <Landing variant={variant} />
      <div className="flex flex-wrap gap-2">
        <Link href="/practica?preview=a" className="rounded-md border border-border px-3 py-1.5 text-sm">
          Ver copy A
        </Link>
        <Link href="/practica?preview=b" className="rounded-md border border-border px-3 py-1.5 text-sm">
          Ver copy B
        </Link>
        <Link href="/bitacora" className="rounded-md border border-border px-3 py-1.5 text-sm">
          Bitácora
        </Link>
      </div>
      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">Metadatos publicados en el HTML</h2>
        <p className="text-sm text-muted-foreground">
          Canonical: <code className="font-mono">{CANONICAL_PATH}</code> (sin query) ·{' '}
          {preview ? 'noindex' : 'index, follow'}
        </p>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 border-b border-border pb-3">
            <dt className="font-mono text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              Title de {variant.toUpperCase()}
            </dt>
            <dd>{copy.seoTitle}</dd>
            <dd className="font-mono text-sm text-muted-foreground">
              {titleLength} caracteres · {inRange(titleLength, TITLE_RANGE) ? 'dentro de 50–60' : 'fuera de rango'}
            </dd>
          </div>
          <div className="flex flex-col gap-1 border-b border-border pb-3">
            <dt className="font-mono text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              Description de {variant.toUpperCase()}
            </dt>
            <dd>{copy.seoDescription}</dd>
            <dd className="font-mono text-sm text-muted-foreground">
              {descriptionLength} caracteres ·{' '}
              {inRange(descriptionLength, DESCRIPTION_RANGE) ? 'dentro de 140–160' : 'fuera de rango'}
            </dd>
          </div>
        </dl>
      </section>
    </main>
  )
}
