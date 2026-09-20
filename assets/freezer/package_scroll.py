"""WebP with alpha for reliable bidirectional scroll, plus full-HD source stills."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'scroll-v2'
PUBLIC=ROOT.parents[1]/'public/media/freezer-scroll'
PUBLIC.mkdir(parents=True,exist_ok=True)
preview='--preview' in sys.argv
folder=OUT/('preview-frames' if preview else 'frames')
timeline=json.loads((OUT/'timeline.json').read_text())
for path in sorted(folder.glob('*.png')):
    desktop=PUBLIC/(path.stem+'.webp')
    mobile=PUBLIC/(path.stem+'-mobile.webp')
    fresh=max(path.stat().st_mtime,Path(__file__).stat().st_mtime)
    if desktop.exists() and mobile.exists() and min(desktop.stat().st_mtime,mobile.stat().st_mtime)>fresh:
        continue
    im=Image.open(path).convert('RGBA')
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
    if int(path.stem) in [1,49,73]:
        im.save(OUT/(path.stem+'-hd.webp'),'WEBP',quality=94,method=3)
track=[entry['anchors'] for entry in timeline['timeline']]
(PUBLIC/'anchors.json').write_text(json.dumps(track,separators=(',',':'))+'\n')
(ROOT.parents[1]/'src/components/story/scroll-anchors.json').write_text(json.dumps(track,separators=(',',':'))+'\n')
board=Image.new('RGB',(1440,900),'#E8EFEE')
draw=ImageDraw.Draw(board)
font=ImageFont.truetype(str(ROOT/'stills-v2/fonts/instrument-sans-medium.ttf'),22)
for i,(frame,caption) in enumerate([(1,'01 / Hero — lukket'),(49,'02–03 / Åpen — samme vinkel'),(73,'04 / Rett forfra')]):
    path=folder/f'{frame:04d}.png'
    if not path.exists(): continue
    im=Image.open(PUBLIC/f'{frame:04d}-mobile.webp').convert('RGBA').resize((440,440),Image.Resampling.LANCZOS)
    board.paste(im,(20+i*480,200),im)
    draw.text((25+i*480,685),caption,font=font,fill='#172125')
draw.text((25,50),'FRYSEBOKSEN / TRANSPARENT 16:9 / REVERSIBEL SCROLL',font=font,fill='#172125')
board.save(OUT/'review-board.jpg',quality=94)
print(json.dumps({'packaged_frames':len(list(folder.glob('*.png'))),'preview':preview,'public':str(PUBLIC)}))
