# Puesta en marcha del asistente

Guía paso a paso para dejar el asistente funcionando: cuentas que hay que crear, qué configurar en cada una, cómo desplegar el servidor, qué variables rellenar y qué probar antes de abrirlo al público.

Orden recomendado: 1) cuentas y claves, 2) servidor con HTTPS, 3) variables de entorno, 4) conocimiento, 5) pruebas, 6) prospección (lo último, y solo tras revisar `CUMPLIMIENTO.md` con su abogado).

> Tarifas, nombres de menús y requisitos de los proveedores cambian a menudo. Donde pone «a confirmar», compruébelo en la documentación vigente del proveedor.

---

## 1. Cuentas y qué configurar en cada una

### 1.1 Anthropic (Claude)

1. Cree la cuenta de la empresa en `console.anthropic.com` y añada un método de pago.
2. En **API Keys**, cree una clave llamada «asistente-produccion». Cópiela en `ANTHROPIC_API_KEY`.
3. En **Limits**, ponga un límite de gasto mensual y un aviso por correo.
4. El modelo es `claude-opus-5-5` en todos los canales; no hace falta tocar nada más.

### 1.2 Twilio (llamadas)

1. Cree la cuenta en `twilio.com`, verifíquela y pase a cuenta de pago (la de prueba no llama a números no verificados).
2. **Paquete regulatorio para España** (Phone Numbers → Regulatory Compliance → Bundles): para comprar un número español Twilio pide los datos de la empresa (razón social, CIF, dirección en España) y documentación (por ejemplo, escrituras o certificado de la AEAT). La aprobación puede tardar varios días. Los requisitos exactos dependen del tipo de número (geográfico, móvil, 900): a confirmar en Twilio.
3. Compre un número **+34** (geográfico, por ejemplo +34 91 o el de su provincia) asociado al paquete aprobado.
   - Antes de usarlo para llamadas comerciales, confirme con su abogado y con Twilio los requisitos de numeración para llamadas comerciales en España (ver `CUMPLIMIENTO.md`, apartado 9).
4. En el número: **Voice Configuration → A call comes in → Webhook**, `https://SU-DOMINIO/voz/entrante`, método `HTTP POST`. El aviso de estado de las salientes lo pone el propio servidor en cada llamada (`/voz/estado`); no hace falta configurarlo.
5. **Voice → Settings → Geo Permissions**: deje activado solo España (y los países a los que vaya a transferir llamadas). Así evita fraude de llamadas a destinos caros.
6. Copie `Account SID` y `Auth Token` (Console → Account Info) en `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN`, y el número en `TWILIO_NUMERO` (formato `+349XXXXXXXX`).
7. Ponga un límite y avisos de gasto (Billing → Usage Triggers).

### 1.3 Deepgram (voz a texto)

1. Cree la cuenta en `console.deepgram.com`.
2. Cree un proyecto y una **API Key** con permiso de miembro (no de administrador). Cópiela en `DEEPGRAM_API_KEY`.
3. Modelo `nova-3`, idioma `es` (ya vienen por defecto).

### 1.4 ElevenLabs (texto a voz)

1. Cree la cuenta en `elevenlabs.io` con un plan que incluya uso por API y suficientes caracteres al mes (unos 400 caracteres por minuto de llamada).
2. Elija la voz:
   - **Voz de la biblioteca**: en Voices → Voice Library, filtre por idioma español y acento de España (peninsular). Pruebe varias con frases del asistente y añada la elegida a «My Voices».
   - **Voz clonada de Valerio**: solo con su consentimiento expreso y por escrito. Use «Professional Voice Cloning» con al menos 30 minutos de audio limpio. El asistente seguirá diciendo que es una inteligencia artificial.
3. Copie el **Voice ID** (en la ficha de la voz) en `ELEVENLABS_VOZ_ID` y la API Key (Profile → API Keys) en `ELEVENLABS_API_KEY`. Si la clave admite permisos, déjele solo «Text to Speech».
4. Modelo `eleven_flash_v2_5` (el de menor latencia).

### 1.5 Meta (WhatsApp Business, API Cloud)

