"""Deterministic unbranded product model for Blender 5.2. Units: metres.
Animation is deliberately deferred until the user approves the stills.
"""
import argparse
import json
import math
import random
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--quality', choices=['preview', 'final'], default='preview')
parser.add_argument('--device', choices=['CPU', 'ONEAPI'], default='CPU')
parser.add_argument('--shots', default='closed,open,filled')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
OUT = ROOT / ('renders' if args.quality == 'final' else 'previews')
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for mat in list(bpy.data.materials):
    bpy.data.materials.remove(mat)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.length_unit = 'CENTIMETERS'
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
if args.device == 'ONEAPI':
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'ONEAPI'
    prefs.get_devices()
    for device in prefs.devices:
        device.use = device.type == 'ONEAPI'
    scene.cycles.device = 'GPU'
scene.cycles.samples = 48 if args.quality == 'preview' else 160
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = .055 if args.quality == 'preview' else .012
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 10
scene.cycles.diffuse_bounces = 4
scene.cycles.glossy_bounces = 4
scene.cycles.transmission_bounces = 6
scene.render.resolution_x = 1100 if args.quality == 'preview' else 2400
scene.render.resolution_y = scene.render.resolution_x
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.color_depth = '8'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = -.12
scene.render.fps = 24

def srgb(code):
    v = [int(code[i:i+2], 16)/255 for i in (0, 2, 4)]
    return tuple(x/12.92 if x < .04045 else ((x+.055)/1.055)**2.4 for x in v)+(1,)

def material(name, color, rough=.3, metallic=0, coat=0, transmission=0, ao=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = srgb(color)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Coat Weight'].default_value = coat
    bsdf.inputs['Transmission Weight'].default_value = transmission
    bsdf.inputs['IOR'].default_value = 1.46
    if ao:
        ambient = mat.node_tree.nodes.new('ShaderNodeAmbientOcclusion')
        ambient.inputs['Distance'].default_value = .055
        ambient.samples = 16
        mix = mat.node_tree.nodes.new('ShaderNodeMixRGB')
        mix.blend_type = 'MULTIPLY'
        mix.inputs[0].default_value = ao
        mix.inputs[1].default_value = srgb(color)
        mat.node_tree.links.new(ambient.outputs['Color'], mix.inputs[2])
        mat.node_tree.links.new(mix.outputs[0], bsdf.inputs['Base Color'])
    return mat

white = material('01 warm white enamel', 'F5F5F1', .285, .025, .19, ao=.16)
plastic = material('02 moulded warm white', 'EAECE7', .34, coat=.08, ao=.20)
inner = material('03 satin aluminium liner', 'D8DFDD', .40, .42, ao=.12)
gasket = material('04 soft pale seal', 'CDD4D0', .65, ao=.12)
dark = material('05 graphite rubber', '283236', .56)
steel = material('06 satin hardware', 'AEB9B8', .29, .72)
green = material('07 quiet teal indicator', '426B60', .21, .14)
paper = material('08 unprinted freezer paper', 'D5BA99', .77)
band = material('09 plain ivory paper band', 'EFEEE3', .69)
salmon = material('10 salmon', 'DA9272', .39, coat=.12)
salmon_line = material('11 salmon grain', 'F5CBA7', .47)
berry = material('12 blueberries', '3D5065', .57)
glass = material('13 frosted storage box', 'C7D3CB', .24, transmission=.28, coat=.18)
food = material('14 lasagne surface', 'CFA75A', .52)
bread = material('15 bread crust', 'B9935F', .65)
score = material('16 bread scoring', 'E8D0A4', .67)
studio = material('17 nordic studio', 'EAF0ED', .83)
for mat, scale, distance in [(inner, 380, .000028), (paper, 210, .00013), (bread, 65, .0007), (food, 60, .0004)]:
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = scale
    noise.inputs['Detail'].default_value = 2
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .24
    bump.inputs['Distance'].default_value = distance
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], nodes.get('Principled BSDF').inputs['Normal'])

