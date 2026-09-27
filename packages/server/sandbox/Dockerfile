FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bubblewrap ca-certificates g++ make python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/openmuse
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/openmuse/ms-playwright
COPY package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund --legacy-peer-deps \
  && ./node_modules/.bin/playwright install --with-deps chromium \
  && chown -R node:node /opt/openmuse/ms-playwright
COPY run-one.mjs openmuse.patch.yml openmuse.browser.patch.yml ./
RUN mkdir -p /openmuse && chown node:node /openmuse
USER node
