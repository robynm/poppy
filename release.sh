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

# Commit any pending work under this version. Unlike the old build.py flow (which
# always bumped a tracked service-worker version), a release may have nothing new
# to commit — the build output lives in the git-ignored pwa/dist/. In that case,
# just tag the current HEAD instead of failing on an empty commit.
git add -A
if git diff --cached --quiet; then
  echo "No changes to commit — tagging current HEAD as $version."
else
  git commit -m "$version"
fi

git tag "$version"
git push
git push --tags

echo "Done — $version pushed and tagged."
