"""Finish Revoada do Caos assets using installed identities and local ComfyUI."""
import hashlib
import json
import math
import sys
from collections import deque
from pathlib import Path
from runpy import run_path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
pipeline = run_path(str(Path(__file__).with_name('generate-comfyui-cast.py')))
INPUT = pipeline['INPUT']
WORK = ROOT / '.cache/chaos-sprite-review/inputs'
OUT = ROOT / 'assets/shuffle/chaos-111'
PROJECTILES = {
    'eggshot': 'single whole ivory speckled egg, upright closed smooth shell, no cracks, no opening, no nest',
    'fire': 'orange fireball flying to the right, sharp flame trails extending to the left, bright yellow core',
    'dirt': 'single chunky brown clod of dirt, irregular rounded crumbly edges, three small cracks, no plant',
    'hex': 'purple witch magic orb, bright lavender spiral in its center, dark violet outline, no cauldron',
    'popcorn': 'cluster of three fluffy popped popcorn kernels, cream lobes and small golden centers, no bucket',
    'frost': 'single icy blue feather, pointed tip facing up, crystalline cyan barbs, no wood',
    'venom': 'single toxic green droplet, pointed top, lime green highlight, no bottle',
    'fire-egg': 'single ivory egg with orange flames wrapping its shell, pointed flame tip facing up, no nest'
}

ICON_DESIGNS = {
    'cornshot': 'golden corn cobs with green husks', 'egg': 'ivory egg with a straw farm hat and red band',
    'sickle': 'blue steel crescent sickle with wooden handle', 'boots': 'pair of red brown leather farm boots',
    'volley': 'bundle of corn cobs and red cord', 'rear': 'white feather with crossed wooden arrows',
    'cross': 'wooden crossbow with four icy blue arrows', 'spiral': 'purple feather with golden stars',
    'sniper': 'orange carrot with green leaves', 'homing': 'curved golden bow with green feathers',
    'boomerang': 'crescent farm sickle with green leaves', 'ricochet': 'red wooden slingshot',
    'fireball': 'iron brazier with bright orange flame', 'frost': 'two crystalline pale blue feathers',
    'venom': 'small green poison vial on wooden handle', 'thunder': 'suspended rustic wooden farm trap with lightning',
    'mines': 'round orange carrot bomb with burning fuse', 'orbit': 'purple crystal orb circled by four stones',
    'quake': 'wooden mallet hitting a cracked stone slab', 'heart': 'pink heart in a golden straw nest',
    'dash': 'golden winged leather boot', 'feather': 'two cream feathers tied with lilac ribbon',
    'magnet': 'red horseshoe magnet attracting three turquoise crystals', 'might': 'golden corn barbell',
    'haste': 'rustic brown mug with a farm emblem', 'reach': 'wooden flute and a green pitchfork',
    'regen': 'small creamy milk bottle tied with green leaves', 'shield': 'round wood and iron shield with blue center',
    'harvest': 'woven basket of golden corn and pale blue eggs', 'thorns': 'green thorn ring and leather belt',
    'milk': 'full creamy milk bottle with violet cloth', 'xp': 'three mint green faceted crystals',
    'fusion-solar': 'glowing golden magic egg', 'fusion-reaper': 'blue steel crescent scythe with turquoise blade',
    'fusion-storm': 'blue wooden drum and two crossed drumsticks', 'fusion-blizzard': 'three hanging lavender ice feathers',
    'fusion-meteor': 'wooden crate filled with golden explosive spikes', 'fusion-cauldron': 'dark purple witch cauldron with green liquid and wooden spoon',
    'fusion-fortress': 'golden shield with purple feathers and turquoise center', 'fusion-popcorn': 'red and cream popcorn tub filled with golden popped kernels',
    'power-feather': 'single cream feather', 'lightning': 'golden lightning bolt', 'water': 'blue water droplet',
    'carrot': 'orange carrot with green leaves', 'claw': 'three gray curved cat claws',
    'bark': 'brown dog paw with three sound waves', 'honk': 'orange goose beak with sound waves',
    'power-shield': 'broken ivory eggshell shield', 'item-egg': 'single ivory egg in a small straw nest',
    'item-boots': 'one brown leather work boot with green cuff', 'item-milk': 'small glass milk bottle with red ribbon',
    'corn': 'three tall green corn stalks with golden corn cobs', 'stone': 'pile of three chunky blue gray quarry stones',
    'lantern': 'wooden lamp post with hanging golden farm lantern'
}


