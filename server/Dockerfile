FROM node:24-alpine
WORKDIR /app
COPY package.json index.mjs engine.mjs ./
ENV NODE_ENV=production
USER node
CMD ["node", "index.mjs"]
