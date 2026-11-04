# Imagen de Atalaya 360° (web + servidor). Node 22 trae node:sqlite: la base es un fichero SQLite en el volumen /datos.
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev && npm cache clean --force
COPY . .
RUN mkdir -p /datos && chown -R node:node /datos /app
USER node
WORKDIR /app/server
ENV PORT=8080 ATALAYA_DATA=/datos TRUST_PROXY=1 COOKIE_SECURE=1
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server.mjs"]
