---
name: atalaya-video-promocional
description: Produce vídeos promocionales profesionales para vender Atalaya 360° a partir de capturas reales de la propia aplicación — guion de venta, capturas nítidas con Playwright, voz en off en español (Piper), montaje fotograma a fotograma con encuadres en movimiento, focos, rótulos y subtítulos, y MP4 1080p. Usar SIEMPRE que se pida un vídeo para vender, presentar o anunciar Atalaya (promo, anuncio, teaser, vídeo para la web, para redes, para una feria o para enviar a clientes), cuando se quiera «montar», «editar» o «rehacer» un vídeo con pantallas de la aplicación, cambiar su ritmo, su guion o su voz, o hacer versiones (más corta, para LinkedIn, con otro mensaje), aunque no se diga la palabra «skill».
---

# Vídeo promocional de Atalaya 360°

Convierte la aplicación en un vídeo de venta: pantallas reales, ritmo de anuncio y un mensaje claro.

El protagonista es lo que Atalaya hace por quien lo compra: anticiparse y decidir con números. La empresa modelo (Valdenorte) es solo el caso con el que se ve. No es una visita guiada de pantallas.

## Lo que hay en la skill

| Pieza | Para qué |
|---|---|
| `scripts/capturar.js` | Capturas 3840×2160 de la app con la empresa modelo activa, las «marcas» (posición de lo que se quiere enseñar) y clips en movimiento (planetas, abanicos) |
| `scripts/revisar_marcas.py` | Hoja con cada captura y sus marcas dibujadas, para comprobar encuadres |
| `scripts/voz.py` | Locución de cada bloque con Piper y su duración |
| `scripts/componer.html` | Compositor: dibuja cada fotograma (encuadre, foco, rótulos, subtítulos, tarjetas) |
| `scripts/render.js` | Línea de tiempo + fotogramas + sonido → MP4 (con `--borrador` para revisar rápido) |
| `assets/capturas-atalaya.json` | Lista de pantallas que se capturan, con sus marcas |
| `assets/promo-atalaya.json` | Guion y montaje del vídeo de unos 85 s, que abre y cierra sobre los planetas (punto de partida) |
| `references/guion.md` | Cómo se escribe un guion que vende (estructura, tono, frases) |
| `references/ritmo.md` | Reglas de ritmo y edición: duración de planos, movimientos, focos, rótulos, cortes |
| `references/planos.md` | Formato de los dos JSON (capturas y montaje), campo a campo |

## Requisitos

- La aplicación servida en local: `cd atalaya && python3 -m http.server 8765`.
- Node con Playwright y Chromium. En este entorno: `PLAYWRIGHT=/opt/node22/lib/node_modules/playwright`.
- `ffmpeg`.
- Piper: `pip install piper-tts` y la voz `es_ES-davefx-medium.onnx` (con su `.json`), que se descarga de `huggingface.co/rhasspy/piper-voices` en `es/es_ES/davefx/medium/`.
  - Hay otras voces: `sharvard`, con hablante femenino (`-s 1`) y masculino.

## Flujo de trabajo

### 1. Brief (dos minutos, sin rodeos)
Fija:
- **Duración:** 30 s, 75–90 s o 2 min.
- **Público:** gerentes de pyme, consultores o asesorías.
- **Dónde se verá:** web, LinkedIn, feria o correo.
- **El mensaje único y la llamada a la acción.**

Si la persona no lo dice, usa estos valores por defecto: 85 s, gerente de pyme, web y LinkedIn, «Vea el futuro de su empresa antes de decidir», «Pruébelo 14 días».

Pregunta solo lo que cambie el vídeo de verdad.

### 2. Guion
Lee `references/guion.md`.

Escribe los bloques del montaje: cada bloque es una frase o dos de locución, con 1 a 3 planos encima.
- En `voz`, los números van en palabras, para que la voz los lea bien.
- En `sub` van con cifras, para los subtítulos.
- Toda cifra de la empresa modelo sale de la aplicación o del motor; no se inventa.

### 3. Capturas
```bash
node scripts/capturar.js assets/capturas-atalaya.json <trabajo>/capturas
python3 scripts/revisar_marcas.py <trabajo>/capturas <trabajo>/marcas.jpg
```
Mira `marcas.jpg`. Cada marca debe rodear justo lo que se quiere enseñar. Si coge solo la cabecera de una tarjeta, sube un nivel (`"subir"`); si coge algo de otra zona, afina el texto. Repite hasta que encajen.