# Soft procedural colour variation keeps food readable without photo textures or brands.
for mat,scale,stops in [
    (bread,5.5,[(.20,'9C744A'),(.48,'BD965F'),(.72,'DEBB83')]),
    (food,9.0,[(.27,'E6CF8A'),(.48,'DDC17A'),(.62,'B88F45'),(.74,'936B38')]),
    (berry,2.8,[(.2,'43576A'),(.55,'506375'),(.8,'5D7180')]),
]:
    nodes,links=mat.node_tree.nodes,mat.node_tree.links
    noise=nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value=scale
    noise.inputs['Detail'].default_value=3
    ramp=nodes.new('ShaderNodeValToRGB')
    for index,(position,color) in enumerate(stops):
        element=ramp.color_ramp.elements[index] if index<2 else ramp.color_ramp.elements.new(position)
        element.position,element.color=position,srgb(color)
    links.new(noise.outputs['Fac'],ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])

def empty(name, loc=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.location = loc
    obj.empty_display_size = .07
    return obj

root = empty('FREEZER | 85 W x 56 D x 77 H cm')
root['width_cm'], root['depth_cm'], root['height_cm'] = 85, 56, 77
root['nominal_net_litres'], root['basket_count'] = 198, 2
root['reference_note'] = 'Reference reconstruction, not an engineering or capacity certification.'
lid = empty('LID_PIVOT | rear hinge, rotate X to open', (0, .266, .728))
lid.parent = root
content = empty('FOOD | same arrangement in both story images')
content.parent = root

def finish(obj, mat, parent=None, bevel=0, smooth=True):
    if mat: obj.data.materials.append(mat)
    if parent: obj.parent = parent
    if bevel:
        mod = obj.modifiers.new('Manufactured edge radii', 'BEVEL')
        mod.width, mod.segments = bevel, 4
        mod.limit_method = 'ANGLE'
        mod.harden_normals = True
    if obj.type == 'MESH' and smooth:
        for p in obj.data.polygons: p.use_smooth = True
        normal = obj.modifiers.new('Weighted surface normals', 'WEIGHTED_NORMAL')
        normal.keep_sharp, normal.weight = True, 40
    return obj

def box(name, loc, dims, mat, bevel=.003, parent=root):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name, obj.dimensions = name, dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, mat, parent, bevel)

def rod(name, start, end, radius, mat, parent=root):
    a, b = Vector(start), Vector(end)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=(b-a).length, location=(a+b)/2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    return finish(obj, mat, parent, bevel=radius*.3)

def curve(name, points, radius, mat, parent=root, closed=False):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.bevel_depth, data.bevel_resolution = radius, 3
    spline = data.splines.new('POLY')
    spline.points.add(len(points)-1)
    for p, co in zip(spline.points, points): p.co = (*co, 1)
    spline.use_cyclic_u = closed
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    if parent: obj.parent = parent
    return obj

def rounded_rect(w, d, radius, z=0, center=(0, 0), steps=8):
    result=[]
    for cx, cy, a in [(w/2-radius,d/2-radius,0),(-w/2+radius,d/2-radius,90),(-w/2+radius,-d/2+radius,180),(w/2-radius,-d/2+radius,270)]:
        for i in range(steps+1):
            angle=math.radians(a+i*90/steps)
            result.append((center[0]+cx+radius*math.cos(angle),center[1]+cy+radius*math.sin(angle),z))
    return result

def ring_mesh(name, loops, mat, parent=root, cap=False, bevel=0):
    n=len(loops[0])
    verts=[v for loop in loops for v in loop]
    faces=[]
    for j in range(len(loops)-1):
        for i in range(n): faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    if cap: faces.append(tuple(range((len(loops)-1)*n,len(loops)*n)))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    scene.collection.objects.link(obj)
    return finish(obj,mat,parent,bevel,smooth=False)

def diagonal_grid(name,xmin,xmax,ymin,ymax,z,spacing,radius,mat,parent,slope=1):
    for sign in [-1,1]:
        m=sign*slope
        low=min(y-m*x for x in (xmin,xmax) for y in (ymin,ymax))
        high=max(y-m*x for x in (xmin,xmax) for y in (ymin,ymax))
        for j in range(1,math.ceil((high-low)/spacing)):
            c=low+j*spacing
            pts=[]
            for x in [xmin,xmax]:
                y=m*x+c
                if ymin-1e-6<=y<=ymax+1e-6: pts.append((x,y,z))
            for y in [ymin,ymax]:
                x=(y-c)/m
                if xmin-1e-6<=x<=xmax+1e-6: pts.append((x,y,z))
            if len(pts)>=2 and (Vector(pts[0])-Vector(pts[1])).length>.004:
                curve(name,pts[:2],radius,mat,parent)

