#!/bin/sh

if [ -z "${ENGINE_URL+x}" ]; then
  echo "ENGINE_URL is unset, using default /api"
  export ENGINE_URL=/api
fi

if [ -z "${BASE_URL+x}" ]; then
  echo "BASE_URL is unset, using default /"
  export BASE_URL=/
fi

if [ -z "${ENGINE_HTTP_PORT+x}" ]; then
  echo "ENGINE_HTTP_PORT is unset, using default 80"
  export ENGINE_HTTP_PORT=80
fi

if [ "$DISABLE_REQUEST_LIMIT" = "true" ]; then
  echo "DISABLE_REQUEST_LIMIT is set to true, disabling request limiting"
  sed -i '/^limit_req/d' /etc/nginx/conf.d/default.conf
fi

if [ -n "${mount_url+x}" ] && [ "$mount_url" != "" ] &&
  [ "$mount_url" != "/" ] && [ "$mount_url" != "/engine" ]; then
  ln -s /usr/share/nginx/engine "/usr/share/nginx${mount_url}"
fi

sed -i -E "s/listen [0-9]+;/listen ${ENGINE_HTTP_PORT};/" /etc/nginx/conf.d/default.conf

RUNTIME_CONFIG_DIR="/var/run/engine-ui-config"
mkdir -p "$RUNTIME_CONFIG_DIR"
cat >"$RUNTIME_CONFIG_DIR/env-config.js" <<EOF
window.__RUNTIME_CONFIG__ = {
  ENGINE_URL: "${ENGINE_URL}",
  BASE_URL: "${BASE_URL}",
};
EOF
