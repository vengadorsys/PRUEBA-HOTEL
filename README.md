# Siete Azules · Hotel de Laguna — demo comercial

Landing premium para un **hotel ficticio** en Bacalar (Quintana Roo), pensada como demostración para vender sitios web a hoteles. Todo el contenido (precios, servicios, opiniones, disponibilidad, contacto) es de **ejemplo** y está marcado como tal en la página.

## Qué incluye

| Área | Estado | Notas |
|---|---|---|
| Landing completa (hero + buscador, historia, habitaciones, experiencias, galería, testimonios, cómo reservar, FAQ, ubicación, contacto, footer) | Real | HTML/CSS/JS sin dependencias de compilación |
| Asistente virtual «Itzel» | Real (Google Gemini) | Responde solo con `data/hotel.json`; no confirma reservas ni precios |
| Buscador inteligente de estancias | Real + simulado | Ranking por reglas en el navegador; Gemini redacta el resumen y el «por qué». **Disponibilidad y precios simulados** |
| Captación de contactos | Real | SQLite privado, consentimiento obligatorio, token anti-bots, campo trampa, límite por IP |
| Panel de solicitudes (`/panel.php`) | Real | Protegido con contraseña; exporta CSV y permite borrar registros (derechos ARCO) |
| Mapa | Real | Leaflet + OpenStreetMap (sin clave); marcador de demostración |
| Imágenes | Provisionales | Ilustraciones de marca hasta generar las fotografías con IA (ver abajo) |
| Reservas / pagos | No incluidos | A propósito: no se simulan reservas confirmadas ni cobros |

## Arquitectura (económica)

- **Frontend estático**: `index.html`, `styles.css`, `main.js`, `lib/leaflet.*`. Sin npm ni build.
- **Backend PHP** en el mismo hosting (Hostinger compartido):
  - `api/asistente.php`: proxy del chat hacia Gemini.
  - `api/recomendador.php`: textos del buscador inteligente.
  - `api/lead.php`: guarda solicitudes en SQLite.
  - `api/_lib.php`: origen único, límites de uso, lectura de la clave, llamada a Gemini con modelos de respaldo.
  - `api/_conocimiento.php`: persona del asistente + datos del hotel.
- **Datos privados** (clave de Gemini, contraseña del panel, base de datos) en `../siete_azules_privado/`, **fuera de `public_html`**. Nunca en el repositorio.
- `data/hotel.json`: fuente única de habitaciones, precios, servicios y políticas (web, asistente y buscador leen de aquí).

## Configuración

1. Abrir `https://<dominio>/setup.php`.
2. Introducir el **código de configuración** (lo tiene el propietario; aquí solo se guarda su hash SHA-256 en `api/_lib.php`).
3. Pegar la clave de Gemini (Google AI Studio → *Get API key*) y una contraseña para el panel.

Para cambiar el código de configuración: generar uno nuevo y reemplazar `SETUP_TOKEN_SHA256` por `sha256(código)`.

### Costes y límites

- Texto (chat y recomendaciones): capa gratuita de Gemini. Límites propios: chat 8/min y 100/día por IP, 1500/día global; recomendador 6/min, 60/día por IP.
- En la capa gratuita Google puede usar el contenido para mejorar sus modelos: para un hotel real con tráfico, activar facturación.
- Google devuelve a veces «alta demanda» (503); el servidor reintenta y cambia de modelo, y si aun así falla muestra un mensaje amable con formulario y WhatsApp.

## Imágenes con IA

Las imágenes de `assets/img/` son **ilustraciones provisionales** (`tools/provisionales.py`). Para generar las fotografías definitivas con Gemini (requiere **facturación activa** en Google AI Studio, ~0.04 USD por imagen):

```bash
GEMINI_API_KEY=... python3 tools/generar-imagenes.py
./tools/empaquetar.sh
```

Después, actualizar los textos «Ilustraciones provisionales» de la galería y del footer.

## Publicación (Hostinger)

1. Hostinger clona este repositorio en una subcarpeta del sitio (Git).
2. Se despliega `dist/sitio.zip` (creado con `tools/empaquetar.sh`) sobre la raíz del sitio.

## Pasar de demo a hotel real

- Sustituir `data/hotel.json`, textos, teléfonos, correo, WhatsApp y redes.
- Quitar la cinta «Sitio de demostración» y las etiquetas «Ejemplo».
- Testimonios: solo reseñas reales y verificables.
- `robots.txt` → `Allow: /`; quitar `noindex` del `<head>`; publicar los datos estructurados de `docs/datos-estructurados.json` con datos reales.
- Revisar el aviso de privacidad con asesoría legal (LFPDPPP).
- Conectar el motor de reservas del hotel en el paso 3 de «Cómo reservar».
