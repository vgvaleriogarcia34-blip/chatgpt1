# Web Valerio García Mentor + Blog automático desde Google Drive

Esta app de **Replit** sirve tu web actual y añade un **blog en `/blog`** que se
publica **solo**, leyendo los artículos que creas en la carpeta de Google Drive
**“Articulos blog generados”** (proyecto *Círculo de Claridad*).

> **El flujo en una frase:** creas un Google Doc en esa carpeta de Drive → la app
> lo detecta automáticamente → aparece publicado en
> `valeriogarciamentor.com/blog`. No tocas código ni subes nada a mano.

---

## 1. Cómo funciona

```
┌────────────────────────┐      cada 15 min       ┌────────────────────────┐
│  Google Drive          │  ───────────────────▶  │  App en Replit         │
│  📁 Articulos blog     │   lee los Google Docs  │  (este repositorio)    │
│     generados          │                        │                        │
│   • Artículo 1 (Doc)   │                        │  /            → web     │
│   • Artículo 2 (Doc)   │                        │  /blog        → índice  │
│   • …                  │                        │  /blog/:slug  → artículo│
└────────────────────────┘                        └────────────────────────┘
```

- Cada **15 minutos** (configurable) la app revisa la carpeta de Drive.
- Cada **Google Doc nuevo** se convierte en un artículo y se publica automáticamente.
- Si editas un Doc, el artículo se **actualiza** en la siguiente sincronización.
- Si borras un Doc (o lo mueves a la papelera), **desaparece** del blog.

### Formato de los Google Docs

Los artículos que generan tus agentes ya siguen este formato y funciona sin tocar nada:

- **Primera línea con texto** → es el **título** del artículo.
  *(Si empieza por una fecha tipo `2026-06-26 - …`, se quita para el título.)*
- **Líneas que empiezan por `#`** → se convierten en **subtítulos** de sección.
- **El resto** → párrafos normales.
- Las **URLs** se convierten en enlaces automáticamente.

---

## 2. Puesta en marcha en Replit (una sola vez)

### Paso A · Importar el proyecto a Replit
1. En Replit: **Create Repl → Import from GitHub**.
2. Pega la URL de este repositorio y créalo.
3. Replit detecta Node.js (gracias a `.replit` y `package.json`).

### Paso B · Crear la cuenta de servicio de Google (acceso a Drive)
Esto le da permiso a la app para **leer** tu carpeta de Drive.

1. Entra en <https://console.cloud.google.com/> y crea (o elige) un proyecto.
2. Activa la **Google Drive API**: *APIs y servicios → Biblioteca → “Google Drive API” → Habilitar*.
3. Crea la cuenta de servicio: *IAM y administración → Cuentas de servicio → Crear cuenta de servicio*.
   - Nombre: por ejemplo `blog-bot`. Crea y continúa (no hacen falta roles).
4. Genera la clave: dentro de la cuenta de servicio → pestaña **Claves → Agregar clave → Crear clave nueva → JSON**.
   Se descargará un archivo `.json`. **Guárdalo, lo usarás en el paso D.**
5. Copia el **email** de la cuenta de servicio (algo como
   `blog-bot@tu-proyecto.iam.gserviceaccount.com`).

### Paso C · Compartir la carpeta de Drive con la cuenta de servicio
1. En Google Drive, abre la carpeta **“Articulos blog generados”**.
2. Botón **Compartir** → pega el **email de la cuenta de servicio** del paso anterior.
3. Permiso **Lector** (Viewer) es suficiente. Comparte.

> Sin este paso la app no podrá leer los documentos aunque las credenciales sean correctas.

### Paso D · Configurar los Secrets en Replit
En Replit, panel **Secrets** (🔒 *Tools → Secrets*), añade:

| Clave | Valor |
|-------|-------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | **Todo el contenido** del archivo `.json` del paso B (cópialo entero). |
| `DRIVE_FOLDER_ID` | `1f-po96lSMY3uaNYYEd-d8eP8gWyqxWyk` *(ya es la carpeta actual; cámbialo solo si usas otra)*. |
| `SYNC_INTERVAL_MINUTES` | `15` *(opcional; cada cuántos minutos revisa Drive)*. |
| `SYNC_TOKEN` | *(opcional)* una palabra secreta para forzar publicaciones manuales. |

> El `DRIVE_FOLDER_ID` es la parte final de la URL de la carpeta en Drive:
> `https://drive.google.com/drive/folders/`**`1f-po96lSMY3uaNYYEd-d8eP8gWyqxWyk`**

### Paso E · Arrancar
1. Pulsa **Run**. En la consola verás `Servidor en http://localhost:3000` y, si todo está bien,
   `[blog] Sync OK: N artículos`.
2. Abre la web de Replit y entra en `/blog`. Deberías ver los artículos.

### Paso F · Publicar de forma permanente (dominio)
1. Pulsa **Deploy** en Replit (Autoscale o Reserved VM).
2. En **Deployments → Settings → Custom domain**, conecta tu dominio para que
   responda en `valeriogarciamentor.com` y, por tanto, en `valeriogarciamentor.com/blog`.

---

## 3. El día a día (lo que harás siempre)

1. Tu agente/tú creáis un **Google Doc** en la carpeta **“Articulos blog generados”**.
2. Esperas (máximo el intervalo configurado, 15 min por defecto).
3. El artículo aparece en `valeriogarciamentor.com/blog`. **Nada más.**

¿Quieres que aparezca **ya**, sin esperar? Fuerza una sincronización:

```
POST  https://TU-WEB/blog/sync?token=TU_SYNC_TOKEN
```

(Si no configuraste `SYNC_TOKEN`, basta con `POST /blog/sync`.)

Para ver el estado: `GET https://TU-WEB/blog/status`.

---

## 4. Rutas de la app

| Ruta | Qué hace |
|------|----------|
| `/` | Tu sitio actual (quiz IA50). |
| `/blog` | Índice de artículos. |
| `/blog/:slug` | Un artículo. |
| `/blog/status` | Estado de la sincronización (diagnóstico, JSON). |
| `POST /blog/sync` | Fuerza una sincronización manual (opcionalmente con `?token=`). |

---

## 5. Probarlo en local (opcional, para desarrolladores)

```bash
npm install
cp .env.example .env      # rellena GOOGLE_SERVICE_ACCOUNT_JSON
node scripts/sync-once.js # prueba la conexión con Drive
npm start                 # http://localhost:3000/blog
```

---

## 6. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| `Falta GOOGLE_SERVICE_ACCOUNT_JSON` | No has puesto el Secret. | Añádelo en Replit (Paso D). |
| `Sync OK: 0 artículos` | La carpeta no está compartida con la cuenta de servicio. | Repite el Paso C. |
| Un artículo no aparece | Aún no ha pasado el intervalo, o el Doc está en la papelera. | Espera o usa `POST /blog/sync`. |
| El título sale raro | La primera línea del Doc no es el título. | Asegúrate de que el título es la primera línea con texto. |

La configuración de archivos está en `.replit`, `package.json` y `lib/` (código del blog).
