# Modelo de Gestión de Pedidos y Entrega — Protón EPIs

Modelo funcional que **replica el funcionamiento de [protonepis.com](https://protonepis.com)**
(tienda online de EPIs / protección laboral) centrándose en lo pedido:
la **gestión de pedidos y la entrega de los mismos**.

Es una aplicación estática (HTML + CSS + JavaScript, sin dependencias ni backend).
Todo el estado se guarda en `localStorage`, de modo que el ciclo completo de un
pedido funciona de extremo a extremo en el navegador.

## Cómo abrirlo

Abre `index.html` en el navegador (doble clic o servidor estático). No requiere build.

## Qué modela

### 1. Catálogo (lado cliente)
- Categorías reales de la tienda: calzado de seguridad, guantes, ropa de trabajo,
  uniformes, protección auditiva/ocular/respiratoria, señalización y vestuario desechable.
- Productos con **marca** (U-Power, FAL, Portwest, Showa, Valento, Roly, 3M…),
  **normativa** (S3, S1P, EN388, FFP2…), precio, ofertas y **stock por talla**
  (calzado 36-48, ropa S-3XL).
- Buscador, ficha de producto con selección de talla y cantidad.

### 2. Carrito y checkout
- Carrito persistente con edición de cantidades.
- Barra de **envío gratis desde 50 €** (envío estándar).
- Checkout con datos de contacto, dirección de entrega, **método de envío**
  (estándar / express 24h / recogida en tienda) y **método de pago**
  (tarjeta, Bizum, transferencia, contra reembolso con recargo).

### 3. Gestión de pedidos (máquina de estados tipo PrestaShop)
Ciclo de vida logístico replicado:

```
Pendiente de pago → Pago aceptado → En preparación → Enviado → En reparto → Entregado
                                          │
                                          └→ (Cancelado)      Entregado → Devolución → Reembolsado
```

- Los pagos **instantáneos** (tarjeta/Bizum) entran ya como *Pago aceptado*;
  transferencia y contra reembolso quedan *Pendiente de pago*.
- **Preparación en menos de 24 h** (promesa de la tienda real).
- Cada transición se registra en el **historial** del pedido con fecha/hora.

### 4. Entrega y seguimiento (lado cliente)
- Barra de **seguimiento** con la fase actual del envío.
- **Transportista** y **nº de seguimiento** (se genera al marcar *Enviado*).
- **Entrega estimada** según el método de envío.
- **Devolución a 14 días** desde la entrega (política de la tienda).

### 5. Panel de gestión / back-office (`#/admin`)
- Métricas: pedidos totales, por preparar, en camino, facturado.
- Tabla de pedidos con filtros por estado.
- Botones de acción que aplican solo las **transiciones válidas** de cada estado.
- Asignación manual o automática del nº de seguimiento en preparación.

## Estructura

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura de la SPA (cabecera, contenedor, pie). |
| `styles.css` | Estilos (tema industrial de EPIs, responsive). |
| `data.js`    | Catálogo, categorías, estados, transiciones, métodos de envío/pago. |
| `app.js`     | Lógica: enrutado por hash, carrito, checkout, ciclo de vida del pedido y back-office. |

## Datos de demostración

Al abrir por primera vez se cargan **dos pedidos de ejemplo** en distintas fases
(uno en reparto, otro pendiente de pago). El botón *«Reiniciar datos de demo»*
del pie restablece todo.
