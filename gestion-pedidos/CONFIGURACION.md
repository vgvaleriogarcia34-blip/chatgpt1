# Resumen de configuración — Modelo de Gestión de Pedidos y Entrega

Toda la configuración del modelo vive en **`data.js`**. Este documento resume
los parámetros para poder ajustar el modelo a las reglas reales de la tienda
sin bucear en el código.

---

## 1. Reglas de negocio

| Parámetro | Valor actual | Constante en `data.js` | Significado |
|---|---|---|---|
| Envío estándar gratis desde | **50 €** | `ENVIO_GRATIS_DESDE` | Umbral de subtotal para envío estándar gratuito |
| Plazo de devolución | **14 días** | `DIAS_DEVOLUCION` | Días desde la entrega para solicitar devolución |
| Preparación del pedido | **< 24 h** | (texto/promesa) | Compromiso de gestión, mostrado en cabecera y estado *En preparación* |

---

## 2. Categorías del catálogo

Definidas en `CATEGORIAS`. Cada una fija el **tipo de tallaje**.

| ID | Categoría | Tallaje |
|---|---|---|
| `calzado` | Calzado de seguridad | calzado |
| `guantes` | Guantes de trabajo | ropa |
| `ropa` | Ropa de trabajo | ropa |
| `uniformes` | Uniformes de trabajo | ropa |
| `auditiva` | Protección auditiva | única |
| `ocular` | Protección ocular | única |
| `respiratoria` | Protección respiratoria | única |
| `senalizacion` | Señalización | única |
| `desechable` | Vestuario desechable | ropa |

### Tallas (`TALLAS`)
- **calzado**: 36 – 48
- **ropa**: S, M, L, XL, 2XL, 3XL
- **única**: Única

---

## 3. Productos

18 productos de demostración en `PRODUCTOS`. Cada producto define:

| Campo | Descripción |
|---|---|
| `id` | Identificador único (usado en URL y carrito) |
| `categoria` | ID de categoría (ver tabla anterior) |
| `nombre`, `marca`, `desc` | Textos de la ficha |
| `precio`, `precioAnterior?` | Precio actual y precio tachado (oferta) |
| `icono` | Emoji usado como imagen |
| `normas` | Etiquetas de normativa (S3, EN388, FFP2…) |
| `stockBase` | Stock base (se reparte por talla automáticamente) |

Marcas incluidas: **U-Power, FAL Seguridad, Portwest, Showa, Roly, Valento, 3M, DuPont, Genérica**.

> El stock por talla se genera con `stockPorTalla()`; para stock manual, sustituir
> el objeto `stock` del producto.

---

## 4. Estados del pedido (`ESTADOS`)

Máquina de estados tipo PrestaShop. Cada estado tiene etiqueta, color, icono y `orden`.

| Estado (clave) | Etiqueta | Fase |
|---|---|---|
| `pendiente_pago` | Pendiente de pago | Inicio (pagos no instantáneos) |
| `pago_aceptado` | Pago aceptado | Ciclo lineal (0) |
| `preparacion` | En preparación | Ciclo lineal (1) — *< 24 h* |
| `enviado` | Enviado | Ciclo lineal (2) — genera nº tracking |
| `en_reparto` | En reparto | Ciclo lineal (3) |
| `entregado` | Entregado | Ciclo lineal (4) — abre ventana de devolución |
| `cancelado` | Cancelado | Terminal |
| `devolucion` | Devolución solicitada | Post-entrega |
| `reembolsado` | Reembolsado | Terminal |

**Flujo lineal de seguimiento** (`FLUJO_LINEAL`), usado en la barra de progreso del cliente:
`pago_aceptado → preparacion → enviado → en_reparto → entregado`

### Transiciones válidas (`TRANSICIONES`)

Gobiernan qué botones aparecen en el back-office para cada estado.

| Desde | Hacia |
|---|---|
| `pendiente_pago` | `pago_aceptado`, `cancelado` |
| `pago_aceptado` | `preparacion`, `cancelado` |
| `preparacion` | `enviado`, `cancelado` |
| `enviado` | `en_reparto` |
| `en_reparto` | `entregado` |
| `entregado` | `devolucion` |
| `devolucion` | `reembolsado` |
| `cancelado` | *(ninguna)* |
| `reembolsado` | *(ninguna)* |

**Estado inicial según el pago:** pago instantáneo → `pago_aceptado`; pago no
instantáneo → `pendiente_pago`.

---

## 5. Métodos de envío (`METODOS_ENVIO`)

| ID | Nombre | Coste | Plazo | Transportista |
|---|---|---|---|---|
| `estandar` | Envío estándar | **4,95 €** (gratis ≥ 50 €) | 24-72 h (3 días) | Correos Express |
| `express` | Envío Express 24h | **8,95 €** | 24 h (1 día) | SEUR |
| `recogida` | Recogida en tienda | **Gratis** | 1 día | Recogida en tienda (Molina de Segura) |

> La **entrega estimada** se calcula como fecha del pedido + `plazoDias` + 1.
> El **nº de seguimiento** se genera con prefijo por transportista (CE-, SEUR-, REC-).

---

## 6. Métodos de pago (`METODOS_PAGO`)

| ID | Nombre | Instantáneo | Recargo |
|---|---|---|---|
| `tarjeta` | Tarjeta de crédito/débito | Sí | — |
| `bizum` | Bizum | Sí | — |
| `transferencia` | Transferencia bancaria | No | — |
| `contrareembolso` | Contra reembolso | No | **+2 €** |

- **Instantáneo = Sí** → el pedido nace como *Pago aceptado*.
- **Instantáneo = No** → el pedido nace como *Pendiente de pago*.

---

## 7. Persistencia

- Clave de almacenamiento: **`protonepis_pedidos_v1`** (localStorage), definida en `app.js` (`LS_KEY`).
- Estado guardado: `cart` (carrito), `orders` (pedidos), `counter` (nº correlativo, base `1000`), `checkout` (formulario en curso).
- Referencia de pedido: prefijo **`PE-`** + contador (p. ej. `PE-1003`).
- **Datos semilla:** 2 pedidos de ejemplo (`seed()`), uno *en reparto* y otro *pendiente de pago*.
- Botón *«Reiniciar datos de demo»* borra la clave y regenera la semilla.

---

## 8. Cómo ajustar el modelo a la tienda real

| Quieres cambiar… | Edita en `data.js` |
|---|---|
| Umbral de envío gratis | `ENVIO_GRATIS_DESDE` |
| Días de devolución | `DIAS_DEVOLUCION` |
| Añadir/quitar categorías | `CATEGORIAS` (+ `TALLAS` si hay tallaje nuevo) |
| Añadir/editar productos | `PRODUCTOS` |
| Costes/plazos/transportistas | `METODOS_ENVIO` |
| Métodos y recargos de pago | `METODOS_PAGO` |
| Estados o flujo del pedido | `ESTADOS`, `FLUJO_LINEAL`, `TRANSICIONES` |
