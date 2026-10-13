#!/usr/bin/env python3
"""Crea ilustraciones provisionales de marca («los siete azules») para cada espacio de imagen.

Se usan solo mientras no existan las fotografías generadas con IA
(ver tools/generar-imagenes.py). Marca los archivos en assets/img/.provisionales.json
para que el generador sepa que puede sustituirlos.
"""
import json, math, random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img"

BLUES = ["#d8ece6", "#a9d8d0", "#6fbfbd", "#3a9aa3", "#1d6b74", "#164b62", "#0f2233"]

SLOTS = {
    "hero": ((1920, 1080), "Siete Azules", "Laguna de Bacalar", ("#f3d7b0", "#e9b98a"), 0.42),
    "alberca": ((1600, 900), "Alberca infinita", "Agua sobre agua", ("#f6e6cc", "#edd2a6"), 0.5),
    "restaurante": ((1400, 1050), "Restaurante Ki'imak", "Cocina peninsular", ("#e7b88f", "#c98b67"), 0.55),
    "spa": ((1400, 1050), "Spa Sak Ha", "Rituales mayas", ("#e6e8d8", "#c9d3bb"), 0.6),
    "hab-jardin": ((1400, 1050), "Habitación Jardín", "Entre palmas", ("#eef0e0", "#d5dfc4"), 0.62),
    "hab-deluxe": ((1400, 1050), "Deluxe Vista Laguna", "Balcón a la laguna", ("#f5e2c4", "#ebcb9c"), 0.48),
    "hab-palafito": ((1400, 1050), "Suite Palafito", "Sobre el agua", ("#f0c9a0", "#d99a74"), 0.45),
    "hab-familiar": ((1400, 1050), "Suite Familiar Selva", "Espacio para todos", ("#eaeedd", "#cddabc"), 0.58),
}


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def make(name, size, title, sub, sky, horizon):
    w, h = size
    rnd = random.Random(name)
    img = Image.new("RGB", size)
    d = ImageDraw.Draw(img)
    top, bottom = hex2rgb(sky[0]), hex2rgb(sky[1])
    hy = int(h * horizon)
    for y in range(hy + 2):
        t = y / max(1, hy)
        d.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    # Sol dorado difuminado
    sun = Image.new("L", size, 0)
    ImageDraw.Draw(sun).ellipse([w * 0.62, hy - h * 0.2, w * 0.62 + h * 0.22, hy + h * 0.02], fill=200)
    sun = sun.filter(ImageFilter.GaussianBlur(h * 0.03))
    img.paste(Image.new("RGB", size, (247, 226, 190)), (0, 0), sun)
    # Siete bandas de azul con ondas suaves
    band_h = (h - hy) / 7
    for i, col in enumerate(BLUES):
        y0 = hy + i * band_h
        amp = h * 0.006 * (1 + i * 0.6)
        freq = rnd.uniform(1.2, 2.4)
        phase = rnd.uniform(0, math.tau)
        pts = [(x, y0 + math.sin(x / w * math.tau * freq + phase) * amp) for x in range(0, w + 8, 8)]
        d.polygon(pts + [(w, h), (0, h)], fill=hex2rgb(col))
    d.rectangle([0, hy - 2, w * 0.38, hy + 1], fill=(34, 56, 46))
    # Grano fino
    noise = Image.effect_noise(size, 18).convert("L")
    img = Image.blend(img, Image.merge("RGB", (noise, noise, noise)), 0.05)
    # Texto
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    marker = OUT / ".provisionales.json"
    prov = set(json.loads(marker.read_text())) if marker.exists() else set()
    for name, (size, title, sub, sky, horizon) in SLOTS.items():
        dest = OUT / f"{name}.webp"
        if dest.exists() and name not in prov:
            continue
        make(name, size, title, sub, sky, horizon).save(dest, "WEBP", quality=82, method=6)
        prov.add(name)
        print("✓", dest.relative_to(ROOT))
    marker.write_text(json.dumps(sorted(prov)))


if __name__ == "__main__":
    main()
