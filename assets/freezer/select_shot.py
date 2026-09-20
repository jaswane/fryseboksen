"""Choose a still state in the saved master without rebuilding its geometry.

Run inside Blender's Text Editor with SHOT edited, or in background:
blender -b fryseboksen-master.blend -P select_shot.py -- --shot filled --render output.png
No animation or keyframes are created.
"""
import argparse
import math
import sys
import bpy

SHOT='open'
parser=argparse.ArgumentParser()
parser.add_argument('--shot',choices=['closed','open','filled'],default=SHOT)
parser.add_argument('--render')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
lid=next(o for o in bpy.data.objects if o.name.startswith('LID_PIVOT'))
food=next(o for o in bpy.data.objects if o.name.startswith('FOOD |'))
def children(obj):
    yield obj
    for child in obj.children:
        yield from children(child)
lid.rotation_euler.x=0 if args.shot=='closed' else math.radians(-95)
for obj in children(food):
    obj.hide_render=args.shot!='filled'
    obj.hide_set(args.shot!='filled')
camera='CAMERA | closed hero' if args.shot=='closed' else 'CAMERA | shared open story'
bpy.context.scene.camera=bpy.data.objects[camera]
bpy.context.view_layer.update()
if args.render:
    bpy.context.scene.render.filepath=args.render
    bpy.ops.render.render(write_still=True)
print('Selected product state:',args.shot)
