"""Dev-time only: build a 1200x630 Open Graph share image. Not shipped."""
from PIL import Image, ImageDraw, ImageFilter
import os

W, H = 1200, 630
BG = (16, 12, 8, 255)

# Background: hero photo, cropped + darkened
hero = Image.open("assets/photos/source/hero.png").convert("RGB")
hw, hh = hero.size
target_ratio = W / H
src_ratio = hw / hh
if src_ratio > target_ratio:
    new_w = int(hh * target_ratio)
    x0 = (hw - new_w) // 2
    hero = hero.crop((x0, 0, x0 + new_w, hh))
else:
    new_h = int(hw / target_ratio)
    y0 = (hh - new_h) // 3
    hero = hero.crop((0, y0, hw, y0 + new_h))
hero = hero.resize((W, H), Image.LANCZOS)

canvas = Image.new("RGB", (W, H), BG[:3])
canvas.paste(hero, (0, 0))

# Dark gradient overlay (bottom-heavy) for legibility
grad = Image.new("L", (1, H), 0)
for y in range(H):
    t = y / H
    alpha = int(60 + t * 175)
    grad.putpixel((0, y), min(255, alpha))
grad = grad.resize((W, H))
overlay = Image.new("RGB", (W, H), BG[:3])
canvas = Image.composite(overlay, canvas, grad)

# Also darken overall slightly for consistency
dark = Image.new("RGB", (W, H), (0, 0, 0))
canvas = Image.blend(canvas, dark, 0.15)

# Logo mark, bottom-left
logo = Image.open("assets/img/logo-cream.webp").convert("RGBA")
logo_w = 190
scale = logo_w / logo.width
logo = logo.resize((logo_w, int(logo.height * scale)), Image.LANCZOS)
canvas = canvas.convert("RGBA")
pos = (70, H - logo.height - 150)
canvas.alpha_composite(logo, pos)

# Wordmark + tagline using default PIL font (kept minimal, no external font dependency)
draw = ImageDraw.Draw(canvas)
try:
    from PIL import ImageFont
    # Try a common system serif; fall back silently if unavailable
    font_title = ImageFont.truetype("georgia.ttf", 64)
    font_sub = ImageFont.truetype("georgiai.ttf", 30)
except Exception:
    font_title = None
    font_sub = None

text_x = pos[0] + logo.width + 28
text_y = H - logo.height - 150 + 10
if font_title:
    draw.text((text_x, text_y), "Culpeo", font=font_title, fill=(242, 235, 218, 255))
    draw.text((text_x, text_y + 78), "Diseño chileno, inspiración global", font=font_sub, fill=(201, 123, 61, 255))
else:
    draw.text((text_x, text_y + 20), "CULPEO", fill=(242, 235, 218, 255))

canvas.convert("RGB").save("assets/img/og-image.jpg", "JPEG", quality=86, optimize=True)
print("OG image saved:", os.path.getsize("assets/img/og-image.jpg") / 1024, "KB")
