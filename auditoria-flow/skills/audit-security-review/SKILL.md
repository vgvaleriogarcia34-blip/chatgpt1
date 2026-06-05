---
name: audit-security-review
description: Fase 2 de la auditoría — revisión de seguridad de los cambios pendientes de la rama. Busca vulnerabilidades y riesgos (inyección, XSS, autenticación/autorización, secretos expuestos, deserialización insegura, etc.). Úsalo tras la revisión de código o cuando el usuario pida auditar la seguridad de los cambios, o dentro de la secuencia /audit-flow. Esta es la segunda fase ("Seguridad").
---

# Auditoría · Fase 2: Revisión de seguridad

Segunda fase de la secuencia. Se ejecuta después de la revisión de código y
antes de la revisión final del PR. El objetivo es encontrar **vulnerabilidades
y riesgos de seguridad** introducidos por los cambios.

## Procedimiento

1. Toma el mismo alcance de diff que la fase anterior (cambios sin commitear o
   diff de la rama contra la base).
2. Invoca el skill integrado `security-review` (vía la herramienta Skill) para
   realizar la revisión de seguridad de los cambios pendientes de la rama.
3. Si no estuviera disponible, revisa manualmente al menos estas categorías:
   - **Inyección**: SQL/NoSQL, comandos del SO, LDAP, plantillas.
   - **XSS / contenido no escapado**: en apps web, salida no sanitizada hacia
     el DOM (`innerHTML`, inserción de HTML, etc.).
   - **AuthN/AuthZ**: rutas o acciones sin control de acceso, escalada de
     privilegios, IDOR.
   - **Secretos**: claves, tokens o credenciales hardcodeados o en logs.
   - **Manejo de datos**: deserialización insegura, path traversal, SSRF,
     validación de entrada insuficiente.
   - **Dependencias**: paquetes con vulnerabilidades conocidas introducidos en
     el cambio.

## Salida

Lista de hallazgos de seguridad clasificados por severidad
(crítica/alta/media/baja), cada uno con ubicación (`archivo:línea`), descripción
del riesgo, vector de explotación y mitigación recomendada. Veredicto final:
**listo para fase 3 (revisión final)** o **bloqueado por hallazgos de seguridad**.
