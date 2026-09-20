"""Approved V2 freezer, transparent 16:9, packaged food and two camera moves."""
import argparse, json, math, sys, time
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'scroll-v2'
p = argparse.ArgumentParser()
p.add_argument('--frames', default='1,49,73')
p.add_argument('--preview', action='store_true')
p.add_argument('--device', choices=['CPU','ONEAPI'], default='ONEAPI')
args = p.parse_args(sys.argv[sys.argv.index('--')+1:])
scene = bpy.context.scene
root = next(o for o in bpy.data.objects if o.name.startswith('FREEZER |'))
lid = next(o for o in bpy.data.objects if o.name.startswith('LID_PIVOT'))
food = next(o for o in bpy.data.objects if o.name.startswith('FOOD |'))
for o in bpy.data.objects:
    if o.type in {'MESH','CURVE'} and o.parent == food:
        o.hide_render = False
        o.hide_set(False)
lid.animation_data_clear()

def material(name, rough, visibility=1):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, links = m.node_tree.nodes, m.node_tree.links
    b = n.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (.94,.98,1,1)
    b.inputs['Transmission Weight'].default_value = 1
    b.inputs['Roughness'].default_value = rough
    b.inputs['IOR'].default_value = 1.46
    if visibility < 1:
        transparent = n.new('ShaderNodeBsdfTransparent')
        mix = n.new('ShaderNodeMixShader')
        mix.inputs[0].default_value = visibility
        links.new(transparent.outputs[0], mix.inputs[1])
        links.new(b.outputs[0], mix.inputs[2])
        links.new(mix.outputs[0], n.get('Material Output').inputs['Surface'])
    return m

clear = material('V2 clear food-safe container plastic', .085)
film = material('V2 thin transparent freezer bag', .16, .20)
def box(name, location, dims, mat, bevel=.002):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    o = bpy.context.object
    o.name, o.dimensions = name, dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.parent = food
    o.data.materials.append(mat)
    m = o.modifiers.new('Soft manufactured edges','BEVEL')
    m.width, m.segments = bevel, 3
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

bpy.data.objects['Blueberry box'].hide_render = True
# Hollow clear box, berries remain inside rather than intersecting a solid glass block.
box('V2 berries clear base',(.270,.104,.477),(.153,.181,.002),clear)
for x in [.194,.346]: box('V2 berries side wall',(x,.104,.530),(.0016,.181,.106),clear)
for y in [.014,.194]: box('V2 berries end wall',(.270,y,.530),(.153,.0016,.106),clear)
box('V2 berries clear closed lid',(.270,.104,.586),(.159,.187,.003),clear,.0014)
box('V2 lasagne closed lid',(0,-.100,.625),(.299,.187,.003),clear,.0014)
box('V2 salmon protective film',(.270,-.101,.548),(.145,.175,.001),film,.0004)

# A loose, lightly wrinkled transparent bag follows the loaf; gathered sealed ends.
verts, faces = [], []
for j in range(33):
    x = -.161 + j*.322/32
    profile = max(.12, math.sqrt(max(0, 1-(x/.167)**4)))
    for k in range(48):
        a = 2*math.pi*k/48
        wrinkle = .0018*math.sin(k*2.7+j*.9) + .0012*math.cos(k*1.3-j*1.7)
        verts.append((x, .101+(.088*profile+wrinkle)*math.cos(a),
                      .596+(.057*profile+wrinkle)*math.sin(a)))
for j in range(32):
    for k in range(48):
        a=j*48+k; b=j*48+(k+1)%48
        faces.append((a,b,b+48,a+48))
faces += [tuple(range(47,-1,-1)), tuple(range(32*48,33*48))]
mesh=bpy.data.meshes.new('Loose bread bag mesh'); mesh.from_pydata(verts,[],faces); mesh.update()
o=bpy.data.objects.new('V2 bread in transparent freezer bag',mesh)
scene.collection.objects.link(o); o.parent=food; mesh.materials.append(film)
for face in mesh.polygons: face.use_smooth=True
for x in [-.155,.155]: box('V2 bread bag sealed edge',(x,.101,.596),(.005,.035,.008),film,.002)

scene.render.engine='CYCLES'
scene.cycles.device='CPU'
if args.device=='ONEAPI':
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='ONEAPI'; prefs.get_devices()
    for device in prefs.devices: device.use=device.type=='ONEAPI'
    scene.cycles.device='GPU'
