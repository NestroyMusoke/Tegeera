FROM node:24-alpine
WORKDIR /app
# Build from the repository root: docker build -f server/Dockerfile .
COPY server/package.json server/index.mjs server/engine.mjs server/sceneResponseSchema.mjs ./server/
COPY shared/*.mjs ./shared/
ENV NODE_ENV=production
USER node
CMD ["node", "server/index.mjs"]
