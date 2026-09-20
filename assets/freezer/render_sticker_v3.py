"""Attach a real matte decal to the V3 model; render a small transparent pass.

The decal receives the same scene lighting, reflections and occlusion as the
freezer. Isolating the camera rays allows existing expensive base renders to be
reused. The final saved .blend contains the complete model WITH the sticker.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'scroll-v3'
p = argparse.ArgumentParser()
p.add_argument('--frames', default='1,49,73')
p.add_argument('--overwrite', action='store_true')
args = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
scene = bpy.context.scene
cam = scene.camera
root = next(o for o in bpy.data.objects if o.name.startswith('FREEZER |'))
for obj in list(bpy.data.objects):
    if obj.name.startswith('V3 sticker'):
        bpy.data.objects.remove(obj, do_unlink=True)
for mesh in list(bpy.data.meshes):
    if mesh.name.startswith('V3 sticker') and mesh.users == 0:
        bpy.data.meshes.remove(mesh)
for material in list(bpy.data.materials):
    if material.name.startswith('V3 sticker') and material.users == 0:
        bpy.data.materials.remove(material)
for image in list(bpy.data.images):
    if image.filepath == str(OUT / 'sticker.png') and image.users == 0:
        bpy.data.images.remove(image)

mat = bpy.data.materials.new('V3 sticker | matte printed paper')
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
bsdf = nodes.get('Principled BSDF')
bsdf.inputs['Roughness'].default_value = .66
bsdf.inputs['Specular IOR Level'].default_value = .22
texture = nodes.new('ShaderNodeTexImage')
texture.image = bpy.data.images.load(str(OUT / 'sticker.png'), check_existing=False)
texture.image.pack()
texture.interpolation = 'Linear'
links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
links.new(texture.outputs['Alpha'], bsdf.inputs['Alpha'])

# 12 x 14 cm, close to the cabinet surface, top-right on the FRONT panel.
width, height, radius = .120, .140, .005
center_x, center_z = .260, .598
front_y, thickness = -.27185, .00020
contour = []
for xs, zs, angle in [(1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)]:
    for step in range(9):
        a = math.radians(angle + step * 90 / 8)
        contour.append((xs * (width / 2 - radius) + radius * math.cos(a),
                        zs * (height / 2 - radius) + radius * math.sin(a)))
verts = [(x + center_x, front_y + layer * thickness, z + center_z)
         for layer in [0, 1] for x, z in contour]
n = len(contour)
faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
for i in range(n):
    faces.append((i, (i + 1) % n, (i + 1) % n + n, i + n))
mesh = bpy.data.meshes.new('V3 sticker | rounded paper with UV')
mesh.from_pydata(verts, [], faces)
mesh.update()
uv = mesh.uv_layers.new(name='Sticker artwork')
for poly in mesh.polygons:
    for loop_index in poly.loop_indices:
        vertex = mesh.vertices[mesh.loops[loop_index].vertex_index].co
        uv.data[loop_index].uv = ((vertex.x - center_x) / width + .5,
                                  (vertex.z - center_z) / height + .5)
sticker = bpy.data.objects.new('V3 sticker | front upper-right', mesh)
scene.collection.objects.link(sticker)
sticker.parent = root
mesh.materials.append(mat)

scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'fryseboksen-scroll.blend'))

# Camera-invisible scene geometry still affects light, reflection and shadow.
# No duplicate freezer/ground pixels are composited over the base sequence.
for obj in bpy.data.objects:
    if obj.type in {'MESH', 'CURVE'} and obj != sticker:
        obj.visible_camera = False
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 64
scene.cycles.adaptive_threshold = .015
# Denoising mistakes tiny printed letters/QR modules for noise. Keep ink crisp.
scene.cycles.use_denoising = False
scene.cycles.filter_width = .8
if hasattr(scene.cycles, 'denoising_use_gpu'):
    scene.cycles.denoising_use_gpu = False
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.render.use_persistent_data = True
scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.use_border = True
scene.render.use_crop_to_border = False
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'

folder = OUT / 'sticker-frames'
folder.mkdir(exist_ok=True)
frames = range(1, 74) if args.frames == 'all' else [int(v) for v in args.frames.split(',')]
poses = []
for frame in frames:
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    points = [world_to_camera_view(scene, cam, sticker.matrix_world @ Vector(v)) for v in sticker.bound_box]
    bounds = [min(p.x for p in points), min(p.y for p in points), max(p.x for p in points), max(p.y for p in points)]
    assert min(bounds) > 0 and max(bounds) < 1, (frame, bounds)
    scene.render.border_min_x = max(0, bounds[0] - .006)
    scene.render.border_min_y = max(0, bounds[1] - .010)
    scene.render.border_max_x = min(1, bounds[2] + .006)
    scene.render.border_max_y = min(1, bounds[3] + .010)
    poses.append({'frame': frame, 'bounds': bounds})
    target = folder / f'{frame:04d}.png'
    if target.exists() and not args.overwrite:
        continue
    scene.render.filepath = str(target)
    print(f'STICKER_RENDER {frame}/73', flush=True)
    bpy.ops.render.render(write_still=True)
(OUT / 'sticker-placement.json').write_text(json.dumps({
    'size_m': [width, height], 'center_m': [center_x, front_y, center_z],
    'qr_target': 'https://fryseboksen.no/', 'frames': poses,
}, indent=2) + '\n')
print('STICKER_RENDER_COMPLETE', flush=True)
