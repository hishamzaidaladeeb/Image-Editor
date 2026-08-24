from pathlib import Path

from PIL import Image, ImageDraw


OUTPUT = Path("/home/ubuntu/image-editor/frontend/public/backgrounds")
SIZE = (1200, 900)


def linear_gradient(top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    image = Image.new("RGB", SIZE)
    pixels = image.load()
    for y in range(SIZE[1]):
        ratio = y / (SIZE[1] - 1)
        color = tuple(round(top[index] * (1 - ratio) + bottom[index] * ratio) for index in range(3))
        for x in range(SIZE[0]):
            pixels[x, y] = color
    return image


def add_soft_shapes(image: Image.Image, colors: list[tuple[int, int, int]]) -> Image.Image:
    draw = ImageDraw.Draw(image, "RGBA")
    positions = [(220, 180, 760), (940, 260, 620), (610, 760, 520)]
    for position, color in zip(positions, colors):
        x, y, radius = position
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(*color, 100))
    return image


def save(image: Image.Image, name: str) -> None:
    image.save(OUTPUT / f"{name}.png", format="PNG", optimize=True)


OUTPUT.mkdir(parents=True, exist_ok=True)
save(Image.new("RGB", SIZE, (250, 250, 250)), "white")
save(Image.new("RGB", SIZE, (18, 18, 22)), "black")
save(linear_gradient((215, 218, 224), (112, 118, 128)), "gray")
save(add_soft_shapes(linear_gradient((36, 55, 85), (9, 19, 34)), [(255, 255, 255), (80, 150, 255), (180, 220, 255)]), "studio")
save(add_soft_shapes(linear_gradient((245, 240, 230), (191, 168, 145)), [(255, 255, 255), (210, 170, 115), (125, 85, 70)]), "product")
save(add_soft_shapes(linear_gradient((255, 180, 122), (80, 78, 180)), [(255, 230, 120), (255, 110, 160), (70, 210, 220)]), "gradient")
minimal = Image.new("RGB", SIZE, (238, 241, 244))
minimal_draw = ImageDraw.Draw(minimal, "RGBA")
for x in range(0, SIZE[0], 120):
    minimal_draw.line((x, 0, x, SIZE[1]), fill=(40, 50, 60, 18), width=2)
for y in range(0, SIZE[1], 120):
    minimal_draw.line((0, y, SIZE[0], y), fill=(40, 50, 60, 18), width=2)
minimal_draw.ellipse((360, 180, 920, 740), fill=(255, 255, 255, 180), outline=(100, 110, 120, 80), width=4)
save(minimal, "minimal")
advertising = linear_gradient((26, 21, 72), (222, 62, 84))
advertising_draw = ImageDraw.Draw(advertising, "RGBA")
advertising_draw.polygon([(0, 700), (450, 200), (760, 900)], fill=(255, 196, 80, 150))
advertising_draw.polygon([(650, 0), (1200, 150), (920, 640)], fill=(50, 220, 200, 130))
save(advertising, "advertising")
