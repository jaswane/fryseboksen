"""Validate exported alpha sequence and all camera/lid poses; no Blender required."""
import json, math
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'scroll-v2'
PUBLIC=ROOT.parents[1]/'public/media/freezer-scroll'
timeline=json.loads((OUT/'timeline.json').read_text())
entries=timeline['timeline']
assert len(entries)==73
assert entries[0]['lid_degrees']==0
assert all(e['lid_degrees']==95 for e in entries[48:])
assert all(a['lid_degrees']<=b['lid_degrees'] for a,b in zip(entries,entries[1:]))
for entry in entries:
    x0,y0,x1,y1=entry['bounds']
    assert .4375<x0<x1<.985 and .02<y0<y1<.98,entry
    for point in entry['anchors'].values(): assert all(0<v<1 for v in point)
max_step=max(math.dist(a['camera'],b['camera']) for a,b in zip(entries,entries[1:]))
assert max_step<.20,max_step
sizes=[]
for frame in range(1,74):
    source=OUT/'frames'/f'{frame:04d}.png'
    with Image.open(source) as image:
        assert image.size==(1920,1080) and image.mode=='RGBA',source
    for suffix,size in [('',(1440,810)),('-mobile',(810,810))]:
        path=PUBLIC/f'{frame:04d}{suffix}.webp'
        with Image.open(path) as image:
            assert image.size==size and image.mode=='RGBA',path
            assert image.getchannel('A').getextrema()==(0,255),path
        sizes.append(path.stat().st_size)
report={'passed':True,'frames':73,'source_size':[1920,1080],
        'desktop_size':[1440,810],'mobile_size':[810,810],
        'total_web_bytes':sum(sizes),'max_camera_step_m':max_step,
        'all_product_bounds_inside_frame':True,'all_frames_have_alpha':True,
        'lid_open_from_frame':49,'lid_degrees_open':95}
(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
