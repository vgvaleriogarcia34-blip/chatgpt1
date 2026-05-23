import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { templates } from '../templates/index.js';

const IMAGES_DIR = path.resolve('public/images');

export async function renderTemplate(templateKey, params) {
  const tpl = templates[templateKey];
  if (!tpl) throw new Error(`Plantilla desconocida: ${templateKey}`);
  const svg = tpl.build(params || {});
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const id = `${templateKey}-${nanoid(10)}.png`;
  const filePath = path.join(IMAGES_DIR, id);
  await writeFile(filePath, png);
  return { id, filePath, relativeUrl: `/images/${id}` };
}

export function listTemplates() {
  return Object.entries(templates).map(([key, t]) => ({ key, name: t.name, size: t.size }));
}
