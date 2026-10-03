/* Atalaya · Personas y equipos · Test a distancia: catálogo y código de respuesta
   Lo comparten la aplicación y la página pública del test (test.html).
   · Catálogo de test que se pueden responder a distancia, con su forma de guardar las respuestas.
   · Código de respuesta: las respuestas caben en un código corto (letras y números, sin confusiones)
     que la persona entrega a su responsable. Funciona sin servidor. Lleva una huella de a quién y a qué
     tarea corresponde y un control que detecta los errores al copiarlo. */
(function () {
  const A = (window.Atalaya = window.Atalaya || {});
  const H = A.personasDatos, L = A.liderazgoDatos;
  const C = (A.testCodigo = {});
  const F = ['D', 'I', 'S', 'C'];

  /* Cada test: letra del código, nombre, minutos, nº de respuestas, base de cada dígito y conversión */
  C.TESTS = {
    disc: { letra: 'D', n: 'Estilo de comportamiento (DISC)', min: 8, len: () => H.DISC_BLOQUES.length, base: 16,
      aDig: (r) => r.map((x) => F.indexOf(x.mas) * 4 + F.indexOf(x.menos)), deDig: (d) => d.map((v) => ({ mas: F[v >> 2], menos: F[v & 3] })),
      valida: (r) => r.every((x) => x && F.includes(x.mas) && F.includes(x.menos) && x.mas !== x.menos) },
    roles: { letra: 'R', n: 'Aportaciones al equipo', min: 7, len: () => H.ROLES_ITEMS.length, base: 5,
      aDig: (r) => r.map((v) => +v), deDig: (d) => d, valida: (r) => r.every((v) => Number.isInteger(v) && v >= 0 && v <= 4) },
    enea: { letra: 'E', n: 'Motivación (eneagrama)', min: 7, len: () => H.ENEA_ITEMS.length, base: 5,
      aDig: (r) => r.map((v) => v - 1), deDig: (d) => d.map((v) => v + 1), valida: (r) => r.every((v) => Number.isInteger(v) && v >= 1 && v <= 5) },
    lid: { letra: 'M', n: 'Estilo de liderazgo', min: 10, len: () => L.SITUACIONES.length, base: 4,
      aDig: (r) => r.map((v) => v - 1), deDig: (d) => d.map((v) => v + 1), valida: (r) => r.every((v) => Number.isInteger(v) && v >= 1 && v <= 4) },
    lid360: { letra: 'V', n: 'Cómo dirige su responsable', min: 10, len: () => L.SITUACIONES.length, base: 4,
      aDig: (r) => r.map((v) => v - 1), deDig: (d) => d.map((v) => v + 1), valida: (r) => r.every((v) => Number.isInteger(v) && v >= 1 && v <= 4) },
    prep: { letra: 'P', n: 'Preparación para una tarea', min: 3, len: () => L.PREP_ITEMS.length, base: 5,
      aDig: (r) => r.map((v) => v - 1), deDig: (d) => d.map((v) => v + 1), valida: (r) => r.every((v) => Number.isInteger(v) && v >= 1 && v <= 5) }
  };
  C.porLetra = (l) => Object.keys(C.TESTS).find((k) => C.TESTS[k].letra === l);
  C.valida = (test, resp) => { const T = C.TESTS[test]; return !!(T && Array.isArray(resp) && resp.length === T.len() && T.valida(resp)); };

  /* Alfabeto sin I, L, O ni U para que no se confundan al copiarlo */
  const AB = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  C.huella = (pid, tid) => { const h = hash(String(pid || '') + '|' + String(tid || '')) % 1024; return AB[h >> 5] + AB[h & 31]; };
  const control = (s) => { const h = hash('atalaya·' + s) % 1024; return AB[h >> 5] + AB[h & 31]; };
  const aB32 = (digs, base) => { let n = 0n; const B = BigInt(base); for (let i = digs.length - 1; i >= 0; i--) n = n * B + BigInt(digs[i]); let s = ''; do { s = AB[Number(n % 32n)] + s; n /= 32n; } while (n > 0n); return s; };
  const deB32 = (s, base, len) => { let n = 0n; for (const ch of s) { const v = AB.indexOf(ch); if (v < 0) throw new Error('Carácter no válido'); n = n * 32n + BigInt(v); } const B = BigInt(base), d = []; for (let i = 0; i < len; i++) { d.push(Number(n % B)); n /= B; } if (n > 0n) throw new Error('Código demasiado largo'); return d; };

  /* Código: letra del test + huella (2) + respuestas + control (2), en grupos de cuatro */
  // La fecha de nacimiento (opcional) va al final, tras una U (letra que no usa el alfabeto), en días desde 1900
  const D0 = Date.UTC(1900, 0, 1);
  const fechaA = (f) => { const n = Math.round((Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)) - D0) / 864e5); return n >= 0 && n < 32768 ? aB32([n], 32768).padStart(3, '0') : ''; };
  const fechaDe = (s) => { const n = deB32(s, 32768, 1)[0]; return new Date(D0 + n * 864e5).toISOString().slice(0, 10); };
  C.codificar = (test, resp, pid, tid, nacimiento) => {
    const T = C.TESTS[test];
    const fe = nacimiento && /^\d{4}-\d{2}-\d{2}$/.test(nacimiento) ? fechaA(nacimiento) : '';
    const cuerpo = T.letra + C.huella(pid, tid) + aB32(T.aDig(resp), T.base) + (fe ? 'U' + fe : '');
    return (cuerpo + control(cuerpo)).match(/.{1,4}/g).join('-');
  };
  C.decodificar = (code) => {
    const s = String(code || '').toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
    if (s.length < 6) throw new Error('El código está incompleto.');
    const test = C.porLetra(s[0]); if (!test) throw new Error('El código no corresponde a ningún test.');
    const cuerpo = s.slice(0, -2);
    if (control(cuerpo) !== s.slice(-2)) throw new Error('El código tiene algún carácter mal copiado. Revíselo.');
    const partes = cuerpo.slice(3).split('U');
    const T = C.TESTS[test], resp = T.deDig(deB32(partes[0], T.base, T.len()));
    if (!T.valida(resp)) throw new Error('El código no contiene respuestas válidas.');
    return { test, huella: cuerpo.slice(1, 3), resp, nacimiento: partes[1] ? fechaDe(partes[1]) : null };
  };

  /* Enlace sin servidor: los datos de la invitación viajan en el propio enlace */
  const b64 = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const deb64 = (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
  C.paqueteEnlace = (o) => b64(o);
  C.leerPaquete = (s) => deb64(s);
})();
