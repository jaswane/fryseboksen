"""V3: reuse the approved V2 model/studio, improve containers and reveal food.

Run against scroll-v2/fryseboksen-scroll.blend. Geometry and camera are identical
between the anonymous 0049 and coloured 0049-known renders. No AI image edits.
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
p.add_argument('--preview', action='store_true')
p.add_argument('--overwrite', action='store_true')
p.add_argument('--device', choices=['CPU', 'ONEAPI'], default='ONEAPI')
args = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
scene = bpy.context.scene
food = next(o for o in bpy.data.objects if o.name.startswith('FOOD |'))
lid = next(o for o in bpy.data.objects if o.name.startswith('LID_PIVOT'))
cam = scene.camera
lid.animation_data_clear()
cam.animation_data_clear()
cam.data.animation_data_clear()


def plastic(name, color, roughness, transmission):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Transmission Weight'].default_value = transmission
    bsdf.inputs['IOR'].default_value = 1.46
    bsdf.inputs['Coat Weight'].default_value = .12
    return mat


clear = plastic('V3 clear polypropylene walls', (.94, .98, .98), .12, 1)
rim = plastic('V3 translucent moulded lid', (.89, .94, .94), .20, .82)
seal = plastic('V3 quiet blue-grey silicone seal', (.37, .47, .48), .5, .1)


def outline(width, depth, radius, z, center):
    points = []
    for xsign, ysign, angle in [(1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)]:
        cx = xsign * (width / 2 - radius) + center[0]
        cy = ysign * (depth / 2 - radius) + center[1]
        for step in range(9):
            a = math.radians(angle + step * 90 / 8)
            points.append((cx + radius * math.cos(a), cy + radius * math.sin(a), z))
    return points


def rings(name, profiles, mat, close_base=False, close_top=False):
    verts = [point for profile in profiles for point in profile]
    n = len(profiles[0])
    faces = []
    for level in range(len(profiles) - 1):
        for i in range(n):
            a, b = level * n + i, level * n + (i + 1) % n
            faces.append((a, b, b + n, a + n))
    if close_base:
        faces.append(tuple(range(n - 1, -1, -1)))
    if close_top:
        faces.append(tuple(range(len(verts) - n, len(verts))))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.parent = food
    mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = len(poly.vertices) == 4
    return obj


def edge(name, points, radius, mat):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for point, co in zip(spline.points, points):
        point.co = (*co, 1)
    spline.use_cyclic_u = True
    obj = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(obj)
    obj.parent = food
    curve.materials.append(mat)


def block(name, location, size, mat, bevel=.002):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name, obj.dimensions = name, size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.parent = food
    obj.data.materials.append(mat)
    modifier = obj.modifiers.new('Rounded moulded corners', 'BEVEL')
    modifier.width, modifier.segments = bevel, 4
    obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')


def container(name, center, width, depth, bottom, top):
    # A continuous hollow shell: lightly tapered, rounded, 1.4 mm walls.
    radius, wall = .010, .0014
    rings(name + ' hollow tapered body', [
        outline(width - .014, depth - .014, radius, bottom, center),
        outline(width, depth, radius, top, center),
        outline(width - 2 * wall, depth - 2 * wall, radius - wall, top, center),
        outline(width - .014 - 2 * wall, depth - .014 - 2 * wall, radius - wall, bottom + wall, center),
    ], clear, True, True)
    # Thin closed lid, inset centre, raised seal seat and four everyday snap tabs.
    rings(name + ' clear lid centre', [
        outline(width - .005, depth - .005, .008, top + .0005, center),
        outline(width - .005, depth - .005, .008, top + .0029, center),
    ], clear, True, True)
    edge(name + ' lid raised lip', outline(width + .006, depth + .006, .013, top + .004, center), .0025, rim)
    edge(name + ' silicone gasket', outline(width - .002, depth - .002, .009, top + .0005, center), .0012, seal)
    for sign in [-1, 1]:
        block(name + ' side snap tab', (center[0] + sign * (width / 2 + .002), center[1], top - .004),
              (.007, .038, .014), rim, .0025)
        block(name + ' end snap tab', (center[0], center[1] + sign * (depth / 2 + .002), top - .004),
              (.039, .007, .014), rim, .0025)


for obj in bpy.data.objects:
    if obj.name.startswith('V2 berries ') or obj.name in {
        'V2 lasagne closed lid', 'Open lasagne container', 'Lasagne rim'
    }:
        obj.hide_render = True
        obj.hide_set(True)

container('V3 berry box', (.270, .104), .153, .181, .477, .586)
container('V3 lasagne box', (0, -.100), .297, .184, .538, .627)

# Food keeps its geometry, arrangement, packaging and shading normals. Only its
# surface identity changes; the freezer/studio/container materials are untouched.
anonymous_nodes = []
for mat in list(bpy.data.materials):
    if mat.name[:2] not in {'08', '09', '10', '11', '12', '14', '15', '16'}:
        continue
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    output = nodes.get('Material Output')
    original = output.inputs['Surface'].links[0].from_socket
    neutral = nodes.new('ShaderNodeBsdfPrincipled')
    neutral.name = 'Anonymous pale food'
    value = .72 if mat.name.startswith('12') else .80
    neutral.inputs['Base Color'].default_value = (value, value + .015, value + .012, 1)
    neutral.inputs['Roughness'].default_value = .62
    base = nodes.get('Principled BSDF')
    if base.inputs['Normal'].is_linked:
        links.new(base.inputs['Normal'].links[0].from_socket, neutral.inputs['Normal'])
    mix = nodes.new('ShaderNodeMixShader')
    mix.name = 'Anonymous to understood'
    links.new(original, mix.inputs[1])
    links.new(neutral.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], output.inputs['Surface'])
    anonymous_nodes.append(mix.inputs[0])
    for frame, value in [(1, 1), (49, 1), (50, 0), (73, 0)]:
        mix.inputs[0].default_value = value
        mix.inputs[0].keyframe_insert('default_value', frame=frame)

scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
if args.device == 'ONEAPI':
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'ONEAPI'
    prefs.get_devices()
    for device in prefs.devices:
        device.use = device.type == 'ONEAPI'
    scene.cycles.device = 'GPU'
scene.cycles.samples = 20 if args.preview else 40
scene.cycles.adaptive_threshold = .04 if args.preview else .025
scene.cycles.use_denoising = True
scene.cycles.use_animated_seed = False
scene.cycles.seed = 47
scene.render.use_motion_blur = False
scene.render.use_persistent_data = False
scene.render.film_transparent = True
scene.render.resolution_x = 960 if args.preview else 1920
scene.render.resolution_y = 540 if args.preview else 1080
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.fps = 24
scene.frame_start, scene.frame_end = 1, 73
objects = [o for o in bpy.data.objects if o.type == 'MESH' and o.name != 'Studio floor' and not o.hide_render]


def smooth(x):
    x = max(0, min(1, x))
    return x * x * x * (x * (x * 6 - 15) + 10)


def bounds():
    points = [world_to_camera_view(scene, cam, o.matrix_world @ Vector(v)) for o in objects for v in o.bound_box]
    return [min(p.x for p in points), min(p.y for p in points), max(p.x for p in points), max(p.y for p in points)]


timeline = []
reveal_outline = []
for frame in range(1, 74):
    opening, frontal = smooth((frame - 1) / 48), smooth((frame - 49) / 24)
    azimuth = math.radians(38) * (1 - frontal)
    elevation = math.radians(30.5 + 27.5 * opening + 5 * frontal)
    target = Vector((0, 0, .55))
    direction = Vector((math.sin(azimuth) * math.cos(elevation), -math.cos(azimuth) * math.cos(elevation), math.sin(elevation)))
    lid.rotation_euler.x = -math.radians(95) * opening
    cam.rotation_euler = (-direction).to_track_quat('-Z', 'Y').to_euler()
    cam.data.shift_x = cam.data.shift_y = 0
    distance = 2.8
    for _ in range(8):
        cam.location = target + direction * distance
        bpy.context.view_layer.update()
        b = bounds()
        distance *= max((b[2] - b[0]) / .49, (b[3] - b[1]) / (.85 + .025 * frontal))
    b = bounds()
    cam.data.shift_x += (b[0] + b[2]) / 2 - .725
    cam.data.shift_y += ((b[1] + b[3]) / 2 - .52) / (16 / 9)
    bpy.context.view_layer.update()
    b = bounds()
    assert min(b) >= .02 and max(b) <= .985, (frame, b)
    anchors = {}
    for key, position in {'beef': (-.27, .098, .568), 'berries': (.27, .104, .595), 'lasagne': (0, -.1, .636)}.items():
        point = world_to_camera_view(scene, cam, Vector(position))
        anchors[key] = [round(point.x, 6), round(1 - point.y, 6)]
    if frame == 49:
        # Restrict the colour overlay to the opaque cavity. This avoids doubling
        # the alpha contact shadow when the two identical stills are blended.
        for x, y in [(-.3785, -.2325), (.3785, -.2325), (.3785, .2325), (-.3785, .2325)]:
            point = world_to_camera_view(scene, cam, Vector((x, y, .718)))
            reveal_outline.append([round(point.x, 6), round(1 - point.y, 6)])
    timeline.append({'frame': frame, 'lid_degrees': round(95 * opening, 3), 'bounds': b, 'anchors': anchors,
                     'camera': list(cam.location), 'elevation': round(math.degrees(elevation), 3)})
    cam.keyframe_insert('location', frame=frame)
    cam.keyframe_insert('rotation_euler', frame=frame)
    cam.data.keyframe_insert('shift_x', frame=frame)
    cam.data.keyframe_insert('shift_y', frame=frame)
    lid.keyframe_insert('rotation_euler', frame=frame)

OUT.mkdir(exist_ok=True)
folder = OUT / ('preview-frames' if args.preview else 'frames')
folder.mkdir(exist_ok=True)
(OUT / 'timeline.json').write_text(json.dumps({'width': 1920, 'height': 1080, 'count': 73, 'open_frame': 49,
    'reveal_frame': '0049-known', 'reveal_outline': reveal_outline, 'timeline': timeline}, indent=2) + '\n')
if not args.preview:
    scene.frame_set(1)
    scene.render.filepath = str(OUT / 'frames') + '/'
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'fryseboksen-scroll.blend'))

frames = list(range(1, 74)) if args.frames == 'all' else [int(v) for v in args.frames.split(',')]
jobs = [(frame, f'{frame:04d}', False) for frame in frames]
if 49 in frames:
    jobs.append((49, '0049-known', True))
for frame, name, known in jobs:
    path = folder / (name + '.png')
    if path.exists() and not args.overwrite:
        continue
    scene.frame_set(frame)
    if known:
        for socket in anonymous_nodes:
            # Rendering re-evaluates the scene frame. Detach animation for this
            # alternate still so frame 49 cannot restore the anonymous shader.
            socket.id_data.animation_data_clear()
            socket.default_value = 0
    scene.render.filepath = str(path)
    print(f'V3_RENDER {name}', flush=True)
    bpy.ops.render.render(write_still=True)
print('V3_RENDER_COMPLETE', flush=True)
