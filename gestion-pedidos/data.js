/* =========================================================================
   MODELO DE DATOS — Gestión de pedidos y entrega (inspirado en Protonepis)
   Tienda de EPIs / protección laboral. Todo el estado vive en el navegador
   (localStorage), de modo que el flujo pedido → preparación → envío →
   entrega → devolución funciona de extremo a extremo sin backend.
   ========================================================================= */

/* -------------------------------------------------------------------------
   1. CATEGORÍAS
   Réplica del árbol de categorías real de la tienda.
   ------------------------------------------------------------------------- */
const CATEGORIAS = [
  { id: 'calzado',        nombre: 'Calzado de seguridad',   icono: '🥾', tipoTalla: 'calzado' },
  { id: 'guantes',        nombre: 'Guantes de trabajo',     icono: '🧤', tipoTalla: 'ropa'    },
  { id: 'ropa',           nombre: 'Ropa de trabajo',        icono: '🦺', tipoTalla: 'ropa'    },
  { id: 'uniformes',      nombre: 'Uniformes de trabajo',   icono: '👔', tipoTalla: 'ropa'    },
  { id: 'auditiva',       nombre: 'Protección auditiva',    icono: '🎧', tipoTalla: 'unica'   },
  { id: 'ocular',         nombre: 'Protección ocular',      icono: '🥽', tipoTalla: 'unica'   },
  { id: 'respiratoria',   nombre: 'Protección respiratoria',icono: '😷', tipoTalla: 'unica'   },
  { id: 'senalizacion',   nombre: 'Señalización',           icono: '⚠️', tipoTalla: 'unica'   },
  { id: 'desechable',     nombre: 'Vestuario desechable',   icono: '🧵', tipoTalla: 'ropa'    },
];

/* Tallas según el tipo de producto */
const TALLAS = {
  calzado: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48'],
  ropa:    ['S', 'M', 'L', 'XL', '2XL', '3XL'],
  unica:   ['Única'],
};

/* -------------------------------------------------------------------------
   2. PRODUCTOS
   Genera stock por talla automáticamente para simplificar la semilla.
   ------------------------------------------------------------------------- */
function stockPorTalla(tallas, cantidad) {
  const s = {};
  tallas.forEach((t, i) => { s[t] = cantidad - (i % 3) * 2; });
  return s;
}

function crearProducto(p) {
  const tallas = TALLAS[CATEGORIAS.find(c => c.id === p.categoria).tipoTalla];
  return { tallas, stock: stockPorTalla(tallas, p.stockBase || 12), ...p };
}