1. **Cuenta comercial de Meta** (`business.facebook.com`) de la empresa, con la verificación del negocio hecha (Configuración → Centro de seguridad).
2. **App** en `developers.facebook.com` → Crear app → tipo «Empresa» → añada el producto **WhatsApp**.
3. **Número**: en WhatsApp → Configuración de la API, añada un número de teléfono que **no** esté en uso en la aplicación de WhatsApp (puede ser uno nuevo o el de Twilio si recibe SMS o llamadas de verificación). Registre el nombre visible («Familias Empresarias») y espere su aprobación.
4. Copie el **Identificador del número de teléfono** (Phone number ID) en `WHATSAPP_PHONE_NUMBER_ID`.
5. **Token permanente**: en la cuenta comercial, Usuarios → Usuarios del sistema → Añadir (rol administrador) → Asignar activos (la app y la cuenta de WhatsApp) → Generar token, con caducidad «Nunca» y permisos `whatsapp_business_messaging` y `whatsapp_business_management`. Cópielo en `WHATSAPP_TOKEN`.
6. **Clave secreta de la app** (Configuración de la app → Básica → Clave secreta): en `WHATSAPP_APP_SECRET`. Sirve para comprobar que los mensajes vienen de Meta.
7. **Webhook** (WhatsApp → Configuración): URL de devolución de llamada `https://SU-DOMINIO/whatsapp/webhook`; token de verificación: invente un texto largo y póngalo igual en `WHATSAPP_VERIFY_TOKEN`. Pulse «Verificar y guardar» (el servidor debe estar ya funcionando) y suscríbase al campo **messages**.
8. Añada un método de pago en la cuenta de WhatsApp (WhatsApp Manager → Configuración de pago).
9. **Plantillas** (WhatsApp Manager → Plantillas de mensajes). Fuera de la ventana de 24 horas solo se puede escribir con plantillas aprobadas. Propuestas (idioma: español; ajústelas a su gusto):

| Nombre | Categoría | Texto propuesto |
|---|---|---|
| `seguimiento_conversacion` (la que usa el asistente: `WHATSAPP_PLANTILLA_SEGUIMIENTO`) | Utilidad | «Hola. Le escribe el asistente de inteligencia artificial de Familias Empresarias sobre la conversación que tuvimos: {{1}} Si no desea recibir más mensajes, responda BAJA.» |
| `confirmacion_reunion` | Utilidad | «Su reunión con {{1}} queda confirmada para el {{2}}. Enlace o lugar: {{3}}. Si necesita cambiarla, responda a este mensaje.» |
| `recordatorio_reunion` | Utilidad | «Le recordamos su reunión con {{1}} mañana a las {{2}}. Si no puede asistir, responda a este mensaje y buscamos otro momento.» |
| `seguimiento_ponencia` | Marketing (solo a quien haya dado su consentimiento para WhatsApp) | «Hola, {{1}}. Soy el asistente de inteligencia artificial de Familias Empresarias. Gracias por asistir a «{{2}}». ¿Le enviamos el resumen y vemos cómo aplicarlo en su empresa? Si no desea más mensajes, responda BAJA.» (añada el botón de respuesta rápida «Dejar de recibir») |

   Meta decide la categoría al revisarla; si una plantilla de «Utilidad» tiene tono comercial, la pasará a «Marketing» (con otro precio).

### 1.6 HubSpot (CRM)

1. En HubSpot: Configuración (rueda) → Integraciones → **Aplicaciones privadas** → Crear aplicación privada «Asistente FE». (En las cuentas nuevas puede aparecer como «Legacy apps» o dentro de «Development»: a confirmar según su versión.)
2. Permisos (pestaña Ámbitos o Scopes):

| Permiso | Para qué |
|---|---|
| `crm.objects.contacts.read` y `crm.objects.contacts.write` | Buscar, crear y actualizar contactos; llamadas, notas, tareas y reuniones asociadas |
| `crm.objects.companies.read` y `crm.objects.companies.write` | Empresa del contacto |
| `crm.objects.deals.read` y `crm.objects.deals.write` | Negocio cuando hay reunión u oportunidad |
| `crm.schemas.contacts.read` y `crm.schemas.contacts.write` | Crear y leer las propiedades propias (`preparar-hubspot.js`) |
| `crm.lists.read` | Importar una lista de HubSpot a una campaña |
| `crm.objects.owners.read` | Asignar propietario |
| Llamadas, notas, tareas, reuniones y comunicaciones (WhatsApp) | En la API v3 suelen bastar los permisos de contactos; si HubSpot muestra permisos específicos de «engagements», «calls», «meetings» o «communications», márquelos también (a confirmar en su cuenta) |

