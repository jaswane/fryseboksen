"""Validate V3 camera margins, alpha exports and the anonymous/known reveal."""
import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageStat

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'scroll-v3'
PUBLIC = ROOT.parents[1] / 'public/media/freezer-scroll-v3'
timeline = json.loads((OUT / 'timeline.json').read_text())
entries = timeline['timeline']
assert len(entries) == 73
assert entries[0]['lid_degrees'] == 0
assert all(e['lid_degrees'] == 95 for e in entries[48:])
assert all(a['lid_degrees'] <= b['lid_degrees'] for a, b in zip(entries, entries[1:]))
assert entries[48]['elevation'] == 58
assert entries[72]['elevation'] == 63
baseline = json.loads((ROOT / 'scroll-v2/timeline.json').read_text())['timeline']
assert all(math.dist(a['camera'], b['camera']) < .000001 for a, b in zip(entries[:49], baseline[:49]))
for entry in entries:
    x0, y0, x1, y1 = entry['bounds']
    assert .4375 < x0 < x1 < .985 and .02 < y0 < y1 < .98, entry
    for point in entry['anchors'].values():
        assert all(0 < value < 1 for value in point)
max_step = max(math.dist(a['camera'], b['camera']) for a, b in zip(entries, entries[1:]))
assert max_step < .20, max_step
sticker_track = json.loads((OUT / 'sticker-placement.json').read_text())
assert len(sticker_track['frames']) == 73
assert sticker_track['size_m'] == [.12, .14]
for pose in sticker_track['frames']:
    path = OUT / 'sticker-frames' / f"{pose['frame']:04d}.png"
    with Image.open(path) as decal:
        assert decal.mode == 'RGBA' and decal.size == (1920, 1080), path
        assert decal.getchannel('A').getextrema() == (0, 255), path
        assert decal.getchannel('A').getbbox() is not None, path
        x0, y0, x1, y1 = pose['bounds']
        assert .4375 < x0 < x1 < .985 and .02 < y0 < y1 < .98, pose

sizes = []
names = [f'{frame:04d}' for frame in range(1, 74)] + ['0049-known']
for name in names:
    source = OUT / 'frames' / (name + '.png')
    with Image.open(source) as im:
        assert im.size == (1920, 1080) and im.mode == 'RGBA', source
        im.load()
    for suffix, size in [('', (1440, 810)), ('-mobile', (810, 810))]:
        path = PUBLIC / (name + suffix + '.webp')
        with Image.open(path) as im:
            assert im.size == size and im.mode == 'RGBA', path
            assert im.getchannel('A').getextrema() == (0, 255), path
            im.load()
        sizes.append(path.stat().st_size)
for name in ['0001', '0049', '0049-known', '0073']:
    with Image.open(OUT / (name + '-hd.webp')) as im:
        assert im.size == (1920, 1080) and im.mode == 'RGBA'

unknown = Image.open(OUT / 'frames/0049.png').convert('RGBA')
known = Image.open(OUT / 'frames/0049-known.png').convert('RGBA')
mask = Image.new('L', unknown.size, 0)
ImageDraw.Draw(mask).polygon([(round(x * unknown.width), round(y * unknown.height))
                             for x, y in timeline['reveal_outline']], fill=255)


def chroma(im):
    r, g, b = im.convert('RGB').split()
    highest = ImageChops.lighter(ImageChops.lighter(r, g), b)
    lowest = ImageChops.darker(ImageChops.darker(r, g), b)
    return ImageStat.Stat(ImageChops.subtract(highest, lowest), mask).mean[0]


unknown_chroma, known_chroma = chroma(unknown), chroma(known)
assert known_chroma > unknown_chroma * 1.5 + 2, (unknown_chroma, known_chroma)
unknown_silhouette = unknown.getchannel('A').point(lambda a: 255 if a > 250 else 0)
known_silhouette = known.getchannel('A').point(lambda a: 255 if a > 250 else 0)
silhouette_difference = ImageStat.Stat(ImageChops.difference(unknown_silhouette, known_silhouette)).mean[0] / 255
assert silhouette_difference < .01, silhouette_difference
exported_mask = json.loads((ROOT.parents[1] / 'src/components/story/scroll-reveal-mask.json').read_text())
assert exported_mask == timeline['reveal_outline']
exported_anchors = json.loads((ROOT.parents[1] / 'src/components/story/scroll-anchors.json').read_text())
assert exported_anchors == [entry['anchors'] for entry in entries]

report = {
    'passed': True, 'camera_frames': 73, 'source_renders': 74, 'web_exports': 148,
    'source_size': [1920, 1080], 'desktop_size': [1440, 810], 'mobile_size': [810, 810],
    'total_web_bytes': sum(sizes), 'max_camera_step_m': max_step,
    'all_product_bounds_inside_frame': True, 'all_frames_have_alpha': True,
    'minimum_top_margin': min(1 - e['bounds'][3] for e in entries),
    'minimum_bottom_margin': min(e['bounds'][1] for e in entries),
    'lid_open_from_frame': 49, 'lid_degrees_open': 95,
    'scene_2_and_3_camera_frame': 49, 'scene_2_and_3_elevation': 58, 'scene_4_elevation': 63,
    'opening_camera_matches_approved_v2': True,
    'sticker_passes': 73, 'sticker_size_m': [.12, .14], 'sticker_in_all_camera_views': True,
    'unknown_cavity_chroma': unknown_chroma, 'known_cavity_chroma': known_chroma,
    'silhouette_changed_fraction': silhouette_difference,
}
(OUT / 'validation.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
