"""Read-only Blender comparison: approved freezer/studio versus V3 plus decal."""
import hashlib
import json
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent


def ancestors(obj):
    result = []
    while obj.parent:
        obj = obj.parent
        result.append(obj.name)
    return result


def stable(values):
    return [0 if abs(value) < .0000005 else round(value, 6) for value in values]


def geometry_signature():
    objects = {}
    for obj in bpy.data.objects:
        parents = ancestors(obj)
        if obj.type not in {'MESH', 'CURVE'} or obj.name.startswith('V3 sticker'):
            continue
        if not any(name.startswith('FREEZER |') for name in parents):
            continue
        if any(name.startswith('FOOD |') for name in parents):
            continue
        if obj.type == 'MESH':
            geometry = [stable(vertex.co) for vertex in obj.data.vertices]
        else:
            geometry = [[stable(point.co) for point in spline.points] for spline in obj.data.splines]
        objects[obj.name] = {
            'geometry': geometry, 'world': [stable(row) for row in obj.matrix_world],
            'materials': [slot.material.name if slot.material else None for slot in obj.material_slots],
        }
    digest = hashlib.sha256(json.dumps(objects, sort_keys=True).encode()).hexdigest()
    return digest, len(objects)


def lighting():
    return {obj.name: {'location': stable(obj.location), 'energy': obj.data.energy,
                       'color': stable(obj.data.color)}
            for obj in bpy.data.objects if obj.type == 'LIGHT'}


bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'scroll-v2/fryseboksen-scroll.blend'))
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
before, count = geometry_signature()
studio = lighting()
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'scroll-v3/fryseboksen-scroll.blend'))
scene = bpy.context.scene
scene.frame_set(1)
bpy.context.view_layer.update()
after, current_count = geometry_signature()
assert before == after and count == current_count, 'Freezer geometry changed'
assert studio == lighting(), 'Studio lighting changed'
assert len([obj for obj in bpy.data.objects if obj.name.startswith('BASKET ') and obj.type == 'EMPTY']) == 2
sticker = bpy.data.objects['V3 sticker | front upper-right']
assert sticker.visible_camera and not sticker.hide_render
texture = next(node for node in sticker.data.materials[0].node_tree.nodes if node.type == 'TEX_IMAGE')
assert texture.image.packed_file is not None, 'Sticker image must be embedded in the .blend'
assert all(obj.visible_camera for obj in bpy.data.objects if obj.type in {'MESH', 'CURVE'}), 'Decal-pass visibility leaked into the saved model'
assert not scene.render.use_border, 'Decal-pass render border leaked into saved model'
assert scene.camera.data.type == 'PERSP' and scene.camera.data.lens == 52
ao_count = sum(1 for mat in bpy.data.materials if mat.use_nodes for node in mat.node_tree.nodes if node.type == 'AMBIENT_OCCLUSION')
assert ao_count >= 4

model_objects = [obj for obj in bpy.data.objects if obj.type == 'MESH' and not obj.hide_render and obj.name != 'Studio floor']
points = [obj.matrix_world @ Vector(vertex) for obj in model_objects for vertex in obj.bound_box]
dimensions = [max(p[axis] for p in points) - min(p[axis] for p in points) for axis in range(3)]
assert all(abs(a - b) < .003 for a, b in zip(dimensions, [.85, .56, .77])), dimensions

scene.frame_set(49)
bpy.context.view_layer.update()
poses = {obj.name: [stable(row) for row in obj.matrix_world] for obj in model_objects}
camera = [stable(row) for row in scene.camera.matrix_world]
for mat in bpy.data.materials:
    if mat.use_nodes and 'Anonymous to understood' in mat.node_tree.nodes:
        mat.node_tree.animation_data_clear()
        mat.node_tree.nodes['Anonymous to understood'].inputs[0].default_value = 0
bpy.context.view_layer.update()
assert poses == {obj.name: [stable(row) for row in obj.matrix_world] for obj in model_objects}
assert camera == [stable(row) for row in scene.camera.matrix_world]

report = {'passed': True, 'unchanged_freezer_geometry_objects': count, 'geometry_sha256': after,
          'closed_dimensions_m': dimensions, 'baskets': 2, 'studio_lights_unchanged': len(studio),
          'ao_nodes': ao_count, 'camera_type': 'PERSP', 'lens_mm': 52,
          'sticker_embedded_in_complete_model': True, 'reveal_keeps_all_object_and_camera_poses': True}
(ROOT / 'scroll-v3/model-validation.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report), flush=True)
