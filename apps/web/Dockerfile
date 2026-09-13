# Stage 1: build
FROM node:22-alpine AS builder
WORKDIR /app

# Copy monorepo manifests and lockfile
COPY package.json package-lock.json ./
COPY packages/shared-types ./packages/shared-types
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

