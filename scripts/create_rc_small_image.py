from pathlib import Path
from PIL import Image

output = Path("/home/ubuntu/image-editor/rc-assets/export-visual-small.png")
output.parent.mkdir(parents=True, exist_ok=True)
image = Image.new("RGBA", (160, 100))
pixels = image.load()
for y in range(image.height):
    for x in range(image.width):
        pixels[x, y] = (x, y * 2, 220 - x // 2, 140 if x >= 80 else 255)
image.save(output, format="PNG")
