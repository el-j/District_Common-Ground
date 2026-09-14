# Stage 1: build
FROM node:22-alpine AS builder
WORKDIR /app

# Copy monorepo manifests and lockfile
COPY package.json package-lock.json ./
# All npm workspace packages web depends on — not just shared-types — must be
# present before `npm ci` so its workspace-package references (e.g.
# @district-cg/minigame-courier-rush) resolve instead of hitting the registry.
COPY packages/ ./packages/
COPY apps/web/package.json ./apps/web/

# Install dependencies using lockfile
RUN npm ci --ignore-scripts

# Copy web source and build
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN npm run build

# Stage 2: serve
FROM nginx:1.27-alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

