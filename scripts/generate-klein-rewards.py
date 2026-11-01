"""Reference-edit native animal poses into coherent costumed pixel-art skins in local ComfyUI."""
import copy
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('cast',ROOT/'scripts/generate-comfyui-cast.py')
cast=importlib.util.module_from_spec(spec);spec.loader.exec_module(cast)
cast.CACHE=ROOT/'.cache/klein-rewards-117'
DEST=ROOT/'assets/sprites/wardrobe-117';REVIEW=ROOT/'preview/wardrobe-117'
definitions,_=json.JSONDecoder().raw_decode((ROOT/'systems/pixellab-art-data.js').read_text().split('const PixelLabArtData =',1)[1].lstrip())
CONFIG={
 'goat':('goat','Keep the cream and caramel mountain goat. Give it TWO LARGE clearly visible dark brown curved horns, sweeping outward then upward on the two sides of its head. The horns must remain recognizable above the hat in every view. Fit a LOW tan straw hat with a green band between the horn bases: the two horns pass through natural openings, the crown hugs the skull, and the brim rests above the eyebrows without hiding the eyes. Add a small green triangular neckerchief tied around the neck. Preserve its four legged goat anatomy and all four hooves in the exact input pose.'),
 'turkey':('turkey','Give the turkey dark teal blue feathers with cream feather tips. Add a small navy captain cap with a gold badge fitted on its head above its eyes, and a red neckerchief tied around its neck. Keep its red wattle, yellow beak and two bird feet.'),
 'owl':('owl','Give the owl soft plum violet feathers. Add a lilac fabric bow tied around its neck, like the existing cat skin. Keep its cream facial disk, expressive amber eyes, two wings and two tiny talons.'),
 'pony':('horse','Give the four legged pony a silver gray coat, dark mane and tail. Add a small burgundy cowboy hat naturally fitted between its ears and a red neckerchief around its neck. Keep all four hooves and the horizontal animal body.')}

def crop(atlas,f):return atlas.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))

