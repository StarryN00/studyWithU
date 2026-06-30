#!/usr/bin/env python3
"""Draw raster assets for the elementary math knowledge tree."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "assets" / "map"
DATA = ROOT / "data" / "math-elementary.json"

W = 1120
TRUNK_X = 470
BAND_H = 210
GRADES = 6
TOP_PAD = 190
BASE_PAD = 230
H = TOP_PAD + GRADES * BAND_H + BASE_PAD
Y_TOP = TOP_PAD + 8
Y_BOT = H - BASE_PAD + 54
PLATE_PAD = 34
DOMAIN_ORDER = ["A", "G", "S", "P"]

INK = (22, 19, 15, 238)
INK_MID = (22, 19, 15, 154)
INK_LIGHT = (22, 19, 15, 88)
TRUNK_FILL = (246, 241, 229, 238)
DOMAIN_COLORS = {
    "A": (160, 128, 46),
    "G": (92, 134, 83),
    "S": (70, 138, 132),
    "P": (156, 92, 140),
}
GRADE_NAMES = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"]
FONT_SERIF = Path("/System/Library/Fonts/Supplemental/Songti.ttc")
FONT_HEI = Path("/System/Library/Fonts/STHeiti Light.ttc")


def cx(y: float) -> float:
    return TRUNK_X + math.sin((Y_BOT - y) / 260) * 9


def trunk_half(y: float) -> float:
    t = min(1, max(0, (y - Y_TOP) / (Y_BOT - Y_TOP)))
    return 14 + t * t * 42


def trunk_edge(y: float, side: int) -> float:
    t = min(1, max(0, (y - Y_TOP) / (Y_BOT - Y_TOP)))
    wave = math.sin(y / 29) * 4.2 + math.sin(y / 71 + side * 1.7) * 5.4
    knots = math.sin(y / 143 + side * 0.9) * 7.2 * t
    return cx(y) + side * (trunk_half(y) + wave + knots)


def band_center(grade: int) -> float:
    return Y_BOT - 50 - (grade - 0.5) * BAND_H


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def jitter(seed: str, salt: str) -> float:
    h = 2166136261
    for ch in seed + salt:
        h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    return (h % 1000) / 1000


def cubic(
    p0: tuple[float, float],
    p1: tuple[float, float],
    p2: tuple[float, float],
    p3: tuple[float, float],
    steps: int = 28,
) -> list[tuple[float, float]]:
    pts = []
    for i in range(steps + 1):
        t = i / steps
        mt = 1 - t
        x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
        y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def quad(
    p0: tuple[float, float],
    p1: tuple[float, float],
    p2: tuple[float, float],
    steps: int = 22,
) -> list[tuple[float, float]]:
    pts = []
    for i in range(steps + 1):
        t = i / steps
        mt = 1 - t
        x = mt**2 * p0[0] + 2 * mt * t * p1[0] + t**2 * p2[0]
        y = mt**2 * p0[1] + 2 * mt * t * p1[1] + t**2 * p2[1]
        pts.append((x, y))
    return pts


def ink_line(
    draw: ImageDraw.ImageDraw,
    points: Iterable[tuple[float, float]],
    fill: tuple[int, int, int, int] = INK,
    width: int = 2,
) -> None:
    pts = [(round(x), round(y)) for x, y in points]
    if len(pts) > 1:
        draw.line(pts, fill=fill, width=width, joint="curve")


def trembling_line(
    draw: ImageDraw.ImageDraw,
    points: Iterable[tuple[float, float]],
    fill: tuple[int, int, int, int] = INK,
    width: int = 1,
    seed: str = "line",
) -> None:
    """Draw a slightly doubled hand-inked line."""
    pts = list(points)
    ink_line(draw, pts, fill, width)
    rng = random.Random(seed)
    shifted = [(x + rng.uniform(-0.9, 0.9), y + rng.uniform(-0.75, 0.75)) for x, y in pts]
    ink_line(draw, shifted, (fill[0], fill[1], fill[2], max(36, int(fill[3] * 0.42))), 1)


def draw_plate() -> None:
    rng = random.Random(22)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pix = img.load()
    for y in range(H):
        for x in range(W):
            if x < PLATE_PAD or x > W - PLATE_PAD or y < PLATE_PAD or y > H - PLATE_PAD:
                continue
            grain = rng.randint(-5, 5)
            wave = int(math.sin(y / 11) * 1.4 + math.sin((x + y) / 43) * 1.5)
            pix[x, y] = (
                max(0, min(255, 248 + grain + wave)),
                max(0, min(255, 244 + grain + wave)),
                max(0, min(255, 235 + grain)),
                255,
            )

    noise = Image.new("L", (W, H), 0)
    nd = ImageDraw.Draw(noise)
    for _ in range(14500):
        x = rng.randrange(PLATE_PAD, W - PLATE_PAD)
        y = rng.randrange(PLATE_PAD, H - PLATE_PAD)
        nd.point((x, y), fill=rng.randrange(6, 22))
    noise = noise.filter(ImageFilter.GaussianBlur(0.32))
    img.alpha_composite(Image.merge("RGBA", [noise, noise, noise, noise]))

    draw = ImageDraw.Draw(img)
    frame = (22, 19, 15, 110)
    draw.rectangle((PLATE_PAD, PLATE_PAD, W - PLATE_PAD, H - PLATE_PAD), outline=(22, 19, 15, 72), width=1)
    draw.rectangle((PLATE_PAD + 14, PLATE_PAD + 14, W - PLATE_PAD - 14, H - PLATE_PAD - 14), outline=frame, width=1)
    img.convert("RGB").save(OUT / "plate-paper.webp", quality=86, method=6)


def make_plate_image() -> Image.Image:
    draw_plate()
    return Image.open(OUT / "plate-paper.webp").convert("RGBA")


def draw_trunk() -> None:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    left = []
    right = []
    for i in range(70):
        y = lerp(Y_TOP - 4, Y_BOT + 8, i / 69)
        left.append((trunk_edge(y, -1), y))
        right.append((trunk_edge(y, 1), y))
    outline = [(round(x), round(y)) for x, y in left + list(reversed(right))]
    draw.polygon(outline, fill=TRUNK_FILL, outline=INK)

    # Plate-XV style bark: dense vertical etching plus short diagonal hatches.
    rng = random.Random(119)
    for i in range(240):
        y = lerp(Y_TOP + 4, Y_BOT - 4, i / 239)
        left_x = trunk_edge(y, -1)
        right_x = trunk_edge(y, 1)
        x = rng.uniform(left_x + 4, right_x - 4)
        h = rng.uniform(20, 78)
        sway = rng.uniform(-5, 5)
        pts = cubic((x, y), (x + sway, y + h * 0.3), (x - sway * 0.6, y + h * 0.72), (x + sway * 0.35, y + h), 14)
        trembling_line(draw, pts, (22, 19, 15, rng.randrange(78, 150)), 1, f"bark-{i}")

    for i in range(170):
        y = lerp(Y_TOP + 20, Y_BOT - 25, i / 169)
        x = rng.uniform(trunk_edge(y, -1) + 2, trunk_edge(y, 1) - 2)
        slant = rng.choice([-1, 1]) * rng.uniform(6, 14)
        draw.line((round(x), round(y), round(x + slant), round(y + rng.uniform(7, 17))), fill=(22, 19, 15, rng.randrange(42, 96)), width=1)

    for i in range(40):
        y = lerp(Y_TOP + 18, Y_BOT - 18, i / 39)
        l = trunk_edge(y, -1)
        r = trunk_edge(y, 1)
        trembling_line(draw, [(l + 2, y), (r - 2, y + rng.uniform(-6, 6))], (22, 19, 15, rng.randrange(28, 58)), 1, f"cross-hatch-{i}")

    base_x = cx(Y_BOT)
    for i, k in enumerate([-1.22, -0.92, -0.62, -0.34, 0, 0.38, 0.72, 1.06, 1.32]):
        ex = base_x + k * (105 + i * 20)
        ey = Y_BOT + 70 + abs(k) * 36
        pts = cubic((base_x + k * 10, Y_BOT - 6), (base_x + k * 42, Y_BOT + 28), (base_x + k * 72, Y_BOT + 58), (ex, ey), 32)
        trembling_line(draw, pts, INK_MID, 2, f"root-{i}")
        if k:
            fork = quad((lerp(base_x, ex, 0.58), lerp(Y_BOT, ey, 0.58)), (ex - k * 36, ey - 18), (ex - k * 58, ey + 12), 16)
            trembling_line(draw, fork, INK_LIGHT, 1, f"root-fork-{i}")
            fork2 = quad((lerp(base_x, ex, 0.42), lerp(Y_BOT, ey, 0.42)), (ex + k * 28, ey - 28), (ex + k * 62, ey - 18), 12)
            trembling_line(draw, fork2, INK_LIGHT, 1, f"root-fork2-{i}")
            for n in range(3):
                sx = lerp(base_x, ex, 0.5 + n * 0.12)
                sy = lerp(Y_BOT, ey, 0.5 + n * 0.12)
                rootlet = quad((sx, sy), (sx + k * rng.uniform(18, 42), sy + rng.uniform(-28, 10)), (sx + k * rng.uniform(42, 76), sy + rng.uniform(-14, 26)), 12)
                trembling_line(draw, rootlet, (22, 19, 15, 82), 1, f"rootlet-{i}-{n}")

    top_x = cx(Y_TOP)
    for k in [-1.1, -0.72, -0.36, 0, 0.38, 0.74, 1.1]:
        ex = top_x + k * 82
        ey = Y_TOP - 34 - (1 - abs(k)) * 12
        pts = quad((top_x, Y_TOP), (top_x + k * 20, Y_TOP - 40), (ex, ey), 28)
        trembling_line(draw, pts, INK_MID, 2, f"canopy-{k}")
        twig = quad((ex, ey), (ex + k * 16, ey - 18), (ex + k * 28, ey - 10), 10)
        trembling_line(draw, twig, INK_LIGHT, 1, f"canopy-twig-{k}")
        for n in range(3):
            twiglet = quad((ex, ey), (ex + k * (20 + n * 12), ey + rng.uniform(-20, 18)), (ex + k * (34 + n * 18), ey + rng.uniform(-28, 22)), 10)
            trembling_line(draw, twiglet, (22, 19, 15, 78), 1, f"canopy-twiglet-{k}-{n}")

    for i in range(42):
        t = i / 41
        y = lerp(Y_TOP + 18, Y_BOT - 18, t)
        side = -1 if i % 2 == 0 else 1
        x = rng.uniform(trunk_edge(y, -1) + 3, trunk_edge(y, 1) - 3)
        h = 42 + jitter(f"b{i}", "h") * 70
        sway = side * (5 + jitter(f"b{i}", "s") * 9)
        pts = cubic((x, y), (x + sway, y + h * 0.32), (x - sway * 0.4, y + h * 0.7), (x + sway * 0.35, y + h), 24)
        trembling_line(draw, pts, (22, 19, 15, 120), 1, f"bark-old-{i}")

    for i in range(10):
        y = lerp(Y_TOP + 120, Y_BOT - 140, i / 9)
        x = rng.uniform(trunk_edge(y, -1) + 5, trunk_edge(y, 1) - 5)
        rx = rng.uniform(3, 8)
        ry = rng.uniform(10, 22)
        draw.ellipse((x - rx, y - ry, x + rx, y + ry), outline=(22, 19, 15, 104), width=1)
        draw.arc((x - rx * 0.6, y - ry * 0.75, x + rx * 0.6, y + ry * 0.75), 250, 110, fill=(22, 19, 15, 70), width=1)

    img.save(OUT / "tree-trunk.png")


def box_for(name: str, cxp: float, cyp: float) -> tuple[float, float, float, float]:
    w = len(name) * 13 + 22
    return cxp - w / 2, cyp - 13, w, 26


def draw_branches() -> None:
    topics = json.loads(DATA.read_text())
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    for g in range(1, GRADES + 1):
        items = [t for t in topics if t["grade"] == g]
        items.sort(key=lambda t: DOMAIN_ORDER.index(t["domain"]))
        left = []
        right = []
        for i, topic in enumerate(items):
            (left if i % 2 == 0 else right).append(topic)

        center = band_center(g)
        for side_list, side in ((left, -1), (right, 1)):
            c = len(side_list)
            for j, topic in enumerate(side_list):
                frac = 0.5 if c == 1 else j / (c - 1)
                y_label = center - BAND_H * 0.32 + frac * (BAND_H * 0.64)
                dist = 160 + (j % 2) * 96 + jitter(topic["id"], "d") * 48
                cxp = TRUNK_X + side * dist
                bx, by, bw, bh = box_for(topic["name"], cxp, y_label)
                anchor_y = y_label + 14 + jitter(topic["id"], "a") * 26
                anchor_x = trunk_edge(anchor_y, side) - side * 2
                inner_x = bx + (bw if side < 0 else 0)
                dx = inner_x - anchor_x
                sag = 10 + jitter(topic["id"], "sag") * 18
                branch = cubic(
                    (anchor_x, anchor_y),
                    (anchor_x + dx * 0.26, anchor_y - 18 - sag * 0.35),
                    (inner_x - dx * 0.52, y_label + 11 + sag),
                    (inner_x, y_label),
                    42,
                )
                alpha = 232 if g == 1 else 174
                trembling_line(draw, branch, (22, 19, 15, alpha), 2 if g == 1 else 1, f"branch-{topic['id']}")

                for n in range(4):
                    tpos = 0.24 + n * 0.16
                    stem = branch[min(len(branch) - 1, max(0, round(tpos * (len(branch) - 1))))]
                    curl = 10 + jitter(topic["id"], f"t{n}") * 18
                    lift = (-1 if n % 2 == 0 else 1) * (8 + jitter(topic["id"], f"lift{n}") * 14)
                    twig = quad(
                        stem,
                        (stem[0] + side * curl * 0.7, stem[1] + lift * 0.6),
                        (stem[0] + side * curl * 1.15, stem[1] + lift),
                        14,
                    )
                    trembling_line(draw, twig, (22, 19, 15, 122), 1, f"twig-{topic['id']}-{n}")

                # Small rootlet-like terminal splits, closer to Haeckel's biological tree.
                end_y = y_label
                end_x = inner_x
                for n in range(5):
                    spread = (10 + 7 * jitter(topic["id"], f"spr{n}")) * side
                    lift = -22 + n * 11
                    terminal = quad((end_x, end_y), (end_x + spread * 0.55, end_y + lift * 0.25), (end_x + spread, end_y + lift), 10)
                    trembling_line(draw, terminal, (22, 19, 15, 116 if g != 1 else 150), 1, f"term-{topic['id']}-{n}")

        top = center - BAND_H * 0.42
        bot = center + BAND_H * 0.42
        bx = W - 92
        bracket = [
            (bx + 10, top),
            (bx, top + 10),
            (bx, center - 8),
            (bx - 8, center),
            (bx, center + 8),
            (bx, bot - 10),
            (bx + 10, bot),
        ]
        trembling_line(draw, bracket, (22, 19, 15, 132), 1, f"bracket-{g}")

    img.save(OUT / "tree-branches.png")


def text_bbox(draw: ImageDraw.ImageDraw, xy: tuple[float, float], text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int, int, int]:
    return draw.textbbox(xy, text, font=font)


def draw_centered_text(
    draw: ImageDraw.ImageDraw,
    center: tuple[float, float],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int, int] = INK,
) -> None:
    box = text_bbox(draw, (0, 0), text, font)
    w = box[2] - box[0]
    h = box[3] - box[1]
    draw.text((center[0] - w / 2, center[1] - h / 2 - box[1]), text, font=font, fill=fill)


def draw_vertical_text(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int, int] = INK,
    gap: int = 2,
) -> None:
    cy = y
    for ch in text:
        box = text_bbox(draw, (0, 0), ch, font)
        w = box[2] - box[0]
        h = box[3] - box[1]
        draw.text((x - w / 2, cy - box[1]), ch, font=font, fill=fill)
        cy += h + gap


def label_box(draw: ImageDraw.ImageDraw, box: tuple[float, float, float, float], text: str, domain: str, font: ImageFont.FreeTypeFont) -> None:
    x, y, w, h = box
    rect = (round(x), round(y), round(x + w), round(y + h))
    draw.rectangle(rect, fill=(255, 253, 247, 224), outline=INK, width=1)
    # A small colored pin keeps domain meaning without breaking the monochrome plate.
    pin = DOMAIN_COLORS.get(domain, (80, 80, 80))
    draw.ellipse((x + w - 11, y + h / 2 - 3, x + w - 5, y + h / 2 + 3), fill=pin + (190,))
    draw_centered_text(draw, (x + w / 2 - 2, y + h / 2), text, font, INK)


def draw_full_png() -> Path:
    """Compose one standalone PNG with tree, labels, and all knowledge nodes."""
    draw_plate()
    draw_trunk()
    draw_branches()

    img = Image.open(OUT / "plate-paper.webp").convert("RGBA")
    img.alpha_composite(Image.open(OUT / "tree-trunk.png").convert("RGBA"))
    img.alpha_composite(Image.open(OUT / "tree-branches.png").convert("RGBA"))
    draw = ImageDraw.Draw(img)

    title_font = ImageFont.truetype(str(FONT_SERIF), 31)
    subtitle_font = ImageFont.truetype(str(FONT_SERIF), 13)
    latin_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/PTSerif.ttc", 12)
    label_font = ImageFont.truetype(str(FONT_SERIF), 14)
    grade_font = ImageFont.truetype(str(FONT_SERIF), 14)
    small_font = ImageFont.truetype(str(FONT_SERIF), 12)

    draw.text((64, 72), "MATHEMATICA ELEMENTARIA", font=latin_font, fill=INK)
    draw.text((974, 72), "PLATE I", font=latin_font, fill=INK)
    draw_centered_text(draw, (W / 2, 96), "小学数学 · 知识之树", title_font, INK)
    draw_centered_text(draw, (W / 2, 132), "好奇 · 探索 · 惊喜", subtitle_font, (22, 19, 15, 150))
    draw.text((cx(Y_TOP) + 94, Y_TOP - 10), "↑ 通向初中数学", font=small_font, fill=(22, 19, 15, 150))

    origin = (cx(Y_BOT) - 92, Y_BOT + 102, 184, 32)
    draw.rectangle((origin[0], origin[1], origin[0] + origin[2], origin[1] + origin[3]), fill=(255, 253, 247, 224), outline=INK, width=1)
    draw_centered_text(draw, (origin[0] + origin[2] / 2, origin[1] + origin[3] / 2), "数一数 · 万物之始", label_font, INK)

    topics = json.loads(DATA.read_text())
    branch_order = 0
    for g in range(1, GRADES + 1):
        items = [t for t in topics if t["grade"] == g]
        items.sort(key=lambda t: DOMAIN_ORDER.index(t["domain"]))
        left: list[dict] = []
        right: list[dict] = []
        for i, topic in enumerate(items):
            (left if i % 2 == 0 else right).append(topic)
        center = band_center(g)
        draw.text((W - 76, center - 12), GRADE_NAMES[g - 1], font=grade_font, fill=INK)
        if g == 1:
            draw.text((W - 76, center + 12), "点开详图", font=small_font, fill=INK)
        for side_list, side in ((left, -1), (right, 1)):
            c = len(side_list)
            for j, topic in enumerate(side_list):
                frac = 0.5 if c == 1 else j / (c - 1)
                y_label = band_center(g) - BAND_H * 0.32 + frac * (BAND_H * 0.64)
                dist = 160 + (j % 2) * 96 + jitter(topic["id"], "d") * 48
                bx, by, bw, bh = box_for(topic["name"], TRUNK_X + side * dist, y_label)
                label_box(draw, (bx, by, bw, bh), topic["name"], topic["domain"], label_font)
                branch_order += 1

    draw_vertical_text(draw, W - 40, Y_TOP + 40, "小学数学", small_font, (22, 19, 15, 170))
    draw_vertical_text(draw, W - 40, Y_TOP + BAND_H * 2.2, "四大领域", small_font, (22, 19, 15, 170))
    draw_vertical_text(draw, W - 40, Y_TOP + BAND_H * 4.25, "六年脉络", small_font, (22, 19, 15, 170))
    draw_centered_text(draw, (W / 2, H - 48), "小学数学 · 全局之树 — 从树基「计数」向上生长", small_font, (22, 19, 15, 120))

    out = OUT / "haeckel-knowledge-tree.png"
    img.convert("RGB").save(out, optimize=True)
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw_plate()
    draw_trunk()
    draw_branches()
    full = draw_full_png()
    print("wrote full", full)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
