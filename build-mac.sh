#!/usr/bin/env bash
# 个人工作台 · macOS 一键重新构建（.app + .dmg）
#
# 说明：本机的 Rust 工具链安装在移植包内的 .toolchain/（未写入 ~/.cargo），
#       因此必须显式设置 CARGO_HOME / RUSTUP_HOME，直接用 npx tauri build 会找不到 cargo。
#       脚本会显式做 ad-hoc 签名（identity "-"），避免产物只有 linker 签名、codesign --verify 不通过。
#
# 用法：  ./build-mac.sh            # 构建 .app + .dmg
#         ./build-mac.sh app        # 只构建 .app
#
# 注意：DMG 需要 hdiutil 创建/挂载磁盘映像。若在受限沙箱中运行（例如由 AI 代理执行），
#       hdiutil 会被系统拒绝（"create failed - 操作不被允许"），请在普通终端里运行本脚本。

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLCHAIN="$ROOT/.toolchain"
APP_DIR="$ROOT/workbench-v8"
BUNDLES="${1:-app,dmg}"

export CARGO_HOME="$TOOLCHAIN/cargo"
export RUSTUP_HOME="$TOOLCHAIN/rustup"
export PATH="$CARGO_HOME/bin:$PATH"
export npm_config_cache="$ROOT/.npm-cache"
export APPLE_SIGNING_IDENTITY="-"     # ad-hoc 签名（个人自用，不做公证）

echo "==> rustc: $(rustc --version)"
echo "==> node:  $(node --version)"
echo "==> bundles: $BUNDLES"

cd "$APP_DIR"

if [ ! -d node_modules ]; then
  echo "==> npm ci"
  npm ci --no-audit --no-fund
fi

echo "==> tauri build --bundles $BUNDLES"
./node_modules/.bin/tauri build --bundles "$BUNDLES"

BUNDLE="$APP_DIR/src-tauri/target/release/bundle"
echo
echo "==> 产物："
[ -d "$BUNDLE/macos/个人工作台.app" ] && echo "    APP: $BUNDLE/macos/个人工作台.app"
ls -1 "$BUNDLE"/dmg/*.dmg 2>/dev/null | sed 's/^/    DMG: /' || true

if [ -d "$BUNDLE/macos/个人工作台.app" ]; then
  echo
  echo "==> 签名校验："
  codesign --verify --strict --verbose=2 "$BUNDLE/macos/个人工作台.app"
fi
