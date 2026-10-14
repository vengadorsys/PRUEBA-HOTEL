# Salvia & Durazno · Atelier floral — demo comercial

Landing premium para una **florería ficticia**, pensada para vender la web a una florería real.
Todo el contenido (nombre, precios, opiniones, dirección, horarios y teléfono) es **de ejemplo** y está marcado así en la página.

## Cambiar el número de WhatsApp
Un solo lugar: `config.js` → `whatsapp: "524921059504"` (52 + 10 dígitos, solo números). Ahora apunta a +52 492 105 9504.
Ahí también están los mensajes prellenados (general, por arreglo y por ocasión).

## Qué incluye
- Hero con fotografía, catálogo filtrable por ocasión (10 arreglos), por qué elegirnos, cómo pedir (con chat de ejemplo), testimonios de ejemplo, preguntas frecuentes y contacto con enlace a Google Maps.
- **Personaliza tu pedido**: formulario de ocasión, presupuesto, arreglo de referencia, fecha y horario, colores, zona y dedicatoria. No guarda nada: arma el mensaje (con vista previa en vivo) y abre WhatsApp listo para enviar.
- Botón flotante de WhatsApp + botón en el hero, en cada arreglo («Pedir este arreglo») y en contacto. Cada uno abre WhatsApp con el mensaje ya escrito.
- Sin formularios que guarden datos, sin cuentas, sin carrito ni pagos, sin chatbot ni IA en la web.
- HTML/CSS/JS sin compilación. Animaciones con GSAP local (`lib/`).

## Imágenes
- `assets/img/hero.webp`, `taller.webp`, `rosas.webp`, `cumple.webp`: fotografías generadas con IA (Canva).
- `assets/img/arreglo-*.svg`: **ilustraciones provisionales** del catálogo (`tools/ilustraciones.py`). Sustituir por fotos reales de cada arreglo (4:5, WebP) y quitar la nota «Ilustraciones provisionales».
- Para optimizar fotos nuevas: dejarlas en `assets/photos/source/` y ejecutar `python3 tools/fotos.py`.

## Publicar
`./tools/empaquetar.sh` → `dist/sitio.zip` (se despliega en la raíz del sitio de Hostinger).
Al cambiar CSS/JS, subir el `?v=` en `index.html`.

## Pasar de demo a florería real
- Cambiar nombre, textos, precios, dirección, horario, enlace de Maps y número (`config.js`).
- Quitar la cinta «Sitio de demostración» y las etiquetas «ejemplo».
- Testimonios: solo opiniones reales de clientes.
- Quitar `noindex` del `<head>` cuando sea la web definitiva.
