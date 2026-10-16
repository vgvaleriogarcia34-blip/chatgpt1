# Formato de los JSON

## capturas.json (lo que se fotografía)

```json
{
  "app": "http://localhost:8765",
  "planVista": "consultora",
  "densidad": 2,
  "ocultar": [".algun-selector"],
  "css": "/* CSS extra para todas */",
  "capturas": [
    {
      "id": "est-cobros",
      "url": "estrategia.html#cobros",
      "esperar": 4500,
      "acciones": [ { "scrollTexto": "Caja atrapada", "altura": 0.25 } ],
      "marcas": {
        "kpis": { "texto": "Caja atrapada", "subir": 3 },
        "lectura": ".selector-css"
      }
    }
  ]
}
```

- **`planVista`:** el plan con el que se enseña la empresa modelo. «consultora» abre todos los mundos.
- **`densidad`:** 2 para capturas de 3840×2160, nítidas al acercar.
- **`acciones`** (en orden):

  | Acción | Qué hace |
  |---|---|
  | `{"click": "selector"}` | Pulsa ese elemento |
  | `{"eval": "código JS"}` | Ejecuta ese código en la página |
  | `{"scroll": "selector"}` | Desplaza hasta ese elemento |
  | `{"scrollY": 520}` | Desplaza a esa altura |
  | `{"scrollTexto": "texto", "altura": 0.2}` | Desplaza hasta el texto y lo deja a esa altura de la pantalla |

  Cada acción admite `"esperar"` (ms).
- **`clip`** (opcional): además de la foto, graba la pantalla **en movimiento** (planetas que giran, abanicos que se elevan al pasar el ratón):
  ```json
  "clip": { "segundos": 6, "fps": 30, "lento": 0.02,
            "antes": [ { "click": "#rutaBtn" } ],
            "guion": [ { "t": 0.4, "raton": { "de": [380, 840], "a": [1560, 700], "dur": 5.2 } },
                       { "t": 3.6, "click": ".pt-world[data-w=sim]" } ] }
  ```
  - **Cómo se graba:** a cámara lenta. El reloj de la página y las animaciones CSS corren a `lento` × la velocidad real y cada fotograma se fecha con ese reloj, así que el clip sale fluido a 30 fps aunque el 3D por software vaya lento. Se graba a 1920×1080 (densidad 1) en `<id>/f0000.jpg…`.
  - **`lento`:** 0,05 para el puesto de mando 3D; 0,02 para los mapas en abanico (cada fotograma cuesta 1–2 s). Si el script avisa de pocas muestras, bájelo.
  - **`antes`:** acciones antes de grabar (por defecto, las `acciones` de la captura).
  - **`guion`:** en el segundo `t` del clip: `click`, `hover` (selector), `eval` o `raton` (recorrido del ratón de `de` a `a` en `dur` segundos, que pasa por encima de lo que encuentra).
  - **Clics que abren otra pantalla:** la página se queda (la navegación se corta), así se puede grabar el vuelo de la cámara hacia un planeta.
  - **Tiempo:** unos 3 minutos por clip de 6 s en este entorno.
- **`marcas`:** un selector CSS o `{ "texto": "…", "subir": n }`.
  - Se busca el elemento visible más pequeño que contiene ese texto (sin distinguir mayúsculas) y se sube n niveles para coger la tarjeta entera.
  - Se guardan en `capturas.manifest.json` como `[x, y, ancho, alto]` en px de una pantalla de 1920×1080.
  - Para comprobarlas: `revisar_marcas.py`.

## promo.json (el montaje)

```json
{
  "titulo": "…",
  "fps": 30,
  "acento": "#c9f24d",
  "marca": "Atalaya *360°*",
  "subtitulos": true,
  "velocidad_voz": 1.06,
  "musica": null,
  "volumen_musica": 0.22,
  "entrada": 0.4,
  "salida": 0.6,
  "bloques": [
    {
      "voz": "Texto tal como se dice (números en palabras).",
      "sub": "Texto de los subtítulos (con cifras). Opcional: si falta, se usa voz.",
      "pausa": 0.55,
      "retardo": 0.15,
      "duracion": 3,
      "planos": [ ]
    }
  ]
}
```

