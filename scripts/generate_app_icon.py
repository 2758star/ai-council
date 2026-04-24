from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ICONS_DIR = ROOT / "src-tauri" / "icons"
ICONSET_DIR = ICONS_DIR / "icon.iconset"


def pick_font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Futura.ttc",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Black.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size, index=1 if path.suffix == ".ttc" else 0)
    return ImageFont.load_default()


def make_gradient(size: int, start: tuple[int, int, int], end: tuple[int, int, int]) -> Image.Image:
    image = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(image)
    for y in range(size):
        ratio = y / max(size - 1, 1)
        color = tuple(int(start[i] * (1 - ratio) + end[i] * ratio) for i in range(3))
        draw.line([(0, y), (size, y)], fill=color + (255,))
    return image


def draw_icon(size: int) -> Image.Image:
    bg = (248, 244, 238, 255)
    border = (226, 220, 211, 255)
    foreground = (26, 32, 45, 255)
    warm = (255, 177, 120, 90)
    cool = (166, 195, 255, 82)

    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    pad = int(size * 0.08)
    radius = int(size * 0.24)
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        fill=bg,
        outline=border,
        width=max(2, size // 80),
    )

    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse(
        [int(size * 0.52), int(size * 0.08), int(size * 0.96), int(size * 0.52)],
        fill=warm,
    )
    glow_draw.ellipse(
        [int(size * 0.00), int(size * 0.48), int(size * 0.50), int(size * 0.98)],
        fill=cool,
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(8, size // 18)))
    canvas = Image.alpha_composite(canvas, glow)

    inner = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner_draw = ImageDraw.Draw(inner)
    inner_draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        outline=(255, 255, 255, 120),
        width=max(1, size // 170),
    )
    canvas = Image.alpha_composite(canvas, inner)

    font = pick_font(int(size * 0.58))
    text = "A"
    text_box = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    text_draw = ImageDraw.Draw(text_box)
    bbox = text_draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) / 2 - bbox[0]
    y = (size - text_h) / 2 - bbox[1] - size * 0.02

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.text((x, y + size * 0.018), text, font=font, fill=(17, 24, 39, 46))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=max(4, size // 96)))
    canvas = Image.alpha_composite(canvas, shadow)

    text_draw.text((x, y), text, font=font, fill=foreground)

    cut = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cut_draw = ImageDraw.Draw(cut)
    cut_draw.rounded_rectangle(
        [
            int(size * 0.41),
            int(size * 0.53),
            int(size * 0.61),
            int(size * 0.585),
        ],
        radius=max(2, size // 100),
        fill=(255, 187, 136, 255),
    )
    cut = cut.filter(ImageFilter.GaussianBlur(radius=max(1, size // 256)))

    text_box = Image.alpha_composite(text_box, cut)
    canvas = Image.alpha_composite(canvas, text_box)
    image = Image.alpha_composite(image, canvas)
    return image


def save_png(image: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.resize((size, size), Image.LANCZOS).save(path, format="PNG")


def main() -> None:
    base = draw_icon(1024)

    root_sizes = {
        "32x32.png": 32,
        "64x64.png": 64,
        "128x128.png": 128,
        "128x128@2x.png": 256,
        "icon.png": 512,
        "StoreLogo.png": 50,
        "Square30x30Logo.png": 30,
        "Square44x44Logo.png": 44,
        "Square71x71Logo.png": 71,
        "Square89x89Logo.png": 89,
        "Square107x107Logo.png": 107,
        "Square142x142Logo.png": 142,
        "Square150x150Logo.png": 150,
        "Square284x284Logo.png": 284,
        "Square310x310Logo.png": 310,
    }

    for name, size in root_sizes.items():
        save_png(base, ICONS_DIR / name, size)

    iconset_sizes = {
        "icon_16x16.png": 16,
        "icon_16x16@2x.png": 32,
        "icon_32x32.png": 32,
        "icon_32x32@2x.png": 64,
        "icon_128x128.png": 128,
        "icon_128x128@2x.png": 256,
        "icon_256x256.png": 256,
        "icon_256x256@2x.png": 512,
        "icon_512x512.png": 512,
        "icon_512x512@2x.png": 1024,
    }

    for name, size in iconset_sizes.items():
        save_png(base, ICONSET_DIR / name, size)

    ios_sizes = {
        "AppIcon-20x20@1x.png": 20,
        "AppIcon-20x20@2x.png": 40,
        "AppIcon-20x20@2x-1.png": 40,
        "AppIcon-20x20@3x.png": 60,
        "AppIcon-29x29@1x.png": 29,
        "AppIcon-29x29@2x.png": 58,
        "AppIcon-29x29@2x-1.png": 58,
        "AppIcon-29x29@3x.png": 87,
        "AppIcon-40x40@1x.png": 40,
        "AppIcon-40x40@2x.png": 80,
        "AppIcon-40x40@2x-1.png": 80,
        "AppIcon-40x40@3x.png": 120,
        "AppIcon-60x60@2x.png": 120,
        "AppIcon-60x60@3x.png": 180,
        "AppIcon-76x76@1x.png": 76,
        "AppIcon-76x76@2x.png": 152,
        "AppIcon-83.5x83.5@2x.png": 167,
        "AppIcon-512@2x.png": 1024,
    }

    for name, size in ios_sizes.items():
        save_png(base, ICONS_DIR / "ios" / name, size)

    android_sizes = {
        "mipmap-mdpi/ic_launcher.png": 48,
        "mipmap-mdpi/ic_launcher_round.png": 48,
        "mipmap-mdpi/ic_launcher_foreground.png": 48,
        "mipmap-hdpi/ic_launcher.png": 72,
        "mipmap-hdpi/ic_launcher_round.png": 72,
        "mipmap-hdpi/ic_launcher_foreground.png": 72,
        "mipmap-xhdpi/ic_launcher.png": 96,
        "mipmap-xhdpi/ic_launcher_round.png": 96,
        "mipmap-xhdpi/ic_launcher_foreground.png": 96,
        "mipmap-xxhdpi/ic_launcher.png": 144,
        "mipmap-xxhdpi/ic_launcher_round.png": 144,
        "mipmap-xxhdpi/ic_launcher_foreground.png": 144,
        "mipmap-xxxhdpi/ic_launcher.png": 192,
        "mipmap-xxxhdpi/ic_launcher_round.png": 192,
        "mipmap-xxxhdpi/ic_launcher_foreground.png": 192,
    }

    for name, size in android_sizes.items():
        save_png(base, ICONS_DIR / "android" / name, size)

    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    base.save(ICONS_DIR / "icon.ico", format="ICO", sizes=ico_sizes)


if __name__ == "__main__":
    main()
