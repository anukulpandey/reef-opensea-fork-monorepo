#!/usr/bin/env bash

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:4000}"
WEB_BASE_URL="${WEB_BASE_URL:-http://localhost:3000}"

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

bootstrap_json="$(curl -sfL "$API_BASE_URL/bootstrap")"
printf '%s' "$bootstrap_json" | json_assert
creator_slug="$(printf '%s' "$bootstrap_json" | node -e 'const data = JSON.parse(require("node:fs").readFileSync(0, "utf8")); process.stdout.write(data.featuredCollections[0].creatorSlug)')"

collection_json="$(curl -sfL "$API_BASE_URL/dataset/collection/cryptopunks")"
printf '%s' "$collection_json" | json_assert
sample_contract="$(printf '%s' "$collection_json" | node -e 'const data = JSON.parse(require("node:fs").readFileSync(0, "utf8")); process.stdout.write(data.items[0].contractAddress)')"
sample_token_id="$(printf '%s' "$collection_json" | node -e 'const data = JSON.parse(require("node:fs").readFileSync(0, "utf8")); process.stdout.write(data.items[0].tokenId)')"

api_routes=(
  "/health"
  "/config"
  "/bootstrap"
  "/dataset/discover"
  "/dataset/collections"
  "/dataset/tokens"
  "/dataset/drops"
  "/dataset/activity"
  "/dataset/rewards"
  "/dataset/studio"
  "/dataset/collection/cryptopunks"
  "/dataset/item/$sample_contract/$sample_token_id"
)

web_routes=(
  "/"
  "/collections"
  "/collections?search=reef&sort=volume&category=all"
  "/tokens"
  "/swap"
  "/drops"
  "/activity"
  "/rewards"
  "/studio"
  "/profile"
  "/collection/cryptopunks"
  "/collection/cryptopunks/explore"
  "/collection/cryptopunks/items"
  "/collection/cryptopunks/offers"
  "/collection/cryptopunks/holders"
  "/collection/cryptopunks/activity"
  "/collection/cryptopunks/analytics"
  "/collection/cryptopunks/traits"
  "/collection/cryptopunks/about"
  "/item/reef/$sample_contract/$sample_token_id"
  "/$creator_slug/created"
)

for route in "${api_routes[@]}"; do
  curl -sfL "$API_BASE_URL$route" | json_assert
  echo "api ok  $route"
done

for route in "${web_routes[@]}"; do
  html="$(curl -sfL "$WEB_BASE_URL$route")"
  require_html_root "$html"
  echo "web ok  $route"
done

echo "Route smoke check completed successfully."