def style():
    plate=Image.new('RGB',(512,512),'white')
    for i,name in enumerate(['skin-zeca','skin-pipoca','skin-amora','skin-pacoca']):
        definition=definitions[name];f=definition['actions']['idle']['downright']['frames'][0]
        cut=crop(Image.open(ROOT/definition['source']).convert('RGBA'),f);scale=max(1,int(190/max(cut.size)))
        cut=cut.resize((cut.width*scale,cut.height*scale),Image.Resampling.NEAREST)
        plate.paste(cut,(i%2*256+(256-cut.width)//2,i//2*256+(256-cut.height)//2),cut)
    plate.save(cast.INPUT/'reward-117-existing-skins.png')

def workflow(file,prompt,name,width=512,height=512):
    graph={
      '1':{'class_type':'UNETLoader','inputs':{'unet_name':'flux-2-klein-4b-fp8.safetensors','weight_dtype':'default'}},
      '2':{'class_type':'CLIPLoader','inputs':{'clip_name':'qwen_3_4b_fp4_flux2.safetensors','type':'flux2','device':'default'}},
      '3':{'class_type':'VAELoader','inputs':{'vae_name':'flux2-vae.safetensors'}},
      '4':{'class_type':'CLIPTextEncode','inputs':{'clip':['2',0],'text':prompt}},
      '5':{'class_type':'ConditioningZeroOut','inputs':{'conditioning':['4',0]}},
      '6':{'class_type':'LoadImage','inputs':{'image':file}},
      '7':{'class_type':'VAEEncode','inputs':{'pixels':['6',0],'vae':['3',0]}},
      '8':{'class_type':'ReferenceLatent','inputs':{'conditioning':['4',0],'latent':['7',0]}},
      '9':{'class_type':'ReferenceLatent','inputs':{'conditioning':['5',0],'latent':['7',0]}},
      '10':{'class_type':'LoadImage','inputs':{'image':'reward-117-existing-skins.png'}},
      '12':{'class_type':'VAEEncode','inputs':{'pixels':['10',0],'vae':['3',0]}},
      '13':{'class_type':'ReferenceLatent','inputs':{'conditioning':['8',0],'latent':['12',0]}},
      '14':{'class_type':'ReferenceLatent','inputs':{'conditioning':['9',0],'latent':['12',0]}},
      '15':{'class_type':'CFGGuider','inputs':{'model':['1',0],'positive':['13',0],'negative':['14',0],'cfg':1}},
      '16':{'class_type':'RandomNoise','inputs':{'noise_seed':20261101}},
      '17':{'class_type':'KSamplerSelect','inputs':{'sampler_name':'euler'}},
      '18':{'class_type':'Flux2Scheduler','inputs':{'steps':4,'width':width,'height':height}},
      '19':{'class_type':'EmptyFlux2LatentImage','inputs':{'width':width,'height':height,'batch_size':1}},
      '20':{'class_type':'SamplerCustomAdvanced','inputs':{'noise':['16',0],'guider':['15',0],'sampler':['17',0],'sigmas':['18',0],'latent_image':['19',0]}},
      '21':{'class_type':'VAEDecode','inputs':{'samples':['20',0],'vae':['3',0]}},
      '11':{'class_type':'SaveImage','inputs':{'images':['21',0],'filename_prefix':'reward-117/'+name}}}
    return graph

def remove_background(image):
    image=image.convert('RGBA');w,h=image.size;pixels=image.load();mask=Image.new('L',image.size);m=mask.load()
    pending=[(0,0),(w-1,0),(0,h-1),(w-1,h-1)]
    while pending:
        x,y=pending.pop()
        if x<0 or y<0 or x>=w or y>=h or m[x,y]:continue
        r,g,b,_=pixels[x,y]
        if min(r,g,b)<215 or max(r,g,b)-min(r,g,b)>30:continue
        m[x,y]=255;pending.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
    image.putalpha(Image.eval(mask,lambda a:255-a));return image

def fit_frame(result,original,f,cw,ch):
    result=remove_background(result);box=result.getbbox();assert box
    result=result.crop(box);native=original.getbbox();height=native[3]-native[1]+7
    scale=min(height/result.height,(cw-4)/result.width)
    result=result.resize((max(1,round(result.width*scale)),max(1,round(result.height*scale))),Image.Resampling.NEAREST)
    canvas=Image.new('RGBA',(cw,ch));left=round(f.get('cx',f['w']//2)+8-result.width/2);top=f['bottom']+16-result.height
    assert left>=0 and top>=0 and left+result.width<=cw and top+result.height<=ch
    canvas.paste(result,(left,top));return canvas

def render(kind):
    species,design=CONFIG[kind];definition=copy.deepcopy(definitions[species]);atlas=Image.open(ROOT/definition['source']).convert('RGBA')
    # Owl flight and alarm belong to the sentinel, not to a walking player skin.
    definition['actions']={a:p for a,p in definition['actions'].items() if a not in ['fly','alert']}
    unique={}
    for action,poses in definition['actions'].items():
        for direction,pose in poses.items():
            for f in pose['frames']:unique.setdefault((f['x'],f['y'],f['w'],f['h']),(action,direction,f))
    cells=list(unique);cw=max(k[2] for k in cells)+16;ch=max(k[3] for k in cells)+20
    output=Image.new('RGBA',(cw*16,ch*((len(cells)+15)//16)));mapping={}
    for index,key in enumerate(cells):
        action,direction,f=unique[key]
        sample_directions=['down','right','up','downright'] if '--views' in sys.argv else ['downright']
        if '--samples' in sys.argv and (direction not in sample_directions or f!=definition['actions']['idle'][direction]['frames'][0]):continue
        cut=crop(atlas,f);working=Image.new('RGBA',(cw,ch));working.paste(cut,(8,16))
        name=f'{kind}-{index}';file=f'reward-117-{name}.png';offset,size=cast.prepare(working,file,512)
        facing=cast.DIRECTIONS[direction]
        if direction=='up':facing+='; only the back of the head and hindquarters are visible, absolutely no eyes, face, nose or mouth visible'
        elif direction.startswith('up'):facing+='; looking away from the viewer, show the back and rear cheek rather than a frontal face'
        prompt=('Edit only the animal sprite in image 1. The animal MUST stay in this exact orientation: '+facing+'. '+design+
          ' Match the exact pixel art rendering style of the existing game skins in image 2: same chunky clean one-pixel dark outlines, deliberate pixel clusters, warm limited colors and two-tone shading. '
          'Keep image 1 animal species, anatomy, expression, camera angle, facing direction, size, position and exact leg pose. '
          'Clothes must fit the animal naturally as one integrated drawing. Preserve the visible body parts of the original angle. Keep the background plain white, without a floor or any shadow. Do not add other characters.')
        if action in ['walk','run']:prompt+=' This is an animation frame: copy the exact raised hooves or feet, leg placement and weight shift in image 1. Do not replace it with an idle standing pose.'
        result=cast.generate(workflow(file,prompt,name),name)[0]
        REVIEW.mkdir(parents=True,exist_ok=True)
        if '--samples' in sys.argv:
            result.save(REVIEW/f'{kind}-{direction}-raw.png')
            result=fit_frame(result,cut,f,cw,ch)
            result.save(REVIEW/f'{kind}-{direction}-sample.png')
            if direction=='downright':result.save(REVIEW/f'{kind}-sample.png')
            print(kind+'/'+direction+': sample ready',flush=True);continue
        result=fit_frame(result,cut,f,cw,ch)
        box=result.getbbox();assert box and box[3]-box[1]>15
        x=index%16*cw;y=index//16*ch;output.paste(result,(x,y))
        mapping[key]={'x':x,'y':y,'w':cw,'h':ch,'cx':f.get('cx',f['w']//2)+8,'bottom':box[3],
          'top':box[1],'width':box[2]-box[0],'scale':1,'pixelArt':True}
        print(f'{kind}: {index+1}/{len(cells)}',flush=True)
    if '--samples' in sys.argv:return
    alpha=output.getchannel('A');output=output.quantize(colors=64,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).convert('RGBA');output.putalpha(alpha)
    digest=hashlib.sha256(output.tobytes()).hexdigest()[:12];source=f'assets/sprites/wardrobe-117/runtime/{kind}-{digest}.png';(ROOT/source).parent.mkdir(parents=True,exist_ok=True);output.save(ROOT/source)
    for poses in definition['actions'].values():
        for pose in poses.values():
            pose['frames']=[{**mapping[(f['x'],f['y'],f['w'],f['h'])],'src':source} for f in pose['frames']]
            pose.update(cx=pose['frames'][0]['cx'],bottom=max(f['bottom'] for f in pose['frames']),top=min(f['top'] for f in pose['frames']),width=max(f['width'] for f in pose['frames']))
    definition.update(poses=copy.deepcopy(definition['actions']['walk']),source=source,width=output.width,height=output.height,provider='comfyui',edition=117)
    cast.write_json(DEST/'meta'/f'{kind}.json',{'id':kind,'definition':definition,'method':'klein-reference-edit',
       'workflow':'scripts/generate-klein-rewards.py','sourceDefinition':definitions[species]['source'],'frames':len(cells),
       'styleReferences':['skin-zeca','skin-pipoca','skin-amora','skin-pacoca']})

if __name__=='__main__':
    style()
    for kind in [a for a in sys.argv[1:] if a in CONFIG] or CONFIG:render(kind)
