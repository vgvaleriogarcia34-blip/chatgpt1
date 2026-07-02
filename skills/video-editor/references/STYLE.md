# Guía de estilo — Reel "mentor de VIDA & Negocios" (Sergio Sáiz)

Esta guía documenta el lenguaje visual extraído fotograma a fotograma del vídeo
modelo aportado por el usuario (screen-recording de un reel de Sergio Sáiz,
"Lo Que Los Ricos Saben Sobre La Frecuencia Del Dinero"). Es la referencia
canónica para el skill `video-editor`.

## 1. Formato y look general

- **Cámara hablando** (un sujeto a cámara), plano medio, mirada a cámara.
- **Iluminación cinematográfica**: fondo muy oscuro, una luz principal, luz de
  recorte cálida en la piel. Alto contraste, atmósfera sobria.
- **Reel vertical** (9:16) o master 16:9 reencuadrado. Ritmo rápido.
- Dos capas de texto SIEMPRE presentes: **subtítulo corrido** (abajo) y, en los
  momentos fuerza, **titular/cabecera grande**.

## 2. Sistema de color (semántica)

| Nombre | Hex | Significado / uso |
|---|---|---|
| Blanco | `#FFFFFF` | Texto por defecto (titulares y subtítulos) |
| Verde | `#22DD44` | **Dinero**: GANAR, DINERO, riqueza |
| Rojo | `#E01414` | **Emoción/énfasis**: AMOR, CÁNCER, QUITAR + línea de acento |
| Teal | `#1FC7A6` | Acento de marca — **VIDA** |
| Magenta | `#E23A8C` | Acento de marca — **Negocios** + glow neón del nombre |
| Navy | `#0B1B3A` | Fondo de las tarjetas de marca |

Regla: **una sola** palabra clave coloreada por cabecera. El resto en blanco.

## 3. Cabeceras / titulares (lo más importante)

Estructura observada en el modelo:

```
linea de entrada   ->  minúscula, tamaño pequeño   ("hoy hay que", "si tú entregas")
PALABRA GRANDE      ->  MAYÚSCULA, tamaño grande     ("ENAMORARSE", "AMOR", "CÁNCER")
línea de cierre     ->  minúscula, tamaño medio      ("del proceso")   [opcional]
```

- **Peso**: grotesca pesada/black. Tracking ajustado. Objetivo: *Anton* /
  *Montserrat Black* / *Poppins Black*.
- **Posición**: tercio izquierdo (más común) o derecho, a media altura vertical.
  Nunca centrado sobre la cara del sujeto.
- **Palabra clave**: en MAYÚSCULA y, cuando aplica, en color (verde/rojo).
- **Línea de acento roja**: una barra horizontal roja fina cruza por detrás del
  titular a la altura de la palabra grande. Entra con un *wipe* de izquierda a
  derecha. (`rule: "red"` en el spec).
- **Animación de entrada**: *pop* (escala 70%→100%) + fundido rápido.

Ejemplos reales del vídeo (texto → tratamiento):

| Cabecera | Tratamiento |
|---|---|
| ¡GANAR **DINERO** | "GANAR" blanco + "DINERO" verde |
| hoy hay que **ENAMORARSE** del proceso | 3 líneas, "ENAMORARSE" rojo + línea de acento roja |
| si tú entregas **AMOR** | derecha, "AMOR" rojo |
| **EL DINERO** viene a ti | "EL DINERO" rojo mayúscula + cierre script |
| lo único **que hacen** | derecha, jerarquía de dos tamaños |
| eres **EL RESPONSABLE** de lo que está | énfasis blanco a mayúscula |
| qué implicaba **tu CÁNCER?** | "CÁNCER" mayúscula, número "5" de marca de agua detrás |
| problemas con mi **MADRE** | "MADRE" grande blanco |

## 4. Subtítulos corridos

- Abajo, centrados (a veces alineados a la izquierda del bloque de cabecera).
- Blanco, semibold, con contorno/sombra sutil o caja translúcida oscura.
- **Aparición palabra a palabra** (acumulativa): la frase se va revelando al
  ritmo del habla; solo una versión visible cada instante (sin apilarse).
- Fuente objetivo: *Montserrat* / *Poppins* semibold.

## 5. Tarjetas (title cards)

### Tarjeta de nombre (tipo "SERGIO")
- Pantalla (o banda) navy. Nombre en MAYÚSCULA, grande, blanco con **glow neón**
  magenta (borde desenfocado de color bajo un relleno blanco). Entrada con pop.

### Tarjeta de marca ("mentor de VIDA & Negocios")
- Fondo navy. Bloque alineado a la izquierda, tres líneas:
  - `mentor` (minúscula, blanco, más pequeño)
  - `de VIDA` (grande; "VIDA" en **teal**)
  - `& NEGOCIOS` (grande; "NEGOCIOS" en **magenta**)
- Acentos de emblema/dinero opcionales; sujeto recortado a la derecha en el
  original (se puede componer con overlay, ver §7).

## 6. Movimiento

- **Punch-in** lento (empuje de cámara) durante los planos de habla (`-z 1.06`).
- **Pop** de entrada en cabeceras y tarjetas (escala + fade).
- **Wipe** de la línea de acento roja.
- **Glow** neón en el reveal del nombre.

## 7. Técnicas avanzadas con ffmpeg (manuales)

El skill cubre subtítulos + cabeceras + tarjetas + reencuadre + punch-in. Para
replicar del todo el modelo, estas recetas complementan el render:

**Split-screen de doble ángulo con línea divisoria** (dos recortes de la cara):
```bash
ffmpeg -i A.mp4 -i B.mp4 -filter_complex \
 "[0:v]crop=iw/2:ih:0:0[l];[1:v]crop=iw/2:ih:iw/2:0[r]; \
  [l][r]hstack[m];[m]drawbox=x=iw/2-2:y=0:w=4:h=ih:color=white@0.9:t=fill[v]" \
 -map "[v]" -map 0:a out.mp4
```

**B-roll / cutaway sincronizado** (insertar clip entre t1 y t2 del principal):
usa `-ss/-t` para cortar segmentos y `concat`, o superpón con `overlay` +
`enable='between(t,t1,t2)'`.

**Overlay de un PNG/gráfico (emblema, billetes) con enable temporal**:
```bash
ffmpeg -i base.mp4 -i emblema.png -filter_complex \
 "[0][1]overlay=60:H*0.2:enable='between(t,13,16)'" out.mp4
```

## 8. Checklist de fidelidad

- [ ] Fondo oscuro / alto contraste conservado.
- [ ] Subtítulo corrido palabra a palabra, sin apilarse.
- [ ] 3-6 cabeceras en los momentos fuerza, no más.
- [ ] Una palabra clave coloreada por cabecera (verde dinero / rojo emoción).
- [ ] Línea de acento roja en al menos una cabecera fuerza.
- [ ] Tarjeta de nombre con glow + tarjeta de marca teal/magenta.
- [ ] Punch-in sutil en planos largos de habla.
