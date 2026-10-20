/**
 * Prueba rápida del núcleo del experimento, sin base ni navegador.
 *
 *   node scripts/check-experiment.mjs
 *
 * Sirve como evidencia para el informe: hash estable, caso fijo calculado
 * con la fórmula y validación del log.
 */
import assert from 'node:assert/strict'
import {
  DESCRIPTION_RANGE,
  HASH_EXAMPLE_ID,
  HASH_NAME,
  TEST_CASE,
  TITLE_RANGE,
  VARIANTS,
  assignVariant,
  characterCount,
  conversionRate,
  emptyLog,
  formatPoints,
  formatRate,
  inRange,
  parseLog,
  rateGap,
  serializeLog,
} from '../lib/experiment.ts'

const ok = (label) => console.log(`ok  ${label}`)

// 1. Hash estable: repetir el mismo id no cambia el resultado.
const first = assignVariant(HASH_EXAMPLE_ID)
const second = assignVariant(HASH_EXAMPLE_ID)
assert.equal(first, second)
assert.ok(first === 'a' || first === 'b')
console.log(`${HASH_NAME} · assignVariant('${HASH_EXAMPLE_ID}') → ${first.toUpperCase()} (×2)`)
ok('asignación estable')

// 2. Caso fijo calculado con la fórmula, no escrito a mano.
assert.equal(conversionRate(TEST_CASE.a), 18 / 240)
assert.equal(conversionRate(TEST_CASE.b), 31 / 236)
console.log(`A: ${formatRate(conversionRate(TEST_CASE.a))}  B: ${formatRate(conversionRate(TEST_CASE.b))}`)
console.log(`B − A = ${formatPoints(rateGap(TEST_CASE))}`)
assert.equal(formatRate(conversionRate(TEST_CASE.a)), '7,50%')
assert.equal(formatRate(conversionRate(TEST_CASE.b)), '13,14%')
assert.equal(formatPoints(rateGap(TEST_CASE)), '5,64 pp')
ok('caso fijo 7,50% / 13,14% / 5,64 pp')

// 3. Sin impresiones no hay tasa: null, no 0.
assert.equal(conversionRate({ impressions: 0, conversions: 0 }), null)
assert.equal(formatRate(null), 'Pendiente')
ok('sin impresiones, tasa Pendiente')

// 4. Log validado antes de usarlo.
assert.deepEqual(parseLog(serializeLog(emptyLog())), emptyLog())
assert.deepEqual(parseLog(undefined), emptyLog())
assert.deepEqual(parseLog('no es json'), emptyLog())
assert.deepEqual(parseLog('{"a":{"impressions":-1,"conversions":0}}'), emptyLog())
ok('parseLog valida y cae a log vacío')

// 5. Longitudes dentro de rango.
for (const variant of ['a', 'b']) {
  const copy = VARIANTS[variant]
  const title = characterCount(copy.seoTitle)
  const description = characterCount(copy.seoDescription)
  assert.ok(inRange(title, TITLE_RANGE), `title de ${variant} fuera de rango (${title})`)
  assert.ok(inRange(description, DESCRIPTION_RANGE), `description de ${variant} fuera de rango (${description})`)
  console.log(`${variant.toUpperCase()}: title ${title} (50–60) · description ${description} (140–160)`)
}
ok('metadatos en rango')

console.log('\nTodo en orden.')
