# Imagen del asistente de Familias Empresarias (Node 22 con node:sqlite)
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
# Los .md curados del conocimiento van en la imagen; la base de datos y lo descargado, en el volumen /app/datos
COPY datos/conocimiento/*.md ./datos-inicial/conocimiento/
RUN mkdir -p /app/datos && chown -R node:node /app
USER node
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8090)+'/salud').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
# Si el volumen está vacío, se copian los .md iniciales del conocimiento
CMD ["sh", "-c", "mkdir -p datos/conocimiento && cp -n datos-inicial/conocimiento/*.md datos/conocimiento/ 2>/dev/null; exec node src/servidor.js"]
