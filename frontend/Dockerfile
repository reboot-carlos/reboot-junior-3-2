# ── Étape 1 : construire le site ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --silent

COPY . .
RUN NODE_ENV=production npm run build

# ── Étape 2 : servir le site avec nginx ───────────────────────────────────────
# nginx sert les fichiers statiques ET redirige /api vers le backend.
FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

EXPOSE 80

# envsubst remplace ${PORT} et ${BACKEND_URL} par leurs vraies valeurs au démarrage
CMD ["/bin/sh", "-c", "envsubst '${PORT} ${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
