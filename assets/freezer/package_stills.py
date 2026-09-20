"""Export Blender stills, separate UI overlays and a review sheet.

This is deterministic compositing of the 3D renders, with no generative image step.
Python dependencies: Pillow, fonttools[woff].
"""
from pathlib import Path
import argparse
import base64
import html
import json
import shutil
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

ROOT=Path(__file__).resolve().parent
PROJECT=ROOT.parents[1]
sys.path.insert(0,str(PROJECT/'work'/'asset-python'))
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

parser=argparse.ArgumentParser()
parser.add_argument('--preview',action='store_true')
args=parser.parse_args()
SOURCE=ROOT/('previews' if args.preview else 'renders')
TARGET=ROOT/('review-preview' if args.preview else 'stills-v2')
TARGET.mkdir(exist_ok=True)
(TARGET/'overlays').mkdir(exist_ok=True)
(TARGET/'fonts').mkdir(exist_ok=True)

font_source=PROJECT/'node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2'
if not font_source.exists():
    font_source=ROOT/'fonts/instrument-sans-latin-wght-normal.woff2'
font_path=TARGET/'fonts/instrument-sans-medium.ttf'
font=TTFont(font_source)
font.flavor=None
font=instantiateVariableFont(font,{'wght':500},inplace=True)
font.save(font_path)
font_license=PROJECT/'public/licenses/instrument-sans.txt'
if not font_license.exists(): font_license=ROOT/'fonts/OFL.txt'
shutil.copy2(font_license,TARGET/'fonts/OFL.txt')
shutil.copy2(font_source,TARGET/'fonts/instrument-sans-latin-wght-normal.woff2')
woff=base64.b64encode(font_source.read_bytes()).decode('ascii')
manifest=json.loads((SOURCE/'manifest.json').read_text())
filled=Image.open(SOURCE/'filled.png').convert('RGBA')
W,H=filled.size
S=W/1100
anchors=manifest['shots']['filled']['anchors']

def fnt(size): return ImageFont.truetype(str(font_path),round(size*S))

# Labels sit outside the important food silhouettes, on the same anchor points in both states.
labels=[
    {'key':'beef','name':'Kjøttdeig','x':215,'y':445,'side':'right'},
    {'key':'berries','name':'Blåbær','x':855,'y':660,'side':'left'},
    {'key':'lasagne','name':'Lasagne','x':270,'y':780,'side':'right'},
]

