import { Router } from 'express';
import crypto from 'node:crypto';
import {
  exchangeCodeForToken as igExchange,
  exchangeForLongLivedToken,
  findInstagramBusinessAccount
} from '../services/instagram.js';
import {
  authUrl as liAuthUrl,
  exchangeCodeForToken as liExchange,
  getMemberUrn
} from '../services/linkedin.js';

const router = Router();

const baseUrl = () => process.env.PUBLIC_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

// ---------- Instagram (via Meta / Facebook Login) ----------
router.get('/instagram', (req, res) => {
  const redirectUri = `${baseUrl()}/auth/instagram/callback`;
  const state = crypto.randomBytes(16).toString('hex');
  req.session.metaState = state;
  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_show_list',
    'pages_read_engagement',
    'business_management'
  ].join(',');
  const url =
    `https://www.facebook.com/v21.0/dialog/oauth?` +
    `client_id=${process.env.META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}` +
    `&scope=${scopes}`;
  res.redirect(url);
});

router.get('/instagram/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Falta code');
    if (state !== req.session.metaState) return res.status(400).send('state invalido');
    const redirectUri = `${baseUrl()}/auth/instagram/callback`;
    const shortToken = await igExchange({ code, redirectUri });
    const longToken = await exchangeForLongLivedToken(shortToken);
    const account = await findInstagramBusinessAccount(longToken);
    if (!account) {
      return res
        .status(400)
        .send(
          'No se encontro ninguna cuenta de Instagram Business vinculada a tus Paginas de Facebook.'
        );
    }
    res.type('html').send(`
      <h2>Instagram conectado</h2>
      <p>Anade a tu <code>.env</code>:</p>
      <pre style="background:#111;color:#0f0;padding:16px;border-radius:8px">
META_LONG_LIVED_TOKEN=${longToken}
IG_BUSINESS_ACCOUNT_ID=${account.igBusinessAccountId}
      </pre>
      <p>Pagina: <b>${account.pageName}</b> (id ${account.pageId})</p>
      <p>Despues reinicia el servidor.</p>
      <a href="/">Volver</a>
    `);
  } catch (e) {
    res.status(500).send(`<pre>${JSON.stringify(e.response?.data || e.message, null, 2)}</pre>`);
  }
});

// ---------- LinkedIn ----------
router.get('/linkedin', (req, res) => {
  const redirectUri = `${baseUrl()}/auth/linkedin/callback`;
  const state = crypto.randomBytes(16).toString('hex');
  req.session.liState = state;
  res.redirect(liAuthUrl(redirectUri, state));
});

router.get('/linkedin/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Falta code');
    if (state !== req.session.liState) return res.status(400).send('state invalido');
    const redirectUri = `${baseUrl()}/auth/linkedin/callback`;
    const accessToken = await liExchange({ code, redirectUri });
    const memberUrn = await getMemberUrn(accessToken);
    res.type('html').send(`
      <h2>LinkedIn conectado</h2>
      <p>Anade a tu <code>.env</code>:</p>
      <pre style="background:#111;color:#0f0;padding:16px;border-radius:8px">
LINKEDIN_ACCESS_TOKEN=${accessToken}
LINKEDIN_MEMBER_URN=${memberUrn}
      </pre>
      <p>Despues reinicia el servidor.</p>
      <a href="/">Volver</a>
    `);
  } catch (e) {
    res.status(500).send(`<pre>${JSON.stringify(e.response?.data || e.message, null, 2)}</pre>`);
  }
});

// ---------- Status ----------
router.get('/status', (req, res) => {
  res.json({
    instagram: Boolean(process.env.META_LONG_LIVED_TOKEN && process.env.IG_BUSINESS_ACCOUNT_ID),
    linkedin: Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_MEMBER_URN),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY)
  });
});

export default router;
