"""Animate the approved V2 model: hero, lid opening, camera rise and food reveal.

Run with the approved master open in Blender. The master itself is never saved over.
Question marks are a separate tracked overlay, exported by package_animation.py.
"""
import argparse
import json
import math
import shutil
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--quality',choices=['preview','final'],default='preview')
parser.add_argument('--device',choices=['CPU','ONEAPI'],default='ONEAPI')
parser.add_argument('--frames',default='1,16,32,48,64,80,96')
parser.add_argument('--prepare-only',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
OUT=ROOT/'animation-v1'
FRAMES=OUT/('preview-frames' if args.quality=='preview' else 'frames')
FRAMES.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene
lid=next(o for o in bpy.data.objects if o.name.startswith('LID_PIVOT'))
food=next(o for o in bpy.data.objects if o.name.startswith('FOOD |'))
hero=bpy.data.objects['CAMERA | closed hero']
assert hero.data.type=='PERSP'
for obj in list(bpy.data.objects):
    if obj.name=='CAMERA | opening sequence': bpy.data.objects.remove(obj,do_unlink=True)
cam=hero.copy()
cam.data=hero.data.copy()
cam.name='CAMERA | opening sequence'
scene.collection.objects.link(cam)
scene.camera=cam

def descendants(obj):
    yield obj
    for child in obj.children: yield from descendants(child)

for obj in descendants(food):
    obj.hide_render=False
    obj.hide_set(False)
lid.animation_data_clear()
cam.animation_data_clear()
cam.data.animation_data_clear()
scene.frame_start=1
scene.frame_end=96
scene.render.fps=24
scene.render.fps_base=1
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
if args.device=='ONEAPI':
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='ONEAPI'
    prefs.get_devices()
    for device in prefs.devices: device.use=device.type=='ONEAPI'
    scene.cycles.device='GPU'
scene.cycles.samples=24 if args.quality=='preview' else 64
scene.cycles.adaptive_threshold=.045 if args.quality=='preview' else .022
scene.cycles.use_denoising=True
scene.cycles.use_animated_seed=False
scene.cycles.seed=47
# Rebuild the render state per frame. A lid self-shadow artefact appeared with
# persistent data and motion blur enabled together on this Intel oneAPI device.
scene.render.use_persistent_data=False
scene.render.resolution_x=720 if args.quality=='preview' else 1080
scene.render.resolution_y=scene.render.resolution_x
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGBA'
scene.render.use_motion_blur=False

def smooth(start,end,t):
    x=max(0,min(1,(t-start)/(end-start)))
    return x*x*x*(x*(x*6-15)+10)

start_target=Vector((0,0,.39))
start_offset=hero.location-start_target
start_distance=start_offset.length
azimuth=math.atan2(start_offset.x,-start_offset.y)
start_elevation=math.atan2(start_offset.z,math.hypot(start_offset.x,start_offset.y))
anchors={'beef':(-.27,.098,.568),'berries':(.27,.10,.572),'lasagne':(0,-.10,.618)}
timeline=[]
for frame in range(1,97):
    t=(frame-1)/24
    rise=smooth(.15,3.30,t)
    anticipation=smooth(.15,1.85,t)
    approach=smooth(1.75,3.35,t)
    distance=start_distance+(2.34-start_distance)*anticipation-(2.34-1.98)*approach
    elevation=start_elevation+(math.radians(64)-start_elevation)*rise
    target=start_target.lerp(Vector((0,-.01,.685)),rise)
    direction=Vector((math.sin(azimuth)*math.cos(elevation),-math.cos(azimuth)*math.cos(elevation),math.sin(elevation)))
    cam.location=target+direction*distance
    cam.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler()
    cam.data.shift_x=hero.data.shift_x*(1-rise)
    cam.data.shift_y=hero.data.shift_y*(1-rise)+.012*rise
    lid.rotation_euler.x=-math.radians(95)*smooth(.30,2.75,t)
    for prop in ['location','rotation_euler']: cam.keyframe_insert(data_path=prop,frame=frame)
    for prop in ['shift_x','shift_y']: cam.data.keyframe_insert(data_path=prop,frame=frame)
    lid.keyframe_insert(data_path='rotation_euler',frame=frame)
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    markers=[]
    for i,(key,position) in enumerate(anchors.items()):
        point=world_to_camera_view(scene,cam,Vector(position))
        markers.append({'id':key,'x':round(point.x,6),'y':round(1-point.y,6),
                        'opacity':round(smooth(2.65+i*.15,2.98+i*.15,t),5)})
    timeline.append({'frame':frame,'time':round(t,6),'lid_degrees':round(-math.degrees(lid.rotation_euler.x),4),
                     'camera_location':list(cam.location),'camera_target':list(target),
                     'distance':round(distance,5),'markers':markers})

scene.frame_set(1)
scene['status']='APPROVED MODEL V2; opening animation V1 with separately tracked question marks'
scene['animation_notes']='4 seconds / 24 fps; original hero start, lid 0–95 degrees, rise and gentle approach'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'fryseboksen-opening.blend'))
manifest={'fps':24,'frame_count':96,'duration_seconds':4,'width':scene.render.resolution_x,
          'height':scene.render.resolution_y,'quality':args.quality,'samples':scene.cycles.samples,
          'timeline':timeline,'source_model':'approved V2','overlay':'separate screen-space question marks'}
(FRAMES.parent/('preview-timeline.json' if args.quality=='preview' else 'timeline.json')).write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
if args.prepare_only: sys.exit(0)
frames=[1,*range(5,83)] if args.frames=='all' else [int(v) for v in args.frames.split(',')]
for frame in frames:
    scene.frame_set(frame)
    scene.render.filepath=str(FRAMES/f'{frame:04d}.png')
    print(f'ANIMATION_RENDER {frame}/96',flush=True)
    bpy.ops.render.render(write_still=True)
if args.frames=='all':
    # Exact holds: there is no model/camera motion on frames 1–4 or 82–96.
    # Reusing the same samples also prevents noise drift in the stationary holds.
    for frame in [2,3,4]: shutil.copy2(FRAMES/'0001.png',FRAMES/f'{frame:04d}.png')
    for frame in range(83,97): shutil.copy2(FRAMES/'0082.png',FRAMES/f'{frame:04d}.png')
print('ANIMATION_RENDER_COMPLETE',flush=True)
