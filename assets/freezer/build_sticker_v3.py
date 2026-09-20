"""Deterministic, editable sticker artwork: local font/logo and a real domain QR.

The QR encodes the public project root. It is not an implemented freezer/auth flow.
Requires Pillow and ReportLab; no image generation service or reference cropping.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from reportlab.graphics.barcode import qrencoder

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'scroll-v3'
FONT = ROOT / 'stills-v2/fonts/instrument-sans-medium.ttf'
im = Image.new('RGBA', (840, 980), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
ink, muted = '#172125', '#5B747D'
d.rounded_rectangle((1, 1, 838, 978), radius=34, fill='#F6F8F6', outline='#D9E1DF', width=2)


def font(size):
    return ImageFont.truetype(str(FONT), size)


def cube(x, y, size):
    # The same original cube paths as src/components/site/chrome.tsx.
    paths = [
        [(4, 7.5), (14, 2), (24, 7.5), (24, 20.5), (14, 26), (4, 20.5), (4, 7.5)],
        [(4, 7.5), (14, 13.2), (24, 7.5)], [(14, 13.2), (14, 26)], [(9, 4.8), (19, 10.5)],
    ]
    for path in paths:
        d.line([(x + a * size / 28, y + b * size / 28) for a, b in path],
               fill=ink, width=max(2, round(size * 1.5 / 28)), joint='curve')


cube(53, 69, 64)
d.text((137, 78), 'Fryseboksen', font=font(43), fill=ink)
brand_width = d.textlength('Fryseboksen', font=font(43))
d.text((137 + brand_width, 78), '.no', font=font(43), fill=muted)
d.text((63, 190), 'Noe inn', font=font(105), fill=ink)
d.text((63, 303), 'eller ut?', font=font(105), fill=ink)
d.text((65, 520), 'Skann og oppdater', font=font(31), fill=ink)
d.text((65, 562), 'Fryseboksen', font=font(31), fill=ink)
d.text((65, 666), 'fryseboksen.no', font=font(29), fill=muted)

qr = qrencoder.QRCode(None, qrencoder.QRErrorCorrectLevel.M)
qr.addData('https://fryseboksen.no/')
qr.make()
module, quiet = 8, 4
size = (qr.moduleCount + quiet * 2) * module
code = Image.new('RGB', (size, size), '#F6F8F6')
qd = ImageDraw.Draw(code)
for row in range(qr.moduleCount):
    for col in range(qr.moduleCount):
        if qr.modules[row][col]:
            x, y = (col + quiet) * module, (row + quiet) * module
            qd.rectangle((x, y, x + module - 1, y + module - 1), fill=ink)
im.paste(code, (840 - size - 43, 444))
d.line((65, 783, 775, 783), fill='#D1DCDE', width=2)
cube(61, 831, 56)
d.text((142, 844), 'Husk hva du har.', font=font(32), fill=muted)
OUT.mkdir(exist_ok=True)
im.save(OUT / 'sticker.png')
print('STICKER_ARTWORK_READY', im.size, 'QR: https://fryseboksen.no/')
