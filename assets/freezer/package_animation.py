"""Tracked question-mark overlays and MP4/WebM delivery for the Blender opening shot."""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT=Path(__file__).resolve().parent
PROJECT=ROOT.parents[1]
sys.path.insert(0,str(PROJECT/'work/asset-python'))
parser=argparse.ArgumentParser()
parser.add_argument('--preview',action='store_true')
args=parser.parse_args()
OUT=ROOT/'animation-v1'
SOURCE=OUT/('preview-frames' if args.preview else 'frames')
COMPOSITED=OUT/('preview-composited' if args.preview else 'composited-frames')
COMPOSITED.mkdir(exist_ok=True)
manifest=json.loads((OUT/('preview-timeline.json' if args.preview else 'timeline.json')).read_text())
font_source=ROOT/'stills-v2/fonts/instrument-sans-medium.ttf'
if not font_source.exists(): font_source=ROOT/'fonts/instrument-sans-medium.ttf'
SIZE=manifest['width']
S=SIZE/1080
font=ImageFont.truetype(str(font_source),round(32*S))
offsets={'beef':(-170,-85),'berries':(156,-18),'lasagne':(-180,164)}

def overlay(frame):
    layer=Image.new('RGBA',(SIZE,SIZE))
    metadata=[]
    for item in frame['markers']:
        opacity=item['opacity']
        px,py=item['x']*SIZE,item['y']*SIZE
        dx,dy=offsets[item['id']]
        cx,cy=px+dx*S,py+dy*S
        half=26*S
        assert 0<cx-half<cx+half<SIZE and 0<cy-half<cy+half<SIZE or opacity==0
        metadata.append({**item,'card_x':round(cx/SIZE,6),'card_y':round(cy/SIZE,6),
                         'card_size':52/1080,'text':'?'})
        if opacity==0: continue
        single=Image.new('RGBA',(SIZE,SIZE))
        shadow=Image.new('RGBA',(SIZE,SIZE))
        sd=ImageDraw.Draw(shadow)
        box=(cx-half,cy-half,cx+half,cy+half)
        sd.rounded_rectangle((box[0],box[1]+4*S,box[2],box[3]+4*S),radius=5*S,fill=(25,42,49,42))
        shadow=shadow.filter(ImageFilter.GaussianBlur(8*S))
        d=ImageDraw.Draw(single)
        edge=cx+half if dx<0 else cx-half
        d.line([(edge,cy),(px,py)],fill=(112,135,141,215),width=max(1,round(S)))
        r=2.4*S
        d.ellipse((px-r,py-r,px+r,py+r),fill='#617A80',outline='#F3F5F4',width=max(1,round(S)))
        d.rounded_rectangle(box,radius=5*S,fill=(253,254,251,250),outline='#C9D2D1',width=max(1,round(S)))
        d.text((cx,cy),'?',font=font,fill='#263B42',anchor='mm')
        single=Image.alpha_composite(shadow,single)
        single.putalpha(single.getchannel('A').point(lambda a:round(a*opacity)))
        layer=Image.alpha_composite(layer,single)
    return layer,metadata

tracks=[]
available=[]
for frame in manifest['timeline']:
    layer,metadata=overlay(frame)
    tracks.append({'frame':frame['frame'],'time':frame['time'],'markers':metadata})
    path=SOURCE/f"{frame['frame']:04d}.png"
    if not path.exists():
        assert args.preview,f'Missing animation frame: {path}'
        continue
    image=Image.alpha_composite(Image.open(path).convert('RGBA'),layer)
    image.save(COMPOSITED/path.name)
    available.append(frame['frame'])

if args.preview:
    selected=available
else:
    assert len(available)==96
    selected=[1,20,40,60,80,96]
    (OUT/'overlay-track.json').write_text(json.dumps({'fps':24,'duration_seconds':4,
        'coordinate_system':'normalized screen space, origin top-left','frames':tracks},indent=2)+'\n',encoding='utf-8')

cols=3
rows=(len(selected)+cols-1)//cols
board=Image.new('RGB',(1500,rows*520+85),'#F3F5F4')
d=ImageDraw.Draw(board)
title=ImageFont.truetype(str(font_source),25)
caption=ImageFont.truetype(str(font_source),18)
d.text((25,25),'FRYSEBOKSEN / ÅPNING OG INNHOLD / 4 SEKUNDER',font=title,fill='#20323A')
for i,frame in enumerate(selected):
    x=15+(i%cols)*500
    y=85+(i//cols)*520
    im=Image.open(COMPOSITED/f'{frame:04d}.png').convert('RGB').resize((470,470),Image.Resampling.LANCZOS)
    board.paste(im,(x,y))
    d.text((x+8,y+478),f'{(frame-1)/24:.2f} s'.replace('.',','),font=caption,fill='#20323A')
board.save(OUT/('preview-storyboard.jpg' if args.preview else 'storyboard.jpg'),quality=94)
if args.preview:
    print('PREVIEW_OVERLAYS_COMPLETE')
    sys.exit(0)

import imageio_ffmpeg
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
for kind,source in [('questions',COMPOSITED),('clean',SOURCE)]:
    common=[ffmpeg,'-hide_banner','-loglevel','error','-y','-framerate','24','-start_number','1',
            '-i',str(source/'%04d.png'),'-frames:v','96','-an',
            '-vf','scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p',
            '-color_range','tv','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709']
    for extension,codec in [('mp4',['-c:v','libx264','-preset','slow','-crf','18','-movflags','+faststart']),
                            ('webm',['-c:v','libvpx-vp9','-b:v','0','-crf','26','-row-mt','1','-deadline','good','-cpu-used','2'])]:
        path=OUT/f'fryseboksen-opening-{kind}.{extension}'
        subprocess.run(common+codec+[str(path)],check=True)
        print('ENCODED',path.name,path.stat().st_size,flush=True)
for source,name in [(SOURCE/'0001.png','poster-hero'),(COMPOSITED/'0096.png','poster-questions'),(SOURCE/'0096.png','poster-content-clean')]:
    im=Image.open(source).convert('RGB')
    im.save(OUT/(name+'.png'))
    im.save(OUT/(name+'.webp'),quality=93,method=6)
(OUT/'fonts').mkdir(exist_ok=True)
shutil.copy2(font_source,OUT/'fonts/instrument-sans-medium.ttf')
license_source=font_source.parent/'OFL.txt'
shutil.copy2(license_source,OUT/'fonts/OFL.txt')
print('ANIMATION_PACKAGE_COMPLETE',flush=True)
