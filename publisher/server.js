import 'dotenv/config';
import express from 'express';
import cookieSession from 'cookie-session';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import generateRouter from './src/routes/generate.js';
import publishRouter from './src/routes/publish.js';
import authRouter from './src/routes/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(
  cookieSession({
    name: 'publisher_sess',
    keys: [process.env.SESSION_SECRET || 'dev-secret-change-me'],
    maxAge: 24 * 60 * 60 * 1000
  })
);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', authRouter);
app.use('/api/generate', generateRouter);
app.use('/api/publish', publishRouter);

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Social Publisher escuchando en http://localhost:${PORT}`);
  console.log(`PUBLIC_BASE_URL = ${process.env.PUBLIC_BASE_URL || '(sin definir)'}`);
});
