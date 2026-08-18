# Grabador de Pantalla con voz, cámara y zonas privadas

Aplicación web para grabar la pantalla del ordenador con tu voz, con la cámara
opcional y con la posibilidad de **tapar zonas concretas de la pantalla** (nombres
de archivo, rutas, correos, cifras, cualquier dato sensible) para que no aparezcan
en el vídeo.

Todo el procesado ocurre en tu navegador: el vídeo **no sale de tu ordenador** y no
se sube a ningún servidor.

## Cómo se usa

1. Abre `index.html` en un navegador de escritorio (Chrome, Edge, Brave, Opera o Firefox).
   - Doble clic sobre el archivo suele bastar. Si tu navegador bloquea la captura,
     sírvelo en local: `npx http-server .` y abre `http://localhost:8080`.
2. **1 · Pantalla** → *Seleccionar pantalla / ventana*. Elige pantalla completa, una
   ventana concreta o una pestaña. Marca “Compartir audio” en el diálogo del navegador
   si quieres que se grabe también el sonido del ordenador.
3. **2 · Tu voz** → interruptor encendido y elige micrófono. El medidor confirma que
   te está oyendo. Puedes ajustar el volumen de tu voz y el del sistema por separado.
4. **3 · Cámara** → enciéndela o apágala cuando quieras, **incluso durante la grabación**.
   Puedes elegir esquina, tamaño, forma redonda y efecto espejo, o pasar a “Solo cámara”.
5. **4 · Zonas privadas** → pulsa *Dibujar zona privada* y arrastra sobre la vista previa
   el rectángulo que quieres esconder. Cada zona puede taparse en **negro**, con
   **desenfoque** o con **pixelado**, y puede moverse, redimensionarse, renombrarse,
   desactivarse temporalmente o borrarse. Las zonas también se pueden añadir y mover
   mientras grabas.
6. **5 · Calidad** → resolución, fotogramas por segundo, calidad del vídeo y cuenta atrás.
7. Pulsa **Empezar a grabar**. Al detener aparece el vídeo listo para revisar y descargar.

## Lo que incluye

- Grabación de pantalla, ventana o pestaña con audio del sistema (si el navegador lo permite).
- Narración con micrófono, con selector de dispositivo, medidor de nivel y mezcla de volúmenes.
- Cámara opcional en recuadro (4 esquinas, tamaño, redonda o rectangular, espejo) o a pantalla completa.
- Zonas privadas ilimitadas con tres modos de tapado y control de intensidad.
- Pausa y reanudación, cuenta atrás, controles flotantes mientras grabas y atajos de teclado.
- Captura PNG de la pantalla **ya censurada**.
- Ajustes y zonas guardados en el navegador para la siguiente sesión.
- Salida en MP4 (H.264) cuando el navegador lo soporta; si no, WebM.

## Atajos

| Atajo | Acción |
|---|---|
| `Ctrl` + `Shift` + `R` | Empezar / detener la grabación |
| `Ctrl` + `Shift` + `P` | Pausar / reanudar |
| `Supr` | Borrar la zona privada seleccionada |

## Importante sobre las zonas privadas

El tapado se aplica al **componer cada fotograma**, así que lo que se graba y lo que se
descarga ya va censurado: no es una capa que se pueda quitar después.

Las zonas son rectángulos fijos respecto a la vista previa. Si mueves una ventana por
debajo de una zona, el dato podría quedar fuera del rectángulo: comprueba la vista previa
antes de empezar y, ante la duda, usa una zona un poco más grande.

## Archivos

- `index.html` — interfaz.
- `styles.css` — estilos.
- `app.js` — captura, composición en `<canvas>`, tapado de zonas, mezcla de audio y grabación.