3. Copie el **token** (`pat-eu1-…`) en `HUBSPOT_TOKEN`.
4. Su ID de propietario (Configuración → Usuarios y equipos → su usuario, o con la API de owners) en `HUBSPOT_OWNER_ID`.
5. Pipeline y etapa de negocio: por defecto `default` y `appointmentscheduled`; cámbielos si usa otros (`HUBSPOT_PIPELINE`, `HUBSPOT_ETAPA`).
6. Cree las propiedades propias una sola vez:

```bash
node src/crm/preparar-hubspot.js
```

   Crea el grupo «Familias Empresarias» con: base legal del contacto (`fe_base_legal`), preocupación principal, origen, último resultado del asistente y baja de comunicaciones comerciales (`fe_baja`). Al importar una lista de HubSpot a una campaña se leen `fe_base_legal`, `fe_origen`, `fe_baja` y la base legal nativa `hs_legal_basis`.

### 1.7 Google (Calendar y Drive)

1. En `console.cloud.google.com`, cree un proyecto «asistente-fe» y active **Google Calendar API** y **Google Drive API**.
2. IAM → Cuentas de servicio → Crear («asistente-fe»). En la cuenta creada → Claves → Añadir clave → JSON. Guarde el fichero en el servidor fuera del código (por ejemplo `secretos/google-cuenta-servicio.json`, permisos 600) y ponga su ruta en `GOOGLE_CREDENCIALES`.
3. Dos formas de dar acceso:
   - **Compartir (cuenta de Gmail o Workspace)**: en Google Calendar → configuración del calendario de Valerio → Compartir con personas → añada el correo de la cuenta de servicio (`…@….iam.gserviceaccount.com`) con «Hacer cambios en los eventos». Ponga el correo o el ID del calendario en `GOOGLE_CALENDAR_ID`. En Drive, comparta cada carpeta del conocimiento con ese mismo correo como **Lector** y ponga los ID de las carpetas (lo que va tras `/folders/` en la dirección) en `GOOGLE_DRIVE_CARPETAS`, separados por comas.
     - Limitación conocida de Google: sin delegación de dominio, una cuenta de servicio no puede añadir invitados a los eventos. El evento se crea en el calendario y la confirmación al cliente sale por WhatsApp o correo.
   - **Delegación de dominio (solo Google Workspace)**: en la consola de administración → Seguridad → Controles de API → Delegación de todo el dominio → añada el ID de cliente de la cuenta de servicio con los ámbitos `https://www.googleapis.com/auth/calendar` y `https://www.googleapis.com/auth/drive.readonly`. Ponga en `GOOGLE_SUPLANTAR` el correo de Valerio. Así las invitaciones salen a su nombre.

---

## 2. Despliegue

Necesita un servidor accesible desde internet con **HTTPS** y un dominio (por ejemplo `asistente.su-dominio.es`). Twilio y Meta solo llaman a direcciones HTTPS, y el audio va por WebSocket seguro (`wss://`), así que el proxy debe admitir WebSocket.

Elija un servidor en Europa (Fráncfort, Ámsterdam, París o Madrid) para reducir la latencia.

### Opción A (recomendada): VPS con Docker y Caddy

Un VPS pequeño (2 vCPU, 2–4 GB de RAM) en un proveedor europeo basta para varias llamadas a la vez.

1. Instale Docker y el complemento Compose.
2. Apunte el registro DNS `A` de `asistente.su-dominio.es` a la IP del servidor.
3. Copie el proyecto, cree `.env` a partir de `.env.ejemplo` y deje el JSON de Google en `secretos/google-cuenta-servicio.json`.
4. Arranque:

```bash
DOMINIO=asistente.su-dominio.es docker compose up -d --build
docker compose logs -f asistente
```

   Caddy obtiene y renueva solo el certificado HTTPS. La base de datos queda en `./datos` (fuera del contenedor).
5. Prepare el conocimiento (descarga Drive y la web y construye el índice):

```bash
docker compose exec asistente node src/conocimiento/ingestar.js
```

6. Copias de seguridad: copie a diario `datos/asistente.db` (con el servidor en marcha use `sqlite3 datos/asistente.db ".backup copia.db"`) a un almacenamiento cifrado.

### Opción B: VPS con systemd

