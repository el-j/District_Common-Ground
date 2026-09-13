# Stage 1: build
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/server

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
