/* Atalaya 360° · Datos del titular: FAMILIAS EMPRESARIAS, S.L.
   ÚNICO SITIO donde se escriben los datos identificativos de la sociedad que exigen el artículo 10 de la LSSI y el
   artículo 13 del RGPD. Los usan:
   · las páginas legales (aviso-legal, privacidad, cookies y condiciones): cada elemento con data-titular="campo" se
     rellena con el valor; si el valor está vacío, conserva el texto neutro que trae («(en trámite de publicación)»).
     Los elementos con data-titular-si="campo" solo se muestran si ese campo tiene valor (p. ej., el delegado de
     protección de datos);
   · el módulo «Contrato» (js/intervencion/contrato.js): valores por defecto del Consultor cuando la ficha de la firma
     está vacía. Lo escrito en la ficha de la firma o en el propio contrato manda sobre estos valores.
   No invente ningún dato: rellene solo lo que conste en la escritura, el Registro Mercantil o la AEAT. */
(function (raiz) {
  'use strict';
  const T = {
    razonSocial: 'FAMILIAS EMPRESARIAS, S.L.',
    nombreComercial: 'Business Avance International Consulting',
    nif: '',              // NIF de la sociedad, p. ej. «B12345678»
    domicilio: '',        // domicilio social completo: calle, número, código postal, localidad y provincia
    registro: '',         // inscripción: «Registro Mercantil de …, tomo …, folio …, hoja …, inscripción …»
    email: '',            // correo de contacto general (avisos, bajas, consultas sobre el servicio)
    emailPrivacidad: '',  // correo para protección de datos; si se deja vacío, se usa «email»
    telefono: '+34 678 447 296',
    dpd: '',              // delegado de protección de datos (nombre y correo), solo si se ha designado; vacío: no se muestra
    firmanteCargo: '',    // cargo de quien firma por la sociedad: «administrador único», «consejero delegado», «apoderado»…
    seguroRC: '',         // seguro de responsabilidad civil profesional: «Compañía, póliza n.º …» (vacío: la cláusula no sale)
    correoProveedor: '',  // empresa que envía los correos del servicio (servidor SMTP configurado en SMTP_HOST)
    correoUbicacion: ''   // país o región donde ese proveedor trata los datos, p. ej. «Unión Europea (Alemania)»
  };
  const CORREOS = ['email', 'emailPrivacidad'];
  const valor = (k) => String((k === 'emailPrivacidad' ? T.emailPrivacidad || T.email : T[k]) || '').trim();

  function rellenar(doc) {
    doc.querySelectorAll('[data-titular]').forEach((el) => {
      const k = el.getAttribute('data-titular'), v = valor(k);
      if (!v) return; // se queda el texto neutro que trae la página
      if (CORREOS.includes(k)) { el.textContent = ''; const a = doc.createElement('a'); a.href = 'mailto:' + v; a.textContent = v; el.appendChild(a); } else el.textContent = v;
      el.classList.add('tt-ok');
    });
    doc.querySelectorAll('[data-titular-si]').forEach((el) => { el.hidden = !valor(el.getAttribute('data-titular-si')); });
  }

  const API = Object.assign({}, T, { valor, rellenar });
  if (typeof module === 'object' && module.exports) module.exports = API;
  if (!raiz) return;
  raiz.Atalaya = raiz.Atalaya || {};
  raiz.Atalaya.titular = API;
  if (raiz.document) {
    if (raiz.document.readyState === 'loading') raiz.document.addEventListener('DOMContentLoaded', () => rellenar(raiz.document));
    else rellenar(raiz.document);
  }
})(typeof window !== 'undefined' ? window : null);