```bash
# Node 22.5 o superior
sudo useradd -r -m -d /srv/asistente asistente
sudo -u asistente git clone <repositorio> /srv/asistente/app   # o copie los ficheros
cd /srv/asistente/app && sudo -u asistente npm ci --omit=dev
sudo -u asistente cp .env.ejemplo .env && sudo -u asistente chmod 600 .env   # y rellénelo
```

`/etc/systemd/system/asistente.service`:

```ini
[Unit]
Description=Asistente de Familias Empresarias
After=network-online.target

[Service]
User=asistente
WorkingDirectory=/srv/asistente/app
ExecStart=/usr/bin/node src/servidor.js
Restart=always
Environment=NODE_ENV=production
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/srv/asistente/app/datos

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now asistente
journalctl -u asistente -f
```

Delante, Caddy (`caddy reverse-proxy --from asistente.su-dominio.es --to 127.0.0.1:8090`) o nginx con certificado de Let's Encrypt y la cabecera `Upgrade` para WebSocket.

### Opción C: Render o Fly.io

Funcionan si se cumplen dos cosas: **disco persistente** para `datos/` (Render: Persistent Disk; Fly: volumen) y **WebSocket** activado (ambos lo admiten). Use el `Dockerfile` del proyecto, una sola instancia (SQLite no se comparte entre instancias) y una región europea. Ponga las variables en el panel del proveedor y `DATOS_DIR` apuntando al disco persistente.

---

## 3. Variables de entorno

Todas están comentadas en `.env.ejemplo`. «Sí» en «Obligatoria» significa que sin ella esa parte no funciona (el servidor arranca igualmente y avisa).

