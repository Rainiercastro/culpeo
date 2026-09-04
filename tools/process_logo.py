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
# At 16-32px thin line-art nearly disappears, so the favicon uses a *dilated*
# (thickened) copy of the mark, scaled to fill more of the circle. The
# apple-touch-icon is shown much larger (home screen), so it keeps the
# crisp original linework instead.
from PIL import ImageDraw, ImageFilter

FAV_BG = (14, 11, 9, 255)  # --bg

def favicon_canvas(mark_src, scale_pct, size):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.ellipse([0, 0, size, size], fill=FAV_BG)
    mark = max_side_resize(mark_src, int(size * scale_pct))
    mx = (size - mark.width) // 2
    my = (size - mark.height) // 2 - int(size * 0.02)
    canvas.alpha_composite(mark, (mx, my))
    return canvas

# Thickened mark for tiny favicon sizes (dilate alpha channel before scaling down)
thick_alpha = logo_cream.split()[-1].filter(ImageFilter.MaxFilter(8 * 2 + 1))
logo_cream_thick = Image.merge("RGBA", (*logo_cream.split()[:3], thick_alpha))

fav_master = favicon_canvas(logo_cream_thick, 0.80, 256)
fav_master.save(f"{OUT}/favicon.png", "PNG")
fav_master.resize((32, 32), Image.LANCZOS).save(f"{OUT}/favicon-32.png", "PNG")

# Apple touch icon: larger canvas, keep the crisp original mark
apple_icon = favicon_canvas(logo_cream, 0.68, 180)
apple_icon.save(f"{OUT}/apple-touch-icon.png", "PNG")

print("Logo processed:", logo_black.size, "->", f"{OUT}/logo.webp, logo-cream.webp, favicon.png")
