# Imagen del API Gateway (también entrega la página web)
FROM node:24-alpine

ENV NODE_ENV=production

WORKDIR /app/api-gateway

COPY api-gateway/package.json api-gateway/package-lock.json ./
RUN npm ci --omit=dev

COPY api-gateway/gateway.js ./

# La página (frontend). El gateway la busca en ../public, es decir, en /app/public
COPY public /app/public

USER node

EXPOSE 8000
CMD ["node", "gateway.js"]