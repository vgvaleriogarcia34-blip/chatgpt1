---
name: video-editor
description: >-
  Edita vídeos cortos verticales (Reels/TikTok/Shorts) de tipo "talking head"
  con el estilo de edición de la marca "mentor de VIDA & Negocios" (Sergio Sáiz):
  subtítulos animados palabra a palabra, cabeceras/titulares grandes con jerarquía
  tipográfica y palabra clave en color (verde=dinero, rojo=emoción), línea de
  acento roja, y tarjetas de marca/nombre con glow neón. Úsalo cuando el usuario
  quiera montar, subtitular o "editar como los reels de Sergio" un vídeo de cámara
  hablando, o pida cabeceras/tipografía/cambios de color al estilo del vídeo
  modelo. Motor: ffmpeg + subtítulos ASS (libass).
---

# Video Editor — estilo "mentor de VIDA & Negocios"

Este skill convierte un vídeo de **cámara hablando** (una persona a cámara, fondo
oscuro/cinematográfico) en un **reel vertical** con la edición de cabeceras y
tipografía del vídeo de referencia: titulares grandes con una palabra clave en
color, subtítulos que aparecen palabra a palabra, una **línea de acento roja**
tras el titular, y **tarjetas de marca / nombre** con glow neón.

La guía visual completa (colores exactos, jerarquía de tamaños, ejemplos de
cada cabecera del vídeo modelo) está en **`references/STYLE.md`**. Léela antes
de decidir textos, colores y posiciones.

## Cuándo usar este skill

- "Edítame este vídeo como los reels de Sergio / mentor de vida y negocios"
- "Ponle subtítulos y cabeceras con la palabra clave en color"
- "Quiero titulares grandes, cambios de color, tarjeta de nombre con neón"
- Cualquier montaje corto vertical talking-head con subtítulo + titular.

## Requisitos

- `ffmpeg` con libass (filtro `subtitles`). Compruébalo: `ffmpeg -filters | grep subtitles`.
- Python 3 (solo librería estándar).
- **Fuentes**: por defecto usa fuentes del sistema (DejaVu/Liberation). Para la
  máxima fidelidad al modelo, añade Anton / Montserrat / Poppins en
  `assets/fonts/` (ver `assets/fonts/README.md`). El skill las detecta solas.

## Flujo de trabajo (3 pasos)

### 1. Crear el *edit spec* (JSON)

Es la partitura de la edición: subtítulos con tiempos, cabeceras con su palabra
clave y color, y tarjetas. Formato completo en `examples/sample_spec.json`.

```jsonc
{
  "resolution": [1080, 1920],          // 9:16 reel; usa [1920,1080] para 16:9
  "font_scale": 1.0,
  "subtitles": [                        // capa base: subtítulo corrido
    {"start": 0.2, "end": 2.6, "text": "te lo voy a decir bien claro",
     "reveal": "word"}                  // "word" = palabra a palabra (por defecto)
  ],
  "headlines": [                        // capa de titulares en momentos clave
    {"start": 2.6, "end": 5.0, "align": "left",
     "lines": [{"text": "GANAR", "size": "big"},
               {"text": "DINERO", "size": "big", "color": "green"}]},
    {"start": 5.2, "end": 8.0, "align": "left", "rule": "red",
     "lines": ["hoy hay que", "ENAMORARSE", "del proceso"],
     "accent": {"word": "ENAMORARSE", "color": "red"}}
  ],
  "cards": [                            // tarjetas a pantalla completa
    {"start": 11.2, "end": 13.4, "type": "name",  "name": "SERGIO"},
    {"start": 13.4, "end": 16.0, "type": "brand",
     "lines": ["mentor", "de VIDA", "& NEGOCIOS"]}
  ]
}
```

Si el usuario aporta una transcripción con tiempos (p. ej. de Whisper), mapéala
a `subtitles` y elige 3-6 frases fuerza como `headlines` con su palabra clave.

### 2. Generar los subtítulos ASS

```bash
python3 scripts/build_captions.py spec.json -o captions.ass
```

Genera un `.ass` con todos los estilos (subtítulo, titular, tarjeta), colores,
animaciones de aparición (`pop`), la línea de acento y el glow neón.

Para ver una demostración sin spec:
```bash
python3 scripts/build_captions.py --demo -o demo.ass
```

### 3. Renderizar (quemar en el vídeo)

```bash
bash scripts/render.sh -i entrada.mp4 -a captions.ass -o salida.mp4 \
     -r 1080x1920 -z 1.06
```

- `-r 1080x1920` reencuadra a vertical (recorte por cobertura, sin deformar).
- `-z 1.06` aplica un *punch-in* lento (empuje de cámara). `1.0` lo desactiva.
- El look tipográfico vive íntegro en el `.ass`; `render.sh` solo reencuadra,
  hace el zoom y quema.

## El sistema de estilo (resumen)

| Elemento | Uso | Color |
|---|---|---|
| Titular blanco | texto por defecto | blanco |
| Palabra clave **verde** | dinero, ganar, riqueza | `green` `#22DD44` |
| Palabra clave **roja** | emoción, dolor, énfasis | `red` `#E01414` |
| Marca **VIDA** | acento identidad | `teal` `#1FC7A6` |
| Marca **Negocios** | acento identidad | `magenta` `#E23A8C` |
| Fondo tarjeta | tarjetas de marca | `navy` `#0B1B3A` |

**Jerarquía de cabecera** (como en el modelo): línea de entrada pequeña en
minúscula (`hoy hay que`) + **PALABRA GRANDE** en mayúscula, opcionalmente una
tercera línea. Posición en el tercio izquierdo o derecho, a media altura.

**Colores en el spec**: usa los nombres (`green`, `red`, `teal`, `magenta`,
`white`) o un hex `RRGGBB` directo. Ver la paleta en `scripts/build_captions.py`
(`PALETTE`) y en `references/STYLE.md`.

## Técnicas visuales avanzadas (manuales, con ffmpeg)

`STYLE.md` incluye recetas ffmpeg para: split-screen de doble ángulo (con línea
divisoria), B-roll/cutaways sincronizados, y overlays. El skill cubre de serie
subtítulos + cabeceras + tarjetas + reencuadre + punch-in.

## Notas de fidelidad

- La tipografía objetivo es una grotesca pesada condensada (tipo **Anton**) para
  titulares y semibold (tipo **Montserrat/Poppins**) para subtítulos. Sin esas
  fuentes se usa DejaVu Sans Bold, que aproxima el peso pero no la condensación.
  Añádelas en `assets/fonts/` para clavar el modelo.
- Todos los tamaños son relativos a la altura del frame, así que el mismo spec
  sirve para 1080×1920, 720×1280 o 1920×1080 sin tocar nada.
