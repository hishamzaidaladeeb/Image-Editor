from pathlib import Path
from PIL import Image

output = Path("/home/ubuntu/image-editor/rc-assets/export-visual-source.png")
output.parent.mkdir(parents=True, exist_ok=True)
image = Image.new("RGBA", (640, 420))
pixels = image.load()
for y in range(image.height):
    for x in range(image.width):
        pixels[x, y] = (x % 256, y % 256, 180, 160 if x > image.width // 3 else 255)
image.save(output, format="PNG")