scene.cycles.samples=20 if args.preview else 40
scene.cycles.adaptive_threshold=.04 if args.preview else .025
scene.cycles.use_denoising=True
scene.cycles.use_animated_seed=False; scene.cycles.seed=47
scene.render.use_motion_blur=False; scene.render.use_persistent_data=False
scene.render.film_transparent=True
bpy.data.objects['Studio floor'].is_shadow_catcher=True
scene.render.resolution_x=960 if args.preview else 1920
scene.render.resolution_y=540 if args.preview else 1080
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'
scene.render.fps=24; scene.frame_start=1; scene.frame_end=73
hero=bpy.data.objects['CAMERA | closed hero']
cam=hero.copy(); cam.data=hero.data.copy(); cam.name='CAMERA | reversible scroll'
scene.collection.objects.link(cam); scene.camera=cam
cam.animation_data_clear(); cam.data.animation_data_clear()
objects=[o for o in bpy.data.objects if o.type=='MESH' and o.name!='Studio floor' and not o.hide_render]
def smooth(x):
    x=max(0,min(1,x)); return x*x*x*(x*(x*6-15)+10)
def projected_bounds():
    points=[world_to_camera_view(scene,cam,o.matrix_world@Vector(v)) for o in objects for v in o.bound_box]
    return [min(p.x for p in points),min(p.y for p in points),max(p.x for p in points),max(p.y for p in points)]

timeline=[]
for frame in range(1,74):
    opening=smooth((frame-1)/48)
    frontal=smooth((frame-49)/24)
    azimuth=math.radians(38)*(1-frontal)
    elevation=math.radians(30.5+27.5*opening-6*frontal)
    target=Vector((0,0,.55))
    direction=Vector((math.sin(azimuth)*math.cos(elevation),-math.cos(azimuth)*math.cos(elevation),math.sin(elevation)))
    lid.rotation_euler.x=-math.radians(95)*opening
    cam.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler()
    cam.data.shift_x=0; cam.data.shift_y=0
    bpy.context.view_layer.update()
    # Fit the WHOLE freezer, including open lid, inside the safe 16:9 right-hand area.
    distance=2.8
    for _ in range(8):
        cam.location=target+direction*distance; bpy.context.view_layer.update()
        b=projected_bounds()
        ratio=max((b[2]-b[0])/.49,(b[3]-b[1])/.85)
        distance*=ratio
    b=projected_bounds()
    cam.data.shift_x+=(b[0]+b[2])/2-.725
    cam.data.shift_y+=((b[1]+b[3])/2-.52)/(16/9)
    bpy.context.view_layer.update()
    b=projected_bounds()
    assert min(b)>=.02 and max(b)<=.985,(frame,b)
    anchors={}
    for key,pos in {'beef':(-.27,.098,.568),'berries':(.27,.104,.59),'lasagne':(0,-.1,.627)}.items():
        v=world_to_camera_view(scene,cam,Vector(pos)); anchors[key]=[round(v.x,6),round(1-v.y,6)]
    timeline.append({'frame':frame,'lid_degrees':round(95*opening,3),'bounds':b,'anchors':anchors,
                     'camera':list(cam.location),'elevation':round(math.degrees(elevation),3)})
    cam.keyframe_insert(data_path='location',frame=frame); cam.keyframe_insert(data_path='rotation_euler',frame=frame)
    cam.data.keyframe_insert(data_path='shift_x',frame=frame); cam.data.keyframe_insert(data_path='shift_y',frame=frame)
    lid.keyframe_insert(data_path='rotation_euler',frame=frame)

OUT.mkdir(exist_ok=True)
folder=OUT/('preview-frames' if args.preview else 'frames'); folder.mkdir(exist_ok=True)
(OUT/'timeline.json').write_text(json.dumps({'width':1920,'height':1080,'count':73,'open_frame':49,'timeline':timeline},indent=2)+'\n')
if not args.preview:
    scene.render.filepath=str(OUT/'frames')+'/'
    scene.frame_set(1); bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'fryseboksen-scroll.blend'))
frames=range(1,74) if args.frames=='all' else [int(v) for v in args.frames.split(',')]
for frame in frames:
    path=folder/f'{frame:04d}.png'
    if path.exists(): continue
    scene.frame_set(frame); scene.render.filepath=str(path)
    print(f'SCROLL_RENDER {frame}/73',flush=True)
    bpy.ops.render.render(write_still=True)
print('SCROLL_RENDER_COMPLETE',flush=True)
