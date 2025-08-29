FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install only production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy just what this worker needs
COPY invoice-worker.js ./

# Optional healthcheck: verifies Node can start (lightweight)
HEALTHCHECK --interval=30s --timeout=3s --retries=5 CMD \
    node -e "process.exit(0)"

USER node
CMD ["node", "invoice-worker.js"]
