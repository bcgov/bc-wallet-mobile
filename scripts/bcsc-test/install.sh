#!/usr/bin/env bash
# Copies the CLI out of the checkout so ~/bin/bcsc-test keeps working after a branch switch.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
dest="${BCSC_TEST_INSTALL_DIR:-$HOME/.local/share/bcsc-test}"
bin="${BCSC_TEST_BIN_DIR:-$HOME/bin}"

rm -rf "$dest"
mkdir -p "$dest/src" "$bin"
cp "$here/package.json" "$dest/"
find "$here/src" -name '*.ts' ! -name '*.test.ts' -exec cp {} "$dest/src/" \;

cat > "$bin/bcsc-test" <<WRAPPER
#!/usr/bin/env bash
exec node "$dest/src/main.ts" "\$@"
WRAPPER
chmod +x "$bin/bcsc-test"

echo "Installed bcsc-test to $bin/bcsc-test (sources in $dest)"
