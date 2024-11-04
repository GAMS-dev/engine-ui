FROM --platform=linux/amd64 node:20 AS builder
WORKDIR /app
RUN apt-get update && \
    apt-get -y install build-essential libcairo2-dev \
    libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
RUN npm install react-scripts -g --silent
COPY package*.json ./
RUN npm install
COPY . .
ARG REACT_APP_ENGINE_URL=AAAABBBBCCCC
ARG REACT_APP_BASE_NAME=DDDDEEEEFFFF
ARG PUBLIC_URL=GGGGHHHHIIIIJJJJ
RUN npm run build

FROM --platform=linux/amd64 nginx:1.27-alpine-slim
COPY --from=builder /app/build /usr/share/nginx/engine
RUN apk update && \
    apk upgrade --available
COPY boot.sh /docker-entrypoint.d/30-fix-ui-vars.sh
RUN chmod +x /docker-entrypoint.d/30-fix-ui-vars.sh
COPY engine.conf /etc/nginx/templates/default.conf.template
COPY engine-ssl.conf /etc/nginx/templates/default.conf.template-secure
