import axios from 'axios';

const GRAPH = 'https://graph.facebook.com/v21.0';

// Publica una imagen unica en el feed de Instagram Business.
// imageUrl tiene que ser PUBLICA y accesible desde internet (Meta la descarga).
export async function publishImage({ imageUrl, caption }) {
  const igId = process.env.IG_BUSINESS_ACCOUNT_ID;
  const token = process.env.META_LONG_LIVED_TOKEN;
  if (!igId || !token) throw new Error('Falta IG_BUSINESS_ACCOUNT_ID o META_LONG_LIVED_TOKEN en .env');

  // 1) Crear contenedor de media
  const create = await axios.post(`${GRAPH}/${igId}/media`, null, {
    params: { image_url: imageUrl, caption, access_token: token }
  });
  const creationId = create.data.id;

  // 2) Publicar contenedor
  const publish = await axios.post(`${GRAPH}/${igId}/media_publish`, null, {
    params: { creation_id: creationId, access_token: token }
  });

  return { creationId, mediaId: publish.data.id };
}

// Helpers para el OAuth: intercambia code -> short token -> long token,
// y descubre la IG business account vinculada a una Pagina de Facebook.
export async function exchangeCodeForToken({ code, redirectUri }) {
  const res = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: {
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri: redirectUri,
      code
    }
  });
  return res.data.access_token;
}

export async function exchangeForLongLivedToken(shortToken) {
  const res = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      fb_exchange_token: shortToken
    }
  });
  return res.data.access_token;
}

export async function findInstagramBusinessAccount(token) {
  const pages = await axios.get(`${GRAPH}/me/accounts`, { params: { access_token: token } });
  for (const page of pages.data.data || []) {
    const detail = await axios.get(`${GRAPH}/${page.id}`, {
      params: { fields: 'instagram_business_account', access_token: token }
    });
    const igId = detail.data.instagram_business_account?.id;
    if (igId) return { pageId: page.id, pageName: page.name, igBusinessAccountId: igId };
  }
  return null;
}
