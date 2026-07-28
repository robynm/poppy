#!/usr/bin/env bash
set -e

# Determine next version from the latest git tag (expects vN format)
latest=$(git tag --sort=-v:refname | grep -E '^v[0-9]+$' | head -1)
if [ -z "$latest" ]; then
  next=1
else
  next=$(( ${latest#v} + 1 ))
fi
version="v$next"

echo "Releasing $version..."

# Validate the app builds before tagging. GitHub Actions rebuilds and publishes
# on push (deploy) and on tag (release zip); the service worker is regenerated
# by vite-plugin-pwa, so there's no cache version to bump by hand anymore.
( cd pwa && npm run build )

git add -A
git commit -m "$version"
git tag "$version"
git push
git push --tags

echo "Done — $version pushed and tagged."
