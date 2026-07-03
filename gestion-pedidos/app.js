/* =========================================================================
   LÓGICA — Gestión de pedidos y entrega
   SPA en vanilla JS con enrutado por hash y persistencia en localStorage.
   Modela el ciclo completo: tienda → carrito → checkout → pedido →
   preparación → envío → reparto → entrega → devolución.
   ========================================================================= */
(function () {
  'use strict';

  const {
    CATEGORIAS, PRODUCTOS, ESTADOS, FLUJO_LINEAL, TRANSICIONES,
    METODOS_ENVIO, METODOS_PAGO, ENVIO_GRATIS_DESDE, DIAS_DEVOLUCION,
  } = window.DATA;

  const app = document.getElementById('app');
  const LS_KEY = 'protonepis_pedidos_v1';

  /* --------------------------------------------------------------------- */
  /*  Estado persistente                                                    */
  /* --------------------------------------------------------------------- */
  const defaultState = () => ({ cart: [], orders: [], counter: 1000, checkout: {} });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { /* ignora datos corruptos */ }
    return seed();
  }
  function save() { localStorage.setItem(LS_KEY, JSON.stringify(state)); }

  /* Semilla: dos pedidos de ejemplo en distintas fases del ciclo */
  function seed() {
    const s = defaultState();
    const p1 = PRODUCTOS.find(p => p.id === 'up-redlion');
    const p2 = PRODUCTOS.find(p => p.id === 'showa-nitrilo');
    const p3 = PRODUCTOS.find(p => p.id === 'valento-altavis');

    const ejemplo1 = buildOrder({
      cliente: { nombre: 'Taller Mecánico García S.L.', email: 'compras@tallergarcia.es', telefono: '968 45 12 30' },
      direccion: { calle: 'C/ Mayor 14', cp: '30500', ciudad: 'Molina de Segura', provincia: 'Murcia' },
      lineas: [ lineFrom(p1, '43', 2), lineFrom(p2, 'L', 10) ],
      envioId: 'estandar', pagoId: 'tarjeta',
    }, s);
    // Avanza el ejemplo 1 hasta "en reparto"
    ['preparacion', 'enviado', 'en_reparto'].forEach(e => applyTransition(ejemplo1, e, true));
    ejemplo1.tracking = 'CE-8842019ES';

    const ejemplo2 = buildOrder({
      cliente: { nombre: 'Construcciones Levante', email: 'pedidos@construccioneslevante.com', telefono: '966 11 22 33' },
      direccion: { calle: 'Pol. Ind. Tapiado, Nave 7', cp: '03203', ciudad: 'Elche', provincia: 'Alicante' },
      lineas: [ lineFrom(p3, 'XL', 4) ],
      envioId: 'express', pagoId: 'transferencia',
    }, s);
    // Ejemplo 2 queda pendiente de pago (transferencia sin confirmar)

    s.orders = [ejemplo2, ejemplo1];
    return s;
  }

  /* --------------------------------------------------------------------- */
  /*  Utilidades                                                            */
  /* --------------------------------------------------------------------- */
  const eur = n => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  const byId = id => PRODUCTOS.find(p => p.id === id);
  const catById = id => CATEGORIAS.find(c => c.id === id);

  function fmtDate(iso, withTime) {
    const d = new Date(iso);
    const opts = withTime
      ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'long', year: 'numeric' };
    return d.toLocaleDateString('es-ES', opts);
  }
  function addDays(iso, days) {
    const d = new Date(iso); d.setDate(d.getDate() + days); return d.toISOString();
  }
  function esc(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function lineFrom(prod, talla, cantidad) {
    return { id: prod.id, nombre: prod.nombre, marca: prod.marca, icono: prod.icono,
             talla, cantidad, precio: prod.precio };
  }

  /* --------------------------------------------------------------------- */
  /*  Carrito                                                               */
  /* --------------------------------------------------------------------- */
  const cartCount = () => state.cart.reduce((n, l) => n + l.cantidad, 0);
  const cartSubtotal = () => state.cart.reduce((s, l) => s + l.precio * l.cantidad, 0);

  function addToCart(prodId, talla, cantidad) {
    const prod = byId(prodId);
    const existing = state.cart.find(l => l.id === prodId && l.talla === talla);
    if (existing) existing.cantidad += cantidad;
    else state.cart.push(lineFrom(prod, talla, cantidad));
    save(); updateBadge();
    toast(`Añadido: ${prod.nombre} (talla ${talla}) ×${cantidad}`);
  }
  function updateBadge() { document.getElementById('cartBadge').textContent = cartCount(); }

  /* --------------------------------------------------------------------- */
  /*  Construcción y ciclo de vida del pedido                               */
  /* --------------------------------------------------------------------- */
  function buildOrder({ cliente, direccion, lineas, envioId, pagoId }, targetState) {
    const st = targetState || state;
    const envio = METODOS_ENVIO.find(e => e.id === envioId);
    const pago = METODOS_PAGO.find(p => p.id === pagoId);
    const subtotal = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
    const envioCoste = (envio.id === 'estandar' && subtotal >= ENVIO_GRATIS_DESDE) ? 0 : envio.precio;
    const recargo = pago.recargo || 0;
    const total = subtotal + envioCoste + recargo;

    st.counter += 1;
    const ref = 'PE-' + st.counter;
    const now = new Date().toISOString();

    // Pagos instantáneos entran ya como "pago aceptado"; el resto, pendientes.
    const estadoInicial = pago.instantaneo ? 'pago_aceptado' : 'pendiente_pago';

    return {
      ref, fecha: now,
      cliente, direccion, lineas,
      envio: { id: envio.id, nombre: envio.nombre, precio: envioCoste, transportista: envio.transportista, plazoDias: envio.plazoDias },
      pago: { id: pago.id, nombre: pago.nombre, recargo },
      subtotal, envioCoste, recargo, total,
      estado: estadoInicial,
      tracking: null,
      entregaEstimada: addDays(now, envio.plazoDias + 1),
      historial: [{ estado: estadoInicial, ts: now }],
    };
  }

  /* Aplica una transición de estado y registra el historial. */
  function applyTransition(order, nuevoEstado, silent) {
    order.estado = nuevoEstado;
    const ts = new Date().toISOString();
    order.historial.push({ estado: nuevoEstado, ts });
    if (nuevoEstado === 'enviado' && !order.tracking) {
      order.tracking = generarTracking(order);
    }
    if (nuevoEstado === 'entregado') {
      order.entregadoEl = ts;
      order.devolucionHasta = addDays(ts, DIAS_DEVOLUCION);
    }
    if (!silent) save();
  }

  function generarTracking(order) {
    const pref = { 'Correos Express': 'CE', 'SEUR': 'SEUR', 'Recogida en tienda': 'REC' }[order.envio.transportista] || 'TRK';
    const num = Math.floor(1000000 + Math.random() * 8999999);
    return `${pref}-${num}ES`;
  }

  /* --------------------------------------------------------------------- */
  /*  Router                                                                */
  /* --------------------------------------------------------------------- */
  const routes = [
    { re: /^\/?$/,                    fn: () => viewShop(null) },
    { re: /^\/tienda$/,               fn: () => viewShop(null) },
    { re: /^\/categoria\/(.+)$/,      fn: m => viewShop(m[1]) },
    { re: /^\/producto\/(.+)$/,       fn: m => viewProduct(m[1]) },
    { re: /^\/carrito$/,              fn: () => viewCart() },
    { re: /^\/checkout$/,             fn: () => viewCheckout() },
    { re: /^\/confirmacion\/(.+)$/,   fn: m => viewConfirm(m[1]) },
    { re: /^\/mis-pedidos$/,          fn: () => viewMyOrders() },
    { re: /^\/pedido\/(.+)$/,         fn: m => viewOrderDetail(m[1]) },
    { re: /^\/admin$/,                fn: () => viewAdmin() },
  ];

  function router() {
    const hash = location.hash.replace(/^#/, '') || '/tienda';
    const path = hash.split('?')[0];
    for (const r of routes) {
      const m = path.match(r.re);
      if (m) { r.fn(m); highlightNav(path); window.scrollTo(0, 0); return; }
    }
    app.innerHTML = notFound();
  }

  function highlightNav(path) {
    document.querySelectorAll('.header-nav a[data-nav]').forEach(a => a.classList.remove('active'));
    const key = path.includes('admin') ? 'admin'
      : path.includes('mis-pedidos') || path.includes('pedido') ? 'mis-pedidos'
      : path.includes('carrito') || path.includes('checkout') ? 'carrito' : 'tienda';
    const el = document.querySelector(`.header-nav a[data-nav="${key}"]`);
    if (el) el.classList.add('active');
  }

  /* --------------------------------------------------------------------- */
  /*  Vista: Tienda                                                         */
  /* --------------------------------------------------------------------- */
  function viewShop(catId, search) {
    const q = (search || '').toLowerCase();
    let prods = PRODUCTOS;
    if (catId) prods = prods.filter(p => p.categoria === catId);
    if (q) prods = prods.filter(p => (p.nombre + p.marca + p.desc).toLowerCase().includes(q));

    const cat = catId ? catById(catId) : null;
    const cats = CATEGORIAS.map(c =>
      `<li><a href="#/categoria/${c.id}" class="${c.id === catId ? 'active' : ''}">${c.icono} ${c.nombre}</a></li>`
    ).join('');

    const cards = prods.map(p => {
      const badge = p.precioAnterior ? `<span class="product-badge">OFERTA</span>` : '';
      const norms = p.normas.map(n => `<span class="norm-tag">${esc(n)}</span>`).join('');
      const old = p.precioAnterior ? `<span class="price-old">${eur(p.precioAnterior)}</span>` : '';
      return `
        <div class="product-card" data-link="#/producto/${p.id}">
          <div class="product-thumb">${badge}${p.icono}</div>
          <div class="product-body">
            <span class="product-brand">${esc(p.marca)}</span>
            <span class="product-name">${esc(p.nombre)}</span>
            <div class="product-norms">${norms}</div>
            <div class="product-price"><span class="price-now">${eur(p.precio)}</span>${old}</div>
          </div>
        </div>`;
    }).join('') || `<div class="empty-state"><div class="emoji">🔍</div><h2>Sin resultados</h2><p>No hay productos que coincidan.</p></div>`;

    app.innerHTML = `
      <div class="breadcrumb"><a href="#/tienda">Tienda</a>${cat ? ' / ' + esc(cat.nombre) : ''}${q ? ' / Búsqueda: "' + esc(q) + '"' : ''}</div>
      <h1 class="page-title">${cat ? esc(cat.nombre) : 'Catálogo de EPIs y protección laboral'}</h1>
      <p class="page-sub">Selecciona productos, añádelos al carrito y sigue el ciclo completo del pedido hasta su entrega.</p>
      <div class="shop-layout">
        <aside class="cat-sidebar">
          <h3>Categorías</h3>
          <ul class="cat-list">
            <li><a href="#/tienda" class="${!catId ? 'active' : ''}">🏬 Todos los productos</a></li>
            ${cats}
          </ul>
        </aside>
        <div class="product-grid">${cards}</div>
      </div>`;
  }

  /* --------------------------------------------------------------------- */
  /*  Vista: Ficha de producto                                              */
  /* --------------------------------------------------------------------- */
  function viewProduct(id) {
    const p = byId(id);
    if (!p) { app.innerHTML = notFound(); return; }
    const cat = catById(p.categoria);
    const old = p.precioAnterior ? `<span class="price-old">${eur(p.precioAnterior)}</span>` : '';
    const norms = p.normas.map(n => `<span class="norm-tag">${esc(n)}</span>`).join('');
    const sizes = p.tallas.map(t => {
      const disabled = p.stock[t] <= 0;
      return `<button class="size-btn" data-size="${t}" ${disabled ? 'disabled' : ''}>${t}</button>`;
    }).join('');

    app.innerHTML = `
      <div class="breadcrumb"><a href="#/tienda">Tienda</a> / <a href="#/categoria/${cat.id}">${esc(cat.nombre)}</a> / ${esc(p.nombre)}</div>
      <div class="product-detail">
        <div class="pd-media">${p.icono}</div>
        <div class="pd-info">
          <span class="product-brand">${esc(p.marca)}</span>
          <h1>${esc(p.nombre)}</h1>
          <div class="product-norms">${norms}</div>
          <div class="pd-price">${eur(p.precio)} ${old}</div>
          <p class="pd-desc">${esc(p.desc)}</p>

          <div class="size-label">Selecciona talla${cat.tipoTalla === 'calzado' ? ' (calzado)' : ''}:</div>
          <div class="size-grid" id="sizeGrid">${sizes}</div>

          <div class="qty-row">
            <div class="qty-ctrl">
              <button data-qty="-1">−</button><span id="qtyVal">1</span><button data-qty="1">+</button>
            </div>
            <span class="stock-note" id="stockNote">Selecciona una talla</span>
          </div>

          <button class="btn btn-primary btn-block" id="btnAdd" disabled>🛒 Añadir al carrito</button>
        </div>
      </div>`;

    // Interacción local de la ficha
    let talla = null, qty = 1;
    const sizeGrid = document.getElementById('sizeGrid');
    const stockNote = document.getElementById('stockNote');
    const btnAdd = document.getElementById('btnAdd');
    const qtyVal = document.getElementById('qtyVal');

    sizeGrid.addEventListener('click', e => {
      const b = e.target.closest('.size-btn'); if (!b || b.disabled) return;
      sizeGrid.querySelectorAll('.size-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); talla = b.dataset.size; qty = 1; qtyVal.textContent = 1;
      const stock = p.stock[talla];
      stockNote.textContent = stock <= 5 ? `¡Solo quedan ${stock} uds!` : `${stock} uds en stock`;
      stockNote.className = 'stock-note' + (stock <= 5 ? ' low' : '');
      btnAdd.disabled = false;
    });
    app.querySelector('.qty-row').addEventListener('click', e => {
      const b = e.target.closest('[data-qty]'); if (!b || !talla) return;
      const max = p.stock[talla];
      qty = Math.min(max, Math.max(1, qty + parseInt(b.dataset.qty, 10)));
      qtyVal.textContent = qty;
    });
    btnAdd.addEventListener('click', () => {
      if (!talla) return;
      addToCart(p.id, talla, qty);
    });
  }

  /* --------------------------------------------------------------------- */
  /*  Vista: Carrito                                                        */
  /* --------------------------------------------------------------------- */
  function viewCart() {
    if (state.cart.length === 0) {
      app.innerHTML = `
        <div class="empty-state">
          <div class="emoji">🛒</div><h2>Tu carrito está vacío</h2>
          <p>Añade EPIs desde el catálogo para iniciar un pedido.</p>
          <a href="#/tienda" class="btn btn-primary">Ir a la tienda</a>
        </div>`;
      return;
    }

    const items = state.cart.map((l, i) => `
      <div class="cart-item">
        <div class="cart-item-thumb">${l.icono}</div>
        <div>
          <div class="cart-item-name">${esc(l.nombre)}</div>
          <div class="cart-item-meta">${esc(l.marca)} · Talla ${esc(l.talla)} · ${eur(l.precio)}/ud</div>
          <a class="link-remove" data-remove="${i}">Eliminar</a>
        </div>
        <div class="cart-item-actions">
          <div class="qty-ctrl">
            <button data-cqty="${i}:-1">−</button><span>${l.cantidad}</span><button data-cqty="${i}:1">+</button>
          </div>
          <span class="cart-item-price">${eur(l.precio * l.cantidad)}</span>
        </div>
      </div>`).join('');

    const sub = cartSubtotal();
    const falta = Math.max(0, ENVIO_GRATIS_DESDE - sub);
    const pct = Math.min(100, (sub / ENVIO_GRATIS_DESDE) * 100);
    const shipMsg = falta > 0
      ? `Te faltan <strong>${eur(falta)}</strong> para el envío estándar gratis.`
      : `🎉 ¡Tienes envío estándar <strong>gratis</strong>!`;

    app.innerHTML = `
      <h1 class="page-title">Tu carrito</h1>
      <p class="page-sub">${cartCount()} artículo(s). Revisa y continúa al pago.</p>
      <div class="cart-layout">
        <div class="cart-items">${items}</div>
        <div class="summary-card">
          <h3>Resumen</h3>
          <div class="free-ship-bar">
            <div class="free-ship-track"><div class="free-ship-fill" style="width:${pct}%"></div></div>
            <div class="free-ship-msg">${shipMsg}</div>
          </div>
          <div class="summary-row"><span>Subtotal</span><span>${eur(sub)}</span></div>
          <div class="summary-row muted"><span>Envío</span><span>Se calcula en el pago</span></div>
          <div class="summary-total"><span>Total</span><span>${eur(sub)}</span></div>
          <a href="#/checkout" class="btn btn-primary btn-block" style="margin-top:16px">Finalizar compra →</a>
          <a href="#/tienda" class="btn btn-ghost btn-block" style="margin-top:10px">Seguir comprando</a>
        </div>
      </div>`;

    app.addEventListener('click', function handler(e) {
      const rm = e.target.closest('[data-remove]');
      const cq = e.target.closest('[data-cqty]');
      if (rm) {
        state.cart.splice(parseInt(rm.dataset.remove, 10), 1);
        save(); updateBadge(); viewCart();
      } else if (cq) {
        const [i, d] = cq.dataset.cqty.split(':').map(Number);
        const line = state.cart[i];
        const max = byId(line.id).stock[line.talla];
        line.cantidad = Math.min(max, Math.max(1, line.cantidad + d));
        save(); updateBadge(); viewCart();
      }
    }, { once: true });
  }

  /* --------------------------------------------------------------------- */
  /*  Vista: Checkout                                                       */
  /* --------------------------------------------------------------------- */
  function viewCheckout() {
    if (state.cart.length === 0) { location.hash = '#/carrito'; return; }
    const c = state.checkout || {};
    c.envioId = c.envioId || 'estandar';
    c.pagoId = c.pagoId || 'tarjeta';

    const sub = cartSubtotal();

    const envios = METODOS_ENVIO.map(e => {
      const coste = (e.id === 'estandar' && sub >= ENVIO_GRATIS_DESDE) ? 0 : e.precio;
      const precioTxt = coste === 0 ? 'Gratis' : eur(coste);
      return `
        <label class="option-card ${c.envioId === e.id ? 'active' : ''}" data-envio="${e.id}">
          <input type="radio" name="envio" ${c.envioId === e.id ? 'checked' : ''}>
          <span class="option-main">
            <span class="option-name">${e.nombre}</span>
            <span class="option-desc">${e.desc}</span>
          </span>
          <span class="option-price">${precioTxt}</span>
        </label>`;
    }).join('');

    const pagos = METODOS_PAGO.map(p => `
        <label class="option-card ${c.pagoId === p.id ? 'active' : ''}" data-pago="${p.id}">
          <input type="radio" name="pago" ${c.pagoId === p.id ? 'checked' : ''}>
          <span class="option-icon">${p.icono}</span>
          <span class="option-main">
            <span class="option-name">${p.nombre}</span>
            <span class="option-desc">${p.instantaneo ? 'Confirmación inmediata del pago' : 'El pedido queda pendiente hasta confirmar el pago'}</span>
          </span>
        </label>`).join('');

    app.innerHTML = `
      <div class="breadcrumb"><a href="#/carrito">Carrito</a> / Finalizar compra</div>
      <h1 class="page-title">Finalizar compra</h1>
      <p class="page-sub">Completa los datos de entrega y elige envío y pago.</p>
      <div class="checkout-layout">
        <form id="checkoutForm">
          <div class="checkout-section">
            <h3>👤 Datos de contacto</h3>
            <div class="form-grid">
              <div class="form-field full"><label>Nombre / Empresa *</label><input name="nombre" value="${esc(c.nombre||'')}" required></div>
              <div class="form-field"><label>Email *</label><input name="email" type="email" value="${esc(c.email||'')}" required></div>
              <div class="form-field"><label>Teléfono *</label><input name="telefono" value="${esc(c.telefono||'')}" required></div>
            </div>
          </div>

          <div class="checkout-section">
            <h3>📍 Dirección de entrega</h3>
            <div class="form-grid">
              <div class="form-field full"><label>Dirección *</label><input name="calle" value="${esc(c.calle||'')}" required></div>
              <div class="form-field"><label>Código postal *</label><input name="cp" value="${esc(c.cp||'')}" required></div>
              <div class="form-field"><label>Población *</label><input name="ciudad" value="${esc(c.ciudad||'')}" required></div>
              <div class="form-field full"><label>Provincia *</label><input name="provincia" value="${esc(c.provincia||'')}" required></div>
            </div>
          </div>

          <div class="checkout-section">
            <h3>🚚 Método de envío</h3>
            <p class="section-hint">Los pedidos se preparan en menos de 24 h. El plazo depende del transportista.</p>
            <div id="enviosBox">${envios}</div>
          </div>

          <div class="checkout-section">
            <h3>💳 Método de pago</h3>
            <div id="pagosBox">${pagos}</div>
          </div>
        </form>

        <div class="summary-card" id="checkoutSummary"></div>
      </div>`;

    // Recalcula el resumen y guarda el estado del formulario.
    function readForm() {
      const fd = new FormData(document.getElementById('checkoutForm'));
      Object.assign(c, Object.fromEntries(fd.entries()));
      state.checkout = c; save();
    }
    function renderSummary() {
      const envio = METODOS_ENVIO.find(e => e.id === c.envioId);
      const pago = METODOS_PAGO.find(p => p.id === c.pagoId);
      const envioCoste = (envio.id === 'estandar' && sub >= ENVIO_GRATIS_DESDE) ? 0 : envio.precio;
      const recargo = pago.recargo || 0;
      const total = sub + envioCoste + recargo;
      document.getElementById('checkoutSummary').innerHTML = `
        <h3>Resumen del pedido</h3>
        <div class="summary-row"><span>Subtotal (${cartCount()} art.)</span><span>${eur(sub)}</span></div>
        <div class="summary-row"><span>Envío · ${esc(envio.nombre)}</span><span>${envioCoste === 0 ? 'Gratis' : eur(envioCoste)}</span></div>
        ${recargo ? `<div class="summary-row"><span>Recargo ${esc(pago.nombre)}</span><span>${eur(recargo)}</span></div>` : ''}
        <div class="summary-total"><span>Total</span><span>${eur(total)}</span></div>
        <div class="free-ship-msg" style="margin:8px 0 4px">Entrega estimada: <strong>${fmtDate(addDays(new Date().toISOString(), envio.plazoDias + 1))}</strong></div>
        <button class="btn btn-primary btn-block" id="btnPlace" style="margin-top:14px">✅ Confirmar pedido</button>`;

      document.getElementById('btnPlace').addEventListener('click', placeOrder);
    }

    // Listeners de selección de envío/pago
    document.getElementById('enviosBox').addEventListener('click', e => {
      const l = e.target.closest('[data-envio]'); if (!l) return;
      c.envioId = l.dataset.envio; save();
      document.querySelectorAll('#enviosBox .option-card').forEach(x => x.classList.toggle('active', x === l));
      l.querySelector('input').checked = true; renderSummary();
    });
    document.getElementById('pagosBox').addEventListener('click', e => {
      const l = e.target.closest('[data-pago]'); if (!l) return;
      c.pagoId = l.dataset.pago; save();
      document.querySelectorAll('#pagosBox .option-card').forEach(x => x.classList.toggle('active', x === l));
      l.querySelector('input').checked = true; renderSummary();
    });
    document.getElementById('checkoutForm').addEventListener('input', readForm);

    renderSummary();
  }

  function placeOrder() {
    const form = document.getElementById('checkoutForm');
    const requeridos = ['nombre', 'email', 'telefono', 'calle', 'cp', 'ciudad', 'provincia'];
    let ok = true;
    requeridos.forEach(name => {
      const input = form.querySelector(`[name="${name}"]`);
      if (!input.value.trim()) { input.classList.add('error'); ok = false; }
      else input.classList.remove('error');
    });
    if (!ok) { toast('⚠️ Completa todos los campos obligatorios'); return; }

    const fd = Object.fromEntries(new FormData(form).entries());
    const order = buildOrder({
      cliente: { nombre: fd.nombre, email: fd.email, telefono: fd.telefono },
      direccion: { calle: fd.calle, cp: fd.cp, ciudad: fd.ciudad, provincia: fd.provincia },
      lineas: state.cart.map(l => ({ ...l })),
      envioId: state.checkout.envioId || 'estandar',
      pagoId: state.checkout.pagoId || 'tarjeta',
    });
    state.orders.unshift(order);
    state.cart = [];
    state.checkout = {};
    save(); updateBadge();
    location.hash = '#/confirmacion/' + order.ref;
  }

  /* --------------------------------------------------------------------- */
  /*  Vista: Confirmación                                                   */
  /* --------------------------------------------------------------------- */
  function viewConfirm(ref) {
    const order = state.orders.find(o => o.ref === ref);
    if (!order) { app.innerHTML = notFound(); return; }
    const pendiente = order.estado === 'pendiente_pago';
    app.innerHTML = `
      <div class="confirm-hero">
        <div class="confirm-check">✓</div>
        <h1>¡Pedido recibido!</h1>
        <p class="page-sub">Gracias, ${esc(order.cliente.nombre)}. Hemos registrado tu pedido.</p>
        <div class="ref">${esc(order.ref)}</div>
        <div class="delivery-box ${pendiente ? 'warn' : 'alt'}" style="max-width:520px;margin:20px auto 0;text-align:left">
          <span class="delivery-icon">${pendiente ? '🏦' : '📦'}</span>
          <div>
            <div class="delivery-title">${pendiente ? 'Pendiente de pago' : 'En cola de preparación'}</div>
            <div class="delivery-text">${pendiente
              ? 'Realiza el pago por ' + esc(order.pago.nombre.toLowerCase()) + ' para que preparemos tu pedido.'
              : 'Prepararemos tu pedido en menos de 24 h. Entrega estimada: ' + fmtDate(order.entregaEstimada) + '.'}</div>
          </div>
        </div>
        <div style="margin-top:24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <a href="#/pedido/${order.ref}" class="btn btn-primary">Ver seguimiento</a>
          <a href="#/tienda" class="btn btn-ghost">Volver a la tienda</a>
        </div>
      </div>`;
  }

  /* --------------------------------------------------------------------- */
  /*  Vista: Mis pedidos                                                    */
  /* --------------------------------------------------------------------- */
  function viewMyOrders() {
    if (state.orders.length === 0) {
      app.innerHTML = `
        <div class="empty-state"><div class="emoji">📦</div><h2>Aún no hay pedidos</h2>
        <p>Cuando realices un pedido aparecerá aquí con su seguimiento.</p>
        <a href="#/tienda" class="btn btn-primary">Ir a la tienda</a></div>`;
      return;
    }
    const cards = state.orders.map(o => orderCardHTML(o)).join('');
    app.innerHTML = `
      <h1 class="page-title">Mis pedidos</h1>
      <p class="page-sub">Historial y seguimiento de entregas.</p>
      ${cards}`;
  }

  function orderCardHTML(o) {
    const st = ESTADOS[o.estado];
    const lineas = o.lineas.map(l =>
      `<div class="order-line"><span class="order-line-name">${l.icono} ${esc(l.nombre)} <span class="order-line-qty">(T. ${esc(l.talla)} ×${l.cantidad})</span></span><span>${eur(l.precio * l.cantidad)}</span></div>`
    ).join('');
    return `
      <div class="order-card">
        <div class="order-head">
          <div>
            <div class="order-ref">${esc(o.ref)}</div>
            <div class="order-meta">${fmtDate(o.fecha, true)} · ${esc(o.cliente.nombre)}</div>
          </div>
          <span class="status-badge" style="background:${st.color}">${st.icono} ${st.label}</span>
        </div>
        <div class="order-lines">${lineas}</div>
        <div class="order-foot">
          <span class="order-total">${eur(o.total)}</span>
          <a href="#/pedido/${o.ref}" class="btn btn-ghost btn-sm">Ver seguimiento →</a>
        </div>
      </div>`;
  }

  /* --------------------------------------------------------------------- */
  /*  Vista: Detalle / seguimiento de un pedido                             */
  /* --------------------------------------------------------------------- */
  function viewOrderDetail(ref) {
    const o = state.orders.find(x => x.ref === ref);
    if (!o) { app.innerHTML = notFound(); return; }
    const st = ESTADOS[o.estado];

    // Barra de seguimiento lineal
    let trackerHTML = '';
    const especial = ['cancelado', 'devolucion', 'reembolsado'].includes(o.estado);
    if (!especial) {
      const idxActual = o.estado === 'pendiente_pago' ? -1 : FLUJO_LINEAL.indexOf(o.estado);
      const steps = FLUJO_LINEAL.map((e, i) => {
        const cls = i < idxActual ? 'done' : i === idxActual ? 'current' : '';
        const info = ESTADOS[e];
        return `<div class="tracker-step ${cls}"><div class="tracker-dot">${info.icono}</div><div class="tracker-label">${info.label}</div></div>`;
      }).join('');
      const fillPct = idxActual <= 0 ? 0 : (idxActual / (FLUJO_LINEAL.length - 1)) * 88;
      trackerHTML = `<div class="tracker"><div class="tracker-fill" style="width:${fillPct}%"></div>${steps}</div>`;
    }

    // Caja de entrega según estado
    let deliveryBox = '';
    if (o.estado === 'pendiente_pago') {
      deliveryBox = box('warn', '🏦', 'Pendiente de pago', `Esperando el pago por ${esc(o.pago.nombre.toLowerCase())}.`);
    } else if (o.estado === 'entregado') {
      deliveryBox = box('', '✅', 'Pedido entregado', `Entregado el ${fmtDate(o.entregadoEl, true)}. Dispones de ${DIAS_DEVOLUCION} días para devoluciones (hasta el ${fmtDate(o.devolucionHasta)}).`);
    } else if (o.estado === 'cancelado') {
      deliveryBox = box('warn', '✖️', 'Pedido cancelado', 'Este pedido ha sido cancelado.');
    } else if (o.estado === 'devolucion') {
      deliveryBox = box('warn', '↩️', 'Devolución en curso', 'Estamos gestionando la devolución de tu pedido.');
    } else if (o.estado === 'reembolsado') {
      deliveryBox = box('alt', '💶', 'Reembolsado', `Se ha reembolsado ${eur(o.total)}.`);
    } else if (o.tracking) {
      deliveryBox = box('alt', '🚚', `${esc(o.envio.transportista)} · ${esc(o.tracking)}`,
        `Entrega estimada: ${fmtDate(o.entregaEstimada)}. ${st.desc}`);
    } else {
      deliveryBox = box('alt', '📦', st.label, st.desc + ` Entrega estimada: ${fmtDate(o.entregaEstimada)}.`);
    }

    const lineas = o.lineas.map(l =>
      `<div class="order-line"><span class="order-line-name">${l.icono} ${esc(l.nombre)} <span class="order-line-qty">· ${esc(l.marca)} · Talla ${esc(l.talla)} ×${l.cantidad}</span></span><span>${eur(l.precio * l.cantidad)}</span></div>`
    ).join('');

    const historial = [...o.historial].reverse().map(h =>
      `<li class="history-item"><div class="history-what">${ESTADOS[h.estado].icono} ${ESTADOS[h.estado].label}</div><div class="history-when">${fmtDate(h.ts, true)}</div></li>`
    ).join('');

    app.innerHTML = `
      <div class="breadcrumb"><a href="#/mis-pedidos">Mis pedidos</a> / ${esc(o.ref)}</div>
      <div class="order-head" style="align-items:center;border:none">
        <div><h1 class="page-title">Pedido ${esc(o.ref)}</h1>
        <p class="order-meta">Realizado el ${fmtDate(o.fecha, true)}</p></div>
        <span class="status-badge" style="background:${st.color}">${st.icono} ${st.label}</span>
      </div>

      ${trackerHTML}
      ${deliveryBox}

      <div class="checkout-layout" style="margin-top:24px">
        <div>
          <div class="checkout-section">
            <h3>📋 Artículos</h3>
            <div class="order-lines">${lineas}</div>
            <div class="order-foot"><span>Subtotal</span><span>${eur(o.subtotal)}</span></div>
            <div class="summary-row"><span>Envío (${esc(o.envio.nombre)})</span><span>${o.envioCoste === 0 ? 'Gratis' : eur(o.envioCoste)}</span></div>
            ${o.recargo ? `<div class="summary-row"><span>Recargo pago</span><span>${eur(o.recargo)}</span></div>` : ''}
            <div class="summary-total"><span>Total</span><span>${eur(o.total)}</span></div>
          </div>
          <div class="checkout-section">
            <h3>🕓 Historial del pedido</h3>
            <ul class="history-list">${historial}</ul>
          </div>
        </div>
        <div class="summary-card">
          <h3>📦 Envío</h3>
          <div class="summary-row"><span>Método</span><span>${esc(o.envio.nombre)}</span></div>
          <div class="summary-row"><span>Transportista</span><span>${esc(o.envio.transportista)}</span></div>
          <div class="summary-row"><span>Seguimiento</span><span>${o.tracking ? esc(o.tracking) : '—'}</span></div>
          <h3 style="margin-top:18px">📍 Dirección</h3>
          <p class="order-meta">${esc(o.cliente.nombre)}<br>${esc(o.direccion.calle)}<br>${esc(o.direccion.cp)} ${esc(o.direccion.ciudad)} (${esc(o.direccion.provincia)})<br>${esc(o.cliente.telefono)}</p>
        </div>
      </div>`;
  }

  function box(cls, icon, title, text) {
    return `<div class="delivery-box ${cls}"><span class="delivery-icon">${icon}</span><div><div class="delivery-title">${title}</div><div class="delivery-text">${text}</div></div></div>`;
  }

  /* --------------------------------------------------------------------- */
  /*  Vista: Panel de gestión (back-office)                                 */
  /* --------------------------------------------------------------------- */
  let adminFiltro = 'todos';

  function viewAdmin() {
    const orders = state.orders;
    const activos = orders.filter(o => !['entregado', 'cancelado', 'reembolsado'].includes(o.estado));
    const porPreparar = orders.filter(o => o.estado === 'pago_aceptado' || o.estado === 'preparacion');
    const enCamino = orders.filter(o => o.estado === 'enviado' || o.estado === 'en_reparto');
    const facturado = orders.filter(o => o.estado !== 'cancelado').reduce((s, o) => s + o.total, 0);

    const filtros = [
      ['todos', 'Todos'], ['pendiente_pago', 'Pendientes de pago'], ['preparacion', 'En preparación'],
      ['enviado', 'En camino'], ['entregado', 'Entregados'], ['devolucion', 'Devoluciones'],
    ].map(([k, label]) =>
      `<button class="admin-filter ${adminFiltro === k ? 'active' : ''}" data-filtro="${k}">${label}</button>`
    ).join('');

    let visibles = orders;
    if (adminFiltro === 'enviado') visibles = enCamino;
    else if (adminFiltro !== 'todos') visibles = orders.filter(o => o.estado === adminFiltro);

    const filas = visibles.map(o => adminRow(o)).join('') ||
      `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:30px">Sin pedidos en este filtro.</td></tr>`;

    app.innerHTML = `
      <h1 class="page-title">⚙️ Gestión de pedidos</h1>
      <p class="page-sub">Panel de back-office: procesa pagos, prepara pedidos, gestiona envíos y entregas.</p>

      <div class="admin-stats">
        <div class="stat-card"><div class="stat-value">${orders.length}</div><div class="stat-label">Pedidos totales</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--orange)">${porPreparar.length}</div><div class="stat-label">Por preparar</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#0891b2">${enCamino.length}</div><div class="stat-label">En camino</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--green)">${eur(facturado)}</div><div class="stat-label">Facturado</div></div>
      </div>

      <div class="admin-toolbar">${filtros}</div>

      <table class="admin-table">
        <thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Envío</th><th>Acciones</th></tr></thead>
        <tbody id="adminBody">${filas}</tbody>
      </table>`;

    // Filtros
    app.querySelector('.admin-toolbar').addEventListener('click', e => {
      const b = e.target.closest('[data-filtro]'); if (!b) return;
      adminFiltro = b.dataset.filtro; viewAdmin();
    });

    // Acciones sobre pedidos (delegación)
    document.getElementById('adminBody').addEventListener('click', onAdminAction);
  }

  function adminRow(o) {
    const st = ESTADOS[o.estado];
    const acciones = TRANSICIONES[o.estado].map(next => {
      const info = ESTADOS[next];
      const danger = (next === 'cancelado') ? 'style="color:#dc2626;border-color:#fecaca"' : '';
      return `<button class="btn btn-ghost btn-sm" data-accion="${o.ref}:${next}" ${danger}>${info.icono} ${accionLabel(next)}</button>`;
    }).join('');
    const trackingCell = (o.estado === 'preparacion')
      ? `<div class="tracking-input"><input placeholder="Nº seguimiento (auto)" data-track-input="${o.ref}"><button class="btn btn-dark btn-sm" data-set-track="${o.ref}">Asignar</button></div>`
      : (o.tracking ? `<span class="norm-tag">${esc(o.tracking)}</span>` : '—');

    return `
      <tr>
        <td><a href="#/pedido/${o.ref}" style="font-weight:700;color:var(--navy)">${esc(o.ref)}</a><br><span class="order-meta">${fmtDate(o.fecha)}</span></td>
        <td>${esc(o.cliente.nombre)}<br><span class="order-meta">${esc(o.direccion.ciudad)}</span></td>
        <td><strong>${eur(o.total)}</strong><br><span class="order-meta">${esc(o.pago.nombre)}</span></td>
        <td><span class="status-badge" style="background:${st.color}">${st.icono} ${st.label}</span></td>
        <td>${esc(o.envio.nombre)}<br>${trackingCell}</td>
        <td><div class="admin-actions">${acciones || '<span class="order-meta">—</span>'}</div></td>
      </tr>`;
  }

  function accionLabel(estado) {
    return {
      pago_aceptado: 'Confirmar pago', preparacion: 'Preparar', enviado: 'Marcar enviado',
      en_reparto: 'En reparto', entregado: 'Marcar entregado', cancelado: 'Cancelar',
      devolucion: 'Devolución', reembolsado: 'Reembolsar',
    }[estado] || ESTADOS[estado].label;
  }

  function onAdminAction(e) {
    const acc = e.target.closest('[data-accion]');
    const setTrack = e.target.closest('[data-set-track]');
    if (acc) {
      const [ref, next] = acc.dataset.accion.split(':');
      const o = state.orders.find(x => x.ref === ref);
      if (!o) return;
      if (next === 'cancelado' && !confirm(`¿Cancelar el pedido ${ref}?`)) return;
      applyTransition(o, next);
      toast(`${ref} → ${ESTADOS[next].label}`);
      viewAdmin();
    } else if (setTrack) {
      const ref = setTrack.dataset.setTrack;
      const o = state.orders.find(x => x.ref === ref);
      const input = document.querySelector(`[data-track-input="${ref}"]`);
      o.tracking = (input && input.value.trim()) || generarTracking(o);
      save();
      toast(`Nº de seguimiento asignado a ${ref}: ${o.tracking}`);
      viewAdmin();
    }
  }

  /* --------------------------------------------------------------------- */
  /*  Búsqueda global                                                       */
  /* --------------------------------------------------------------------- */
  const buscador = document.getElementById('buscador');
  buscador.addEventListener('input', () => {
    const q = buscador.value.trim();
    if (q.length >= 2) viewShop(null, q);
    else if (location.hash.replace('#', '') !== '/tienda') { /* nada */ }
    else viewShop(null);
  });

  /* --------------------------------------------------------------------- */
  /*  Navegación por tarjetas (data-link) y reset                           */
  /* --------------------------------------------------------------------- */
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-link]');
    if (link) location.hash = link.dataset.link;
  });

  document.getElementById('btnReset').addEventListener('click', () => {
    if (!confirm('¿Reiniciar todos los datos de demostración?')) return;
    localStorage.removeItem(LS_KEY);
    state = seed(); save(); updateBadge();
    location.hash = '#/tienda'; router();
    toast('Datos de demostración reiniciados');
  });

  /* --------------------------------------------------------------------- */
  /*  Arranque                                                              */
  /* --------------------------------------------------------------------- */
  function notFound() {
    return `<div class="empty-state"><div class="emoji">🧭</div><h2>Página no encontrada</h2>
      <p>La ruta solicitada no existe.</p><a href="#/tienda" class="btn btn-primary">Ir a la tienda</a></div>`;
  }

  window.addEventListener('hashchange', router);
  updateBadge();
  router();
})();
