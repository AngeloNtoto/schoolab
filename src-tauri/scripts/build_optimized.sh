#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${1:-schoolab}"   # ou extract depuis package.json
PLATFORM="${2:-linux}"      # linux | windows

cd "$(dirname "$0")/.." || exit 1  # go to src-tauri

# Build no bundle
pnpm tauri build --no-bundle ${PLATFORM == "windows" && "--target x86_64-pc-windows-msvc" || ""}

if [[ "$PLATFORM" == "windows" ]]; then
  BIN="target/x86_64-pc-windows-msvc/release/${APP_NAME}.exe"
else
  BIN="target/release/${APP_NAME}"
fi

cp "$BIN" "${BIN}.orig"

if [[ "$PLATFORM" == "linux" ]]; then
  sudo apt-get update -y
  sudo apt-get install -y binutils
  objcopy --only-keep-debug "$BIN" "${BIN}.debug" || true
  objcopy --strip-debug "$BIN" || true
  objcopy --add-gnu-debuglink="${BIN}.debug" "$BIN" || true
fi

# Windows: attempt llvm-strip if available (install via rustup component if needed)
if [[ "$PLATFORM" == "windows" ]]; then
  if command -v llvm-strip >/dev/null 2>&1; then
    llvm-strip "$BIN" || true
  else
    echo "llvm-strip not found; skipping strip on Windows"
  fi
fi

# UPX compress
if command -v upx >/dev/null 2>&1; then
  upx --best --lzma "$BIN" || true
fi

# Optional: produce final bundles and repack deb
pnpm tauri build || true
DEB=$(find target/release/bundle -type f -name '*.deb' -print -quit || true)
if [[ -n "$DEB" && "$PLATFORM" == "linux" ]]; then
  mkdir -p deb-work
  dpkg-deb -R "$DEB" deb-work
  BIN_IN_DEB=$(find deb-work -type f -name "$APP_NAME" -print -quit || true)
  if [[ -n "$BIN_IN_DEB" ]]; then
    cp "$BIN" "$BIN_IN_DEB"
    dpkg-deb --build -Zxz deb-work "${DEB%.deb}-min.deb"
    echo "Built ${DEB%.deb}-min.deb"
  fi
fi

# report
du -h "$BIN" "${BIN}.orig" || true
