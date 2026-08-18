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
8. ¿No te ha gustado la toma? **Borrar esta grabación** y a repetirla; no hace falta cerrar nada.

## Lo que incluye

- Grabación de pantalla, ventana o pestaña con audio del sistema (si el navegador lo permite).
- Narración con micrófono, con selector de dispositivo, medidor de nivel y mezcla de volúmenes.
- Cámara opcional en recuadro (4 esquinas, tamaño, redonda o rectangular, espejo) o a pantalla completa.
- Zonas privadas ilimitadas con tres modos de tapado y control de intensidad.
- Sin efecto espejo: se detecta solo, la vista previa pasa a imagen fija y se apaga al grabar; la grabación no se congela aunque minimices el navegador.
- Pausa y reanudación, cuenta atrás, controles flotantes mientras grabas y atajos de teclado.
- Borrar la grabación, descartarla a mitad o reiniciar la aplicación entera sin recargar la página.
- Captura PNG de la pantalla **ya censurada**.
- Ajustes y zonas guardados en el navegador para la siguiente sesión.
- Salida en MP4 (H.264) cuando el navegador lo soporta; si no, WebM.

## Atajos

| Atajo | Acción |
|---|---|
| `Ctrl` + `Shift` + `R` | Empezar / detener la grabación |
| `Ctrl` + `Shift` + `P` | Pausar / reanudar |
| `Ctrl` + `Shift` + `V` | Mostrar u ocultar la vista previa mientras grabas |
| `Supr` | Borrar la zona privada seleccionada |

## Borrar y volver a empezar

No hace falta cerrar y abrir la aplicación para repetir una toma:

- **Borrar esta grabación** (en la ventana del resultado): borra el vídeo y deja todo
  listo para grabar otra vez, con la misma pantalla y las mismas zonas.
- **Grabar otra vez**: cierra el resultado sin borrar nada. El vídeo sigue disponible
  en **Ver la última grabación**, por si aún quieres descargarlo.
- **Descartar lo grabado y empezar de nuevo** (botón del panel, o la ✕ del control
  flotante): tira lo grabado a mitad de la toma, sin llegar a generar el vídeo.
- **Empezar de cero**: deja la aplicación como recién abierta — se deja de compartir la
  pantalla, se apaga la cámara, se borran las zonas privadas y la última grabación.
- Si empiezas una grabación nueva teniendo otra sin descargar, la aplicación avisa antes
  de sustituirla.

Todas las acciones que borran algo piden confirmación.

## El efecto espejo (bucle infinito)

Si lo que compartes contiene esta misma ventana —la pantalla completa, o la propia
ventana del navegador— la vista previa muestra la pantalla… en la que está la vista
previa, que muestra la pantalla, y así hasta el infinito.

La aplicación lo resuelve sin que tengas que hacer nada:

1. **Lo detecta sola.** Al elegir la fuente pinta durante medio segundo un color
   testigo sobre la vista previa y comprueba si ese color aparece en la imagen
   capturada. Si aparece, es que te estás capturando a ti mismo.
2. **Cambia a imagen fija.** En lugar del directo verás una **foto** de tu pantalla,
   tomada con la vista previa apagada, así que sale limpia y sin bucle. Colocas las
   zonas privadas sobre esa foto con normalidad: **el vídeo se sigue grabando en
   directo**, la foto es solo la referencia para dibujar.
   - *Actualizar imagen* vuelve a hacer la foto cuando cambie lo que hay en pantalla.
   - *Ver en directo* fuerza el directo si prefieres asumir el bucle.
   - El botón **Vista en directo / Imagen fija** de la barra superior alterna a mano.
   - *Volver a comprobar el efecto espejo* repite la detección cuando cambies de fuente.
3. **Apaga la vista previa al grabar** (casilla activada por defecto): mientras dura la
   grabación se muestra un panel con el cronómetro en vez de la imagen, así que no hay
   nada que reflejar. Se puede volver a mostrar con el botón del ojo del control flotante
   o con `Ctrl` + `Shift` + `V`.
4. **Esta pestaña no aparece en la lista de fuentes**, para que no puedas elegirla por
   error (sería un espejo puro).
5. **Puedes minimizar el navegador**: la composición del vídeo se alimenta de un
   temporizador en un *Web Worker*, así que la grabación no se congela aunque la ventana
   quede oculta o tapada por otra aplicación.

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
