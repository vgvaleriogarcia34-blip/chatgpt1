import { Router } from 'express';
import { renderTemplate, listTemplates } from '../services/imageRenderer.js';
import {
  generateInstagramCaption,
  generateLinkedinArticle,
  generateImageBrief
} from '../services/claude.js';

const router = Router();

router.get('/templates', (req, res) => {
  res.json({ templates: listTemplates() });
});

router.post('/image', async (req, res) => {
  try {
    const { template, params } = req.body || {};
    if (!template) return res.status(400).json({ error: 'template requerido' });
    const out = await renderTemplate(template, params || {});
    res.json({ url: out.relativeUrl, id: out.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/caption', async (req, res) => {
  try {
    const text = await generateInstagramCaption(req.body || {});
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/article', async (req, res) => {
  try {
    const text = await generateLinkedinArticle(req.body || {});
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/brief', async (req, res) => {
  try {
    const brief = await generateImageBrief(req.body || {});
    res.json({ brief });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
