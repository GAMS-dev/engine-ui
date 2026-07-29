FROM denoland/deno:debian-2.7.10 AS builder
WORKDIR /app
COPY package.json deno.lock ./
RUN deno install --frozen
COPY . .
RUN deno task build

FROM nginxinc/nginx-unprivileged:1.30-alpine
USER root
COPY --from=builder /app/build /usr/share/nginx/engine
RUN apk update && \
    apk upgrade --available
COPY boot.sh /docker-entrypoint.d/30-fix-ui-vars.sh
RUN chmod +x /docker-entrypoint.d/30-fix-ui-vars.sh
COPY engine.conf /etc/nginx/templates/default.conf.template
COPY engine-ssl.conf /etc/nginx/templates/default.conf.template-secure
USER 101