const PRODUCTOS = [
  { id: 'up-redlion', categoria: 'calzado', nombre: 'Bota U-Power Red Lion S3', marca: 'U-Power',
    precio: 79.90, precioAnterior: 94.90, icono: '🥾', normas: ['S3', 'SRC'],
    desc: 'Bota de seguridad S3 con puntera de composite y suela antideslizante SRC. Ligera y transpirable.' },
  { id: 'fal-zeta', categoria: 'calzado', nombre: 'Zapato FAL Zeta S1P', marca: 'FAL Seguridad',
    precio: 54.50, icono: '👟', normas: ['S1P', 'SRC'],
    desc: 'Zapato de seguridad S1P transpirable, puntera de acero y plantilla antiperforación.' },
  { id: 'pw-steelite', categoria: 'calzado', nombre: 'Bota Portwest Steelite S3', marca: 'Portwest',
    precio: 62.00, icono: '🥾', normas: ['S3'],
    desc: 'Bota robusta S3 para construcción e industria pesada. Cuero hidrofugado.' },
  { id: 'up-food', categoria: 'calzado', nombre: 'Zapato Alimentación U-Power White S2', marca: 'U-Power',
    precio: 48.90, icono: '👟', normas: ['S2', 'SRC'],
    desc: 'Calzado blanco para industria alimentaria, higiénico y lavable.' },

  { id: 'showa-nitrilo', categoria: 'guantes', nombre: 'Guante Showa 377 Nitrilo', marca: 'Showa',
    precio: 4.20, icono: '🧤', normas: ['EN388'],
    desc: 'Guante recubierto de nitrilo, excelente agarre en seco y húmedo. Resistente a la abrasión.' },
  { id: 'pw-corte', categoria: 'guantes', nombre: 'Guante Anticorte Portwest Nivel D', marca: 'Portwest',
    precio: 6.80, icono: '🧤', normas: ['EN388', 'Corte D'],
    desc: 'Protección anticorte nivel D con fibra HPPE. Manipulación de piezas cortantes.' },
  { id: 'showa-quimico', categoria: 'guantes', nombre: 'Guante Químico Showa 660', marca: 'Showa',
    precio: 3.10, icono: '🧤', normas: ['EN374'],
    desc: 'Guante de látex/nitrilo resistente a productos químicos. Interior flocado.' },

  { id: 'roly-buzo', categoria: 'ropa', nombre: 'Buzo de trabajo Roly Tornado', marca: 'Roly',
    precio: 34.90, icono: '🦺', normas: [],
    desc: 'Buzo de trabajo resistente con múltiples bolsillos y refuerzos en rodillas.' },
  { id: 'pw-pantalon', categoria: 'ropa', nombre: 'Pantalón multibolsillos Portwest', marca: 'Portwest',
    precio: 27.50, icono: '👖', normas: [],
    desc: 'Pantalón de trabajo con rodilleras integrables y tejido resistente al desgaste.' },
  { id: 'valento-altavis', categoria: 'ropa', nombre: 'Chaqueta Alta Visibilidad Valento', marca: 'Valento',
    precio: 39.00, precioAnterior: 45.00, icono: '🦺', normas: ['EN20471'],
    desc: 'Chaqueta de alta visibilidad clase 3 con bandas reflectantes. Impermeable.' },
  { id: 'roly-camiseta', categoria: 'ropa', nombre: 'Camiseta técnica Roly Bahrain', marca: 'Roly',
    precio: 8.90, icono: '👕', normas: [],
    desc: 'Camiseta técnica transpirable de secado rápido para uso laboral intensivo.' },

  { id: 'val-polo', categoria: 'uniformes', nombre: 'Polo corporativo Valento', marca: 'Valento',
    precio: 12.50, icono: '👔', normas: [],
    desc: 'Polo de uniforme personalizable, ideal para hostelería y sanidad.' },
  { id: 'roly-casaca', categoria: 'uniformes', nombre: 'Casaca sanitaria Roly', marca: 'Roly',
    precio: 18.90, icono: '🥼', normas: [],
    desc: 'Casaca sanitaria cómoda y resistente a lavados industriales.' },

  { id: '3m-orejeras', categoria: 'auditiva', nombre: 'Orejeras 3M Peltor Optime', marca: '3M',
    precio: 21.90, icono: '🎧', normas: ['SNR 31dB'],
    desc: 'Orejeras de protección auditiva con atenuación 31 dB. Uso industrial.' },
  { id: '3m-gafas', categoria: 'ocular', nombre: 'Gafas de seguridad 3M SecureFit', marca: '3M',
    precio: 7.40, icono: '🥽', normas: ['EN166'],
    desc: 'Gafas panorámicas antivaho y antirrayado con protección UV.' },
  { id: '3m-mascarilla', categoria: 'respiratoria', nombre: 'Mascarilla FFP2 3M Aura (caja 10)', marca: '3M',
    precio: 14.90, icono: '😷', normas: ['FFP2'],
    desc: 'Caja de 10 mascarillas autofiltrantes FFP2 con válvula de exhalación.' },

  { id: 'senal-obligacion', categoria: 'senalizacion', nombre: 'Señal "Uso obligatorio de EPIs"', marca: 'Genérica',
    precio: 5.50, icono: '⚠️', normas: [],
    desc: 'Cartel de PVC señalización de seguridad, 30x21 cm. Uso obligatorio de EPIs.' },
  { id: 'des-buzo', categoria: 'desechable', nombre: 'Buzo desechable Tyvek (pack 5)', marca: 'DuPont',
    precio: 22.00, icono: '🧵', normas: ['Tipo 5/6'],
    desc: 'Pack de 5 buzos desechables con capucha, protección contra partículas y salpicaduras.' },
].map(crearProducto);

/* -------------------------------------------------------------------------
   3. ESTADOS DEL PEDIDO (máquina de estados tipo PrestaShop)
   `orden` marca la progresión lineal del ciclo de vida logístico.
   ------------------------------------------------------------------------- */
