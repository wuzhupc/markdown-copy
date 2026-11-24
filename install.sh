#!/usr/bin/env sh
# Deploy markdown-copy into the OpenCode plugin directory (macOS / Linux).
# Usage: ./install.sh [destination]
set -eu

src=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
target=${1:-"${XDG_CONFIG_HOME:-$HOME/.config}/opencode/plugins/markdown-copy"}
manifest="tui.ts panel.tsx messages.js clipboard.js package.json README.md"

echo "markdown-copy -> $target"

for name in $manifest; do
    if [ ! -f "$src/$name" ]; then
        echo "missing source file: $src/$name" >&2
        exit 1
    fi
done

# Optional bundle check; skipped when bun is not installed.
if command -v bun >/dev/null 2>&1; then
    tmp=$(mktemp "${TMPDIR:-/tmp}/markdown-copy-check-XXXXXX.js")
    if bun build "$src/tui.ts" \
        --target bun \
        --jsx-runtime automatic \
        --jsx-import-source @opentui/solid \
        --external @opencode/plugin/tui \
        --external @opentui/core \
        --external @opentui/solid \
        --external solid-js \
        --outfile "$tmp" >/dev/null; then
        echo "bundle check ok"
    else
        rm -f "$tmp"
        echo "bundle check failed" >&2
        exit 1
    fi
    rm -f "$tmp"
else
    echo "bun not found, skipping bundle check"
fi

mkdir -p "$target"

# Remove stale modules so a renamed or deleted file cannot shadow the new build.
find "$target" -maxdepth 1 -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' \) | while IFS= read -r file; do
    base=$(basename "$file")
    case " $manifest " in
        *" $base "*) ;;
        *)
            rm -f "$file"
            echo "removed stale $base"
            ;;
    esac
done

for name in $manifest; do
    cp "$src/$name" "$target/$name"
    echo "copied $name"
done

echo
echo "Deployed to $target"
echo "Verify with: opencode plugin list"