| Variable | Obligatoria | Por defecto | Para qué |
|---|---|---|---|
| `PORT` | No | `8090` | Puerto del servidor |
| `URL_PUBLICA` | Sí | — | `https://asistente.su-dominio.es` (Twilio y Meta llaman aquí; también marca las cookies del panel como seguras) |
| `DATOS_DIR` | No | `./datos` | Carpeta de la base de datos y el conocimiento |
| `EMPRESA_NOMBRE` | No | `Familias Empresarias` | Nombre de la empresa |
| `EMPRESA_MARCA` | No | `Business Avance` | Marca comercial |
| `EMPRESA_WEB` | No | `https://businessavance.es` | Web |
| `ASISTENTE_NOMBRE` | No | `Lucía` | Nombre del asistente (siempre se presenta como IA) |
| `RESPONSABLE_NOMBRE` | No | `Valerio` | Con quién se agenda |
| `RESPONSABLE_MOVIL` | Para transferir | — | Móvil `+34…` al que se pasan las llamadas |
| `RESPONSABLE_EMAIL` | No | — | Correo del responsable |
| `ZONA_HORARIA` | No | `Europe/Madrid` | Zona horaria de horarios y agenda |
| `ANTHROPIC_API_KEY` | Sí | — | Clave de Claude |
| `MODELO_VOZ` / `MODELO_TEXTO` | No | `claude-opus-5-5` | Modelo (no cambiar) |
| `ESFUERZO_VOZ` / `ESFUERZO_TEXTO` | No | `low` / `medium` | Esfuerzo de razonamiento por canal |
| `CLAUDE_FALLBACKS` | No | `sí` | Modelo de respaldo si el principal no está disponible |
| `TWILIO_ACCOUNT_SID` | Voz | — | Cuenta de Twilio |
| `TWILIO_AUTH_TOKEN` | Voz | — | Token de Twilio (también comprueba las firmas) |
| `TWILIO_NUMERO` | Voz | — | Número `+34` comprado |
| `GRABAR_LLAMADAS` | No | `no` | Grabar llamadas (exige aviso; ver `CUMPLIMIENTO.md`) |
| `DEEPGRAM_API_KEY` | Voz | — | Voz a texto (y notas de voz de WhatsApp) |
| `DEEPGRAM_MODELO` / `DEEPGRAM_IDIOMA` | No | `nova-3` / `es` | Modelo e idioma |
| `ELEVENLABS_API_KEY` | Voz | — | Texto a voz |
| `ELEVENLABS_VOZ_ID` | Voz | — | Voz elegida |
| `ELEVENLABS_MODELO` | No | `eleven_flash_v2_5` | Modelo de voz |
| `ELEVENLABS_ESTABILIDAD` / `ELEVENLABS_SIMILITUD` / `ELEVENLABS_VELOCIDAD` | No | `0.45` / `0.8` / `1.0` | Ajustes de la voz |
| `WHATSAPP_TOKEN` | WhatsApp | — | Token permanente del usuario del sistema |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp | — | ID del número en Meta |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp | — | Texto de verificación del webhook |
| `WHATSAPP_APP_SECRET` | WhatsApp | — | Comprueba la firma de Meta |
| `WHATSAPP_API_VERSION` | No | `v23.0` | Versión de la API de Meta |
| `WHATSAPP_PLANTILLA_SEGUIMIENTO` | No | — | Plantilla para escribir fuera de las 24 horas |
| `WHATSAPP_PLANTILLA_IDIOMA` | No | `es` | Idioma de la plantilla |
| `HUBSPOT_TOKEN` | CRM | — | Token de la app privada |
| `HUBSPOT_OWNER_ID` | No | — | Propietario de contactos y tareas |
| `HUBSPOT_PIPELINE` / `HUBSPOT_ETAPA` | No | `default` / `appointmentscheduled` | Pipeline y etapa de los negocios |
| `GOOGLE_CREDENCIALES` | Agenda y Drive | — | Ruta al JSON de la cuenta de servicio |
| `GOOGLE_CALENDAR_ID` | No | `primary` | Calendario de reuniones |
| `GOOGLE_SUPLANTAR` | No | — | Correo a suplantar con delegación de dominio |
| `GOOGLE_DRIVE_CARPETAS` | No | — | ID de carpetas de Drive del conocimiento, separados por comas |
| `REUNION_MINUTOS` | No | `30` | Duración de la reunión |
| `HORARIO_REUNIONES` | No | `L-V 09:30-14:00,16:00-19:00` | Cuándo se pueden agendar reuniones |
| `REUNION_ANTELACION_H` | No | `24` | Antelación mínima |
| `CONOCIMIENTO_DIR` | No | `datos/conocimiento` | Carpeta del conocimiento |
| `CONOCIMIENTO_URLS` | No | web de Business Avance y de Valerio | Páginas que descarga la ingesta |
| `CONOCIMIENTO_MAX_PALABRAS` | No | `60000` | Tamaño máximo del paquete de conocimiento en las instrucciones |
| `PROSPECCION_ACTIVA` | No | `no` | Interruptor general de las llamadas salientes |
| `HORARIO_LLAMADAS` | No | `L-V 10:00-14:00,16:30-20:00` | Horario de llamadas (siempre limitado a L-V 9:00-21:00) |
| `PROSPECCION_MAX_INTENTOS` | No | `3` | Intentos por contacto y campaña |
| `PROSPECCION_SEPARACION_H` | No | `48` | Horas mínimas entre intentos |
| `PROSPECCION_SIMULTANEAS` | No | `2` | Llamadas salientes a la vez |
| `FESTIVOS` | Recomendada | — | `AAAA-MM-DD` o `MM-DD`, separados por comas |
| `PANEL_USUARIO` | No | `admin` | Usuario del panel |
| `PANEL_CLAVE` | Para el panel | — | Sin ella, el panel está desactivado |
| `PANEL_SECRETO` | Recomendada | aleatoria | Firma de la sesión del panel (`openssl rand -hex 32`) |

---

## 4. Conocimiento

1. Revise los ficheros de `datos/conocimiento/*.md` (servicios, método, casos, precios orientativos, preguntas frecuentes…) y responda lo que queda en `PENDIENTE.md`.
2. Ejecute `npm run ingestar` (o, con Docker, `docker compose exec asistente node src/conocimiento/ingestar.js`).
3. En el panel, pulse **«Volver a cargar el conocimiento»** para que las conversaciones nuevas usen la versión actualizada.

---

## 5. Pruebas antes de abrirlo

Haga estas pruebas con el equipo antes de publicar el número o activar la prospección.

**Servidor**
- [ ] `https://SU-DOMINIO/salud` responde `{"ok":true,…}`.
- [ ] En los registros aparecen cargados todos los módulos (voz, WhatsApp, CRM, agenda, conocimiento, prospección, panel) sin errores.
- [ ] `npm test` pasa en el servidor.

**Panel**
- [ ] `https://SU-DOMINIO/panel` pide usuario y contraseña; con una contraseña errónea no entra.
- [ ] Pestaña **Probar**: escriba como un cliente («Hola, tengo una empresa familiar de 40 personas y no sé si crecer o consolidar»). El asistente se presenta como IA, pregunta con sentido, consulta huecos y propone reunión.
- [ ] Pulse «Volver a cargar el conocimiento»: muestra la confirmación.

