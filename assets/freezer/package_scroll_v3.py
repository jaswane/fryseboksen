"""Package V3 alpha frames and the matching coloured reveal still for the web."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'scroll-v3'
PUBLIC=ROOT.parents[1]/'public/media/freezer-scroll-v3'

preview='--preview' in sys.argv
if preview: PUBLIC=OUT/'preview-web'
PUBLIC.mkdir(parents=True,exist_ok=True)
folder=OUT/('preview-frames' if preview else 'frames')
timeline=json.loads((OUT/'timeline.json').read_text())
for path in sorted(folder.glob('*.png')):
    if '--keyframes' in sys.argv and path.stem not in ['0001','0049','0049-known','0073']:
        continue
    desktop=PUBLIC/(path.stem+'.webp')
    mobile=PUBLIC/(path.stem+'-mobile.webp')
    sticker=OUT/'sticker-frames'/(path.stem.split('-')[0]+'.png')
    if not preview:
        assert sticker.exists(), f'Missing Blender sticker pass: {sticker}'
    fresh=max(path.stat().st_mtime,Path(__file__).stat().st_mtime,
              sticker.stat().st_mtime if sticker.exists() and not preview else 0)
    if desktop.exists() and mobile.exists() and min(desktop.stat().st_mtime,mobile.stat().st_mtime)>fresh:
        continue
    im=Image.open(path).convert('RGBA')
    if sticker.exists() and not preview:
        decal=Image.open(sticker).convert('RGBA')
        assert decal.size==im.size, sticker
        im.alpha_composite(decal)
    # Preserve opaque product pixels; make the broad semi-transparent catcher shadow quieter.
    # A short smooth ramp retains anti-aliased contact edges.
    original=im.getchannel('A')
    def alpha(a):
        t=max(0,min(1,(a-200)/55))
        return round(max(0,a-50)*.38*(1-t)+a*t)
    matte=original.point(alpha)
    fade=Image.new('L',im.size,255)
    d=ImageDraw.Draw(fade)
    feather=round(im.height*.04)
    for i in range(feather):
        d.rectangle((i,i,im.width-i-1,im.height-i-1),outline=round(255*i/feather))
    fade=ImageChops.lighter(fade,original.point(lambda a: 255 if a>240 else 0))
    im.putalpha(ImageChops.multiply(matte,fade))
    im.resize((1440,810),Image.Resampling.LANCZOS).save(PUBLIC/(path.stem+'.webp'),'WEBP',quality=88,method=3)
    # Trim only the empty left side for a square mobile composition; freezer remains intact.
    small=im.crop((round(im.width*.4375),0,im.width,im.height)).resize((810,810),Image.Resampling.LANCZOS)
    edge=Image.new('L',small.size,255); ed=ImageDraw.Draw(edge)
    for i in range(32): ed.rectangle((i,i,809-i,809-i),outline=round(255*i/32))
    small.putalpha(ImageChops.multiply(small.getchannel('A'),edge))
    small.save(PUBLIC/(path.stem+'-mobile.webp'),'WEBP',quality=86,method=3)
    if path.stem in ['0001','0049','0049-known','0073']:
        im.save(OUT/(path.stem+'-hd.webp'),'WEBP',quality=94,method=3)
track=[entry['anchors'] for entry in timeline['timeline']]
(PUBLIC/'anchors.json').write_text(json.dumps(track,separators=(',',':'))+'\n')
if not preview: (ROOT.parents[1]/'src/components/story/scroll-anchors.json').write_text(json.dumps(track,separators=(',',':'))+'\n')
if not preview and 'reveal_outline' in timeline:
    (ROOT.parents[1]/'src/components/story/scroll-reveal-mask.json').write_text(json.dumps(timeline['reveal_outline'])+'\n')

board=Image.new('RGB',(1600,1760),'#E8EFEE')
draw=ImageDraw.Draw(board)
font=ImageFont.truetype(str(ROOT/'stills-v2/fonts/instrument-sans-medium.ttf'),26)
smallfont=ImageFont.truetype(str(ROOT/'stills-v2/fonts/instrument-sans-medium.ttf'),21)
draw.text((45,35),'FRYSEBOKSEN / VISUELL REVISJON 03',font=font,fill='#172125')
for i,(name,caption) in enumerate([
    ('0001','01 / Samme fryseboks og hero'),
    ('0049','02 / Anonymt innhold'),
    ('0049-known','03 / Farger og identitet — samme kamera'),
    ('0073','04 / Litt nærmere, litt mer ovenfra'),
]):
    path=PUBLIC/(name+'-mobile.webp')
    if not path.exists(): continue
    x,y=35+(i%2)*800,110+(i//2)*810
    im=Image.open(path).convert('RGBA').resize((730,730),Image.Resampling.LANCZOS)
    board.paste(im,(x,y),im)
    draw.text((x+10,y+740),caption,font=smallfont,fill='#172125')
board.save(OUT/('preview-board.jpg' if preview else 'review-board.jpg'),quality=94)
print(json.dumps({'packaged_frames':len(list(folder.glob('*.png'))),'preview':preview,'public':str(PUBLIC)}))
