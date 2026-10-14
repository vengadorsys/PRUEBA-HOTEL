"""Convierte las fotos de assets/photos/source a WebP optimizado en assets/img.
Las vistas previas de Canva llegan a ~400-600 px: se amplían x2 (Lanczos + enfoque
suave) para pantallas retina. Cuando la florería entregue fotos reales grandes,
basta con dejarlas en source/ con el mismo nombre y volver a ejecutar."""
import sys
from pathlib import Path
from PIL import Image, ImageFilter

root = Path(__file__).resolve().parent.parent
src, out = root / "assets/photos/source", root / "assets/img"
out.mkdir(parents=True, exist_ok=True)
for p in sorted(src.glob("*.*")):
    im = Image.open(p).convert("RGB")
    if im.width < 1000:
        im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))
    elif im.width > 1800:
        im.thumbnail((1800, 1800), Image.LANCZOS)
    dest = out / (p.stem + ".webp")
    im.save(dest, "WEBP", quality=84, method=6)
    print(dest.name, im.size, dest.stat().st_size // 1024, "KB")
