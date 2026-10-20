/**
 * Verificación end-to-end contra el dev server en http://localhost:3000.
 * Comprueba, con HTML crudo, lo que pide la sección 7 del instructivo.
 *
 *   node scripts/check-http.mjs
 */
const BASE = process.env.LAB_BASE_URL ?? 'http://localhost:3000'

let failures = 0
function check(label, condition, detail = '') {
  const mark = condition ? 'ok  ' : 'FAIL'
  if (!condition) failures += 1
  console.log(`${mark} ${label}${detail ? ` — ${detail}` : ''}`)
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

function mergeCookies(jar, response) {
  const raw = response.headers.getSetCookie?.() ?? []
  for (const line of raw) {
    const [pair] = line.split(';')
    const index = pair.indexOf('=')
    const name = pair.slice(0, index).trim()
    const value = pair.slice(index + 1).trim()
    if (value === '') delete jar[name]
    else jar[name] = value
  }
}

async function get(path, jar, extraHeaders = {}) {
  const headers = { ...extraHeaders }
  const cookie = cookieHeader(jar)
  if (cookie) headers.cookie = cookie
  const response = await fetch(`${BASE}${path}`, { headers, redirect: 'manual' })
  mergeCookies(jar, response)
  const html = await response.text()
  return { response, html }
}

function meta(html, pattern) {
  return html.match(pattern)?.[1] ?? null
}

console.log(`== ${BASE} ==\n`)

// 1. Primer request: asigna visitante y variante por cookie.
const jar = {}
const first = await get('/practica', jar)
check('primer request responde 200', first.response.status === 200, String(first.response.status))
check('setea cookie de visitante', Boolean(jar.lab_visitor), jar.lab_visitor)
check('setea cookie de variante', jar.lab_variant === 'a' || jar.lab_variant === 'b', jar.lab_variant)
check('setea cookie de impresión', Boolean(jar.lab_impressed), jar.lab_impressed)

const title = meta(first.html, /<title>([^<]*)<\/title>/i)
const description = meta(first.html, /<meta name="description" content="([^"]*)"/i)
const canonical = meta(first.html, /<link rel="canonical" href="([^"]*)"/i)
const robots = meta(first.html, /<meta name="robots" content="([^"]*)"/i)

console.log(`     variante=${jar.lab_variant} title="${title}"`)
console.log(`     canonical=${canonical} robots=${robots}`)
check('title acorde a la variante', Boolean(title) && title !== 'Taller Norte' && !title.includes('Laboratorio 01'))
check('description presente', Boolean(description))
check('canonical sin query', canonical === `${BASE}/practica` || canonical === '/practica', String(canonical))
check('no lleva noindex', !String(robots).includes('noindex'))

const expectedTitle =
  jar.lab_variant === 'b'
    ? 'Abril abre cupos: cursos de oficio en grupos de 12'
    : 'Cursos de oficio en ocho semanas, con salida laboral'
check('title es el de la variante', title === expectedTitle, title)

// 2. Recargar no cambia la variante ni suma impresión.
const variantBefore = jar.lab_variant
const impressedBefore = jar.lab_impressed
const second = await get('/practica', jar)
check('recargar mantiene la variante', jar.lab_variant === variantBefore, jar.lab_variant)
check('recargar no reinicia la ventana de impresión', jar.lab_impressed === impressedBefore)
check('recargar mantiene el mismo visitante', Boolean(jar.lab_visitor))

// 3. Preview: muestra B, no pisa la cookie y lleva noindex.
const preview = await get('/practica?preview=b', jar)
const previewTitle = meta(preview.html, /<title>([^<]*)<\/title>/i)
const previewRobots = meta(preview.html, /<meta name="robots" content="([^"]*)"/i)
check('preview=b muestra el title de B', previewTitle === 'Abril abre cupos: cursos de oficio en grupos de 12', previewTitle)
check('preview lleva noindex', String(previewRobots).includes('noindex'), previewRobots)
check('preview no pisa la cookie de variante', jar.lab_variant === variantBefore, jar.lab_variant)

// 4. Salir del preview vuelve a la variante asignada.
const after = await get('/practica', jar)
const afterTitle = meta(after.html, /<title>([^<]*)<\/title>/i)
check('al salir del preview vuelve la variante asignada', afterTitle === expectedTitle, afterTitle)

// 5. Un visitante distinto puede caer en otra variante (o en la misma, es azar).
const otherJar = {}
await get('/practica', otherJar)
check('otro visitante recibe su propia cookie', otherJar.lab_visitor !== jar.lab_visitor)

// 6. Hash estable: repetir el id no cambia la variante (chequeo cruzado).
const sameAgain = await get('/practica', otherJar)
check('recargar en el segundo visitante mantiene su variante', sameAgain.html.includes('Variante'))

console.log('')
if (failures === 0) console.log('Todo en orden.')
else console.log(`${failures} verificación(es) fallaron.`)
process.exit(failures === 0 ? 0 : 1)
