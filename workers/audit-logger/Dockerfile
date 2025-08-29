FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Copy and install deps first (cache-friendly)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy app code
COPY . .

# Optional healthcheck: quick syntax check + connection-free start probe
HEALTHCHECK --interval=30s --timeout=3s --retries=5 CMD \
    node -e "require('./index.js'); process.exit(0)"

USER node
CMD ["node", "index.js"]
