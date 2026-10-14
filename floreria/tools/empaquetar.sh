#!/usr/bin/env bash
# Crea dist/sitio.zip con solo lo que la web necesita (index.html en la raíz del zip).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f dist/sitio.zip && mkdir -p dist
zip -qr dist/sitio.zip index.html styles.css main.js config.js .htaccess lib assets -x "assets/photos/*"
unzip -l dist/sitio.zip | tail -n 25
