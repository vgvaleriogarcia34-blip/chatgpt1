# Puesta en marcha en el servidor · lista de comprobaciones

Lo que hay que revisar el día que Atalaya pase de la demostración en el navegador a su propio servidor (`server/server.mjs`). Marca cada punto al comprobarlo.

## 1. Arranque y seguridad

- [ ] Node 20 o superior; `cd server && npm install` (instala `nodemailer` para el correo).
- [ ] Variables de entorno: `PORT`, `ATALAYA_DATA` (carpeta de la base de datos), `APP_URL` (dirección pública), `COOKIE_SECURE=1` con HTTPS, `ADMIN_PASSWORD` o código de configuración inicial.
- [ ] HTTPS delante (Caddy o Nginx) y redirección de http a https.
- [ ] Copia de seguridad diaria de `ATALAYA_DATA` (la base de datos es un fichero JSON).
- [ ] Contraseña de administración configurada y acceso solo por `index.html#admin` o `admin.html`.

## 2. Varias empresas por cuenta (comprobar en el servidor)

El servidor ya comprueba el límite de empresas, además del navegador:

- [ ] Una cuenta **Esencial** o **Profesional** no puede dar de alta una segunda empresa: el servidor responde «Tu plan incluye una empresa…» y el selector lo muestra.
- [ ] Una cuenta **Consultora** no pasa de 15 empresas.
- [ ] Una cuenta **Grupos** puede dar de alta las sociedades que quiera, y el gestor de usuarios muestra cuántas tiene y su tramo (690 €, 970 € o 1.790 € al mes).
- [ ] No se pueden guardar datos de una empresa que no está dada de alta en la cuenta (`simulador--id` o `estrategia--id`).
- [ ] Si un cliente baja de plan teniendo más empresas, puede seguir viéndolas y borrarlas, pero no crear más.
- [ ] Los datos de cada empresa se guardan aparte y la vista de grupo los lee todos.

Probado ya en local contra el servidor: Profesional rechazado al crear la segunda empresa; Grupos aceptado; datos de una empresa no registrada, rechazados.

## 3. Correo

- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: enlace de recuperación de contraseña por correo.
- [ ] Prueba de «¿Has olvidado tu contraseña?» de principio a fin.

## 4. Inteligencia artificial

- [ ] `ANTHROPIC_API_KEY` en el servidor para el asistente, la lectura con IA de documentos y los datos de mercado.
- [ ] Más adelante: que cada cliente pueda poner su propia clave (pendiente).

## 5. Cobro

Ver «Opciones de cobro» abajo. Hasta tener el cobro automático, el acceso se activa a mano desde administración («Registrar pago»).

## 6. Otros

- [ ] Las librerías externas (Three.js, lectura de Excel y PDF) se cargan de cdnjs: comprobar que el servidor no las bloquea.
- [ ] Probar el recorrido completo con un usuario de cada plan: alta, prueba de 14 días, fin de la prueba, pago y reactivación.

---

# Opciones de cobro

| Opción | Necesita servidor | Activa el acceso solo | Coste aproximado | Encaje |
|---|---|---|---|---|
| **Enlaces de pago de Stripe** (Payment Links) | No | No: el pago llega a Stripe y se registra a mano | Tarjeta UE ≈ 1,5 % + 0,25 € | Para empezar ya, sin programar |
| **Stripe Billing + aviso al servidor** (webhook) | Sí | Sí: al cobrar se amplía el acceso; si falla, aviso y bloqueo | Tarjeta ≈ 1,5 % + 0,25 € y ≈ 0,7 % de Billing | **Recomendada** al subir al servidor |
| **Domiciliación SEPA** (GoCardless o SEPA dentro de Stripe) | Sí | Sí | ≈ 1 % + 0,20 € con tope por cobro | Ideal para Grupos y pagos anuales altos |
| TPV del banco (Redsys) | Sí | Con más trabajo | Comisión baja negociada | Suscripciones complejas de montar |
| Revendedor que factura por ti (Paddle, Lemon Squeezy) | Sí | Sí | ≈ 5 % + 0,50 € | Solo si se vende mucho fuera de España |

**Recomendación**

1. **Ahora, sin servidor:** crear en Stripe un enlace de pago por plan y periodo (mensual y anual, y los tres tramos de Grupos). Se envía al cliente cuando pide la activación y, al ver el pago en Stripe, se pulsa «Registrar pago» en administración. Cero desarrollo.
2. **Al subir al servidor:** Stripe Billing con suscripciones mensual y anual (−30 %). Grupos como tres precios según el tramo, más la tarjeta y la domiciliación SEPA. El servidor recibe el aviso de Stripe y:
   - con el pago confirmado, marca el pago y amplía el acceso hasta el final del periodo;
   - si un cobro falla, avisa y bloquea tras unos días de gracia;
   - al cancelarse la suscripción, deja de renovar el acceso.

   El cliente cambia de tarjeta o de plan desde el portal de Stripe. Desarrollo estimado: dos rutas nuevas en `server.mjs` (pago y aviso de Stripe) y un botón «Pagar» en la pantalla de activación.
3. **Facturas:** que las emita Stripe con IVA, o la herramienta de facturación que ya uses. Revisa con tu asesor las obligaciones de facturación electrónica (VeriFactu) y su calendario.