# Continuous hollow cabinet, not overlapping boxes pretending to be a cavity.
shell=ring_mesh('Cabinet | continuous enamel shell',[
    rounded_rect(.846,.541,.007,.025),
    rounded_rect(.848,.543,.007,.703),
    rounded_rect(.752,.460,.012,.703),
    rounded_rect(.748,.456,.018,.110),
],white,cap=True,bevel=.0017)
shell.data.materials.append(inner)
n=len(rounded_rect(1,1,.01))
for face in shell.data.polygons:
    if face.index>=2*n: face.material_index=1
# The ring winding gives inward normals on the liner and upward normals on the floor.
box('Compressor step | inside right',(.2835,0,.164),(.185,.453,.108),inner,.008)
ring_mesh('Moulded upper rim',[
    rounded_rect(.850,.554,.008,.704),
    rounded_rect(.850,.554,.008,.718),
    rounded_rect(.757,.465,.012,.718),
    rounded_rect(.752,.460,.012,.704),
],plastic,bevel=.002)
curve('Basket rail | front',[(-.367,-.229,.696),(.367,-.229,.696)],.004,plastic)
curve('Basket rail | rear',[(-.367,.229,.696),(.367,.229,.696)],.004,plastic)
for x in [-.347,.347]:
    for y in [-.205,.205]:
        box('Recessed foot',(x,y,.014),(.052,.040,.028),dark,.004)

