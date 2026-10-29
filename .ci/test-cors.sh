#!/bin/sh
# End-to-end smoke test for engine.conf's CORS support (see
# CORS_ALLOWED_ORIGINS/CORS_ALLOWED_ORIGIN_REGEX in engine-ui-defaults.envsh)
# and for serving the UI under a sub-path - builds the real production image
# and curls the running container, rather than just checking the rendered
# nginx config parses. Run from the repo root: sh .ci/test-cors.sh
set -eu

IMAGE_TAG="engine-ui-cors-test:local"
CONTAINER_NAME="engine-ui-cors-test"
PORT=18080
TEST_HOST="${CORS_TEST_HOST:-127.0.0.1}"
BASE_URL="http://$TEST_HOST:$PORT"
# Where the UI is mounted (mount_url and the UI's BASE_URL).
MOUNT_PATH=/

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

fail() {
  echo "FAIL: $1" >&2
  docker logs "$CONTAINER_NAME" >&2 || true
  exit 1
}

# $1: header name (exact case, as nginx emits it), $2: raw header dump.
# grep finding nothing is expected (a missing header, e.g. for a disallowed
# origin) - `|| true` keeps that from reading as an error.
header_value() {
  printf '%s' "$2" | { grep "^$1: " || true; } | tr -d '\r' | sed "s/^$1: //"
}

# $@: extra `docker run -e ...` args, e.g. `-e CORS_ALLOWED_ORIGINS=...`.
# The app-specific vars below aren't set anywhere in this repo (supplied by
# the deployment), so a nonexistent uwsgi upstream is fine: the CORS
# headers are added at server level with `always`, so they land even on
# the resulting 502.
run_container() {
  cleanup
  docker run -d --name "$CONTAINER_NAME" \
    -p "$PORT:8080" \
    -e ENGINE_HTTP_PORT=8080 \
    -e mount_api_url=/api \
    -e uwsgi_pass_url=127.0.0.1:9999 \
    -e root_url=/usr/share/nginx/engine \
    -e mount_url="$MOUNT_PATH" \
    -e BASE_URL="$MOUNT_PATH" \
    "$@" \
    "$IMAGE_TAG" >/dev/null

  for _ in $(seq 1 30); do
    if curl -fso /dev/null --max-time 2 "$BASE_URL${MOUNT_PATH}env-config.js"; then
      return 0
    fi
    sleep 0.5
  done
  fail "nginx never became ready"
}

echo "Building the production image..."
docker build -t "$IMAGE_TAG" . >/dev/null

echo "=== CORS enabled (vscode.dev, insiders.vscode.dev allowed) ==="
run_container -e CORS_ALLOWED_ORIGINS=https://vscode.dev,https://insiders.vscode.dev

echo "- an allowed origin is reflected back"
headers=$(curl -s --max-time 5 -D - -o /dev/null \
  -H "Origin: https://vscode.dev" "$BASE_URL/api/whatever")
acao=$(header_value "Access-Control-Allow-Origin" "$headers")
[ "$acao" = "https://vscode.dev" ] ||
  fail "expected ACAO=https://vscode.dev, got '$acao'"

echo "- the second origin in the comma-separated list is also reflected"
headers=$(curl -s --max-time 5 -D - -o /dev/null \
  -H "Origin: https://insiders.vscode.dev" "$BASE_URL/api/whatever")
acao=$(header_value "Access-Control-Allow-Origin" "$headers")
[ "$acao" = "https://insiders.vscode.dev" ] ||
  fail "expected ACAO=https://insiders.vscode.dev, got '$acao'"

echo "- a non-whitelisted origin gets no ACAO header"
headers=$(curl -s --max-time 5 -D - -o /dev/null \
  -H "Origin: https://evil.example" "$BASE_URL/api/whatever")
acao=$(header_value "Access-Control-Allow-Origin" "$headers")
[ -z "$acao" ] ||
  fail "expected no ACAO header for a disallowed origin, got '$acao'"

echo "- an OPTIONS preflight short-circuits with 204 and echoes the requested headers"
preflight_headers=$(curl -s --max-time 5 -D - -o /dev/null -w '\n%{http_code}\n' \
  -X OPTIONS \
  -H "Origin: https://vscode.dev" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type" \
  "$BASE_URL/api/whatever")
status=$(printf '%s\n' "$preflight_headers" | tail -1)
[ "$status" = "204" ] || fail "expected 204 from an OPTIONS preflight, got $status"
acao=$(header_value "Access-Control-Allow-Origin" "$preflight_headers")
[ "$acao" = "https://vscode.dev" ] ||
  fail "expected ACAO=https://vscode.dev on the preflight, got '$acao'"
acah=$(header_value "Access-Control-Allow-Headers" "$preflight_headers")
[ "$acah" = "Authorization, Content-Type" ] ||
  fail "expected ACAH to echo the request, got '$acah'"

echo "=== CORS disabled (no CORS_ALLOWED_ORIGINS) ==="
run_container

echo "- no origin gets reflected, even one that would otherwise be allowed"
headers=$(curl -s --max-time 5 -D - -o /dev/null \
  -H "Origin: https://vscode.dev" "$BASE_URL/api/whatever")
acao=$(header_value "Access-Control-Allow-Origin" "$headers")
[ -z "$acao" ] ||
  fail "expected CORS to be off by default, but got ACAO='$acao'"

echo "=== Mounted under a sub-path ==="
MOUNT_PATH=/engine-ui/
run_container

echo "- the runtime config is served (uncached) under the mount path"
config=$(curl -s --max-time 5 -D - "$BASE_URL${MOUNT_PATH}env-config.js")
printf '%s' "$config" | grep -q "BASE_URL: \"$MOUNT_PATH\"" ||
  fail "expected the runtime env-config.js, got: $config"
cache=$(header_value "Cache-Control" "$config")
[ "$cache" = "no-store, max-age=0" ] ||
  fail "expected env-config.js to be uncached, got Cache-Control='$cache'"
nosniff=$(header_value "X-Content-Type-Options" "$config")
[ "$nosniff" = "nosniff" ] ||
  fail "expected env-config.js to keep the server's security headers"

echo "- the page gets the mount path as its <base> and is never cached"
page=$(curl -s --max-time 5 -D - "$BASE_URL$MOUNT_PATH")
printf '%s' "$page" | grep -q "<base href=\"$MOUNT_PATH\">" ||
  fail "expected <base href=\"$MOUNT_PATH\"> in the page"
cache=$(header_value "Cache-Control" "$page")
[ "$cache" = "no-store, max-age=0" ] ||
  fail "expected the page to be uncached, got Cache-Control='$cache'"

cleanup
echo "All checks passed."
