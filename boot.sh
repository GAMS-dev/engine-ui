#!/bin/sh

if [ -z "${ENGINE_URL+x}" ]; then
  echo "ENGINE_URL is unset, using default /api"
  export ENGINE_URL=/api
fi

if [ -z "${BASE_URL+x}" ]; then
  echo "BASE_URL is unset, using default /"
  export BASE_URL=/
fi

if [ "$DISABLE_REQUEST_LIMIT" = "true" ]; then
  echo "DISABLE_REQUEST_LIMIT is set to true, disabling request limiting"
  sed -i '/^limit_req/d' /etc/nginx/conf.d/default.conf
fi

RUNTIME_CONFIG_DIR="/tmp/engine-ui-config"
mkdir -p "$RUNTIME_CONFIG_DIR"
cat >"$RUNTIME_CONFIG_DIR/env-config.js" <<EOF
window.__RUNTIME_CONFIG__ = {
  ENGINE_URL: "${ENGINE_URL}",
  BASE_URL: "${BASE_URL}",
};
EOF