# Handles are recessed into the lid SIDE caps, as in the supplied close-up.
lid_main=box('Lid | metal top and recessed side caps',(0,-.266,.019),(.850,.560,.046),white,.006,lid)
bpy.context.view_layer.objects.active=lid_main
for mod in list(lid_main.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
for side in [-1,1]:
    cutter=box('temporary grip tool',(side*.425,-.266,.013),(.020,.430,.020),None,.0045,lid)
    bpy.context.view_layer.objects.active=cutter
    for mod in list(cutter.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.context.view_layer.objects.active=lid_main
    mod=lid_main.modifiers.new('Recessed side grip','BOOLEAN')
    mod.operation,mod.solver,mod.object='DIFFERENCE','EXACT',cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
finish(lid_main,None,bevel=.0008)
curve('Lid perimeter gasket',rounded_rect(.817,.527,.008,-.007,(0,-.266)),.0036,gasket,lid,True)
box('Lid inner moulding',(0,-.266,-.009),(.775,.478,.017),plastic,.013,lid)
box('Lid diamond panel',(0,-.266,-.018),(.716,.419,.006),white,.009,lid)
curve('Lid inset border',rounded_rect(.742,.446,.011,-.014,(0,-.266)),.0038,plastic,lid,True)
diagonal_grid('Lid embossed diamond rib',-.347,.347,-.465,-.067,-.022,.059,.00125,plastic,lid,.64)
box('Lid underside blank cover',(0,-.447,-.024),(.082,.034,.004),plastic,.004,lid)
for x in [-.272,.272]:
    box('Rear hinge bracket',(x,.266,.694),(.062,.018,.047),plastic,.004)
    rod('Rear hinge barrel',(x-.035,.266,.728),(x+.035,.266,.728),.0085,plastic)

# Functional controls only: no logo, temperature sticker or advertising text.
box('Thermostat recessed plate',(.320,-.2725,.119),(.060,.003,.117),plastic,.003)
rod('Thermostat satin surround',(.320,-.274,.143),(.320,-.276,.143),.020,steel)
rod('Thermostat dial',(.320,-.274,.143),(.320,-.279,.143),.0175,plastic)
box('Thermostat grip',(.320,-.279,.143),(.0035,.002,.027),white,.001)
rod('Power indicator surround',(.320,-.274,.085),(.320,-.276,.085),.005,steel)
rod('Power indicator',(.320,-.275,.085),(.320,-.278,.085),.0034,green)
rod('Drain cap outer',(-.309,-.272,.043),(-.309,-.277,.043),.017,plastic)
rod('Drain cap centre',(-.309,-.276,.043),(-.309,-.279,.043),.010,white)

def basket(side,x):
    assembly=empty('BASKET '+side+' | moulded lattice')
    assembly.parent=root
    w,d,ztop,zbottom=.177,.424,.695,.472
    bw,bd=.155,.389
    curve('Basket '+side+' top rim',rounded_rect(w,d,.009,ztop,(x,0)),.0055,plastic,assembly,True)
    curve('Basket '+side+' bottom rim',rounded_rect(bw,bd,.007,zbottom,(x,0)),.0034,plastic,assembly,True)
    for y in [-.229,.229]:
        box('Basket '+side+' suspension tab',(x,y,.704),(.164,.038,.008),plastic,.002,assembly)
    for edge in [-1,1]:
        for i in range(8):
            y=-bd/2+i*bd/7
            rod('Basket '+side+' side strut',(x+edge*bw/2,y,zbottom),(x+edge*w/2,y*d/bd,ztop),.0032,plastic,assembly)
        for i in range(4):
            dx=-bw/2+i*bw/3
            rod('Basket '+side+' end strut',(x+dx,edge*bd/2,zbottom),(x+dx*w/bw,edge*d/2,ztop),.0032,plastic,assembly)
    diagonal_grid('Basket '+side+' diamond base',x-bw/2+.005,x+bw/2-.005,-bd/2+.006,bd/2-.006,zbottom+.002,.047,.0021,plastic,assembly,1.4)
    return assembly

baskets=[basket('LEFT',-.270),basket('RIGHT',.270)]

def sphere(name,loc,dims,mat,parent=content):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=loc)
    obj=bpy.context.object
    obj.name=name
    obj.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(mat)
    obj.parent=parent
    for face in obj.data.polygons: face.use_smooth=True
    return obj

# Physical support below the visible food. No packages float above an empty floor.
for i in range(4):
    z=.160+i*.104
    box('Lower freezer tub '+str(i),(0,0,z),(.310,.379,.097),plastic,.013,content)
    box('Lower tub lid '+str(i),(0,0,z+.049),(.316,.385,.009),gasket,.006,content)

for y in [-.098,.098]:
    box('Beef parcel',(-.270,y,.522),(.141,.171,.084),paper,.014,content)
    box('Beef plain paper band',(-.270,y,.566),(.060,.156,.0015),band,.001,content)
    for edge in [-1,1]:
        curve('Parcel folded seam',[(-.333,y+edge*.065,.558),(-.301,y+edge*.043,.565),(-.270,y+edge*.056,.567)],.00075,band,content)

box('Salmon plain tray',(.270,-.101,.488),(.143,.173,.027),band,.010,content)
for dx in [-.029,.029]:
    sphere('Salmon fillet',(.270+dx,-.101,.523),(.052,.139,.038),salmon)
    for j in range(6):
        yy=-.15+j*.019
        curve('Salmon fine grain',[(.249+dx,yy,.529),(.270+dx,yy+.011,.542),(.290+dx,yy+.016,.530)],.0008,salmon_line,content)

box('Blueberry box',(.270,.104,.515),(.141,.170,.074),glass,.010,content)
rng=random.Random(198)
for i in range(42):
    x=.270+rng.uniform(-.054,.054)
    y=.104+rng.uniform(-.066,.066)
    z=.551+rng.uniform(-.003,.015)
    r=rng.uniform(.009,.014)
    sphere('Blueberry', (x,y,z),(r*2,r*2,r*1.8),berry)

ring_mesh('Open lasagne container',[
    rounded_rect(.277,.165,.014,.529,(0,-.100)),
    rounded_rect(.290,.178,.018,.619,(0,-.100)),
    rounded_rect(.271,.159,.014,.619,(0,-.100)),
    rounded_rect(.261,.149,.010,.539,(0,-.100)),
],glass,content,cap=True,bevel=.001)
box('Lasagne layers',(0,-.100,.577),(.260,.151,.067),food,.010,content)
vertices=[]
faces=[]
for j in range(17):
    for i in range(29):
        x=-.125+i*.250/28
        y=-.169+j*.138/16
        vertices.append((x,y,.612+.0010*math.sin(i*.91)*math.cos(j*1.32)+rng.uniform(-.0003,.0003)))
for j in range(16):
    for i in range(28):
        a=j*29+i
        faces.append((a,a+1,a+30,a+29))
mesh=bpy.data.meshes.new('Baked surface mesh')
mesh.from_pydata(vertices,[],faces)
obj=bpy.data.objects.new('Gently uneven baked lasagne surface',mesh)
scene.collection.objects.link(obj)
obj.parent=content
mesh.materials.append(food)
for face in mesh.polygons: face.use_smooth=True
curve('Lasagne rim',rounded_rect(.288,.177,.018,.618,(0,-.100)),.0033,plastic,content,True)
box('Bread paper base',(0,.101,.539),(.279,.170,.025),paper,.010,content)
sphere('Bread loaf',(0,.101,.598),(.261,.155,.094),bread)
for x in [-.075,-.025,.025,.075]:
    pts=[]
    for j in range(13):
        yy=-.045+j*.09/12
        zz=.598+.047*math.sqrt(max(0,1-(x/.137)**2-(yy/.079)**2))
        pts.append((x+yy*.23,.101+yy,zz+.0003))
    curve('Bread scoring',pts,.0011,score,content)

# One studio for every shot: large softboxes, indirect light and subtle material AO.
box('Studio floor',(0,0,-.0175),(200,200,.035),studio,0,None)
world=bpy.data.worlds.new('Nordic studio world')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=srgb('EDF2F5')
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.18
scene.world=world

def point_at(obj,point):
    obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()

def area(name,loc,power,size,color,target=(0,0,.55)):
    data=bpy.data.lights.new(name,'AREA')
    data.energy=power
    data.shape='DISK'
    data.size=size
    data.color=srgb(color)[:3]
    obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location=loc
    point_at(obj,target)
    return obj

area('Softbox | broad warm key',(-2.4,-3.0,3.4),380,2.2,'FFF9F1')
area('Softbox | cool fill',(2.6,-.6,2.4),60,2.2,'E4EEF4')
area('Softbox | rear edge',(1.0,2.1,3.2),220,2.1,'FFFFFF')

def camera(name,loc,target,shift):
    data=bpy.data.cameras.new(name)
    data.type='PERSP'
    data.lens=52
    data.sensor_width=36
    data.sensor_fit='HORIZONTAL'
    data.shift_x,data.shift_y=shift
    data.clip_start=.02
    obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location=loc
    point_at(obj,target)
    return obj

hero=camera('CAMERA | closed hero',(.969842,-1.238097,1.318573),(0,0,.39),(.010051,-.047905))
opened=camera('CAMERA | shared open story',(.974362,-1.435902,2.526159),(0,0,.680),(.039941,.020738))
anchors={'beef':(-.27,.098,.568),'salmon':(.27,-.1,.543),'berries':(.27,.10,.572),'lasagne':(0,-.1,.618),'bread':(0,.10,.646)}

def descendants(obj):
    yield obj
    for child in obj.children:
        yield from descendants(child)

def set_shot(name):
    lid.rotation_euler.x=0 if name=='closed' else math.radians(-95)
    for obj in descendants(content):
        obj.hide_render=name!='filled'
    scene.camera=hero if name=='closed' else opened
    bpy.context.view_layer.update()

# Perspective from the front-right, with the product larger in frame.
# 52 mm on a 36 mm sensor; framing is locked across the story pair.
set_shot('closed')
scene['product'] = 'Fryseboksen unbranded 198 litre reference model'
scene['status'] = 'STILLS FOR APPROVAL; no opening animation authored yet'
scene['render_notes'] = 'Cycles, three fixed softboxes, AgX and subtle Ambient Occlusion nodes'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'fryseboksen-master.blend'))
manifest={'revision':'v2-perspective','dimensions_cm':{'width':85,'height':77,'depth':56},'nominal_net_litres':198,'baskets':2,'quality':args.quality,'shots':{}}
for name in filter(None,args.shots.split(',')):
    set_shot(name)
    scene.render.filepath=str(OUT/(name+'.png'))
    print('RENDER_START',name,flush=True)
    bpy.ops.render.render(write_still=True)
    w,h=scene.render.resolution_x,scene.render.resolution_y
    points={}
    for key,position in anchors.items():
        co=world_to_camera_view(scene,scene.camera,Vector(position))
        points[key]={'x':round(co.x*w,1),'y':round((1-co.y)*h,1)}
    cam=scene.camera
    manifest['shots'][name]={'file':name+'.png','width':w,'height':h,'camera':cam.name,'camera_type':cam.data.type,'focal_length_mm':cam.data.lens,'sensor_width_mm':cam.data.sensor_width,'location':list(cam.location),'shift':[cam.data.shift_x,cam.data.shift_y],'lid_degrees':0 if name=='closed' else 95,'anchors':points}
    print('RENDER_DONE',name,flush=True)
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('ASSET_PASS_COMPLETE',flush=True)
