#!/usr/bin/env bash
# Crea dist/sitio.zip con solo lo que debe publicarse (sin herramientas, documentación ni secretos).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f dist/sitio.zip && mkdir -p dist
zip -q -r -X dist/sitio.zip \
  index.html 404.html privacidad.html condiciones.html setup.php panel.php \
  styles.css main.js robots.txt sitemap.xml .htaccess \
  api data lib assets \
  -x 'assets/img/.provisionales.json' -x '*.DS_Store'
unzip -l dist/sitio.zip | tail -1
