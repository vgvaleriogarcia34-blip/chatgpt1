/* Escribe el guion para la voz (escenas.json) a partir del motor y de la empresa modelo */
global.window = global; global.matchMedia = () => ({ matches: false }); global.document = { addEventListener(){}, readyState: 'complete' };
const base = require('path').resolve(__dirname, '../../js') + '/';
['sectors.js','engine.js','modelo/datos.js','video/guion.js'].forEach(f => require(base + f));
const V = window.Atalaya.videoModelo, R = V.calcular(), D = V.guion(R, V.DECIR);
const hash = (t) => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
require('fs').writeFileSync(process.argv[2], JSON.stringify(D.map(e => ({ id: e.id, voz: e.texto, h: hash(e.texto) }))));
