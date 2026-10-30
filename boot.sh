#!/bin/sh

if [ -z "${ENGINE_URL+x}" ]; then
  echo "ENGINE_URL is unset, using default /api"
  export ENGINE_URL=/api
fi

# Both go into JS string literals below, and BASE_URL also into the nginx
# config's sub_filter '<head><base href="...">', so refuse characters that
# would end a string early. A URL carries them percent-encoded anyway.
newline='
'
# $1: variable name, $2: its value.
reject_unsafe() {
  case "$2" in
    *\"* | *\'* | *\\* | *"$newline"* | *"$(printf '\r')"*)
      echo "$1 must not contain quotes, backslashes or line breaks" >&2
      exit 1
      ;;
  esac
}
reject_unsafe ENGINE_URL "$ENGINE_URL"
reject_unsafe BASE_URL "$BASE_URL"

RUNTIME_CONFIG_DIR="/tmp/engine-ui-config"
mkdir -p "$RUNTIME_CONFIG_DIR"
cat >"$RUNTIME_CONFIG_DIR/env-config.js" <<EOF
window.__RUNTIME_CONFIG__ = {
  ENGINE_URL: "${ENGINE_URL}",
  BASE_URL: "${BASE_URL}",
};
EOF
