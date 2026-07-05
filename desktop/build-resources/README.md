# Build Resources

Place your app icons here before building:

- `icon.icns` — macOS icon (512×512 or 1024×1024 recommended)
- `icon.ico`  — Windows icon (256×256 recommended, multi-size .ico)
- `icon.png`  — Linux icon (512×512 PNG with transparency)

You can generate all three from a single 1024×1024 PNG using:
https://www.electronforge.io/guides/create-and-add-icons

Or use ImageMagick:
  convert icon.png -resize 512x512 icon-512.png
  (then use an online .ico generator for Windows)

If no icons are provided, electron-builder will use the default Electron icon.
