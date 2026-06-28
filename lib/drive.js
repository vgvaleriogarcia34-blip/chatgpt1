'use strict';

/**
 * Integración con Google Drive.
 *
 * Lee los documentos de Google Docs que están dentro de la carpeta
 * "Articulos blog generados" (Círculo de Claridad) y exporta su texto.
 *
 * Autenticación: cuenta de servicio (service account). Se configura con la
 * variable de entorno GOOGLE_SERVICE_ACCOUNT_JSON (el JSON completo de la
 * clave) y se comparte la carpeta de Drive con el email de esa cuenta.
 */

const { google } = require('googleapis');

const FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1f-po96lSMY3uaNYYEd-d8eP8gWyqxWyk';

let driveClient = null;

function getCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      'Falta GOOGLE_SERVICE_ACCOUNT_JSON. Añade el JSON de la cuenta de servicio ' +
        'en los Secrets de Replit (ver README).'
    );
  }
  try {
    // Acepta tanto el JSON tal cual como una versión con \n escapados.
    return JSON.parse(raw);
  } catch (err) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON no es un JSON válido: ' + err.message);
  }
}

function getDrive() {
  if (driveClient) return driveClient;
  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

/**
 * Lista los Google Docs dentro de la carpeta configurada.
 * Devuelve metadatos (id, título, fechas) ordenados del más reciente al más antiguo.
 */
async function listArticleDocs() {
  const drive = getDrive();
  const files = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q:
        `'${FOLDER_ID}' in parents and ` +
        `mimeType = 'application/vnd.google-apps.document' and trashed = false`,
      fields: 'nextPageToken, files(id, name, createdTime, modifiedTime)',
      orderBy: 'createdTime desc',
      pageSize: 100,
      pageToken: pageToken || undefined,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    files.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return files;
}

/**
 * Exporta el contenido de un Google Doc como texto plano.
 */
async function exportDocText(fileId) {
  const drive = getDrive();
  const res = await drive.files.export(
    { fileId, mimeType: 'text/plain' },
    { responseType: 'text' }
  );
  return typeof res.data === 'string' ? res.data : String(res.data);
}

module.exports = { listArticleDocs, exportDocText, FOLDER_ID };
