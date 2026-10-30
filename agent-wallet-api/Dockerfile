FROM node:20-bookworm-slim

RUN npm install -g @binance/agentic-wallet@1.12.0

WORKDIR /app
COPY package.json server.mjs ./
RUN mkdir -p /data/sessions && chown -R node:node /app /data

USER node
ENV PORT=10000
ENV SESSION_ROOT=/data/sessions
CMD ["npm", "start"]
