/* Atalaya 360° · Mesa de trabajo · enlace común
   Cualquier mundo (simulador, sistema estratégico, personas y equipos) puede enviar trabajo a la mesa de trabajo
   de la empresa activa: A.mesa.enviar([{ t, area, mundo, origen, oid, fecha, resp, impacto }]).
   Las tareas con el mismo «oid» no se duplican. */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const P = () => A.platform;
  const LSK = () => (P() && P().k ? P().k('atalaya.agenda.v1') : 'atalaya.agenda.v1');
  const M = (A.mesa = A.mesa || {});
  M.vacia = () => ({ v: 1, tareas: [], repetitivas: [], metas: [], semana: [], reuniones: [], delegaciones: [], descartadas: [], logros: {} });
  M.cargar = async () => {
    let st = null;
    try { st = JSON.parse(localStorage.getItem(LSK())); } catch (e) { st = null; }
    if (P() && P().loadData) { try { const r = await P().loadData('agenda'); if (r) st = r; } catch (e) { /* local */ } }
    st = Object.assign(M.vacia(), st || {});
    Object.keys(M.vacia()).forEach((k) => { if (k !== 'v' && k !== 'logros' && !Array.isArray(st[k])) st[k] = []; });
    if (!st.logros || typeof st.logros !== 'object') st.logros = {};
    return st;
  };
  M.guardarYa = async (st) => { try { localStorage.setItem(LSK(), JSON.stringify(st)); } catch (e) { /* sin almacenamiento */ } if (P() && P().saveData) await P().saveData('agenda', st); };
  M.uid = () => 't' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);
  M.hoy = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  M.enviar = async (items) => {
    const st = await M.cargar();
    let n = 0;
    (items || []).forEach((x) => {
      if (!x || !x.t) return;
      if (x.oid && st.tareas.some((y) => y.oid === x.oid)) return;
      st.tareas.push(Object.assign({ id: M.uid(), entrada: M.hoy(), tipo: 'importante', estado: 'pendiente', impacto: 3, esfuerzo: 3, clave: false }, x));
      n++;
    });
    await M.guardarYa(st);
    return n;
  };
  /* Botón estándar «A mi mesa de trabajo»: devuelve el elemento ya conectado */
  M.boton = (fn, txt) => {
    const b = document.createElement('button'); b.className = 'btn ghost small mesa-btn'; b.type = 'button'; b.textContent = txt || 'A mi mesa de trabajo';
    b.onclick = async () => { b.disabled = true; try { const n = await M.enviar(fn()); b.textContent = n ? `${n} enviada${n > 1 ? 's' : ''} a la mesa` : 'Ya estaban en la mesa'; } catch (e) { b.textContent = 'No se pudo enviar'; } setTimeout(() => { b.disabled = false; b.textContent = txt || 'A mi mesa de trabajo'; }, 3500); };
    return b;
  };
})();
