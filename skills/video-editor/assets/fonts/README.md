# Fuentes

El skill funciona sin fuentes extra: usa las del sistema (DejaVu Sans Bold /
Liberation Sans) como *fallback*. Pero para clavar la tipografía del vídeo
modelo, coloca aquí los `.ttf`/`.otf` de estas familias:

| Rol | Familia objetivo | Alternativas |
|---|---|---|
| Titulares (display) | **Anton** | Bebas Neue, Montserrat Black, Poppins Black, Archivo Black |
| Sub-líneas (heavy) | **Montserrat** | Poppins, Archivo, Inter |
| Subtítulos (body) | **Montserrat** | Poppins, Inter, Roboto |
| Cursiva script | Dancing Script | Pacifico |

`scripts/fonts.py` detecta automáticamente cualquiera de estas que esté instalada
en el sistema **o** presente en esta carpeta, y elige la más fiel disponible.
`render.sh` pasa esta carpeta a libass con `fontsdir`, así que basta con soltar
los ficheros aquí.

## Cómo obtenerlas

Son gratuitas (SIL Open Font License) en Google Fonts:

- Anton: https://fonts.google.com/specimen/Anton
- Montserrat: https://fonts.google.com/specimen/Montserrat
- Poppins: https://fonts.google.com/specimen/Poppins
- Bebas Neue: https://fonts.google.com/specimen/Bebas+Neue

Descarga el zip, extrae los `.ttf` y déjalos en esta carpeta. Verifica con:

```bash
python3 scripts/fonts.py
```

Debe mostrar `display -> Anton` (o la que corresponda) en lugar del fallback.

> Nota: en este entorno el proxy bloquea las descargas a CDNs externos, por eso
> las fuentes no vienen empaquetadas. Añádelas en tu máquina local.
