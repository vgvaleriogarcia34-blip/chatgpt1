import axios from 'axios';
import { readFile } from 'node:fs/promises';

const API = 'https://api.linkedin.com';

// OAuth 2.0 - Authorization Code
export function authUrl(redirectUri, state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: redirectUri,
    state,
    scope: 'openid profile email w_member_social'
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export async function exchangeCodeForToken({ code, redirectUri }) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: process.env.LINKEDIN_CLIENT_ID,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET
  });
  const res = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return res.data.access_token;
}

export async function getMemberUrn(accessToken) {
  // OpenID Connect userinfo endpoint
  const res = await axios.get(`${API}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return `urn:li:person:${res.data.sub}`;
}

// Publicar un post de texto + opcionalmente imagen.
// Usa el API REST nuevo (versionado). 'X-Restli-Protocol-Version' es necesario.
export async function publishPost({ text, imagePath }) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const author = process.env.LINKEDIN_MEMBER_URN;
  if (!token || !author) throw new Error('Falta LINKEDIN_ACCESS_TOKEN o LINKEDIN_MEMBER_URN en .env');

  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202409',
    'Content-Type': 'application/json'
  };

  let mediaContent = null;
  if (imagePath) {
    // 1) initializeUpload
    const init = await axios.post(
      `${API}/rest/images?action=initializeUpload`,
      { initializeUploadRequest: { owner: author } },
      { headers }
    );
    const { uploadUrl, image } = init.data.value;

    // 2) PUT binary
    const bytes = await readFile(imagePath);
    await axios.put(uploadUrl, bytes, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' }
    });

    mediaContent = { media: { id: image, altText: 'Imagen del articulo' } };
  }

  // 3) Crear post
  const body = {
    author,
    commentary: text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: []
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
    ...(mediaContent ? { content: mediaContent } : {})
  };

  const res = await axios.post(`${API}/rest/posts`, body, { headers });
  return { postId: res.headers['x-restli-id'] || res.headers['x-linkedin-id'] || null };
}