def composite(mode):
    overlay=Image.new('RGBA',(W,H))
    shadow=Image.new('RGBA',(W,H))
    sd=ImageDraw.Draw(shadow)
    drawing=ImageDraw.Draw(overlay)
    title=fnt(18)
    question=fnt(30)
    parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
        f'<style>@font-face{{font-family:Instrument Sans;src:url(data:font/woff2;base64,{woff}) format("woff2");font-weight:400 700}}</style>',
        '<defs><filter id="shadow" x="-40%" y="-70%" width="180%" height="260%"><feDropShadow dx="0" dy="5" stdDeviation="10" flood-color="#203238" flood-opacity=".12"/></filter></defs>']
    placements=[]
    for item in labels:
        cx,cy=item['x']*S,item['y']*S
        name='?' if mode=='questions' else item['name']
        usefont=question if mode=='questions' else title
        width=50*S if mode=='questions' else drawing.textlength(name,font=usefont)+34*S
        height=50*S
        x0,y0,x1,y1=cx-width/2,cy-height/2,cx+width/2,cy+height/2
        point=anchors[item['key']]
        px,py=point['x'],point['y']
        sx=x1 if item['side']=='right' else x0
        line=[(sx,cy),(px,py)]
        drawing.line(line,fill=(118,141,145,220),width=max(1,round(1.0*S)))
        r=2.6*S
        drawing.ellipse((px-r,py-r,px+r,py+r),fill='#647C80',outline='#EDF1EE',width=max(1,round(S)))
        sd.rounded_rectangle((x0,y0+3*S,x1,y1+3*S),radius=4*S,fill=(31,47,53,32))
        drawing.rounded_rectangle((x0,y0,x1,y1),radius=4*S,fill=(253,254,251,252),outline='#C8D3D0',width=max(1,round(.75*S)))
        drawing.text((cx,cy),name,font=usefont,fill='#263B42',anchor='mm',stroke_width=0)
        parts.append(f'<path d="M {sx:.2f} {cy:.2f} L {px:.2f} {py:.2f}" stroke="#768D91" stroke-width="{S:.2f}" fill="none"/>')
        parts.append(f'<circle cx="{px}" cy="{py}" r="{r:.2f}" fill="#647C80" stroke="#EDF1EE" stroke-width="{S:.2f}"/>')
        parts.append(f'<rect x="{x0:.2f}" y="{y0:.2f}" width="{width:.2f}" height="{height:.2f}" rx="{4*S:.2f}" fill="#FDFEFB" stroke="#C8D3D0" stroke-width="{.75*S:.2f}" filter="url(#shadow)"/>')
        parts.append(f'<text x="{cx:.2f}" y="{cy:.2f}" text-anchor="middle" dominant-baseline="central" font-family="Instrument Sans,sans-serif" font-weight="500" font-size="{(30 if mode=="questions" else 18)*S:.2f}" fill="#263B42">{html.escape(name)}</text>')
        placements.append({'item':item['key'],'text':name,'anchor':point,'card':{'x':x0,'y':y0,'width':width,'height':height}})
    parts.append('</svg>')
    shadow=shadow.filter(ImageFilter.GaussianBlur(7*S))
    layer=Image.alpha_composite(shadow,overlay)
    layer.save(TARGET/'overlays'/f'{mode}.png')
    (TARGET/'overlays'/f'{mode}.svg').write_text('\n'.join(parts),encoding='utf-8')
    (TARGET/'overlays'/f'{mode}.json').write_text(json.dumps({'viewBox':[0,0,W,H],'labels':placements},ensure_ascii=False,indent=2),encoding='utf-8')
    return Image.alpha_composite(filled,layer)

images={
    '01-hero-closed':Image.open(SOURCE/'closed.png').convert('RGBA'),
    '02-open-two-baskets':Image.open(SOURCE/'open.png').convert('RGBA'),
    '03-open-questions':composite('questions'),
    '04-open-overview':composite('overview'),
    '05-open-content-clean':filled,
}
for name,img in images.items():
    img.save(TARGET/(name+'.png'))
    img.convert('RGB').save(TARGET/(name+'.webp'),quality=91,method=6)
    if not args.preview:
        img.resize((1200,1200),Image.Resampling.LANCZOS).convert('RGB').save(TARGET/(name+'-1200.webp'),quality=89,method=6)

board=Image.new('RGB',(1600,1740),'#F3F5F4')
d=ImageDraw.Draw(board)
heading=ImageFont.truetype(str(font_path),28)
caption=ImageFont.truetype(str(font_path),19)
small=ImageFont.truetype(str(font_path),17)
d.text((50,34),'FRYSEBOKSEN / PRODUKTVISUALER V2',font=heading,fill='#20323A')
d.text((50,82),'Perspektiv · front og høyre side · større utsnitt · samme lyssetting',font=small,fill='#50666C')
titles=['01  Lukket / hero','02  Åpen / to kurver','03  Det som er lett å glemme','04  Fra spørsmål til oversikt']
for index,(key,img) in enumerate(list(images.items())[:4]):
    x=40+(index%2)*780
    y=132+(index//2)*792
    board.paste(img.convert('RGB').resize((750,750),Image.Resampling.LANCZOS),(x,y))
    d.text((x+10,y+758),titles[index],font=caption,fill='#20323A')
board.save(TARGET/'review-board.jpg',quality=95)
shutil.copy2(ROOT/'fryseboksen-master.blend',TARGET/'fryseboksen-master.blend')
shutil.copy2(SOURCE/'manifest.json',TARGET/'render-manifest.json')
for name in ['README.md', 'build_freezer.py', 'select_shot.py', 'validate_model.py',
             'verify_stills.py', 'package_stills.py', 'requirements-assets.txt',
             'model-validation.json', 'review.md']:
    source=ROOT/name
    if source.exists(): shutil.copy2(source,TARGET/name)
print('STILL_PACKAGE',TARGET)
print('PRIMARY_FILES',list(images))
