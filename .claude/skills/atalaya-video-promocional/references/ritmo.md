# Ritmo y edición

El ritmo es lo que separa un vídeo profesional de una presentación grabada. Estas reglas salen de cómo se montan los anuncios de software. No son caprichos: cada una evita un problema que el espectador nota aunque no sepa decir cuál.

## Duración de los planos

| Tipo de plano | Duración | Por qué |
|---|---|---|
| Captura con un dato o una tarjeta | 2,5–3,5 s | Lo justo para leer una cifra y su etiqueta |
| Captura con un gráfico | 3–4 s | El ojo necesita recorrer la línea |
| Tarjeta de título o gancho | 3–4 s | Se lee de una vez |
| Cifra antes/después | 4–6 s | Es la prueba: merece aire |
| Cierre con llamada a la acción | 5–7 s | Tiempo para leer la marca y la acción |

- **Plano medio de todo el vídeo:** entre 2,5 y 3,5 s. Por debajo de 1,5 s una captura no se lee; por encima de 6 s el plano se hace largo y conviene partirlo en dos encuadres de la misma pantalla (plano general → detalle).
- **Cómo se reparten:** `render.js` reparte la duración de cada bloque (su voz más una pausa) entre sus planos según el `peso`. Sube el `peso` del plano que tiene que durar más.

## Movimiento de cámara

- **Nunca un plano quieto.** Sin `a`, el plano hace una deriva lenta, un acercamiento del 7 % lineal: da vida sin llamar la atención.
- **Del general al detalle:**
  - `de` es la pantalla o la zona amplia; `a` es la tarjeta o el dato del que habla la voz.
  - El movimiento lleva aceleración y frenada (ease-in-out).
  - Es el movimiento más útil: cuenta «esto es la aplicación… y aquí está lo importante».
- **Del detalle al general:** solo para revelar algo (por ejemplo, de una cifra al gráfico que la explica).
- **Zoom máximo de unas 2,5–3 veces sobre la captura.**
  - Las capturas son al doble de resolución, así que hasta 2× se ve nítido.
  - Más allá, el texto se ablanda y el contexto se pierde.
- **Cambia de lugar entre planos seguidos de la misma pantalla.** Dos planos seguidos con el mismo encuadre parecen un error de montaje.

## Foco (`resalta`)

- **Dónde:** sobre lo que la voz nombra en ese plano.
- **Cuándo:** entra a mitad del movimiento (`resaltaDesde` entre 0,25 y 0,45). Así primero se ve dónde estamos y después qué mirar.
- **Cuántos:** uno por plano. Dos focos a la vez no dirigen la mirada a ningún sitio.
- **Qué rodea:** la tarjeta entera, no solo su título. Si la marca coge solo la cabecera, sube un nivel en la captura.

## Rótulos, etiqueta y subtítulos

- **Etiqueta (arriba a la izquierda):** el mundo de Atalaya que se ve («Simulador de inversión», «Sistema estratégico · Cobros»). Va en el primer plano de cada pantalla nueva, no en todos.
- **Rótulo:** de 2 a 6 palabras, uno por bloque como mucho, con la palabra clave en el color de acento. Entra palabra a palabra.
- **Subtítulos:** quemados, en trozos de hasta 8 palabras cortados en la puntuación. No se ponen en las tarjetas, que ya son texto.

## Cortes y transiciones

- **Corte seco por defecto.** Es lo que usa la publicidad: rápido y limpio.
- **Fundido (`"transicion": "fundido"`):** solo para cambiar de tramo grande (de capacidades a la prueba, o a la tarjeta de cierre). Más de dos o tres fundidos en un minuto hacen el vídeo blando.
- **Entrada y salida:** fundido desde y hasta negro (0,5 s), que ya hace el compositor.
- **Dónde se corta:** el corte cae al terminar la frase; lo garantiza el reparto por bloques. Si un corte queda en mitad de una frase, parte el texto del bloque en dos bloques.

## Sonido

- **Voz:** normalizada por el render a −16 LUFS (lo estándar en web y redes).
- **Pausa entre bloques:** 0,5–0,6 s. Menos suena atropellado; más hace que se caiga el ritmo.
  - Al gancho, 0,4 s para entrar rápido.
  - Al cierre, 1,5 s para que la llamada a la acción se lea.
- **Música (opcional, con licencia):** bajo la voz a unos −18 dB; se aparta sola cuando se habla (compresión con la voz como llave).

## Lista de comprobación del borrador

- [ ] El gancho se entiende en 4 s, sin sonido.
- [ ] Cada plano tiene un punto claro donde mirar.
- [ ] El foco cae donde la voz lo nombra.
- [ ] Ningún plano repite el encuadre del anterior.
- [ ] Rótulos de 6 palabras o menos y legibles.
- [ ] Plano medio entre 2,5 y 3,5 s; `render.js` no avisa de planos fuera de rango (o están justificados).
- [ ] La cifra de prueba está en pantalla al menos 4 s.
- [ ] Cierre con marca, idea y una sola llamada a la acción.
