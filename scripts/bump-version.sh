#!/usr/bin/env bash
# Bump the app version across package.json, src-tauri/Cargo.toml, and
# src-tauri/tauri.conf.json, then commit and tag.
#
# Usage:
#   scripts/bump-version.sh patch   # 0.1.0 -> 0.1.1
#   scripts/bump-version.sh minor   # 0.1.0 -> 0.2.0
#   scripts/bump-version.sh major   # 0.1.0 -> 1.0.0
#   scripts/bump-version.sh 1.2.3   # exact version

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <patch|minor|major|x.y.z>" >&2
  exit 1
fi

CURRENT=$(node -p "require('./package.json').version")
TARGET="$1"

if [[ "$TARGET" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  NEXT="$TARGET"
else
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
  case "$TARGET" in
    patch) PATCH=$((PATCH + 1));;
    minor) MINOR=$((MINOR + 1)); PATCH=0;;
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0;;
    *) echo "Unknown bump: $TARGET" >&2; exit 1;;
  esac
  NEXT="${MAJOR}.${MINOR}.${PATCH}"
fi

echo "Bumping ${CURRENT} -> ${NEXT}"

node -e "
  const fs = require('fs');
  for (const path of ['package.json', 'src-tauri/tauri.conf.json']) {
    const j = JSON.parse(fs.readFileSync(path, 'utf8'));
    j.version = '${NEXT}';
    fs.writeFileSync(path, JSON.stringify(j, null, 2) + '\n');
  }
"

# Update src-tauri/Cargo.toml's [package] version (first version = "..." line)
awk '
  BEGIN { done = 0 }
  /^version = "/ && !done { sub(/"[^"]*"/, "\"'"${NEXT}"'\""); done = 1 }
  { print }
' src-tauri/Cargo.toml > src-tauri/Cargo.toml.tmp
mv src-tauri/Cargo.toml.tmp src-tauri/Cargo.toml

# Refresh Cargo.lock if it's tracked
if [[ -f src-tauri/Cargo.lock ]]; then
  (cd src-tauri && cargo update -p htmlbrowser-dev --precise "${NEXT}" 2>/dev/null) || true
fi

git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
[[ -f src-tauri/Cargo.lock ]] && git add src-tauri/Cargo.lock || true

git commit -m "Release v${NEXT}"
git tag "v${NEXT}"

echo
echo "Tagged v${NEXT}. Push with:"
echo "  git push origin main --follow-tags"