- **Duración de un bloque:** su voz más `retardo` más `pausa`. Si no tiene voz, vale `duracion`.
- **Reparto entre planos:** cada plano recibe una parte proporcional a su `peso` (1 por defecto).
- **`marca`:** el sello de la esquina superior derecha. Aparece solo sobre las capturas.

### Tipos de plano

**Captura**
```json
{ "tipo": "captura", "img": "est-cobros",
  "de": [420, 200, 1150, 450],
  "a": { "marca": "kpis", "margen": 30 },
  "resalta": "cajaAtrapada", "resaltaDesde": 0.35,
  "etiqueta": "Sistema estratégico · Cobros",
  "rotulo": "Lo sabe *hoy*",
  "transicion": "corte", "peso": 1 }
```
- **`de` / `a` (encuadre al empezar y al acabar):**
  - Valen tres formas: `[x, y, ancho, alto]` en px de 1920×1080, el nombre de una marca, o `{ "marca", "margen" }`.
  - El margen por defecto es 120 px en `de` y 60 px en `a`.
  - El encuadre se ajusta a 16:9 y a los bordes de la captura.
  - Sin `de` se ve la captura entera; sin `a`, el plano hace un acercamiento lento del 7 %.
- **`resalta`:** foco con el resto oscurecido. Admite las mismas formas, con 6 px de margen por defecto. `resaltaDesde` es la fracción del plano en la que aparece.
- **`etiqueta`:** el nombre del mundo, arriba a la izquierda.
- **`rotulo`:** texto grande abajo; las `*palabras*` van en el color de acento.
- **`transicion`:** `"corte"` (por defecto) o `"fundido"` con el plano anterior.

**Clip** (pantalla en movimiento)
```json
{ "tipo": "clip", "img": "abanico-est", "desde": 0.4, "velocidad": 1,
  "de": [0, 120, 1920, 960], "a": [120, 280, 1680, 800],
  "etiqueta": "Sistema estratégico · 21 módulos", "rotulo": "Capa a *capa*" }
```
- Igual que una captura (encuadre, foco, etiqueta, rótulo), pero la imagen se mueve. Necesita `clip` en su captura.
- **`desde`:** segundo del clip por el que empieza; **`velocidad`:** 1 natural.
- **Zoom:** el clip está a 1920×1080, así que no acerque más de 1,5 veces.

**Titular sobre imagen** (en una captura o un clip)
```json
"titular": { "kick": "Atalaya 360°", "texto": "Vea el futuro\nde su empresa\n*antes de decidir*", "sub": "…", "cta": "Pruébelo 14 días", "desde": 0.3 }
```
Texto grande centrado sobre la imagen oscurecida. Sirve para abrir y cerrar sobre los planetas. Con titular no se ponen subtítulos ni sello.

**Título**
```json
{ "tipo": "titulo", "kick": "Atalaya 360°", "texto": "Vea el futuro\nde su empresa\n*antes de decidir*", "sub": "opcional" }
```

**Cifra (antes → después)**
```json
{ "tipo": "cifra", "kick": "Liquidez mínima · caso de ejemplo", "de": "−285.000 €", "a": "71.000 €", "pie": "Misma inversión. *Otra decisión.*", "cambio": 0.35 }
```
`cambio` es la fracción del plano en la que aparece el valor de después.

**Cierre**
```json
{ "tipo": "cierre", "texto": "Atalaya *360°*", "sub": "Anticípese. Decida con números.", "cta": "Pruébelo 14 días" }
```

## Lo que deja el render en la carpeta de trabajo

| Archivo | Contenido |
|---|---|
| `voz.json` | Duración de cada bloque (lo escribe `voz.py`) |
| `imagen.mp4` | Vídeo sin sonido |
| `linea-de-tiempo.json` | Inicio y fin de cada plano: sirve para sacar un fotograma por plano y revisar |
