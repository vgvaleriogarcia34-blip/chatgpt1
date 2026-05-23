import { Router } from 'express';
import path from 'node:path';
import { publishImage as igPublishImage } from '../services/instagram.js';
import { publishPost as liPublishPost } from '../services/linkedin.js';

const router = Router();

router.post('/instagram', async (req, res) => {
  try {
    const { imageUrl, imageId, caption } = req.body || {};
    // imageUrl debe ser publica (Meta la descarga). Si solo pasan imageId, montamos la URL absoluta.
    const finalUrl =
      imageUrl ||
      (imageId ? `${process.env.PUBLIC_BASE_URL?.replace(/\/$/, '')}/images/${imageId}` : null);
    if (!finalUrl) return res.status(400).json({ error: 'imageUrl o imageId requerido' });
    const result = await igPublishImage({ imageUrl: finalUrl, caption: caption || '' });
    res.json({ ok: true, ...result, imageUrl: finalUrl });
  } catch (e) {
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

router.post('/linkedin', async (req, res) => {
  try {
    const { text, imageId } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text requerido' });
    const imagePath = imageId ? path.resolve('public/images', imageId) : null;
    const result = await liPublishPost({ text, imagePath });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

export default router;
