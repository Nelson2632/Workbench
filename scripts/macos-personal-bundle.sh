#!/usr/bin/env bash
set -euo pipefail

bundle_dir=src-tauri/target/release/bundle/macos
apps=("$bundle_dir"/*.app)
test "${#apps[@]}" -eq 1
app="${apps[0]}"

# Tauri's --no-sign output can retain an incomplete signature that Gatekeeper
# reports as "damaged" after download. An ad hoc signature is suitable for the
# owner's personal build and requires no certificate or notarization.
codesign --force --deep --sign - "$app"
codesign --verify --deep --strict --verbose=2 "$app"

stage=$(mktemp -d)
mounted=$(mktemp -d)
installed=$(mktemp -d)
cleanup() {
  hdiutil detach "$mounted" -quiet >/dev/null 2>&1 || true
  rm -rf "$stage" "$mounted" "$installed"
}
trap cleanup EXIT
ditto "$app" "$stage/$(basename "$app")"
ln -s /Applications "$stage/Applications"
hdiutil create -volname '个人工作台' -srcfolder "$stage" -format UDZO -ov personal-mac-install.dmg

# Check the distributable image, not just the original build directory.
hdiutil attach personal-mac-install.dmg -mountpoint "$mounted" -nobrowse -quiet
ditto "$mounted/$(basename "$app")" "$installed/$(basename "$app")"
codesign --verify --deep --strict --verbose=2 "$installed/$(basename "$app")"
python3 ../scripts/native-smoke.py "$installed/$(basename "$app")/Contents/MacOS/workbench-v8" macos-installed-smoke.json
shasum -a 256 personal-mac-install.dmg > macos-dmg-sha256.txt
