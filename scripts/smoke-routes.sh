#!/usr/bin/env zsh

set -euo pipefail

if [[ -f ./.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source ./.env
  set +a
fi

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:${API_PORT:-4000}}"
WEB_BASE_URL="${WEB_BASE_URL:-http://127.0.0.1:${WEB_PORT:-3000}}"
API_BASE_URL="${API_BASE_URL/localhost/127.0.0.1}"
WEB_BASE_URL="${WEB_BASE_URL/localhost/127.0.0.1}"

json_assert() {
  node -e 'JSON.parse(require("node:fs").readFileSync(0, "utf8"))' >/dev/null
}

require_html_root() {
  local html="$1"
  if [[ "$html" != *'<div id="root"></div>'* && "$html" != *'<div id="root">'* ]]; then
    echo "Unexpected web response" >&2
    exit 1
  fi
}

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

curl -sS "${API_BASE_URL}/bootstrap" -o "$tmp_dir/bootstrap.json"
bootstrap_json="$(cat "$tmp_dir/bootstrap.json")"
printf '%s' "$bootstrap_json" | json_assert
curl -sS "${API_BASE_URL}/dataset/collections" -o "$tmp_dir/collections.json"
collections_json="$(cat "$tmp_dir/collections.json")"
printf '%s' "$collections_json" | json_assert
creator_slug="$(printf '%s' "$bootstrap_json" | node -e 'const data = JSON.parse(require("node:fs").readFileSync(0, "utf8")); process.stdout.write(data.featuredCollections[0]?.creatorSlug ?? "reef-admin")')"
collection_slug="$(printf '%s' "$collections_json" | node -e 'const data = JSON.parse(require("node:fs").readFileSync(0, "utf8")); process.stdout.write(data.collections[0]?.slug ?? "")')"

sample_contract=""
sample_token_id=""
if [[ -n "$collection_slug" ]]; then
  curl -sS "${API_BASE_URL}/dataset/collection/$collection_slug" -o "$tmp_dir/collection.json"
  collection_json="$(cat "$tmp_dir/collection.json")"
  printf '%s' "$collection_json" | json_assert
  sample_contract="$(printf '%s' "$collection_json" | node -e 'const data = JSON.parse(require("node:fs").readFileSync(0, "utf8")); process.stdout.write(data.items[0]?.contractAddress ?? "")')"
  sample_token_id="$(printf '%s' "$collection_json" | node -e 'const data = JSON.parse(require("node:fs").readFileSync(0, "utf8")); process.stdout.write(data.items[0]?.tokenId ?? "")')"
fi

api_routes=(
  "/health"
  "/config"
  "/bootstrap"
  "/dataset/discover"
  "/dataset/collections"
  "/listings"
  "/orders"
  "/sales"
  "/dataset/tokens"
  "/dataset/drops"
  "/dataset/activity"
  "/dataset/rewards"
  "/dataset/studio"
)

if [[ -n "$collection_slug" ]]; then
  api_routes+=("/dataset/collection/$collection_slug")
fi

if [[ -n "$sample_contract" && -n "$sample_token_id" ]]; then
  api_routes+=("/dataset/item/$sample_contract/$sample_token_id")
fi

web_routes=(
  "/"
  "/collections"
  "/collections?search=reef&sort=volume&category=all"
  "/tokens"
  "/swap"
  "/create"
  "/create/drop"
  "/create/collection"
  "/drops"
  "/activity"
  "/rewards"
  "/studio"
  "/support"
  "/admin"
  "/profile"
  "/profile/created"
  "/$creator_slug/created"
)

if [[ -n "$collection_slug" ]]; then
  web_routes+=(
    "/collection/$collection_slug"
    "/collection/$collection_slug/explore"
    "/collection/$collection_slug/items"
    "/collection/$collection_slug/offers"
    "/collection/$collection_slug/holders"
    "/collection/$collection_slug/activity"
    "/collection/$collection_slug/analytics"
    "/collection/$collection_slug/traits"
    "/collection/$collection_slug/about"
  )
fi

if [[ -n "$sample_contract" && -n "$sample_token_id" ]]; then
  web_routes+=("/item/reef/$sample_contract/$sample_token_id")
fi

for route in "${api_routes[@]}"; do
  curl -sS "${API_BASE_URL}${route}" -o "$tmp_dir/api-route.json"
  json_assert < "$tmp_dir/api-route.json"
  echo "api ok  $route"
done

for route in "${web_routes[@]}"; do
  curl -sS "${WEB_BASE_URL}${route}" -o "$tmp_dir/web-route.html"
  html="$(cat "$tmp_dir/web-route.html")"
  require_html_root "$html"
  echo "web ok  $route"
done

echo "Route smoke check completed successfully."