**Llamada entrante**
- [ ] Llame al número desde un móvil. Saluda en menos de dos segundos, se presenta como asistente de inteligencia artificial y entiende lo que se le dice.
- [ ] Interrúmpale mientras habla: se calla y escucha.
- [ ] Pregunte «¿Es usted una persona?»: responde que no.
- [ ] Pida una reunión: ofrece huecos reales del calendario, confirma el correo y la reserva aparece en Google Calendar.
- [ ] Pida hablar con una persona: transfiere al móvil del responsable.
- [ ] Diga «no me llamen más»: confirma la baja; aparece en el panel (Bajas) y en HubSpot.
- [ ] En el panel aparecen la conversación, su transcripción, el resultado y la latencia media (objetivo: menos de 1.000 ms).
- [ ] En HubSpot aparecen el contacto, la llamada con su resumen y, si procede, la reunión y el negocio.

**WhatsApp**
- [ ] Escriba al número de WhatsApp: responde en pocos segundos, de usted y presentándose como IA.
- [ ] Envíe una nota de voz: la entiende.
- [ ] Escriba «BAJA»: confirma y no vuelve a escribir.

**Prospección (solo tras validar `CUMPLIMIENTO.md` con su abogado)**
- [ ] Cargue la lista Robinson del mes (panel → Bajas y Robinson). Para ficheros de más de 1,8 MB: `node src/prospeccion/importar-robinson.js fichero.csv AAAA-MM-DD`.
- [ ] Cree una campaña de prueba con dos o tres números del equipo (base legal `consentimiento` con fecha) e impórtelos en CSV.
- [ ] Ponga `PROSPECCION_ACTIVA=sí`, reinicie, active la campaña y compruebe: llama solo en horario, se presenta como IA, dice por qué llama, cuelga sin dejar mensaje si salta el buzón y reintenta pasadas 48 horas.
- [ ] Un número de baja o en la lista Robinson no recibe llamada (aparece como «baja» o «excluido»).

Ejemplo de CSV de contactos (separado por comas o por punto y coma):

```csv
telefono,nombre,empresa,cargo,email,base_legal,base_legal_detalle,base_legal_fecha,origen
600111222,Ana Ruiz,Talleres Ruiz,Gerente,ana@talleresruiz.es,relacion_previa,Asistió a la ponencia de FREMM y dejó su tarjeta,2026-10-01,ponencia FREMM
911222333,Luis Pérez,Lácteos Pérez,Director general,luis@lacteosperez.es,cliente,Cliente 2024-2025,2024-03-15,cliente
```

Columnas opcionales: `tipo_linea` (`fijo`, `movil_corporativo`, `movil_personal`) y `consentimiento_whatsapp` (fecha del consentimiento para WhatsApp).

---

## 6. Lista de comprobación final

- [ ] Cuentas creadas y con límites de gasto: Anthropic, Twilio, Deepgram, ElevenLabs, Meta, HubSpot, Google Cloud.
- [ ] Número +34 con paquete regulatorio aprobado y webhook de voz a `/voz/entrante`.
- [ ] Voz de ElevenLabs elegida (o voz de Valerio clonada con su consentimiento por escrito).
- [ ] WhatsApp: negocio verificado, número aprobado, token permanente, webhook verificado, suscrito a `messages`, plantillas aprobadas.
- [ ] HubSpot: app privada con los permisos de la tabla y `preparar-hubspot.js` ejecutado.
- [ ] Google: calendario y carpetas compartidos con la cuenta de servicio (o delegación de dominio).
- [ ] Servidor con HTTPS, `.env` completo con permisos 600, copias de seguridad diarias de `datos/`.
- [ ] `PANEL_CLAVE` larga y `PANEL_SECRETO` configurados.
- [ ] Conocimiento revisado e ingestado; `PENDIENTE.md` respondido.
- [ ] Textos legales: cláusula informativa en web y formularios, registro de actividades del tratamiento, contratos de encargado con los proveedores (ver `CUMPLIMIENTO.md`).
- [ ] Puntos de `CUMPLIMIENTO.md` validados con el abogado **antes** de activar `PROSPECCION_ACTIVA`.
- [ ] Todas las pruebas del apartado 5 hechas.