const ESTADOS = {
  pendiente_pago:   { label: 'Pendiente de pago', color: '#b58900', icono: '⏳', orden: 0,
                      desc: 'Esperamos la confirmación del pago del pedido.' },
  pago_aceptado:    { label: 'Pago aceptado',     color: '#2563eb', icono: '💳', orden: 1,
                      desc: 'Pago confirmado. El pedido entra en cola de preparación.' },
  preparacion:      { label: 'En preparación',    color: '#7c3aed', icono: '📦', orden: 2,
                      desc: 'Preparando tu pedido en almacén (gestión en menos de 24 h).' },
  enviado:          { label: 'Enviado',           color: '#0891b2', icono: '🚚', orden: 3,
                      desc: 'El pedido ha salido de almacén con el transportista.' },
  en_reparto:       { label: 'En reparto',        color: '#0d9488', icono: '🛵', orden: 4,
                      desc: 'El pedido está en la última milla, saliendo a reparto.' },
  entregado:        { label: 'Entregado',         color: '#16a34a', icono: '✅', orden: 5,
                      desc: 'Pedido entregado al destinatario.' },
  // Estados fuera del flujo lineal
  cancelado:        { label: 'Cancelado',         color: '#dc2626', icono: '✖️', orden: -1,
                      desc: 'El pedido ha sido cancelado.' },
  devolucion:       { label: 'Devolución solicitada', color: '#ea580c', icono: '↩️', orden: -1,
                      desc: 'Devolución en curso (plazo de 14 días).' },
  reembolsado:      { label: 'Reembolsado',       color: '#64748b', icono: '💶', orden: -1,
                      desc: 'Importe reembolsado al cliente.' },
};

/* Progresión lineal del ciclo logístico (para la barra de seguimiento) */
const FLUJO_LINEAL = ['pago_aceptado', 'preparacion', 'enviado', 'en_reparto', 'entregado'];

/* Transiciones válidas desde cada estado (gobiernan los botones del admin) */
const TRANSICIONES = {
  pendiente_pago: ['pago_aceptado', 'cancelado'],
  pago_aceptado:  ['preparacion', 'cancelado'],
  preparacion:    ['enviado', 'cancelado'],
  enviado:        ['en_reparto'],
  en_reparto:     ['entregado'],
  entregado:      ['devolucion'],
  devolucion:     ['reembolsado'],
  cancelado:      [],
  reembolsado:    [],
};

/* -------------------------------------------------------------------------
   4. MÉTODOS DE ENVÍO Y PAGO
   ------------------------------------------------------------------------- */
const ENVIO_GRATIS_DESDE = 50; // € — envío estándar gratis a partir de este importe

const METODOS_ENVIO = [
  { id: 'estandar', nombre: 'Envío estándar', desc: '24-72 h laborables · Correos Express',
    precio: 4.95, plazoDias: 3, transportista: 'Correos Express' },
  { id: 'express',  nombre: 'Envío Express 24h', desc: 'Entrega al día siguiente · SEUR',
    precio: 8.95, plazoDias: 1, transportista: 'SEUR' },
  { id: 'recogida', nombre: 'Recogida en tienda', desc: 'Molina de Segura (Murcia) · Gratis',
    precio: 0, plazoDias: 1, transportista: 'Recogida en tienda' },
];

const METODOS_PAGO = [
  { id: 'tarjeta',        nombre: 'Tarjeta de crédito/débito', icono: '💳', instantaneo: true  },
  { id: 'bizum',          nombre: 'Bizum',                     icono: '📲', instantaneo: true  },
  { id: 'transferencia',  nombre: 'Transferencia bancaria',    icono: '🏦', instantaneo: false },
  { id: 'contrareembolso',nombre: 'Contra reembolso (+2€)',    icono: '💵', instantaneo: false, recargo: 2 },
];

const DIAS_DEVOLUCION = 14; // política de devolución de la tienda

/* Exponer para app.js */
window.DATA = {
  CATEGORIAS, TALLAS, PRODUCTOS, ESTADOS, FLUJO_LINEAL, TRANSICIONES,
  METODOS_ENVIO, METODOS_PAGO, ENVIO_GRATIS_DESDE, DIAS_DEVOLUCION,
};