def static_art():
    catalog = json.loads((ROOT / 'assets/shuffle/power-catalog.json').read_text())
    groups = {
        'catalog': (catalog['source'], 64, 64, list(catalog['cells'])),
        'powers': ('assets/shuffle/chaos-powers.png', 64, 64, ['feather','lightning','water','carrot','claw','bark','honk','shield']),
        'items': ('assets/shuffle/items-pixel.png', 64, 64, ['cornshot','egg','sickle','boots','milk','xp']),
        'scenery': ('assets/shuffle/chaos-scenery.png', 64, 96, ['corn','stone','lantern'])
    }
    output = {}
    for group, (source, width, height, ids) in groups.items():
        original = Image.open(ROOT / source).convert('RGBA')
        atlas = Image.new('RGBA', original.size)
        cells = {}
        for i, key in enumerate(ids):
            x, y = i % (original.width // width) * width, i // (original.width // width) * height
            cut = original.crop((x, y, x+width, y+height))
            if group == 'catalog' and key in ['boomerang','fusion-reaper']:
                blade = original.crop((128,0,192,64))
                cut = Image.new('RGBA',(64,64))
                if key == 'boomerang':
                    cut.paste(blade,(0,0))
                    ribbon = ImageDraw.Draw(cut)
                    ribbon.polygon([(42,16),(49,17),(43,27),(41,23),(35,25)],fill='#73ba67',outline='#2a4736')
                else:
                    blade = blade.resize((28,28),Image.Resampling.NEAREST)
                    for point in [(5,12),(31,12),(18,33)]:
                        cut.alpha_composite(blade,point)
            elif group == 'catalog' and key in ['thorns','fusion-cauldron','reach']:
                cut = Image.new('RGBA',(64,64));draw=ImageDraw.Draw(cut);ink='#30342f'
                if key == 'thorns':
                    for angle in range(0,360,45):
                        a=math.radians(angle)
                        draw.polygon([(32+round(math.cos(a)*24),32+round(math.sin(a)*24)),
                                      (32+round(math.cos(a+.22)*16),32+round(math.sin(a+.22)*16)),
                                      (32+round(math.cos(a-.22)*16),32+round(math.sin(a-.22)*16))],fill='#759548',outline=ink)
                    draw.ellipse((14,14,50,50),fill='#638d48',outline=ink,width=2)
                    draw.ellipse((21,21,43,43),fill=(0,0,0,0),outline=ink,width=2)
                    draw.rectangle((27,44,37,51),fill='#c3a15a',outline=ink,width=2)
                elif key == 'reach':
                    draw.line([(16,51),(43,24)],fill=ink,width=7);draw.line([(16,51),(43,24)],fill='#a97643',width=3)
                    draw.line([(32,22),(43,33)],fill=ink,width=5)
                    for start,end in [((32,22),(40,12)),((38,28),(48,18)),((43,33),(54,25))]:
                        draw.line([start,end],fill=ink,width=5);draw.line([start,end],fill='#78c3a4',width=3)
                else:
                    draw.line([(20,43),(17,53)],fill=ink,width=5);draw.line([(44,43),(47,53)],fill=ink,width=5)
                    draw.ellipse((12,20,52,49),fill='#65496e',outline=ink,width=3)
                    draw.ellipse((11,14,53,29),fill='#93c65c',outline=ink,width=3)
                    draw.line([(41,23),(51,7)],fill=ink,width=5);draw.line([(41,23),(51,7)],fill='#bd8a52',width=3)
                    for circle in [(19,9,25,15),(31,5,36,10),(27,17,32,22)]:
                        draw.ellipse(circle,fill='#c5e76c',outline='#53683f')
            name = f'chaos-{group}-{key}'
            offset, size = pipeline['prepare'](cut, name+'.png', 256)
            design = ('power-'+key if group == 'powers' and key in ['feather','shield'] else
                      'item-'+key if group == 'items' and key in ['egg','boots','milk'] else key)
            description = 'three complete blue steel farm sickles' if key == 'fusion-reaper' else 'single green thorn collar with brass buckle' if key == 'thorns' else 'long wooden pitchfork with three turquoise tines' if key == 'reach' else ICON_DESIGNS[design]
            prompt = f'{description}. Cute farm cartoon pixel art game icon, bold clean dark outline, rounded volumes, flat bright colors, simple crisp shade clusters, complete object, same position and silhouette as input, white background.'
            workflow = pipeline['make_workflow'](name+'.png', name+'.png', prompt, {'denoise': .4,'weight': 0,'steps': 12}, 'chaos/'+name)
            workflow['8']['inputs']['model'] = ['1', 0]
            workflow['4']['inputs']['text'] = 'photo, realistic, 3d, plastic, blur, ground, shadow, scenery, text, letters, numbers, watermark, people, human face, extra objects, cropped'
            generated = pipeline['generate'](workflow, name)[0]
            hole = group=='catalog' and key=='thorns'
            if hole:
                ImageDraw.floodfill(generated,(generated.width//2,generated.height//2),(255,255,255),thresh=35)
            painted = cutout(generated, scenery=group=='scenery', fragments=True, hole=hole)
            atlas.paste(painted,(x,y));cells[key]=[x,y]
            print(group+'/'+key,flush=True)
        digest = hashlib.sha256(atlas.tobytes()).hexdigest()[:12]
        installed = f'assets/shuffle/chaos-111/{group}-{digest}.png'
        atlas.save(ROOT / installed)
        output[group] = {'provider':'comfyui','source':installed,'width':atlas.width,'height':atlas.height,
                         'cells':cells,'sourceDefinition':source,'generator':'scripts/generate-comfyui-chaos.py'}
    pipeline['write_json'](OUT / 'statics.json',output)


def cutout(image, scenery=False, fragments=False, hole=False):
    image = image.convert('RGBA')
    pixels = image.load()
    queue = deque([(x, y) for x in range(image.width) for y in [0, image.height - 1]] +
                  [(x, y) for y in range(image.height) for x in [0, image.width - 1]])
    if hole:
        queue.append((image.width//2,image.height//2))
    seen = set()
    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or not (0 <= x < image.width and 0 <= y < image.height):
            continue
        seen.add((x, y))
        r, g, b, _ = pixels[x, y]
        if min(r, g, b) < 225 or max(r, g, b) - min(r, g, b) > 22:
            continue
        pixels[x, y] = (0, 0, 0, 0)
        queue.extend([(x-1, y), (x+1, y), (x, y-1), (x, y+1)])
    # Keep one connected object; detached background specks are not projectile art.
    remaining = {(x, y) for y in range(image.height) for x in range(image.width) if pixels[x, y][3]}
    largest, components = set(), []
    while remaining:
        component = {remaining.pop()}
        pending = list(component)
        while pending:
            x, y = pending.pop()
            for point in [(x-1, y), (x+1, y), (x, y-1), (x, y+1)]:
                if point in remaining:
                    remaining.remove(point)
                    component.add(point)
                    pending.append(point)
        components.append(component)
        if len(component) > len(largest):
            largest = component
    if fragments:
        largest = set().union(*(component for component in components if len(component)>=max(8,len(largest)*.03)))
    for y in range(image.height):
        for x in range(image.width):
            if (x, y) not in largest:
                pixels[x, y] = (0, 0, 0, 0)
    bbox = image.getchannel('A').getbbox()
    assert bbox and bbox[0] > 0 and bbox[1] > 0 and bbox[2] < image.width and bbox[3] < image.height, 'Foreground touches image edge'
    image = image.crop(bbox)
    scale = min(48 / image.width, (76 if scenery else 48) / image.height)
    image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.NEAREST)
    if scenery:
        image = image.crop(image.getchannel('A').getbbox())
    canvas = Image.new('RGBA', (64, 96 if scenery else 64))
    canvas.paste(image, ((64-image.width)//2, 88-image.height if scenery else (64-image.height)//2))
    alpha = canvas.getchannel('A')
    canvas = canvas.quantize(colors=48, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert('RGBA')
    canvas.putalpha(alpha)
    assert canvas.getchannel('A').getextrema() == (0, 255)
    return canvas


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    if '--statics' in sys.argv:
        static_art()
        raise SystemExit(0)
    records = json.loads((WORK / 'portraits.json').read_text(encoding='utf8'))
    manifest = json.loads((ROOT / 'assets/shuffle/results/manifest.json').read_text())
    provenance = {}
    for record in records:
        key, outcome = record['id'], record['outcome']
        if 'existing' in record:
            provenance.setdefault(key, {})[outcome] = record['provenance']
            continue
        cut = Image.open(ROOT / record['source']).convert('RGBA')
        if record['native']:
            result = cut
            provider = 'installed-atlas'
        else:
            filename = key + '-' + outcome + '.png'
            offset, size = pipeline['prepare'](cut, filename)
            style = key + '-style.png'
            pipeline['prepare'](Image.open(WORK / (key + '-win.png')).convert('RGBA'), style)
            emotion = 'proud happy smile' if outcome == 'win' else 'tired sad expression, lowered eyelids'
            if key == 'enemy-mula-sem-cabeca':
                emotion = 'tall bright flame' if outcome == 'win' else 'soft small flame'
            assert isinstance(record.get('description'),str) and record['description'], key+' needs an identity reference'
            prompt = f'Front view, full body, {emotion}. {record["description"]}. Cute farm game pixel art, rounded cartoon, clean dark outlines, flat colors, same anatomy and pose as input, white background.'
            workflow = pipeline['make_workflow'](filename, style, prompt, {'denoise': .38, 'weight': .8}, 'chaos/' + filename[:-4])
            workflow['4']['inputs']['text'] = 'photo, realistic, 3d, plastic, blur, shadow, floor, background, text, watermark, extra limbs, missing limbs, blood'
            if key == 'hero-silkie':
                workflow['4']['inputs']['text'] += ', red comb, red wattles, human face'
            generated = pipeline['generate'](workflow, 'chaos-result-' + key + '-' + outcome)[0]
            result = generated.crop((*offset, offset[0]+size[0], offset[1]+size[1])).resize(cut.size, Image.Resampling.NEAREST).convert('RGBA')
            result.putalpha(cut.getchannel('A'))
            result = result.quantize(colors=64, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert('RGBA')
            result.putalpha(cut.getchannel('A'))
            provider = 'comfyui'
        digest = hashlib.sha256(result.tobytes()).hexdigest()[:12]
        source = f'assets/shuffle/chaos-111/{key}-{outcome}-{digest}.png'
        result.save(ROOT / source)
        manifest.setdefault(key,{})[outcome] = source
        method = ('native-emotion' if record.get('emotion') else 'installed-atlas-frame') if record['native'] else 'reference-preserving-repaint'
        provenance.setdefault(key, {})[outcome] = {'provider': provider, 'method':method, **record['provenance']}
        print(key + '/' + outcome + ': ' + provider, flush=True)
    pipeline['write_json'](OUT / 'portraits.json', provenance)
    native_poses = {}
    for record in records:
        if record.get('atlasSelection'):
            pose = record['provenance']
            native_poses.setdefault(record['id'], {})[record['outcome']] = {'provider':{'pixellab':'PixelLab','comfyui':'ComfyUI'}[record['sourceProvider']],'method':'installed-atlas-frame',
                'sourceSha256':hashlib.sha256((ROOT / pose['source']).read_bytes()).hexdigest(),**pose}
    if native_poses:
        pipeline['write_json'](ROOT / 'assets/shuffle/results/atlas-poses.json', native_poses)
    pipeline['write_json'](ROOT / 'assets/shuffle/results/manifest.json', manifest)
    (ROOT / 'shuffle/result-art.js').write_text('/* Current identities and locally repainted result portraits. */\nconst ShuffleResultArt = ' + json.dumps(manifest, separators=(',', ':')) + ';\n', encoding='utf8')
    if '--portraits' in sys.argv:raise SystemExit(0)
    atlas = Image.new('RGBA', (256, 128))
    cells = {}
    for i, (key, description) in enumerate(PROJECTILES.items()):
        source = Image.open(WORK / (key + '.png')).convert('RGBA')
        if key in ['eggshot', 'fire-egg']:
            source = Image.new('RGBA', (64, 64))
            draw = ImageDraw.Draw(source)
            draw.ellipse((17, 9, 47, 55), fill='#f6e9c9', outline='#493c31', width=2)
            for x, y in [(25, 28), (37, 36), (29, 45)]:
                draw.rectangle((x, y, x+1, y+1), fill='#bca783')
            if key == 'fire-egg':
                flame = Image.open(WORK / 'fire.png').rotate(90)
                source.alpha_composite(flame, (0, -12))
        elif key == 'dirt':
            stones = Image.open(ROOT / 'assets/shuffle/chaos-scenery.png').crop((64, 0, 128, 96)).convert('RGBA')
            stones = stones.crop(stones.getchannel('A').getbbox())
            stones.thumbnail((48, 48), Image.Resampling.NEAREST)
            source = Image.new('RGBA', (64, 64))
            for y in range(stones.height):
                for x in range(stones.width):
                    r, g, b, a = stones.getpixel((x, y))
                    value = (r + g + b) / 3
                    stones.putpixel((x, y), (int(value), int(value*.72), int(value*.43), a))
            source.paste(stones, ((64-stones.width)//2, (64-stones.height)//2))
        elif key in ['frost', 'venom']:
            for y in range(source.height):
                for x in range(source.width):
                    r, g, b, a = source.getpixel((x, y))
                    if a and max(r, g, b) > 90 and min(r, g, b) < 235:
                        if key == 'venom' and b > r * 1.2:
                            source.putpixel((x, y), (min(255, round(r+g*.3)), g, round(b*.2), a))
                        elif key == 'frost':
                            source.putpixel((x, y), (round(r*.65), round(g*.95), min(255, b+14), a))
            if key == 'frost':
                source = source.rotate(45, resample=Image.Resampling.NEAREST)
        filename, style = 'chaos-' + key + '.png', 'chaos-' + key + '-style.png'
        pipeline['prepare'](source, filename)
        pipeline['prepare'](Image.open(WORK / (key + '-style.png')).convert('RGBA'), style)
        prompt = f'One {description}. Polished farm game pixel art icon, clean dark outline, rounded cartoon, flat bright colors, three crisp shade clusters, centered full object, white background.'
        workflow = pipeline['make_workflow'](filename, filename, prompt, {'denoise': .38, 'weight': .65}, 'chaos/projectile-' + key)
        workflow['8']['inputs']['model'] = ['1', 0]
        workflow['4']['inputs']['text'] = 'bottle, bowl, pot, jar, container, handles, box, bucket, cup, sack, bag, lid, plant, nest, campfire, stove, photo, realistic, 3d, plastic, blur, shadow, floor, text, watermark, faces, people, animals, frame, cropped'
        image = cutout(pipeline['generate'](workflow, 'chaos-projectile-' + key)[0])
        cells[key] = [i % 4 * 64, i // 4 * 64]
        atlas.paste(image, tuple(cells[key]))
        print('projectile/' + key, flush=True)
    digest = hashlib.sha256(atlas.tobytes()).hexdigest()[:12]
    source = f'assets/shuffle/chaos-111/projectiles-{digest}.png'
    atlas.save(ROOT / source)
    pipeline['write_json'](OUT / 'projectiles.json', {'provider': 'comfyui', 'source': source, 'cells': cells, 'generator': 'scripts/generate-comfyui-chaos.py'})
    statics = json.loads((OUT / 'statics.json').read_text()) if (OUT / 'statics.json').exists() else {}
    installed = {Path(source).name for pair in manifest.values() for source in pair.values()} | {Path(source).name} | {Path(item['source']).name for item in statics.values()}
    retired = ROOT / '.cache/chaos-sprite-review/retired'
    retired.mkdir(parents=True, exist_ok=True)
    for file in OUT.glob('*.png'):
        if file.name not in installed:
            assert file.resolve().parent == OUT.resolve() and retired.resolve().is_relative_to(ROOT.resolve())
            file.replace(retired / file.name)
