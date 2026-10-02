# Plan de monetización · crecer con módulos de alto valor

Estado: **propuesta para decidir**. No hay nada construido de este plan.

## 1. Punto de partida

- Cuatro planes: Esencial 49 €, Profesional 129 €, Consultora 349 € y Grupos por tramos (690, 970 y 1.790 €). Pago anual con un 30 % de descuento.
- Prueba de 14 días; después, el administrador activa el acceso a mano.
- Hoy cada plan lo incluye todo lo suyo. Los módulos de la hoja de ruta (`AUDITORIA-MODULOS.md`) añaden mucho valor, pero meterlos todos en Profesional regala justo lo que más vale.

## 2. Principios

1. **La prueba lo tiene todo.** Durante 14 días el cliente usa el plan que eligió más todos los packs. Así ve el valor con sus propios datos antes de elegir.
2. **Pocas piezas.** Cuatro planes y como mucho cuatro packs. Nada de cobrar por cada módulo suelto.
3. **El núcleo sigue siendo generoso.** Lo que ya está en Profesional se queda en Profesional, incluidos Evolución, Cobros y Valoración. Nadie pierde nada de lo que paga.
4. **Los packs se agrupan por para qué sirven, no por cómo están hechos por dentro:** ir al banco, la sucesión, las operaciones o las personas.
5. **Los planes de muchas empresas lo incluyen todo.** Consultora y Grupos ya tienen un precio que lo justifica, y así no se complica la venta a clientes grandes.

## 3. Estructura propuesta

### Núcleo (lo que ya existe, sin cambios de precio)

| Plan | Incluye |
|---|---|
| Esencial · 49 € | Simulador de inversión. Puede añadir el pack Banca. |
| Profesional · 129 € | Simulador y sistema estratégico con sus 21 módulos (Evolución, Cobros y Valoración incluidos), zona de origen, informes 360 y calendario de obligaciones legales cuando exista. Incluye la propiedad y **2 perfiles de equipo**. |
| Consultora · 349 € | Lo de Profesional con **todos los packs**, 15 empresas y 10 perfiles. |
| Grupos · por tramos | Lo de Profesional con **todos los packs**, vista de grupo y 10 perfiles. |

El calendario de obligaciones va en el núcleo: cuesta poco mantenerlo, se valora mucho y hace que el cliente vuelva cada mes.

### Packs de diagnóstico (complementos mensuales; pago anual con un 30 % de descuento)

| Pack | Qué contiene (hoja de ruta) | Para quién | Precio |
|---|---|---|---|
| **Banca y financiación** | Dossier para el banco (capacidad de endeudamiento, rating, reparto de la deuda entre bancos, vencimientos, CIRBE), comparar varias inversiones, refinanciación y compra de una empresa en el simulador | Quien va a pedir financiación o a invertir | 39 €/mes |
| **Patrimonio y sucesión** | Empresa familiar y gobierno, protocolo, sucesión de la propiedad, pactos de socios con la valoración, escenarios de entrada y salida de socios | Propiedad y empresa familiar | 49 €/mes |
| **Operaciones a fondo** | Auditoría de inventario (rotación, tiempo sin moverse y coste real), coste de servir a cada cliente, cuenta de resultados por línea con coste completo | Industria, distribución y logística | 49 €/mes |
| **Personas y talento** | Mapa de talento (desempeño y potencial), salarios frente al mercado, puestos sin relevo y plan de formación | Empresas de más de 20 personas | 39 €/mes |

**Profesional Completo: 199 €/mes** (Profesional con los cuatro packs; por separado costaría 305 €). Es la opción que se recomienda al terminar la prueba a quien ha usado dos packs o más.

**Comparación con el sector:** la versión básica (umbrales por sector en los semáforos) va en el núcleo. Si más adelante se compran datos sectoriales detallados, ese informe va al pack Banca, porque el banco lo pide.

**Perfiles de equipo adicionales:** 12 €/mes por perfil a partir de los incluidos.

### Precios con pago anual (−30 %)

| | Mensual | Anual por mes | Anual |
|---|---|---|---|
| Pack de 39 € | 39 € | 27,30 € | 327,60 € |
| Pack de 49 € | 49 € | 34,30 € | 411,60 € |
| Profesional Completo | 199 € | 139,30 € | 1.671,60 € |
| Perfil adicional | 12 € | 8,40 € | 100,80 € |

## 4. Cómo se vende dentro de la aplicación

