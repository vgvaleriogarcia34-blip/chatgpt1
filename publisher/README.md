# Social Publisher

App Node.js + frontend ligero que:

1. **Genera imagenes** con plantillas SVG (cuadradas para Instagram, 1200x627 para LinkedIn).
2. **Escribe captions y articulos** con la API de Claude (Anthropic).
3. **Publica realmente** en tu cuenta de Instagram Business (via Meta Graph API) y en LinkedIn (via API oficial).

---

## Requisitos

- Node.js 20 o superior.
- Cuenta de Instagram **Business** o **Creator** vinculada a una **Pagina de Facebook**. Una cuenta personal *no* sirve: la Graph API solo publica en cuentas Business.
- App registrada en [Meta for Developers](https://developers.facebook.com/) con los productos *Facebook Login* y *Instagram Graph API*, y permisos: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `business_management`.
- App registrada en [LinkedIn Developers](https://www.linkedin.com/developers/) con los productos *Sign In with LinkedIn using OpenID Connect* y *Share on LinkedIn*. Scope `w_member_social` activo.
- API key de Anthropic ([console.anthropic.com](https://console.anthropic.com/)).
- Una URL publica donde tu servidor sea accesible desde internet (Meta descarga la imagen desde esa URL para publicarla en Instagram). En desarrollo local puedes usar [ngrok](https://ngrok.com/), [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) o similar y poner esa URL en `PUBLIC_BASE_URL`.

---

## Instalacion

```bash
cd publisher
cp .env.example .env
# rellena ANTHROPIC_API_KEY, META_APP_ID, META_APP_SECRET, LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
npm install
npm start
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Conectar tus cuentas (OAuth)

En la barra superior de la app:

- **Conectar IG** -> arranca el flujo OAuth de Meta. Al terminar, te muestra los dos valores que debes copiar a tu `.env`:
  - `META_LONG_LIVED_TOKEN` (token de larga duracion, ~60 dias, renovable)
  - `IG_BUSINESS_ACCOUNT_ID` (id de tu cuenta de IG Business)
- **Conectar LinkedIn** -> arranca OAuth de LinkedIn y devuelve:
  - `LINKEDIN_ACCESS_TOKEN`
  - `LINKEDIN_MEMBER_URN`

Tras copiar los valores al `.env`, reinicia el servidor (`Ctrl+C` y `npm start`).

**Redirect URIs que debes registrar en cada app:**

- Meta -> `http(s)://TU-DOMINIO/auth/instagram/callback`
- LinkedIn -> `http(s)://TU-DOMINIO/auth/linkedin/callback`

---

## Como funciona

### Generar imagen

`POST /api/generate/image`

```json
{ "template": "ig-quote", "params": { "title": "...", "subtitle": "...", "author": "..." } }
```

Respuesta: `{ "url": "/images/ig-quote-xxxx.png", "id": "ig-quote-xxxx.png" }`.

Las plantillas se definen en `src/templates/index.js`. Anade las tuyas siguiendo el mismo patron y registra los campos del formulario en `public/js/app.js` (`TEMPLATE_FIELDS`).

### Generar texto con Claude

- `POST /api/generate/caption` -> caption de Instagram.
- `POST /api/generate/article` -> articulo de LinkedIn.
- `POST /api/generate/brief` -> rellena automaticamente los campos de la plantilla.

### Publicar

- `POST /api/publish/instagram` con `{ imageId, caption }`.  Meta descarga la imagen de `PUBLIC_BASE_URL/images/<imageId>` y la publica.
- `POST /api/publish/linkedin` con `{ text, imageId? }`. Si pasas `imageId`, se sube como imagen del post.

---

## Limitaciones importantes

- **Instagram no admite imagenes subidas como binario**: solo URL publica. Por eso `PUBLIC_BASE_URL` tiene que apuntar a un host accesible desde internet.
- El token de Meta dura 60 dias; despues hay que volver a hacer OAuth (puedes automatizar la renovacion en background).
- LinkedIn limita los posts por usuario y dia, y rechaza contenido considerado spam. Revisa la respuesta de la API si te devuelve error 422.
- Esta app publica **una sola imagen** por post (no carruseles ni video). Anadir carrusel implica orquestar varios contenedores en IG y `MULTI_IMAGE` en LinkedIn.

---

## Estructura

```
publisher/
  server.js               # Express bootstrap
  src/
    routes/               # /auth, /api/generate, /api/publish
    services/             # claude.js, instagram.js, linkedin.js, imageRenderer.js
    templates/index.js    # Plantillas SVG (IG y LinkedIn)
  public/
    index.html            # UI con dos pestanas
    css/app.css
    js/app.js
    images/               # PNG generados (gitignored)
```
