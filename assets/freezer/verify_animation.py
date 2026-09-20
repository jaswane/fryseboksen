"""Decode every video frame and verify metadata, image fidelity and stable final lighting."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parents[1]/'work/asset-python'))
import imageio_ffmpeg
OUT=ROOT/'animation-v1'
animation=json.loads((OUT/'animation-validation.json').read_text())
assert animation['passed']
timeline=json.loads((OUT/'timeline.json').read_text())
assert timeline['width']==1080 and timeline['height']==1080 and timeline['frame_count']==96
sampled_luminance=[]
for sample in animation['lid_surface_samples']:
    if sample['frame']<68: continue
    im=Image.open(OUT/'frames'/f"{sample['frame']:04d}.png").convert('RGB')
    px,py=round(sample['x']*1080),round(sample['y']*1080)
    crop=im.crop((px-10,py-10,px+10,py+10)).convert('L')
    brightness=ImageStat.Stat(crop).median[0]
    sampled_luminance.append(brightness)
assert min(sampled_luminance)>195,sampled_luminance
max_lid_step=max(abs(b-a) for a,b in zip(sampled_luminance,sampled_luminance[1:]))
assert max_lid_step<18,max_lid_step
reports=[]
for kind in ['questions','clean']:
    for extension,codec in [('mp4','h264'),('webm','vp9')]:
        path=OUT/f'fryseboksen-opening-{kind}.{extension}'
        reader=imageio_ffmpeg.read_frames(str(path),pix_fmt='rgb24')
        meta=next(reader)
        assert tuple(meta['source_size'])==(1080,1080),meta
        assert meta['fps']==24,meta
        assert abs(meta['duration']-4)<.03,meta
        assert meta['codec']==codec,meta
        errors=[]
        frame_count=0
        source=OUT/('composited-frames' if kind=='questions' else 'frames')
        for frame_count,pixels in enumerate(reader,1):
            decoded=Image.frombytes('RGB',(1080,1080),pixels)
            stats=ImageStat.Stat(decoded.resize((64,64)).convert('L'))
            # The approved white-on-white hero has deliberately low contrast.
            assert stats.mean[0]>150 and stats.stddev[0]>4,(path,frame_count,stats.mean,stats.stddev)
            if frame_count in [1,24,48,68,80,96]:
                reference=Image.open(source/f'{frame_count:04d}.png').convert('RGB')
                error=sum(ImageStat.Stat(ImageChops.difference(decoded,reference)).mean)/3
                assert error<5,(path,frame_count,error)
                errors.append(round(error,3))
        assert frame_count==96,(path,frame_count)
        reports.append({'file':path.name,'codec':meta['codec'],'dimensions':meta['source_size'],
                        'duration_seconds':meta['duration'],'fps':meta['fps'],'decoded_frames':frame_count,
                        'sampled_mean_absolute_error_8bit':errors,'bytes':path.stat().st_size})
report={'passed':True,'videos':reports,'late_lid_luminance_range':[min(sampled_luminance),max(sampled_luminance)],
        'largest_adjacent_lid_luminance_change':max_lid_step,
        'note':'Pixel checks supplement visual inspection and playback review.'}
(OUT/'video-validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2),flush=True)
