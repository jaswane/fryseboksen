"""Read-only Blender checks of dimensions, baskets, materials and closed-lid clearance."""
import json
import math
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view

ROOT=Path(__file__).resolve().parent
root=next(o for o in bpy.data.objects if o.name.startswith('FREEZER |'))
lid=next(o for o in bpy.data.objects if o.name.startswith('LID_PIVOT'))
food=next(o for o in bpy.data.objects if o.name.startswith('FOOD |'))
baskets=[o for o in bpy.data.objects if o.name.startswith('BASKET ')]
lid.rotation_euler.x=0
bpy.context.view_layer.update()
dep=bpy.context.evaluated_depsgraph_get()

def children(obj):
    yield obj
    for child in obj.children:
        yield from children(child)

def geometry(objects):
    verts=[]
    faces=[]
    for obj in objects:
        if obj.type not in ('MESH','CURVE'): continue
        evaluated=obj.evaluated_get(dep)
        mesh=evaluated.to_mesh()
        offset=len(verts)
        verts.extend(evaluated.matrix_world@v.co for v in mesh.vertices)
        faces.extend(tuple(offset+i for i in f.vertices) for f in mesh.polygons)
        evaluated.to_mesh_clear()
    return verts,faces

food_ids={o.name for o in children(food)}
verts,_=geometry(o for o in children(root) if o.name not in food_ids)
minimum=[min(v[i] for v in verts) for i in range(3)]
maximum=[max(v[i] for v in verts) for i in range(3)]
dimensions=[round((maximum[i]-minimum[i])*100,3) for i in range(3)]
assert all(abs(actual-expected)<.1 for actual,expected in zip(dimensions,[85,56,77])),dimensions
assert len(baskets)==2
lid_verts,lid_faces=geometry(children(lid))
lid_bvh=BVHTree.FromPolygons(lid_verts,lid_faces)
collisions={}
for basket in baskets:
    v,f=geometry(children(basket))
    collisions[basket.name]=len(lid_bvh.overlap(BVHTree.FromPolygons(v,f)))
assert not any(collisions.values()),collisions
materials=[m for m in bpy.data.materials if m.use_nodes]
ao_count=sum(n.bl_idname=='ShaderNodeAmbientOcclusion' for m in materials for n in m.node_tree.nodes)
assert ao_count>=3
assert all(o.animation_data is None or o.animation_data.action is None for o in bpy.data.objects)
cameras={}
for shot, camera_name in [('closed','CAMERA | closed hero'),('open','CAMERA | shared open story')]:
    cam=bpy.data.objects[camera_name]
    assert cam.data.type=='PERSP'
    assert cam.location.x>0 and cam.location.y<0
    lid.rotation_euler.x=0 if shot=='closed' else math.radians(-95)
    bpy.context.view_layer.update()
    shot_verts,_=geometry(o for o in children(root) if o.name not in food_ids)
    projected=[world_to_camera_view(bpy.context.scene,cam,v) for v in shot_verts]
    bounds=[min(v.x for v in projected),max(v.x for v in projected),
            min(v.y for v in projected),max(v.y for v in projected)]
    assert min(v.z for v in projected)>0
    assert min(bounds[0],bounds[2])>.035 and max(bounds[1],bounds[3])<.965,bounds
    cameras[shot]={'projection':cam.data.type,'lens_mm':cam.data.lens,
                   'width_fraction':round(bounds[1]-bounds[0],4),
                   'height_fraction':round(bounds[3]-bounds[2],4),
                   'frame_bounds':bounds,'product_clipped':False}
report={
    'passed':True,
    'measured_closed_dimensions_cm':{'width':dimensions[0],'depth':dimensions[1],'height':dimensions[2]},
    'basket_count':len(baskets),
    'closed_lid_basket_triangle_intersections':collisions,
    'ambient_occlusion_material_nodes':ao_count,
    'render_engine':bpy.context.scene.render.engine,
    'cameras':cameras,
    'lights':[{'name':o.name,'watts':o.data.energy} for o in bpy.data.objects if o.type=='LIGHT'],
    'animation_authored':False,
    'note':'198 L is the supplied nominal specification; this is a visual reconstruction, not a capacity certification.',
}
(ROOT/'model-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)
