FROM node:alpine AS builder
WORKDIR /app
RUN npm install react-scripts -g --silent
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build-css
ARG REACT_APP_ENGINE_URL=AAAABBBBCCCC
ARG REACT_APP_BASE_NAME=DDDDEEEEFFFF
RUN npm run build

FROM nginx:latest
COPY --from=builder /app/build /usr/share/nginx/engine
COPY boot.sh /docker-entrypoint.d/30-fix-ui-vars.sh
RUN chmod +x /docker-entrypoint.d/30-fix-ui-vars.sh
