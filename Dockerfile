FROM node:22-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# .env.production (public VITE_* values) is read here and baked into the bundle.
RUN npm run build

ENV NODE_ENV=production
# Cloud Run sets PORT; server.ts listens on it.
CMD ["npm", "start"]