**Escenas en movimiento.** El puesto de mando (los planetas) y los mapas en abanico son las imágenes más potentes de la aplicación: úsalas como clips (`"clip"` en la captura, `"tipo": "clip"` en el montaje; ver `references/planos.md`).
- El 3D se dibuja por software (SwiftShader). `capturar.js` ya lanza Chromium con esa opción e ignora los errores de certificado, que tras un proxy impiden cargar la librería 3D de la CDN; sin eso los planetas no aparecen.
- Mira una tira de fotogramas de cada clip antes de montar: los planetas deben verse y las capas del abanico elevarse.

### 4. Voz
```bash
python3 scripts/voz.py assets/promo-atalaya.json <trabajo> <ruta>/es_ES-davefx-medium.onnx
```
- **Velocidad:** `velocidad_voz` en el montaje (1,0 natural; 1,05–1,1 para un anuncio con más pulso).
- **Volver a generar:** hay que hacerlo cada vez que cambie un texto de `voz`.

### 5. Borrador → revisión → final
```bash
node scripts/render.js assets/promo-atalaya.json <trabajo>/capturas <trabajo> <trabajo>/borrador.mp4 --borrador
```
El borrador tarda un par de minutos.

**Revisión:**
- Saca un fotograma de cada plano (el 75 % de su duración) con la línea de tiempo `<trabajo>/linea-de-tiempo.json` y míralos en una hoja de contactos.
- Comprueba con `references/ritmo.md`:
  - el foco cae sobre lo que dice la voz;
  - los rótulos se leen;
  - ningún plano repite el encuadre del anterior;
  - el plano medio queda entre 2,5 y 3,5 s.
- `render.js` avisa de los planos demasiado cortos o largos.

**Final:**
```bash
node scripts/render.js assets/promo-atalaya.json <trabajo>/capturas <trabajo> atalaya/media/video/atalaya-promo.mp4
```
Unos 10–15 minutos para 85 s a 1080p y 30 fps.

### 6. Comprobación y entrega
- **Sonido:** que la voz suena al principio de cada bloque (`ffmpeg -af volumedetect` en ese instante) y que la sonoridad queda en torno a −16 LUFS (el render la normaliza).
- **Entrega:** el MP4 y una línea con su duración y número de planos. Si la persona puede escucharlo y tú no, díselo: es la comprobación que falta.

## Criterios que no se negocian (y por qué)

- **Pantallas reales, datos reales del caso.** Es un vídeo de venta de software: si lo que se ve no es la aplicación, el cliente lo nota en la demo y se pierde la confianza. Por eso todo sale de capturas y del motor.
- **Un mensaje, no un catálogo.** Cada plano tiene que empujar la misma idea (anticiparse y decidir mejor). Si un módulo no la sostiene, fuera, aunque sea bueno.
- **El ritmo lo marca la voz.** Los cortes caen al terminar las frases (lo hace `render.js` repartiendo el bloque entre sus planos). Así el montaje respira y no parece una presentación de diapositivas.
- **Siempre un punto donde mirar.** Una captura de una aplicación tiene demasiado: el movimiento de cámara y el foco dicen dónde mirar en cada segundo.
- **Subtítulos quemados.** Buena parte de quien lo vea en redes lo hará sin sonido.
- **Registro de usted, sin superlativos ni promesas que no se puedan demostrar.**
- **No nombrar marcas de terceros.**

## Variantes habituales

| Variante | Qué cambia |
|---|---|
| **30 s** | gancho, una capacidad con su prueba (la cifra antes/después) y cierre; 8–10 planos |
| **Vertical 9:16 para redes** | rótulos más grandes y encuadres más cerrados; hoy el compositor dibuja 16:9, así que hay que adaptar `componer.html` (lienzo 1080×1920) y `render.js` (tamaño) |
| **Música** | campo `musica` con la ruta de una pista con licencia; baja sola bajo la voz. No se incluye ninguna pista: no uses música sin licencia |
| **Otro público** (consultores) | lleva el peso a la auditoría integral, la ficha de recorrido y los informes; el cierre, al plan Consultora |
