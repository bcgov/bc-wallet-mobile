#!/usr/bin/env bash
# Copies the CLI out of the checkout so ~/bin/bcsc-test keeps working after a branch switch.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
dest="${BCSC_TEST_INSTALL_DIR:-$HOME/.local/share/bcsc-test}"
bin="${BCSC_TEST_BIN_DIR:-$HOME/bin}"

# Only touch a directory that is empty or already holds a bcsc-test install, and only the files it installs.
if [ -n "$(ls -A "$dest" 2>/dev/null)" ] && ! grep -qs '"name": "bcsc-test"' "$dest/package.json"; then
  echo "Refusing to install into $dest: it is not empty and is not a bcsc-test install." >&2
  exit 1
fi
rm -rf "$dest/src"
mkdir -p "$dest/src" "$bin"
cp "$here/package.json" "$dest/"
find "$here/src" -name '*.ts' ! -name '*.test.ts' -exec cp {} "$dest/src/" \;

cat > "$bin/bcsc-test" <<WRAPPER
#!/usr/bin/env bash
exec node "$dest/src/main.ts" "\$@"
WRAPPER
chmod +x "$bin/bcsc-test"

echo "Installed bcsc-test to $bin/bcsc-test (sources in $dest)"
