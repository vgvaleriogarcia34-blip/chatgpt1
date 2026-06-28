'use strict';

/**
 * Ejecuta una única sincronización con Drive y termina.
 * Útil para probar la conexión:  npm run sync
 */

const store = require('../lib/store');

(async () => {
  store.loadCache();
  const result = await store.sync();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result && result.ok === false ? 1 : 0);
})();
