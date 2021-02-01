FROM node:15.7.0-alpine AS builder
WORKDIR /app
RUN npm install react-scripts -g --silent
COPY package*.json ./
RUN apk add g++ make python
RUN npm install
COPY . .
RUN npm run build-css
ARG REACT_APP_ENGINE_URL=AAAABBBBCCCC
ARG REACT_APP_BASE_NAME=DDDDEEEEFFFF
RUN npm run build

FROM nginx:1.19
COPY --from=builder /app/build /usr/share/nginx/engine
COPY boot.sh /docker-entrypoint.d/30-fix-ui-vars.sh
RUN chmod +x /docker-entrypoint.d/30-fix-ui-vars.sh
COPY engine.conf /etc/nginx/templates/default.conf.template
COPY engine-ssl.conf /etc/nginx/templates/default.conf.template-secure
