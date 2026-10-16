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
