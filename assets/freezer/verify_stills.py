"""Verify image exports and exact reuse of the base render beneath both overlays."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops

parser = argparse.ArgumentParser()
parser.add_argument('directory', type=Path)
args = parser.parse_args()
root = args.directory
names = ['01-hero-closed', '02-open-two-baskets', '03-open-questions',
         '04-open-overview', '05-open-content-clean']
checked = []
for name in names:
    for suffix, expected in [('.png', (2400, 2400)), ('.webp', (2400, 2400)),
                             ('-1200.webp', (1200, 1200))]:
        path = root / (name + suffix)
        with Image.open(path) as im:
            assert im.size == expected, (path, im.size)
            im.verify()
        checked.append(path.name)

base = Image.open(root / '05-open-content-clean.png').convert('RGBA')
composites = {}
for mode, name in [('questions', '03-open-questions'), ('overview', '04-open-overview')]:
    layer = Image.open(root / 'overlays' / (mode + '.png')).convert('RGBA')
    assert layer.size == base.size
    assert layer.getchannel('A').getextrema()[0] == 0
    expected = Image.alpha_composite(base, layer)
    actual = Image.open(root / (name + '.png')).convert('RGBA')
    assert ImageChops.difference(expected, actual).getbbox(alpha_only=False) is None
    coordinates = json.loads((root / 'overlays' / (mode + '.json')).read_text(encoding='utf-8'))
    assert coordinates['viewBox'] == [0, 0, 2400, 2400]
    assert len(coordinates['labels']) == 3
    composites[mode] = 'exact match to the same base render plus the supplied overlay'

report = {'passed': True, 'checked_images': checked, 'composites': composites,
          'animation_files': [p.name for p in root.rglob('*') if p.suffix in ('.mp4', '.webm')]}
assert report['animation_files'] == []
(root / 'asset-validation.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
