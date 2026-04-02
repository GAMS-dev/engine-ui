FROM --platform=linux/amd64 denoland/deno:debian-2.7.10 AS builder
WORKDIR /app
COPY package.json deno.lock ./
RUN deno install --frozen
COPY . .
ARG VITE_ENGINE_URL=AAAABBBBCCCC
ARG VITE_BASE_NAME=DDDDEEEEFFFF
ARG PUBLIC_URL=GGGGHHHHIIIIJJJJ
RUN deno task build

FROM --platform=linux/amd64 nginx:1.29-alpine-slim
COPY --from=builder /app/build /usr/share/nginx/engine
RUN apk update && \
    apk upgrade --available
COPY boot.sh /docker-entrypoint.d/30-fix-ui-vars.sh
RUN chmod +x /docker-entrypoint.d/30-fix-ui-vars.sh
COPY engine.conf /etc/nginx/templates/default.conf.template
COPY engine-ssl.conf /etc/nginx/templates/default.conf.template-secure
