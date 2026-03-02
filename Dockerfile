FROM --platform=linux/amd64 node:25 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_ENGINE_URL=AAAABBBBCCCC
ARG VITE_BASE_NAME=DDDDEEEEFFFF
ARG PUBLIC_URL=GGGGHHHHIIIIJJJJ
RUN npm run build

FROM --platform=linux/amd64 nginx:1.29-alpine-slim
COPY --from=builder /app/build /usr/share/nginx/engine
RUN apk update && \
    apk upgrade --available
COPY boot.sh /docker-entrypoint.d/30-fix-ui-vars.sh
RUN chmod +x /docker-entrypoint.d/30-fix-ui-vars.sh
COPY engine.conf /etc/nginx/templates/default.conf.template
COPY engine-ssl.conf /etc/nginx/templates/default.conf.template-secure
