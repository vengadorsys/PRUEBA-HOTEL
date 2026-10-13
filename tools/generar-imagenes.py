#!/usr/bin/env python3
"""Genera las fotografías del sitio con Google Gemini (modelos de imagen) y las guarda en WebP.

Uso (la clave NUNCA se guarda en el repositorio):
    GEMINI_API_KEY=... python3 tools/generar-imagenes.py            # todas las que falten
    GEMINI_API_KEY=... python3 tools/generar-imagenes.py hero spa   # solo algunas
    ... --forzar                                                     # regenerar aunque existan

Requisitos: Python 3 + Pillow. Los modelos de imagen de Gemini requieren
facturación activa en Google AI Studio (aprox. 0.04 USD por imagen).
"""
import base64, io, json, os, sys, time, urllib.request, urllib.error
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img"
MODELS = ["gemini-2.5-flash-image", "gemini-3.1-flash-image", "gemini-3.1-flash-image-preview"]

ESTILO = (
    "Photorealistic editorial luxury travel photography for a boutique eco-luxury hotel on the shore of "
    "the Bacalar lagoon, Quintana Roo, Mexico. Architecture of white chukum stucco, tzalam wood, thatched "
    "palapa roofs and woven henequen details. Muted, sophisticated palette of warm sand, deep navy, "
    "turquoise and jungle green, soft natural light, shallow depth of field, shot on a full-frame camera. "
    "No text, no logos, no watermarks."
)

# nombre de archivo: (relación de aspecto, ancho final en px, escena)
SLOTS = {
    "hero": ("16:9", 1920, "Golden hour wide view: the hotel's long wooden pier with a palapa at the end over striped turquoise and deep-blue lagoon water, low villas among palms, open sky in the upper third, no people."),
    "alberca": ("16:9", 1600, "Infinity pool merging visually with the turquoise lagoon, two linen sun loungers, palm shadows, late afternoon light, no people."),
    "restaurante": ("4:3", 1400, "Open-air restaurant under a tall thatched palapa, round tables with linen, handmade ceramics, glowing woven pendant lamps, lagoon at dusk in the background, no people."),
    "spa": ("4:3", 1400, "Serene spa treatment room, massage bed with white linen, stone basin with floating flowers, wooden slats, daylight filtering through palm leaves, no people."),
    "hab-jardin": ("4:3", 1400, "Cozy standard hotel room: queen bed with crisp white linen and sand throw, woven rattan headboard, white stucco walls, window with garden and palm view, morning light, no people."),
    "hab-deluxe": ("4:3", 1400, "Deluxe room with king size bed facing floor-to-ceiling glass doors open to a private balcony over the turquoise lagoon, white linen, navy cushions, brass lamp, golden hour, no people."),
    "hab-palafito": ("4:3", 1400, "Overwater palafito suite: king bed with sheer linen canopy, freestanding stone bathtub by a large window, private wooden deck with steps into turquoise water, sunset light, no people."),
    "hab-familiar": ("4:3", 1400, "Spacious family suite: king bed plus two single beds, a woven hammock, linen sofa, wooden floors, big windows to a private garden terrace with tropical plants, bright daylight, no people."),
}


def call(model, key, prompt, aspect):
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": aspect}},
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.load(r)
    for part in data["candidates"][0]["content"]["parts"]:
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and inline.get("data"):
            return base64.b64decode(inline["data"])
    raise RuntimeError("la respuesta no contiene imagen")


def main():
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        sys.exit("Falta GEMINI_API_KEY en el entorno.")
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--forzar" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    marker = OUT / ".provisionales.json"
    provisional = set(json.loads(marker.read_text())) if marker.exists() else set()
    for name, (aspect, width, scene) in SLOTS.items():
        if args and name not in args:
            continue
        dest = OUT / f"{name}.webp"
        if dest.exists() and name not in provisional and not force:
            print(f"· {name}: ya existe, se omite")
            continue
        prompt = f"{ESTILO}\n\nScene: {scene}"
        for model in MODELS:
            try:
                raw = call(model, key, prompt, aspect)
                break
            except urllib.error.HTTPError as e:
                print(f"  {model}: HTTP {e.code}")
                raw = None
            except Exception as e:  # noqa: BLE001
                print(f"  {model}: {e}")
                raw = None
        if not raw:
            print(f"✗ {name}: no se pudo generar")
            continue
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        if im.width > width:
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        im.save(dest, "WEBP", quality=80, method=6)
        provisional.discard(name)
        print(f"✓ {name}: {im.width}x{im.height} → {dest.relative_to(ROOT)}")
        time.sleep(2)
    marker.write_text(json.dumps(sorted(provisional)))


if __name__ == "__main__":
    main()
