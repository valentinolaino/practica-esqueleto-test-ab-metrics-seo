# Informe · Laboratorio 01 — Una landing, dos mensajes, una sola URL indexable

**Taller Norte · Programación Avanzada 2026**

## 1. Qué ve una persona asignada a B

Quien cae en la variante B ve el mismo producto con otro mensaje. Lo que cambia:

- **Titular:** «El curso empieza el 14 de abril.» con la continuación destacada «El cupo, no.»
- **Bajada:** «Doce lugares y una fecha. El mensaje de esta variante apura la decisión, sin cambiar la oferta.»
- **Llamado a la acción:** «Reservar mi lugar».
- **Title:** «Abril abre cupos: cursos de oficio en grupos de 12» (50 caracteres).
- **Description:** «El 14 de abril empiezan grupos de doce. En la cohorte anterior, ocho de cada diez consiguieron
  trabajo en el rubro antes de los noventa días.» (141 caracteres).

Lo que **no** cambia es la oferta, que es idéntica en A y en B: inicio el 14 de abril, 8 semanas de duración,
cupo de 12 personas y los mismos oficios (carpintería, electricidad y cocina). El experimento mueve el mensaje,
no el producto. A habla del método; B apura la decisión con fecha y cupo. Las dos venden lo mismo.

## 2. Qué debería ver un crawler

Un crawler debería ver **siempre la variante de control (A)**, en la misma URL `/practica`, respuesta tras
respuesta. El motivo es que un buscador normalmente **no conserva cookies**: cada visita llega sin cookie de
asignación. Si el mensaje se sorteara en cada visita sin cookie, el buscador podría indexar un texto distinto
cada vez: contenido inestable, que es exactamente lo que rompe la indexación. Por eso la variante se fija en
el servidor y el `<title>`, la `<meta name="description">` y el cuerpo de A viajan ya escritos en el HTML del
primer response, sin JavaScript de por medio.

Esto **no es cloaking**. Cloaking es mostrarle una cosa al buscador y otra a la persona para manipular el
ranking. Acá la página es la misma para todos, en la misma URL y con el mismo canonical; simplemente el crawler
sin cookie recibe el control, que es una variante legítima del mismo experimento y no un texto fabricado para
el bot. No hace falta detectar el user-agent: alcanza con que un request sin cookie caiga en el control.

## 3. Por qué el canonical no cambia

El canonical es siempre `/practica`, sin query, porque **las dos variantes son la misma página**. El contenido
que cambia es solo el mensaje; el documento indexable es uno. Si publicáramos `/variante-a` y `/variante-b`, o
si canonizáramos `?variant=b`, partiríamos el experimento en dos URLs y diluiríamos la indexación: dos páginas
compitiendo por las mismas consultas, con señales repartidas. El query `?preview=a|b` es solo un instrumento de
revisión: no cambia la asignación, no pisa la cookie y además lleva `noindex`, así que nunca entra al índice.

## Asignación estable

La variante se deriva del visitante con un hash **FNV-1a de 32 bits** sobre el identificador. Es determinístico
y sin estado: el mismo id devuelve siempre la misma variante, sin sorteo por render y sin depender de la URL.

Prueba: `assignVariant('lab-visitor-demo-01')` → **B**, y repetir el cálculo devuelve **B** otra vez.

## Caso de prueba (cálculo a mano)

- A: 18 / 240 = 0,075 = **7,50%**
- B: 31 / 236 = 0,131355… = **13,14%**
- Diferencia: 13,14% − 7,50% = **5,64 pp**

Los porcentajes salen de la fórmula, no están escritos a mano. Una tasa más alta no es una prueba: no se declara
ganador.

Dos URL: http://localhost:3000/practica y http://localhost:3000/bitacora.

**El log de eventos de la entrega persiste en una base.** Una cookie alcanza para el visitante y la variante. No alcanza para los conteos.
