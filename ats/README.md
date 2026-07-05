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
- **Ficha de candidato con pestañas**: Resumen · **Scorecards** estructurados
  (criterios 1–5 + recomendación tipo «Sí rotundo/No») · **Entrevistas**
  (scheduling con entrevistador y modalidad) · **Comunicación** (envío de
  plantillas y historial) · **Oferta** (estados y aprobación) · **Actividad**
  (timeline completo).
- **🗃️ CRM · Talent Pool**: base de talento con **rediscovery** — sugiere
  candidatos archivados que encajan con vacantes abiertas por sus etiquetas.
- **📅 Entrevistas**: agenda global de entrevistas con entrevistadores.
- **📄 Ofertas**: gestión, estados y **tasa de aceptación**.
- **📈 Informes**: analítica de contratación — conversión del embudo,
  efectividad por origen, contrataciones por mes (gráfico), candidatos por
  departamento, ratio entrevista→oferta y **reporting DE&I** de diversidad.
- **🌐 Portal de empleo**: página pública de vacantes; las candidaturas
  entran directamente al pipeline.
- **⚙️ Automatización**: reglas activables (email de acuse al aplicar, email
  al rechazar, avisos de estancamiento…) y **plantillas de email** con
  variables `{nombre}` / `{puesto}`.

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
