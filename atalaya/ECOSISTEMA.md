# Ecosistema de planes · coherencia y recorrido

Objetivo: que cada plan prometa lo que da, que se pueda subir o bajar de plan sin salir de la aplicación y que el recorrido sea siempre el mismo: **cuenta → plan → empresas → mundos**.

## 1. Lo que fallaba (evaluación)

| # | Problema | Efecto | Estado |
|---|---|---|---|
| 1 | «Consultora» y «Grupos» en el mapa y en el menú llevaban a la página comercial. Allí «Probar» llevaba al alta y, con la sesión abierta, el alta devolvía al puesto de mando **sin cambiar el plan**. | Un bucle: el usuario creía haber cambiado de plan y seguía en Profesional, con una sola empresa y sin forma de dar de alta otra. | Corregido |
| 2 | No había forma de cambiar de plan dentro de la aplicación. | Para crecer de plan había que hablar con el administrador. | Corregido: «Mi plan» |
| 3 | Esencial (solo simulador) podía entrar en el sistema estratégico. | El plan daba más de lo que cobraba y Profesional perdía sentido. | Corregido |
| 4 | Consultora prometía «Gestor de usuarios para tu equipo», que no existe. | Promesa falsa. | Retirada; queda en la hoja de ruta (equipo con perfiles) |
| 5 | Al terminar la prueba solo se podía activar el plan del alta. | Quien quería otro plan tenía que escribir. | Corregido: se elige plan antes de activar |
| 6 | Bajar a un plan con menos empresas no tenía regla. | Riesgo de perder de vista datos o de tener más empresas de las que se paga. | Corregido: hay que borrar antes las que sobran |
| 7 | La empresa principal se quedaba como «holding» al pasar a Consultora. | Mapa incoherente. | Corregido: se ajusta su papel al cambiar de plan |

## 2. Qué da cada plan

| | Esencial | Profesional | Consultora | Grupos |
|---|---|---|---|---|
| Precio | 49 €/mes | 129 €/mes | 349 €/mes | A medida: «Contactar con nuestro equipo» |
| Simulador de inversión | Sí | Sí | Sí | Sí |
| Sistema estratégico (21 módulos, origen, informes 360) | No: se ve y se ofrece | Sí | Sí | Sí |
| Personas y equipos (DISC, aportaciones al equipo, eneagrama, encaje, equipos, estructura, liderazgo, tablillas) | No: se ve y se ofrece | No: se ve y se ofrece | Sí | No, de momento |
| Empresas | 1 | 1 | Hasta 15 empresas cliente, independientes | Sociedades sin límite |
| Mapa de empresas | Ficha de su empresa | Ficha de su empresa | Empresas cliente en tarjetas | Holding arriba, filiales debajo con su % |
| Vista de conjunto | — | — | Cartera de clientes | Vista de grupo: consolidado, intragrupo, tesorería, objetivos en cascada |

La regla en el código está en un solo sitio (`P.puede` y `P.PLAN_RESUMEN` en `js/platform.js`; el servidor comprueba el límite de empresas y la bajada de plan).

## 3. Recorrido

1. **Alta** con el plan elegido en la página comercial: 14 días de prueba de ese plan.
2. **Paso 1 · mapa de empresas** en el puesto de mando: la ficha de la empresa (o el mapa de clientes o del grupo) y, si el plan lo permite, el alta de nuevas.
3. **Paso 2 · mundos**: simulador, sistema estratégico (este, desde Profesional) y personas y equipos (solo Consultora). La barra superior dice con qué empresa se trabaja.
4. **Mi plan** (menú de la cuenta, mapa de empresas, vista de grupo, pantalla de bloqueo del sistema estratégico, página comercial con sesión abierta):
   - en la prueba, cambio libre y al momento; los 14 días siguen contando desde el alta;
   - con el acceso activado, cambio al momento y ajuste de cuota en el siguiente cobro (queda registrado y aparece en los avisos de administración durante un mes);
   - para bajar a un plan con menos empresas, antes se borran las que sobran;
   - los datos de cada empresa se conservan siempre.
5. **Fin de la prueba**: se elige plan (el del alta u otro) y se solicita la activación.

## 4. Pendiente

- Cobro automático (ver `PUESTA-EN-MARCHA.md`): con Stripe, el cambio de plan prorrateará la cuota solo.
- Equipo con perfiles por empresa (hoja de ruta), que es lo que tendría sentido sumar a Consultora y Grupos.
