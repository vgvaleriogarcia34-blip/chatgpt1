# TalentFlow · ATS para RRHH

Sistema de seguimiento de candidatos (Applicant Tracking System) para el
departamento de Recursos Humanos de una empresa. Aplicación web autónoma,
sin dependencias ni backend: funciona abriendo `index.html` en el navegador
y guarda los datos en `localStorage`.

## Funcionalidades

- **Panel de control**: KPIs (vacantes abiertas, candidatos activos,
  contrataciones, tasa de conversión), embudo de selección y candidatos
  recientes.
- **Vacantes**: alta, edición y baja de puestos con departamento, ubicación,
  modalidad, rango salarial, estado (abierta / en pausa / cerrada) y número de
  candidatos asociados.
- **Pipeline (Kanban)**: tablero por etapas del proceso (Nuevo, Preselección,
  Entrevista, Prueba técnica, Oferta, Contratado, Rechazado) con
  **arrastrar y soltar** para mover candidatos entre etapas. Filtro por vacante.
- **Candidatos**: base de datos con búsqueda, filtro por etapa, valoración por
  estrellas, etiquetas de habilidades, origen y ficha detallada.
- **Ficha del candidato**: cambio de etapa, valoración, etiquetas y notas de
  evaluación con historial.
- **Entrevistas**: agenda de entrevistas próximas ordenadas por fecha.
- **Buscador global** y **datos de ejemplo** precargados.

## Uso

```bash
# Abrir directamente
open ats/index.html          # macOS
xdg-open ats/index.html      # Linux

# O servir con un servidor estático
cd ats && python3 -m http.server 8000
# luego visita http://localhost:8000
```

- **↺ Datos demo**: restaura el juego de datos de ejemplo.
- **🗑 Reiniciar**: borra todos los datos guardados.

## Tecnología

HTML + CSS + JavaScript vanilla. Sin build, sin frameworks, sin instalación.
Persistencia local en el navegador mediante `localStorage`.
