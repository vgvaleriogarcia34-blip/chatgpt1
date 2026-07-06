# TalentFlow · ATS para RRHH

Sistema de seguimiento de candidatos (Applicant Tracking System) para el
departamento de Recursos Humanos de una empresa. Aplicación web autónoma,
sin dependencias ni backend: funciona abriendo `index.html` en el navegador
y guarda los datos en `localStorage`.

Esta edición replica las capacidades de los líderes de mercado —
**Greenhouse** (hiring estructurado, scorecards, aprobación de requisiciones),
**Ashby** (analítica avanzada, scheduling) y **Lever** (CRM y nurture de
talento).

## Funcionalidades

- **📊 Panel de control**: KPIs (requisiciones abiertas, candidatos activos,
  entrevistas, contrataciones, time-to-hire), embudo de selección, diversidad
  de género y feed de actividad reciente.
- **💼 Requisiciones**: alta/edición con **flujo de aprobación**
  (borrador → pendiente → abierta), prioridad, nº de vacantes, recruiter,
  hiring manager y equipo de contratación.
- **🗂️ Pipeline (Kanban)**: tablero por 7 etapas con **arrastrar y soltar**,
  filtro por requisición y puntuación media visible en la tarjeta.
- **👥 Candidatos**: base de datos con búsqueda, filtros combinables
  (etapa/vacante/origen), **selección múltiple con acciones en lote**,
  importación y exportación **CSV**.
- **📎 Documentos adjuntos**: subida de **varios archivos** (CV, carta,
  portfolio…) en **PDF, PNG o JPG** (hasta 3 MB c/u) desde el alta de
  candidato y desde el portal, con vista previa, descarga e indicador.
- **🌐 Portal de empleo configurable y embebible**: página pública
  (`careers.html`) con **branding propio** (nombre, logo, colores, textos) y
  un **código de inserción `<iframe>`** para integrarlo en la web de cualquier
  empresa. La marca y las vacantes viajan codificadas en la URL, y las
  candidaturas (con sus archivos) entran directamente al pipeline.
- **Ficha de candidato con pestañas**: Resumen · **Scorecards** estructurados
  (criterios 1–5 + recomendación tipo «Sí rotundo/No») · **Entrevistas**
  (scheduling con entrevistador y modalidad) · **Comunicación** (envío de
  plantillas y historial) · **Oferta** (estados y aprobación) · **Actividad**
  (timeline completo).
- **🗃️ CRM · Talent Pool**: base de talento con **rediscovery** — sugiere
  candidatos archivados que encajan con vacantes abiertas por sus etiquetas.
- **📅 Entrevistas**: agenda global de entrevistas con entrevistadores.
- **📄 Ofertas**: gestión, estados y **tasa de aceptación**.
- **🧭 Cultura & Fit**: **ADN de empresa** (misión, visión, valores)
  configurable y un **Fit score** compuesto por candidato. En la ficha, pestaña
  **Evaluación** con: **alineamiento por valores** (% de encaje cultural),
  **roles de equipo de Belbin** (los 9 roles con perfil radar y clúster),
  **personalidad Big Five (OCEAN) y DISC**, y **aptitudes psicotécnicas**
  (verbal, numérica, lógica, abstracta) por percentil. Ranking de candidatos
  por encaje. El reclutador puede rellenar la evaluación **o enviar un test
  autoadministrado** (`assessment.html`) para que **el propio candidato** lo
  complete: un cuestionario con corrección automática (valores, Belbin,
  Big Five, DISC y aptitudes con respuestas correctas) que rellena su perfil
  y recalcula el Fit score sin intervención del reclutador.
- **📈 Informes**: analítica de contratación — conversión del embudo,
  efectividad por origen, contrataciones por mes (gráfico), candidatos por
  departamento, ratio entrevista→oferta y **reporting DE&I** de diversidad.
- **🌐 Portal de empleo**: página pública de vacantes; las candidaturas
  entran directamente al pipeline.
- **⚙️ Automatización**: reglas activables (email de acuse al aplicar, email
  al rechazar, avisos de estancamiento…) y **plantillas de email** con
  variables `{nombre}` / `{puesto}`.

## Más allá del mercado

Capacidades que los ATS líderes no ofrecen de serie:

- **🤖 Copiloto de selección**: panel de avisos accionables en el dashboard —
  candidatos estancados, ofertas sin respuesta, entrevistas sin scorecard,
  fit bajo en etapas avanzadas, tests pendientes, requisiciones por aprobar
  y el origen más rentable. Cada aviso enlaza con la acción.
- **🎯 Job-Match**: define el **perfil ideal** de cada requisición
  (habilidades imprescindibles, roles Belbin buscados, percentil
  psicotécnico mínimo) y el sistema **rankea automáticamente** a los
  candidatos por encaje ponderado con el puesto.
- **🧩 Equilibrio de equipo Belbin**: por vacante, analiza los roles del
  equipo ya contratado, muestra la cobertura por clúster (Mental / Social /
  Acción) y **recomienda candidatos del pipeline que cubren los huecos**.
- **⚖ Comparador de candidatos**: selecciona 2–3 candidatos y compáralos
  lado a lado (fit, job-match, Belbin, Big Five, psicotécnico, habilidades).
- **🔒 RGPD**: consentimiento obligatorio en los formularios públicos,
  **exportación de datos** del candidato (portabilidad) y **anonimización
  irreversible** (derecho al olvido) conservando métricas agregadas.
- Entradas de usuario sanitizadas frente a inyección de HTML.

## Uso

```bash
# Abrir directamente
xdg-open ats/index.html      # Linux
open ats/index.html          # macOS

# O servir con un servidor estático
cd ats && python3 -m http.server 8000   # http://localhost:8000
```

- **↺ Datos demo**: restaura el juego de datos de ejemplo.
- **🗑 Reiniciar**: borra todos los datos guardados.

## Tecnología

HTML + CSS + JavaScript vanilla. Sin build, sin frameworks, sin instalación.
Persistencia local en el navegador mediante `localStorage`. Gráficos y
componentes construidos a mano (CSS + SVG), sin librerías externas.
