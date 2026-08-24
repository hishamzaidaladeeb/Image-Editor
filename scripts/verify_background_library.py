from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path("/home/ubuntu/image-editor/frontend/public/backgrounds")
NAMES = ["white", "black", "gray", "studio", "product", "gradient", "minimal", "advertising"]
THUMBNAIL_SIZE = (360, 270)
CELL_SIZE = (390, 320)

results = []
for name in NAMES:
    path = ROOT / f"{name}.png"
    with Image.open(path) as image:
        image.verify()
    with Image.open(path) as image:
        results.append({"name": name, "path": str(path.resolve()), "width": image.width, "height": image.height, "format": image.format, "mode": image.mode, "bytes": path.stat().st_size})

sheet = Image.new("RGB", (CELL_SIZE[0] * 2, CELL_SIZE[1] * 4), "#e5e7eb")
draw = ImageDraw.Draw(sheet)
for index, result in enumerate(results):
    with Image.open(result["path"]) as image:
        thumbnail = image.convert("RGB")
        thumbnail.thumbnail(THUMBNAIL_SIZE)
        x = (index % 2) * CELL_SIZE[0] + (CELL_SIZE[0] - thumbnail.width) // 2
        y = (index // 2) * CELL_SIZE[1] + 12
        sheet.paste(thumbnail, (x, y))
    draw.text(((index % 2) * CELL_SIZE[0] + 12, (index // 2) * CELL_SIZE[1] + 288), f'{result["name"]} · {result["width"]}×{result["height"]} · {result["bytes"]} B', fill="#111827")

sheet.save("/home/ubuntu/image-editor/background-library-contact-sheet.png", format="PNG")
for result in results:
    print(f'{result["name"]}|{result["path"]}|{result["width"]}x{result["height"]}|{result["bytes"]}|{result["format"]}|{result["mode"]}')
