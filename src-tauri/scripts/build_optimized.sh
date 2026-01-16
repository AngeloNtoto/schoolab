APP_NAME="${1:-schoolab}"
PLATFORM="${2:-linux}"

cd "$(dirname "$0")/.." || exit 1

# Build release without bundling
if [[ "$PLATFORM" == "windows" ]]; then
  pnpm tauri build --no-bundle --target x86_64-pc-windows-msvc
else
  pnpm tauri build --no-bundle
fi

# Find the binary robustly
if [[ "$PLATFORM" == "windows" ]]; then
  BIN=$(find target/x86_64-pc-windows-msvc/release -type f -name "${APP_NAME}.exe" -print -quit)
else
  BIN=$(find target -type f -name "${APP_NAME}" -not -path "*/deps/*" -not -path "*/examples/*" -print -quit)
fi

if [[ -z "$BIN" || ! -f "$BIN" ]]; then
  echo "Error: Binary not found"
  exit 1
fi

echo "Found binary at $BIN"
cp "$BIN" "${BIN}.orig"

# UPX compress (without stripping to keep Tauri metadata)
if command -v upx >/dev/null 2>&1; then
  echo "Compressing $BIN with UPX..."
  upx --best --lzma "$BIN" || true
fi

# Run bundle (Tauri will see the binary is already built and use it)
echo "Bundling..."
if [[ "$PLATFORM" == "windows" ]]; then
  pnpm tauri build --target x86_64-pc-windows-msvc
else
  pnpm tauri build
fi

# Optional: Repack deb on linux to use the compressed binary (Tauri might overwrite it during bundle)
if [[ "$PLATFORM" == "linux" ]]; then
  DEB=$(find target -type f -name '*.deb' -not -path "*/deb-work/*" -print -quit || true)
  if [[ -n "$DEB" ]]; then
    echo "Repacking $DEB..."
    mkdir -p deb-work
    dpkg-deb -R "$DEB" deb-work
    BIN_IN_DEB=$(find deb-work -type f -name "$APP_NAME" -print -quit || true)
    if [[ -n "$BIN_IN_DEB" ]]; then
      cp "$BIN" "$BIN_IN_DEB"
      dpkg-deb --build -Zxz deb-work "${DEB%.deb}-min.deb"
      echo "Final optimized deb produced: ${DEB%.deb}-min.deb"
    fi
  fi
fi

# report
ls -lh "$BIN" "${BIN}.orig" || true