1. **Prueba de 14 días con todo.** En el día 10, un aviso: «Te quedan 4 días. Has usado Valoración, Dossier bancario e Inventario».
2. **Fin de la prueba con una recomendación.** Atalaya recomienda un plan según lo que se ha usado: «Te recomendamos Profesional + Operaciones a fondo (178 €/mes), o Profesional Completo (199 €/mes) si quieres también Banca». El cliente elige el periodo, mensual o anual.
3. **Los módulos de un pack sin contratar no se esconden.** Se ven en el mapa con su sello de pack y, al entrar, muestran **el titular calculado con los datos del cliente** y el resto difuminado: «Tienes 85 k€ de existencias sin moverse desde hace más de 180 días. Añade Operaciones a fondo para ver el detalle, el coste real y el plan». Es la venta más honesta: enseñar el hallazgo, no una promesa.
4. **Los informes 360 y el informe de auditoría** citan el hallazgo del pack («hay un análisis disponible en Operaciones a fondo») sin dar el detalle.
5. **Los datos nunca se pierden.** Si se deja de pagar un pack, los datos se quedan; al volver a contratarlo aparece todo como estaba.
6. **A los clientes actuales** se les respeta lo que tienen; si un módulo que ya usaban pasa a un pack, lo mantienen hasta la renovación.

## 5. Cómo se construiría

| Pieza | Trabajo |
|---|---|
| Definición | `P.PACKS` en `js/platform.js` (nombre, precio, módulos) y el mismo listado en `server/server.mjs`. Cada cuenta guarda `packs: []`. |
| Acceso | `S.register({ ..., pack: 'operaciones' })` y una comprobación `S.disponible(id)`: con el pack, el módulo normal; sin él, la vista previa con el titular. En la prueba, todo disponible. |
| Servidor | Guardar y comprobar los packs de cada cuenta, igual que el límite de empresas. Los datos de un pack no contratado se guardan pero no se sirven completos. |
| Administración | Columna de packs editable, cuota total del cliente (plan + packs + perfiles) e ingreso mensual con los packs. |
| Página comercial | Bajo los planes, una franja «Packs de diagnóstico» y la tarjeta Profesional Completo. |
| Alta y fin de prueba | Pantalla de elección con la recomendación según el uso (Atalaya ya registra qué módulos se visitan). |
| Cobro | En Stripe, cada pack es un complemento de la suscripción con su precio mensual y anual. Hasta tener el servidor, enlaces de pago y activación manual, como los planes. |

## 6. Fases

1. **Decidir** precios, el contenido de cada pack y qué incluyen Consultora y Grupos (sección 8).
2. **Mecanismo:** packs en la plataforma, el servidor y la administración, vista previa de los módulos sin contratar, prueba con todo y recomendación al terminar. Se puede montar antes de que exista el primer módulo de pago.
3. **Contenido:** cada módulo nuevo de la hoja de ruta nace dentro de su pack. Primero Banca (dossier y comparar inversiones), porque es el que antes se convierte en dinero para el cliente.
4. **Cobro automático** cuando Atalaya esté en el servidor (ver `PUESTA-EN-MARCHA.md`).

## 7. Qué se puede esperar (ejemplo con 100 clientes Profesional)

| | Clientes | Ingreso mensual |
|---|---|---|
| Solo Profesional | 60 | 7.740 € |
| Profesional + un pack (media de 44 €) | 25 | 4.325 € |
| Profesional Completo | 15 | 2.985 € |
| **Total** | 100 | **15.050 €** frente a 12.900 € (+17 %) |

Si además una de cada cinco cuentas añade un perfil de equipo, son 240 € más al mes. El ingreso medio por cliente pasa de 129 € a unos 150 €, sin subir el precio de entrada.

## 8. Decisiones que necesito de ti

- **Precios de los packs:** 39 y 49 €, o un precio único (por ejemplo, 45 €) para simplificar.
- **Profesional Completo a 199 €:** sí o no.
- **Consultora y Grupos con todos los packs incluidos** (recomendado), o packs aparte por empresa.
- **Perfiles de equipo:** 2 incluidos en Profesional y 12 €/mes por perfil adicional, o sin límite.
- **Esencial:** si puede añadir el pack Banca (recomendado: es el complemento natural del simulador).
- **Comparación sectorial:** la básica en el núcleo y el informe detallado en Banca, o todo en el núcleo.
