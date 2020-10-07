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
COPY boot.sh .
RUN chmod +x boot.sh
ENTRYPOINT ["./boot.sh"]
