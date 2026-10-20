# Laboratorio 01 · Una landing, dos mensajes, una sola URL indexable

Experimento A/B de **Taller Norte**: se cambia el mensaje (título, bajada y CTA), nunca la oferta.
Una persona ve siempre el mismo mensaje y un buscador encuentra una sola URL.

## Cómo funciona

- **Asignación estable.** `proxy.ts` corre solo en `/practica`. En el primer request sin cookie
  genera el visitante con `crypto.randomUUID()` y deriva la variante con `assignVariant`
  (FNV-1a de 32 bits, documentado en `lib/experiment.ts`). No hay sorteo por render ni variante en
  la URL.
- **Cookie.** Visitante y variante viajan en cookies `httpOnly` con `path=/` y 30 días. En HTTPS
  son `Secure` + `SameSite=None` + `Partitioned`, para que funcionen dentro del preview embebido.
  En una pestaña normal con HTTP alcanza `SameSite=Lax`.
- **Metadatos en el servidor.** La landing resuelve la variante desde un header que inyecta el
  proxy (primer request) o desde la cookie, y publica `title`/`description` de la variante en el
  HTML del primer response. El `canonical` es siempre `/practica`, sin query. `?preview=a|b` sirve
  para revisar los copy, no pisa la cookie y lleva `noindex`.
- **Medición.** Una impresión por sesión de 30 minutos y una conversión por visitante, disparada
  **solo** por el CTA. Los eventos se guardan en **Postgres** (`experiment_events`), no en el
  navegador: una cookie alcanza para el visitante y la variante, no para los conteos.
- **Bitácora.** Muestra el caso de prueba fijo calculado con la fórmula (A 7,50%, B 13,14%,
  B − A 5,64 pp), los eventos reales leídos de la base y el resultado estable de
  `lab-visitor-demo-01`. No declara ganador.

## Puesta en marcha

```bash
pnpm install
```

1. Copiá `.env.example` a `.env.local` y completá la conexión:

```env
DATABASE_URL=postgresql://postgres:TU_CLAVE@localhost:5432/lab01
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

2. Creá la base (una sola vez). La tabla y los índices se crean solos al primer evento:

```bash
psql -U postgres -h localhost -c "CREATE DATABASE lab01;"
```

3. Levantá el server:

```bash
pnpm dev
```

Abrí `/practica` y `/bitacora`.

## Verificar el núcleo (sin base ni navegador)

```bash
pnpm check
```

Valida el hash estable, el caso fijo, que sin impresiones la tasa sea `Pendiente` y que el log
inválido caiga a vacío. Imprime el resultado de `lab-visitor-demo-01`.

## Qué verificar en el navegador

| Probar | Tiene que pasar |
| --- | --- |
| Recargar `/practica` | La variante no cambia. |
| Borrar cookies y volver | Puede tocar la otra variante: es otro visitante. |
| Abrir `?preview=b` | Se ve B y la cookie de asignación no se pisa. |
| Ver el HTML (no la pantalla) | `title` y `description` de la variante; `canonical` `/practica`. |
| Ver el HTML del preview | Lleva `noindex`. |
| Recargar dentro de 30 min | No suma otra impresión. |
| Cargar la página | No suma una conversión. |
| Clic en el CTA | Suma una conversión; el segundo clic no suma otra. |
| Buscar `localStorage` | No se usa ni para asignar ni para contar. |

## Postgres con Docker (alternativa)

Si no tenés Postgres local:

```bash
docker run --name lab01-pg -e POSTGRES_PASSWORD=clave -e POSTGRES_DB=lab01 -p 5432:5432 -d postgres:16
```

## Estructura

| Archivo | Rol |
| --- | --- |
| `proxy.ts` | Asigna visitante y variante, y anota una impresión por sesión. |
| `lib/experiment.ts` | Hash estable, tasa, validación del log y copy del experimento. |
| `lib/db.ts` | Persistencia de eventos en Postgres. |
| `app/practica/page.tsx` | Landing y metadatos por variante. |
| `app/practica/actions.ts` | Una conversión por visitante, solo con el CTA. |
| `app/bitacora/page.tsx` | Conteos, tasa, diferencia y caso de prueba. |
