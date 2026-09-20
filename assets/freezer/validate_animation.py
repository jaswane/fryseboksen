"""Validate the saved animation's poses, camera continuity, baskets and marker timing."""
import json
import math
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'animation-v1'
scene=bpy.context.scene
cam=scene.camera
hero=bpy.data.objects['CAMERA | closed hero']
lid=next(o for o in bpy.data.objects if o.name.startswith('LID_PIVOT'))
root=next(o for o in bpy.data.objects if o.name.startswith('FREEZER |'))
food=next(o for o in bpy.data.objects if o.name.startswith('FOOD |'))
baskets=[o for o in bpy.data.objects if o.name.startswith('BASKET ')]
assert len(baskets)==2
assert scene.render.fps==24 and scene.frame_start==1 and scene.frame_end==96
assert cam.data.type=='PERSP' and cam.data.lens==52
assert not scene.render.use_motion_blur
assert not scene.render.use_persistent_data

def descendants(obj):
    yield obj
    for child in obj.children: yield from descendants(child)

def vertices_faces(objects):
    dep=bpy.context.evaluated_depsgraph_get()
    vertices=[]
    faces=[]
    for obj in objects:
        if obj.type not in ('MESH','CURVE'): continue
        evaluated=obj.evaluated_get(dep)
        mesh=evaluated.to_mesh()
        offset=len(vertices)
        vertices.extend(evaluated.matrix_world@v.co for v in mesh.vertices)
        faces.extend(tuple(offset+i for i in face.vertices) for face in mesh.polygons)
        evaluated.to_mesh_clear()
    return vertices,faces

scene.frame_set(1)
assert (cam.location-hero.location).length<1e-5
assert cam.rotation_euler.to_quaternion().rotation_difference(hero.rotation_euler.to_quaternion()).angle<1e-5
assert abs(cam.data.shift_x-hero.data.shift_x)<1e-5 and abs(cam.data.shift_y-hero.data.shift_y)<1e-5
static=[]
for basket in baskets:
    v,f=vertices_faces(descendants(basket))
    static.append(BVHTree.FromPolygons(v,f))
food_names={o.name for o in descendants(food)}
lid_names={o.name for o in descendants(lid)}
timeline=json.loads((OUT/'timeline.json').read_text())
angles=[]
locations=[]
overlaps=[]
clipped=[]
lid_samples=[]
for frame in range(1,97):
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    v,f=vertices_faces(descendants(lid))
    lid_tree=BVHTree.FromPolygons(v,f)
    intersections=sum(len(lid_tree.overlap(tree)) for tree in static)
    if intersections: overlaps.append({'frame':frame,'intersections':intersections})
    angles.append(-math.degrees(lid.rotation_euler.x))
    locations.append(cam.location.copy())
    sample=world_to_camera_view(scene,cam,lid.matrix_world@Vector((0,-.20,-.022)))
    lid_samples.append({'frame':frame,'x':round(sample.x,6),'y':round(1-sample.y,6)})
    if frame in [1,24,48,72,96]:
        v,_=vertices_faces(o for o in descendants(root) if o.name not in food_names)
        projected=[world_to_camera_view(scene,cam,p) for p in v]
        clipped.append({'frame':frame,'top':round(max(p.y for p in projected),4),
                        'bottom':round(min(p.y for p in projected),4)})
    for marker in timeline['timeline'][frame-1]['markers']:
        if marker['opacity']>0:
            assert .04<marker['x']<.96 and .04<marker['y']<.96
            assert angles[-1]>90
assert not overlaps,overlaps
assert abs(angles[0])<1e-5 and abs(angles[-1]-95)<1e-4
assert all(b>=a-1e-4 for a,b in zip(angles,angles[1:]))
steps=[(b-a).length for a,b in zip(locations,locations[1:])]
assert max(steps)<.07,max(steps)
assert locations[-1].z>locations[0].z+1
for frame in [2,3,4]: assert (locations[frame-1]-locations[0]).length<1e-7
for frame in range(83,97): assert (locations[frame-1]-locations[81]).length<1e-7
report={'passed':True,'frames_checked':96,'duration_seconds':4,'fps':24,
        'starts_at_approved_hero_camera':True,'lid_degrees':[round(angles[0],3),round(angles[-1],3)],
        'lid_basket_intersections':overlaps,'camera_max_step_m':round(max(steps),5),
        'camera_rise_m':round(locations[-1].z-locations[0].z,5),
        'perspective_lens_mm':cam.data.lens,'motion_blur':False,'persistent_render_cache':False,
        'sampled_vertical_bounds':clipped,'crop_note':'The upper lid intentionally leaves the frame during the approach to the food.',
        'still_holds':{'start':[1,4],'end':[82,96]}}
report['lid_surface_samples']=lid_samples
(OUT/'animation-validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2),flush=True)
