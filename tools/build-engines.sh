#!/usr/bin/env bash
# Build Pea release tags to WebAssembly for PlayPea.
#
#   tools/build-engines.sh            # all tags listed in tools/pea-versions.txt
#   tools/build-engines.sh v9.1 v10.0 # just these tags
#
# Output: public/engines/pea/pea-<tag>.wasm
#
# Needs: git, rustup target wasm32-wasip1, node >= 18, wasm-opt (binaryen >= 116).
#   rustup target add wasm32-wasip1
#   binaryen: https://github.com/WebAssembly/binaryen/releases (or `npm i -g binaryen`)
# Set WASM_OPT=/path/to/wasm-opt if it is not on PATH.
# Set PEA_BUILD_STD=1 to build std from source (only needed if the
# wasm32-wasip1 target can't be installed with rustup).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/.pea-src"
OUT="$ROOT/public/engines/pea"
WASM_OPT="${WASM_OPT:-wasm-opt}"
REPO="${PEA_REPO:-https://github.com/WGCodings/Pea.git}"

mkdir -p "$OUT"
if [ ! -d "$SRC/.git" ]; then
  git clone --quiet "$REPO" "$SRC"
fi
git -C "$SRC" fetch --quiet --tags origin

if [ $# -gt 0 ]; then
  TAGS=("$@")
else
  mapfile -t TAGS < <(grep -v '^\s*#' "$ROOT/tools/pea-versions.txt" | awk 'NF{print $1}')
fi

CARGO_ARGS=(build --release --target wasm32-wasip1)
if [ "${PEA_BUILD_STD:-0}" = "1" ]; then
  export RUSTC_BOOTSTRAP=1
  CARGO_ARGS+=(-Zbuild-std=std,panic_abort)
fi
# Pea's AVX2 paths are cfg-gated; wasm gets the scalar code, auto-vectorised to simd128.
export RUSTFLAGS="-C target-feature=+simd128"
export CARGO_TARGET_DIR="$SRC/../.pea-target"

for tag in "${TAGS[@]}"; do
  echo "=== Pea $tag"
  git -C "$SRC" checkout --quiet --force "$tag"
  git -C "$SRC" clean --quiet -fdx -e nnue

  # Nets that were never committed to the Pea repo (recovered from the release
  # binaries) live in tools/nets/<tag>/ at the path the source expects.
  if [ -d "$ROOT/tools/nets/$tag" ]; then
    cp -r "$ROOT/tools/nets/$tag/." "$SRC/"
  fi

  # Per-release fixups so the build matches the published binary.
  if [ -f "$ROOT/tools/patches/$tag.sh" ]; then
    (cd "$SRC" && bash "$ROOT/tools/patches/$tag.sh")
  fi

  # v9.1+ imports std::arch::x86_64 unconditionally; gate it so wasm compiles.
  sed -i.bak 's|^use std::arch::x86_64::\*;|#[cfg(target_arch = "x86_64")] use std::arch::x86_64::*;|' \
    "$SRC/src/nnue/network.rs" && rm -f "$SRC/src/nnue/network.rs.bak"

  # Early releases build the engine as the package's default binary.
  if grep -q '^name = "Pea"' "$SRC/Cargo.toml"; then
    BIN=Pea
  else
    BIN=$(sed -n 's/^name = "\(.*\)"/\1/p' "$SRC/Cargo.toml" | head -n1)
  fi

  (cd "$SRC" && cargo "${CARGO_ARGS[@]}" --bin "$BIN")
  node "$ROOT/tools/asyncify.mjs" \
    "$CARGO_TARGET_DIR/wasm32-wasip1/release/$BIN.wasm" \
    "$OUT/pea-$tag.wasm" "$WASM_OPT"
  git -C "$SRC" checkout --quiet --force "$tag"
  ls -lh "$OUT/pea-$tag.wasm"
done
