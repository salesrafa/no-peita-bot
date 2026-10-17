FROM --platform=linux/amd64 node:20-slim

# System dependencies for Chromium, plus tini as the init process: it forwards
# SIGTERM to node and reaps Chromium's child processes.
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    tini \
    --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# .npmrc must be present before installing (legacy-peer-deps — see the file).
COPY package*.json .npmrc ./
RUN npm install
COPY . .
# Compile at build time so the container can start node directly (see CMD).
RUN npm run build

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 3000

# Start node directly under tini instead of `npm start`. With `npm start`
# (npm -> sh -> node) the SIGTERM sent on deploy never reached node, so the
# graceful WhatsApp shutdown never ran and Chromium was killed mid-write,
# which can corrupt the session saved on the volume.
# -s: Railway runs its own init as PID 1, so tini must register as a child
# subreaper to adopt (and reap) orphaned Chromium processes.
ENTRYPOINT ["/usr/bin/tini", "-s", "--"]
CMD ["node", "dist/index.js"]
