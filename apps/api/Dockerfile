# Stage 1: build
# Build context is the monorepo root so that packages/go/ (local plugin modules)
# are available alongside apps/api/ — required for go.mod replace directives.
FROM golang:1.26-alpine AS builder
WORKDIR /app

# Copy go.mod/go.sum first for layer caching.
COPY apps/api/go.mod apps/api/go.sum ./apps/api/

# Copy the local Go plugin modules referenced by replace directives in go.mod.
# These must be present before `go mod download` so the replace paths resolve.
COPY packages/go/ ./packages/go/

# Download dependencies (replace paths now resolvable inside the build).
RUN cd apps/api && go mod download

# Copy the full API source and build.
COPY apps/api/ ./apps/api/
RUN CGO_ENABLED=0 GOOS=linux go build -C apps/api -ldflags="-s -w" -o /app/server ./cmd/server

# Stage 2: wget for health check (separate layer — no Go toolchain in final image)
FROM alpine:3.21 AS health
RUN apk --no-cache add wget

# Stage 3: minimal runtime
FROM scratch
COPY --from=builder /app/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=health /usr/bin/wget /usr/bin/wget
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD ["/usr/bin/wget", "-qO-", "http://localhost:8080/health"]
ENTRYPOINT ["/server"]
