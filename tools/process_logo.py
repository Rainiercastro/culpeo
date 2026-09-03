"""Dev-time only: process the brand logo into web-ready assets. Not shipped."""
from PIL import Image
import os

SRC = "Logo Culpeo (sin fondo).png"
OUT = "assets/img"
os.makedirs(OUT, exist_ok=True)

img = Image.open(SRC).convert("RGBA")

# Trim transparent/near-white margins so the mark sits tight in its box
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

# --- 1. Base black-ink logo (for light surfaces) ---
def max_side_resize(im, max_side):
    w, h = im.size
    scale = max_side / max(w, h)
    if scale < 1:
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    return im

logo_black = max_side_resize(img, 900)
logo_black.save(f"{OUT}/logo.webp", "WEBP", quality=90, lossless=False)

# --- 2. Cream/light recolor (for dark surfaces) — keep alpha, force RGB to cream ---
cream = (242, 235, 218, 255)  # matches --cream token
data = logo_black.getdata()
recolored = []
for r, g, b, a in data:
    recolored.append((cream[0], cream[1], cream[2], a))
logo_cream = Image.new("RGBA", logo_black.size)
logo_cream.putdata(recolored)
logo_cream.save(f"{OUT}/logo-cream.webp", "WEBP", quality=90)

# --- 3. Favicon: cream mark on dark warm circle ---
FAV_BG = (14, 11, 9, 255)  # --bg
size = 256
canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
from PIL import ImageDraw
draw = ImageDraw.Draw(canvas)
draw.ellipse([0, 0, size, size], fill=FAV_BG)
mark = max_side_resize(logo_cream, int(size * 0.66))
mx = (size - mark.width) // 2
my = (size - mark.height) // 2 - int(size * 0.03)
canvas.alpha_composite(mark, (mx, my))
canvas.save(f"{OUT}/favicon.png", "PNG")
canvas.resize((32, 32), Image.LANCZOS).save(f"{OUT}/favicon-32.png", "PNG")
canvas.resize((180, 180), Image.LANCZOS).save(f"{OUT}/apple-touch-icon.png", "PNG")

print("Logo processed:", logo_black.size, "->", f"{OUT}/logo.webp, logo-cream.webp, favicon.png")
