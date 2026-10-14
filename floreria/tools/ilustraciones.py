"""Genera las láminas botánicas (SVG, estilo acuarela) del catálogo.
Son PROVISIONALES: cuando la florería entregue fotos de cada arreglo,
se sustituyen en index.html por assets/img/<nombre>.webp.
Uso: python3 -I tools/ilustraciones.py
"""
import math
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "img"
W, H = 400, 500

SAGE, SAGE_D, SAGE_L = "#8a9a7b", "#5f6f55", "#b7c3a8"
EUCA = "#9fb0a2"
CREAM, PAPER, PAPER_D = "#f7f1e8", "#efe4d4", "#e2d3bf"


def f(x):
    return f"{x:.1f}"


class Svg:
    def __init__(self, seed):
        self.r = random.Random(seed)
        self.back, self.mid, self.front = [], [], []

    # ---------- primitives ----------
    def stem(self, x1, y1, x2, y2, bend=0, layer=None, w=2.2, color=SAGE_D):
        cx = (x1 + x2) / 2 + bend
        cy = (y1 + y2) / 2
        (layer or self.back).append(
            f'<path d="M{f(x1)} {f(y1)} Q{f(cx)} {f(cy)} {f(x2)} {f(y2)}" stroke="{color}" '
            f'stroke-width="{w}" fill="none" stroke-linecap="round" opacity=".85"/>')

    def leaf(self, x, y, ang, L=46, Wd=15, color=SAGE, layer=None):
        a = math.radians(ang)
        tx, ty = x + math.cos(a) * L, y + math.sin(a) * L
        nx, ny = -math.sin(a) * Wd, math.cos(a) * Wd
        mx, my = (x + tx) / 2, (y + ty) / 2
        (layer or self.back).append(
            f'<path d="M{f(x)} {f(y)} Q{f(mx+nx)} {f(my+ny)} {f(tx)} {f(ty)} Q{f(mx-nx)} {f(my-ny)} {f(x)} {f(y)}Z" '
            f'fill="{color}" opacity=".78"/>'
            f'<path d="M{f(x)} {f(y)} L{f(tx)} {f(ty)}" stroke="{SAGE_D}" stroke-width=".8" opacity=".35"/>')

    def eucalyptus(self, x, y, ang, L=120, layer=None):
        a = math.radians(ang)
        ex, ey = x + math.cos(a) * L, y + math.sin(a) * L
        self.stem(x, y, ex, ey, bend=self.r.uniform(-14, 14), layer=layer, w=1.4, color=SAGE_D)
        n = 6
        for i in range(1, n + 1):
            t = i / (n + 1)
            px, py = x + (ex - x) * t, y + (ey - y) * t
            for side in (-1, 1):
                ox = -math.sin(a) * 9 * side
                oy = math.cos(a) * 9 * side
                rr = 9 - t * 3
                (layer or self.back).append(
                    f'<circle cx="{f(px+ox)}" cy="{f(py+oy)}" r="{f(rr)}" fill="{EUCA}" opacity=".7"/>')

    def gyp(self, x, y, n=14, spread=26, layer=None, color="#fffaf2"):
        lay = layer or self.mid
        for _ in range(n):
            dx, dy = self.r.uniform(-spread, spread), self.r.uniform(-spread, spread)
            lay.append(f'<path d="M{f(x)} {f(y)} L{f(x+dx)} {f(y+dy)}" stroke="{SAGE}" stroke-width=".6" opacity=".6"/>')
            lay.append(f'<circle cx="{f(x+dx)}" cy="{f(y+dy)}" r="{f(self.r.uniform(2,3.4))}" fill="{color}" stroke="#e6dccb" stroke-width=".5"/>')

    def rose(self, x, y, R, base, dark, layer=None):
        lay = layer or self.front
        lay.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(R)}" fill="{base}"/>')
        # outer petals
        for i in range(6):
            a = i * 60 + self.r.uniform(-10, 10)
            px, py = x + math.cos(math.radians(a)) * R * .55, y + math.sin(math.radians(a)) * R * .55
            lay.append(f'<ellipse cx="{f(px)}" cy="{f(py)}" rx="{f(R*.55)}" ry="{f(R*.42)}" '
                       f'transform="rotate({f(a)} {f(px)} {f(py)})" fill="{base}" stroke="{dark}" stroke-width=".9" stroke-opacity=".35"/>')
        # spiral heart
        pts = []
        for k in range(46):
            t = k / 45
            ang = t * 4.2 * math.pi
            rr = R * .62 * (1 - t) + 1
            pts.append((x + math.cos(ang) * rr, y + math.sin(ang) * rr * .9))
        d = "M" + " L".join(f"{f(a)} {f(b)}" for a, b in pts)
        lay.append(f'<path d="{d}" stroke="{dark}" stroke-width="1.6" fill="none" opacity=".55" stroke-linecap="round"/>')
        lay.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(R*.18)}" fill="{dark}" opacity=".35"/>')

    def ranunculus(self, x, y, R, base, dark, layer=None):
        lay = layer or self.front
        steps = 7
        for i in range(steps):
            rr = R * (1 - i / steps)
            col = base if i % 2 == 0 else dark
            op = .95 if i % 2 == 0 else .35
            lay.append(f'<circle cx="{f(x + i*.4)}" cy="{f(y - i*.6)}" r="{f(rr)}" fill="{col}" opacity="{op}"/>')
        lay.append(f'<circle cx="{f(x+3)}" cy="{f(y-4)}" r="{f(R*.12)}" fill="#7b8a5a" opacity=".7"/>')

    def peony(self, x, y, R, base, dark, layer=None):
        lay = layer or self.front
        for i in range(11):
            a = self.r.uniform(0, 360)
            d = self.r.uniform(0, R * .45)
            px, py = x + math.cos(math.radians(a)) * d, y + math.sin(math.radians(a)) * d
            rr = R * self.r.uniform(.45, .7)
            lay.append(f'<circle cx="{f(px)}" cy="{f(py)}" r="{f(rr)}" fill="{base}" stroke="{dark}" stroke-width=".8" stroke-opacity=".3" opacity=".9"/>')
        lay.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(R*.25)}" fill="{dark}" opacity=".3"/>')

    def daisy(self, x, y, R, petal="#fffdf8", center="#e8b84a", layer=None):
        lay = layer or self.front
        n = 14
        for i in range(n):
            a = i * 360 / n
            px, py = x + math.cos(math.radians(a)) * R * .55, y + math.sin(math.radians(a)) * R * .55
            lay.append(f'<ellipse cx="{f(px)}" cy="{f(py)}" rx="{f(R*.48)}" ry="{f(R*.16)}" '
                       f'transform="rotate({f(a)} {f(px)} {f(py)})" fill="{petal}" stroke="#e5dccc" stroke-width=".6"/>')
        lay.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(R*.26)}" fill="{center}"/>')

    def lily(self, x, y, R, petal="#fffdf8", vein="#e9c9b4", layer=None):
        lay = layer or self.front
        for i in range(6):
            a = i * 60 - 90 + self.r.uniform(-6, 6)
            ar = math.radians(a)
            tx, ty = x + math.cos(ar) * R, y + math.sin(ar) * R
            nx, ny = -math.sin(ar) * R * .28, math.cos(ar) * R * .28
            mx, my = (x + tx) / 2, (y + ty) / 2
            lay.append(f'<path d="M{f(x)} {f(y)} Q{f(mx+nx)} {f(my+ny)} {f(tx)} {f(ty)} Q{f(mx-nx)} {f(my-ny)} {f(x)} {f(y)}Z" '
                       f'fill="{petal}" stroke="#e2d6c4" stroke-width=".8"/>')
            lay.append(f'<path d="M{f(x)} {f(y)} L{f(mx)} {f(my)}" stroke="{vein}" stroke-width="1.4" opacity=".8"/>')
        for i in range(5):
            a = math.radians(-90 + (i - 2) * 22)
            sx, sy = x + math.cos(a) * R * .55, y + math.sin(a) * R * .55
            lay.append(f'<path d="M{f(x)} {f(y)} L{f(sx)} {f(sy)}" stroke="#b9a36a" stroke-width=".9"/>'
                       f'<ellipse cx="{f(sx)}" cy="{f(sy)}" rx="2.6" ry="1.4" fill="#b5764f"/>')

    def orchid(self, x, y, R, petal="#fffdf8", lip="#e7a7a0", layer=None):
        lay = layer or self.front
        for a in (-90, 30, 150):
            ar = math.radians(a)
            px, py = x + math.cos(ar) * R * .5, y + math.sin(ar) * R * .5
            lay.append(f'<ellipse cx="{f(px)}" cy="{f(py)}" rx="{f(R*.55)}" ry="{f(R*.3)}" transform="rotate({a} {f(px)} {f(py)})" fill="{petal}" stroke="#e4d8c8" stroke-width=".7"/>')
        for a in (-20, 200):
            ar = math.radians(a)
            px, py = x + math.cos(ar) * R * .5, y + math.sin(ar) * R * .5
            lay.append(f'<ellipse cx="{f(px)}" cy="{f(py)}" rx="{f(R*.58)}" ry="{f(R*.48)}" transform="rotate({a} {f(px)} {f(py)})" fill="{petal}" stroke="#e4d8c8" stroke-width=".7"/>')
        lay.append(f'<ellipse cx="{f(x)}" cy="{f(y+R*.2)}" rx="{f(R*.22)}" ry="{f(R*.28)}" fill="{lip}"/>')
        lay.append(f'<circle cx="{f(x)}" cy="{f(y-R*.05)}" r="{f(R*.09)}" fill="#e8c35a"/>')

    # ---------- containers ----------
    def wrap(self, cx, top, color=PAPER, edge=PAPER_D, ribbon="#d99a86"):
        self.mid.append(  # back paper
            f'<path d="M{f(cx-120)} {f(top-20)} L{f(cx-18)} {f(top+190)} L{f(cx+18)} {f(top+190)} L{f(cx+120)} {f(top-30)} '
            f'Q{f(cx)} {f(top+20)} {f(cx-120)} {f(top-20)}Z" fill="{edge}" opacity=".9"/>')
        self.front.append(
            f'<path d="M{f(cx-104)} {f(top+10)} L{f(cx-10)} {f(top+200)} L{f(cx+12)} {f(top+200)} L{f(cx+96)} {f(top+20)} '
            f'Q{f(cx-6)} {f(top+70)} {f(cx-104)} {f(top+10)}Z" fill="{color}"/>'
            f'<path d="M{f(cx-104)} {f(top+10)} Q{f(cx-6)} {f(top+70)} {f(cx+96)} {f(top+20)}" stroke="{edge}" stroke-width="2" fill="none"/>'
            f'<path d="M{f(cx-40)} {f(top+96)} L{f(cx-6)} {f(top+190)}" stroke="{edge}" stroke-width="1.2" opacity=".7"/>'
            f'<path d="M{f(cx-34)} {f(top+120)} Q{f(cx)} {f(top+112)} {f(cx+30)} {f(top+122)}" stroke="{ribbon}" stroke-width="7" fill="none" stroke-linecap="round"/>'
            f'<path d="M{f(cx)} {f(top+118)} q-26 -22 -34 4 q16 10 34 -4z M{f(cx)} {f(top+118)} q26 -22 34 4 q-16 10 -34 -4z" fill="{ribbon}"/>'
            f'<path d="M{f(cx-2)} {f(top+120)} q-8 34 -22 52 M{f(cx+2)} {f(top+120)} q10 30 24 46" stroke="{ribbon}" stroke-width="4" fill="none" stroke-linecap="round"/>')

    def vase(self, cx, top, color="#d9cfc0", band=None):
        d = (f'M{f(cx-52)} {f(top)} Q{f(cx-70)} {f(top+70)} {f(cx-44)} {f(top+150)} L{f(cx+44)} {f(top+150)} '
             f'Q{f(cx+70)} {f(top+70)} {f(cx+52)} {f(top)}Z')
        self.front.append(f'<path d="{d}" fill="{color}"/>'
                          f'<ellipse cx="{f(cx)}" cy="{f(top)}" rx="52" ry="9" fill="#cbbfae"/>'
                          f'<path d="M{f(cx-30)} {f(top+30)} Q{f(cx-42)} {f(top+80)} {f(cx-26)} {f(top+130)}" stroke="#fff" stroke-width="6" opacity=".35" fill="none" stroke-linecap="round"/>')
        if band:
            self.front.append(f'<path d="M{f(cx-60)} {f(top+40)} Q{f(cx)} {f(top+52)} {f(cx+60)} {f(top+40)}" stroke="{band}" stroke-width="5" fill="none"/>')

    def hatbox(self, cx, top, color="#f3e9dc", lid="#e9dccb", ribbon="#d99a86"):
        self.front.append(
            f'<path d="M{f(cx-120)} {f(top)} L{f(cx-120)} {f(top+120)} A120 26 0 0 0 {f(cx+120)} {f(top+120)} L{f(cx+120)} {f(top)}Z" fill="{color}"/>'
            f'<path d="M{f(cx-120)} {f(top)} A120 26 0 0 0 {f(cx+120)} {f(top)}" stroke="{lid}" stroke-width="6" fill="none"/>'
            f'<path d="M{f(cx-120)} {f(top+56)} A120 26 0 0 0 {f(cx+120)} {f(top+56)}" stroke="{ribbon}" stroke-width="9" fill="none" opacity=".9"/>'
            f'<path d="M{f(cx-96)} {f(top+20)} L{f(cx-96)} {f(top+120)}" stroke="#fff" stroke-width="10" opacity=".25"/>')

    def pot(self, cx, top, color="#d8cdbd"):
        self.front.append(
            f'<path d="M{f(cx-58)} {f(top)} L{f(cx-44)} {f(top+110)} L{f(cx+44)} {f(top+110)} L{f(cx+58)} {f(top)}Z" fill="{color}"/>'
            f'<rect x="{f(cx-64)}" y="{f(top-12)}" width="128" height="18" rx="4" fill="#cbbfad"/>')

    def render(self, name, filt_seed):
        s = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img">'
             f'<defs><filter id="wc" x="-5%" y="-5%" width="110%" height="110%">'
             f'<feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="{filt_seed}" result="n"/>'
             f'<feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/>'
             f'</filter>'
             f'<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="3"/>'
             f'<feColorMatrix values="0 0 0 0 .35  0 0 0 0 .3  0 0 0 0 .25  0 0 0 .06 0"/></filter></defs>'
             f'<ellipse cx="200" cy="470" rx="150" ry="14" fill="#5f6f55" opacity=".08"/>'
             f'<g filter="url(#wc)">{"".join(self.back)}{"".join(self.mid)}{"".join(self.front)}</g>'
             f'<rect width="{W}" height="{H}" filter="url(#grain)"/></svg>')
        (OUT / f"{name}.svg").write_text(s, encoding="utf-8")
        print(name, len(s) // 1024, "KB")


def greenery(sv, cx, cy, n=6, spread=110):
    for i in range(n):
        ang = -160 + i * (140 / max(1, n - 1)) + sv.r.uniform(-8, 8)
        if i % 2:
            sv.eucalyptus(cx, cy, ang, L=spread * sv.r.uniform(.8, 1.1))
        else:
            a = math.radians(ang)
            sv.leaf(cx + math.cos(a) * spread * .55, cy + math.sin(a) * spread * .55, ang, L=48, Wd=14)


def bouquet(name, seed, flowers, paper=PAPER, ribbon="#d99a86", gyp=True):
    sv = Svg(seed)
    cx, cy = 200, 205
    for i in range(9):
        sv.stem(cx + sv.r.uniform(-60, 60), cy + sv.r.uniform(-50, 20), cx + sv.r.uniform(-8, 8), 430, bend=sv.r.uniform(-10, 10))
    greenery(sv, cx, cy + 10, n=7, spread=150)
    if gyp:
        for p in ((cx - 95, cy - 40), (cx + 90, cy - 60), (cx + 10, cy - 115)):
            sv.gyp(*p)
    spots = [(cx - 52, cy - 52, 38), (cx + 34, cy - 70, 40), (cx - 6, cy - 4, 44), (cx + 72, cy + 2, 34),
             (cx - 80, cy + 18, 32), (cx - 30, cy - 104, 30), (cx + 50, cy - 124, 26), (cx + 4, cy + 54, 30)]
    for (x, y, R), (kind, base, dark) in zip(spots, flowers):
        getattr(sv, kind)(x, y, R, base, dark) if kind not in ("daisy",) else sv.daisy(x, y, R * .9)
    sv.wrap(cx, cy + 60, color=paper, ribbon=ribbon)
    sv.render(name, seed)


def in_vase(name, seed, flowers, vase_color="#d9cfc0", band=None):
    sv = Svg(seed)
    cx, cy = 200, 210
    for i in range(7):
        sv.stem(cx + sv.r.uniform(-70, 70), cy + sv.r.uniform(-60, 20), cx + sv.r.uniform(-20, 20), 300, bend=sv.r.uniform(-10, 10))
    greenery(sv, cx, cy + 30, n=6, spread=140)
    spots = [(cx - 60, cy - 40, 40), (cx + 44, cy - 58, 42), (cx - 4, cy + 6, 46), (cx + 82, cy + 18, 32),
             (cx - 92, cy + 30, 30), (cx - 16, cy - 98, 32), (cx + 70, cy - 120, 24)]
    for (x, y, R), (kind, base, dark) in zip(spots, flowers):
        if kind == "daisy":
            sv.daisy(x, y, R * .9)
        elif kind == "lily":
            sv.lily(x, y, R * 1.2)
        else:
            getattr(sv, kind)(x, y, R, base, dark)
    sv.vase(cx, 300, color=vase_color, band=band)
    sv.render(name, seed)


def in_box(name, seed, flowers):
    sv = Svg(seed)
    cx = 200
    greenery(sv, cx, 250, n=5, spread=150)
    grid = [(cx - 78, 236, 40), (cx, 222, 44), (cx + 80, 238, 40), (cx - 44, 276, 38), (cx + 44, 278, 38),
            (cx - 100, 280, 30), (cx + 104, 282, 30), (cx, 186, 30)]
    for (x, y, R), (kind, base, dark) in zip(grid, flowers):
        getattr(sv, kind)(x, y, R, base, dark)
    sv.hatbox(cx, 290)
    sv.render(name, seed)


def orchid_pot(name, seed):
    sv = Svg(seed)
    cx = 200
    sv.stem(cx, 330, cx + 30, 120, bend=-60, w=2.4)
    for i, (x, y, R) in enumerate([(cx + 40, 110, 34), (cx + 78, 140, 32), (cx + 104, 184, 30), (cx + 118, 230, 26), (cx - 10, 150, 32), (cx - 40, 196, 30)]):
        sv.orchid(x, y, R)
    sv.stem(cx - 2, 330, cx - 30, 170, bend=30, w=2)
    for ang in (-170, -150, -20, -5):
        a = math.radians(ang)
        sv.leaf(cx, 330, ang, L=110, Wd=24, color="#7f9070", layer=sv.front)
    sv.pot(cx, 340)
    sv.render(name, seed)


def wreath(name, seed):
    sv = Svg(seed)
    cx, cy, R = 200, 230, 130
    sv.back.append(f'<path d="M{cx-60} {cy+150} L{cx-90} 470 M{cx+60} {cy+150} L{cx+90} 470" stroke="#8a7a66" stroke-width="5"/>')
    for ring, off in ((R + 14, 96), (R - 12, 112), (R, 104)):
        for i in range(34):
            a = i * (360 / 34) + sv.r.uniform(-4, 4)
            ar = math.radians(a)
            sv.leaf(cx + math.cos(ar) * ring, cy + math.sin(ar) * ring, a + off, L=44, Wd=13, color=sv.r.choice([SAGE, EUCA, SAGE_L]))
    for i in range(10):
        a = i * 36 + 10
        ar = math.radians(a)
        x, y = cx + math.cos(ar) * R, cy + math.sin(ar) * R
        if i % 3 == 0:
            sv.lily(x, y, 30)
        else:
            sv.rose(x, y, 22, "#fbf7f0", "#d8cbb8")
    sv.gyp(cx - 90, cy - 90, 10)
    sv.gyp(cx + 90, cy + 90, 10)
    sv.front.append(f'<path d="M{cx-26} {cy+R-6} q-30 -26 -42 6 q20 12 42 -6z M{cx+26} {cy+R-6} q30 -26 42 6 q-20 12 -42 -6z" fill="#f1ece3" stroke="#d8cbb8"/>')
    sv.render(name, seed)


def bridal(name, seed):
    sv = Svg(seed)
    cx, cy = 200, 200
    for i in range(10):
        sv.stem(cx + sv.r.uniform(-30, 30), cy + 40, cx + sv.r.uniform(-14, 14), 440, bend=sv.r.uniform(-6, 6), w=3, color="#7d8c68")
    for ang in (-170, -140, -110, -70, -40, -10, 160, 20, 120):
        sv.eucalyptus(cx, cy, ang, L=150)
    sv.gyp(cx - 110, cy - 10, 16, 34)
    sv.gyp(cx + 110, cy - 20, 16, 34)
    for (x, y, R, k) in [(cx - 60, cy - 30, 40, "peony"), (cx + 40, cy - 52, 40, "rose"), (cx - 10, cy + 20, 44, "rose"),
                         (cx + 76, cy + 12, 32, "ranunculus"), (cx - 82, cy + 30, 30, "rose"), (cx - 12, cy - 92, 32, "peony")]:
        getattr(sv, k)(x, y, R, "#fbf6ee", "#d9c6ae")
    sv.front.append(f'<path d="M{cx-26} 300 Q{cx} 292 {cx+26} 300 L{cx+24} 336 Q{cx} 330 {cx-24} 336Z" fill="#f2e6d6"/>'
                    f'<path d="M{cx} 318 q-10 50 -36 92 M{cx+4} 318 q14 46 40 84" stroke="#e8d7c2" stroke-width="7" fill="none" stroke-linecap="round"/>')
    sv.render(name, seed)


def centerpiece(name, seed):
    sv = Svg(seed)
    cx, cy = 200, 300
    for ang in (-178, -168, -12, -2, 182, 172, 8, -6):
        sv.eucalyptus(cx, cy, ang, L=180)
    for (x, y, R, k, b, d) in [(cx - 100, cy - 10, 30, "rose", "#f2c9b8", "#c98f7b"), (cx - 40, cy - 26, 38, "peony", "#f7ddd2", "#d9a796"),
                               (cx + 24, cy - 20, 36, "rose", "#fbf6ee", "#d9c6ae"), (cx + 86, cy - 6, 30, "ranunculus", "#f4c7a8", "#d79a75"),
                               (cx - 4, cy + 16, 30, "ranunculus", "#fbf3e8", "#d9c6ae")]:
        getattr(sv, k)(x, y, R, b, d)
    sv.gyp(cx - 150, cy - 20, 10)
    sv.gyp(cx + 150, cy - 10, 10)
    sv.front.append(f'<rect x="{cx-80}" y="{cy+34}" width="160" height="34" rx="8" fill="#d9cfc0"/>')
    for x in (cx - 140, cx + 140):
        sv.front.append(f'<rect x="{x-7}" y="{cy-60}" width="14" height="128" rx="3" fill="#fbf7f0" stroke="#e2d6c4"/>'
                        f'<path d="M{x} {cy-60} q-5 -12 0 -22 q5 10 0 22z" fill="#f2c27a"/>')
    sv.front.append(f'<path d="M30 {cy+68} L370 {cy+68}" stroke="#cbbfad" stroke-width="2"/>')
    sv.render(name, seed)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    blush, blush_d = "#f3c6bb", "#c98a7c"
    peach, peach_d = "#f6c9a6", "#d38f63"
    cream, cream_d = "#fbf6ee", "#d9c6ae"
    red, red_d = "#c4505a", "#7e2a33"
    yellow, yellow_d = "#f6dc8a", "#d0a645"
    pink, pink_d = "#f2b6c0", "#c97884"

    in_box("arreglo-dulce-durazno", 11, [("rose", peach, peach_d), ("ranunculus", blush, blush_d), ("rose", peach, peach_d),
                                         ("rose", cream, cream_d), ("ranunculus", peach, peach_d), ("rose", blush, blush_d),
                                         ("rose", cream, cream_d), ("ranunculus", blush, blush_d)])
    bouquet("arreglo-pasion-carmesi", 21, [("rose", red, red_d), ("rose", blush, blush_d), ("rose", red, red_d), ("rose", red, red_d),
                                           ("rose", blush, blush_d), ("rose", red, red_d), ("rose", red, red_d), ("rose", blush, blush_d)],
            paper="#f6dcd6", ribbon="#b34a55", gyp=True)
    in_vase("arreglo-petit-amour", 31, [("peony", pink, pink_d), ("peony", blush, blush_d), ("peony", pink, pink_d), ("rose", cream, cream_d),
                                        ("rose", blush, blush_d), ("peony", pink, pink_d), ("ranunculus", blush, blush_d)], vase_color="#e8c9bf", band="#d98f84")
    in_vase("arreglo-jardin-salvia", 41, [("rose", cream, cream_d), ("ranunculus", peach, peach_d), ("daisy", "", ""), ("rose", blush, blush_d),
                                          ("daisy", "", ""), ("ranunculus", yellow, yellow_d), ("daisy", "", "")], vase_color="#b8c4ad")
    orchid_pot("arreglo-orquidea-nube", 51)
    bridal("arreglo-novia-marfil", 61)
    centerpiece("arreglo-mesa-campestre", 71)
    in_vase("arreglo-paz-serena", 81, [("lily", "", ""), ("rose", cream, cream_d), ("lily", "", ""), ("rose", cream, cream_d),
                                       ("rose", cream, cream_d), ("lily", "", ""), ("rose", cream, cream_d)], vase_color="#cfd6c6")
    wreath("arreglo-corona-luz", 91)
    bouquet("arreglo-sol-de-domingo", 101, [("ranunculus", yellow, yellow_d), ("rose", peach, peach_d), ("daisy", "", ""),
                                            ("ranunculus", yellow, yellow_d), ("daisy", "", ""), ("rose", peach, peach_d),
                                            ("daisy", "", ""), ("ranunculus", yellow, yellow_d)], paper="#fbf3df", ribbon="#e2b25e")
