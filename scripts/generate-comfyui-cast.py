"""Redraw the installed authored poses with local ComfyUI; keep their motion and footprint."""
import copy
import hashlib
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/secret-boss-release'
COMFY = ROOT / '.cache/comfyui/ComfyUI'
INPUT = COMFY / 'input'
OUT = ROOT / 'preview/comfyui/release'
DEST = ROOT / 'assets/sprites/comfyui-110'
SERVER = 'http://127.0.0.1:8188'
NEGATIVE = ('photo, realistic, 3d, glossy, gradient, blur, scenery, shadow, floor, text, watermark, '
            'extra limbs, missing legs, extra heads, human body, clothes, cropped, gore')
CONFIG = {
    'curupira': {'source': 'curupira', 'restoreOriginal': True},
    'wolf': {'source': 'wolf', 'restoreOriginal': True},
    'wolf-hardcore': {'source': 'wolf', 'denoise': .68, 'weight': .65,
        'prompt': 'pixel art game sprite, terrifying nightmare wolf, four paws, gaunt long angular muzzle, black eye sockets with glowing amber slits, long ivory fangs, bristling jet black fur, ragged silver mane, pointed ears, bushy tail, ominous dark cartoon, bold black outlines, white background'}
}
DIRECTIONS = {'down': 'front view facing camera', 'up': 'back view, back of head, face hidden',
              'right': 'right side profile facing right', 'left': 'left side profile facing left',
              'downright': 'front three quarter view facing down right', 'downleft': 'front three quarter view facing down left',
              'upright': 'rear three quarter view facing up right, face mostly hidden',
              'upleft': 'rear three quarter view facing up left, face mostly hidden'}


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(value, indent=2), encoding='utf8')
    tmp.replace(path)


def request(route, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(SERVER + route, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(error.read().decode()) from error


def make_workflow(image, reference, prompt, config, prefix):
    return {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': 'DreamShaper_8_pruned.safetensors'}},
        '2': {'class_type': 'LoadImage', 'inputs': {'image': image}},
        '3': {'class_type': 'CLIPTextEncode', 'inputs': {'clip': ['1', 1], 'text': prompt}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'clip': ['1', 1], 'text': config.get('negative', NEGATIVE)}},
        '5': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['2', 0], 'vae': ['1', 2]}},
        '6': {'class_type': 'IPAdapterUnifiedLoader', 'inputs': {'model': ['1', 0], 'preset': 'PLUS (high strength)'}},
        '7': {'class_type': 'IPAdapterAdvanced', 'inputs': {'model': ['6', 0], 'ipadapter': ['6', 1],
            'image': ['10', 0], 'weight': config['weight'], 'weight_type': 'linear', 'combine_embeds': 'concat',
            'start_at': 0.0, 'end_at': 1.0, 'embeds_scaling': 'V only'}},
        '8': {'class_type': 'KSampler', 'inputs': {'model': ['7', 0], 'positive': ['3', 0], 'negative': ['4', 0],
            'latent_image': ['12', 0], 'seed': 20261031, 'steps': config.get('steps', 18), 'cfg': 6.5,
            'sampler_name': 'dpmpp_2m', 'scheduler': 'karras', 'denoise': config['denoise']}},
        '9': {'class_type': 'VAEDecode', 'inputs': {'samples': ['8', 0], 'vae': ['1', 2]}},
        '10': {'class_type': 'LoadImage', 'inputs': {'image': reference}},
        '11': {'class_type': 'SaveImage', 'inputs': {'images': ['9', 0], 'filename_prefix': prefix}},
        '12': {'class_type': 'LatentBatchSeedBehavior', 'inputs': {'samples': ['5', 0], 'seed_behavior': 'fixed'}}
    }


def generate(workflow, name):
    record = CACHE / 'jobs' / (name + '.json')
    inputs = b''.join((INPUT / node['inputs']['image']).read_bytes() for node in workflow.values() if node['class_type'] == 'LoadImage')
    fingerprint = hashlib.sha256(json.dumps(workflow, sort_keys=True).encode() + inputs).hexdigest()
    saved = json.loads(record.read_text()) if record.exists() else {}
    if saved.get('fingerprint') == fingerprint and saved.get('output') and Path(saved['output']).is_file():
        return [Image.open(file).convert('RGB') for file in saved.get('outputs', [saved['output']])]
    if saved.get('fingerprint') == fingerprint and saved.get('prompt_id'):
        # ComfyUI loses pending history after a server restart.
        history=request('/history/'+saved['prompt_id'])
        if saved['prompt_id'] not in history:
            queue=request('/queue')
            if not any(item[1]==saved['prompt_id'] for item in queue['queue_running']+queue['queue_pending']):
                if saved['prompt_id'] not in request('/history/'+saved['prompt_id']):saved.pop('prompt_id')
    if saved.get('fingerprint') != fingerprint or not saved.get('prompt_id'):
        submitted = request('/prompt', {'prompt': workflow, 'client_id': 'galinha-guardia-production'})
        saved = {'fingerprint': fingerprint, 'prompt_id': submitted['prompt_id'], 'workflow': workflow}
        write_json(record, saved)
    deadline = time.monotonic() + 600
    while time.monotonic() < deadline:
        result = request('/history/' + saved['prompt_id']).get(saved['prompt_id'])
        if result:
            if result['status']['status_str'] != 'success':
                raise RuntimeError(json.dumps(result['status']))
            paths = [COMFY / image['type'] / image['subfolder'] / image['filename'] for image in result['outputs']['11']['images']]
            assert all(source.resolve().is_relative_to(COMFY.resolve()) and source.is_file() for source in paths)
            saved['outputs'] = [str(source) for source in paths]
            saved['output'] = str(paths[0])
            write_json(record, saved)
            return [Image.open(source).convert('RGB') for source in paths]
        time.sleep(.4)
    raise TimeoutError('Geração ainda pendente: ' + saved['prompt_id'])


def prepare(cut, filename, canvas_size=384):
    scale = max(1, int(canvas_size * .75 / max(cut.size)))
    size = (cut.width * scale, cut.height * scale)
    offset = ((canvas_size - size[0]) // 2, (canvas_size - size[1]) // 2)
    canvas = Image.new('RGB', (canvas_size, canvas_size), 'white')
    scaled = cut.resize(size, Image.Resampling.NEAREST)
    canvas.paste(scaled, offset, scaled)
    canvas.save(INPUT / filename)
    return offset, size


def nightmare_material(cut):
    cut = cut.copy()
    pixels = cut.load()
    for y in range(cut.height):
        for x in range(cut.width):
            r, g, b, a = pixels[x, y]
            if a and max(r, g, b) >= 48:
                value = 20 + (.299 * r + .587 * g + .114 * b) * .28
                pixels[x, y] = (int(value * .78), int(value * .9), int(value), a)
    return cut


def silkie_material(cut):
    cut = cut.copy()
    bounds = cut.getchannel('A').getbbox()
    if not bounds:
        return cut
    pixels = cut.load()
    for y in range(cut.height):
        for x in range(cut.width):
            r, g, b, a = pixels[x, y]
            if a and r > 90 and r > g * 1.5 and r > b * 1.4:
                color = (230, 224, 205) if y < bounds[1] + (bounds[3]-bounds[1]) * .48 else (48, 54, 60)
                pixels[x, y] = (*color, a)
    return cut


def redraw(kind, samples=False):
    config = CONFIG[kind]
    installed = (ROOT / 'systems/pixellab-art-data.js').read_text(encoding='utf8')
    definitions, _ = json.JSONDecoder().raw_decode(installed.split('const PixelLabArtData =', 1)[1].lstrip())
    definition = definitions[config['source']]
    assert definition['provider'] == 'pixellab' and len(definition['poses']) == 8
    if config.get('restoreOriginal'):
        # Per-frame diffusion distorted faces and flame edges; keep the authored drawing intact.
        frames = {(f['x'],f['y'],f['w'],f['h']) for poses in definition['actions'].values() for pose in poses.values() for f in pose['frames']}
        assert kind == config['source'] and frames and (ROOT / definition['source']).is_file()
        assert all(len(poses)==8 for poses in definition['actions'].values())
        if samples:
            print(kind + ': referência nativa ' + definition['source'],flush=True)
            return
        write_json(DEST / 'meta' / (kind + '.json'), {'id':kind,'definition':definition,
            'sourceDefinition':definition['source'],'workflow':'scripts/generate-comfyui-cast.py',
            'settings':config,'frames':len(frames),'silhouettePreserved':True,'method':'native-recovery'})
        print(f'{kind}: desenho nativo recuperado, {len(frames)} quadros sem repintura',flush=True)
        return
    if config.get('actions'):
        definition['actions'] = {key: value for key, value in definition['actions'].items() if key in config['actions']}
    canvas_size, batch_size = config.get('canvas', 384), config.get('batch', 4)
    prefix = config.get('prefix', '') + kind
    atlas = Image.open(ROOT / definition['source']).convert('RGBA')
    if config.get('silkieIdentity'):
        # Correct the old red comb/wattles in each reference before repainting this breed.
        for poses in definition['actions'].values():
            for pose in poses.values():
                for f in pose['frames']:
                    box = (f['x'], f['y'], f['x']+f['w'], f['y']+f['h'])
                    atlas.paste(silkie_material(atlas.crop(box)), box)
    target = Image.new('RGBA', atlas.size)
    folder = OUT / kind if samples else CACHE / 'frames' / kind
    folder.mkdir(parents=True, exist_ok=True)
    reference = {}
    for direction, pose in definition['actions']['idle'].items():
        f = pose['frames'][0]
        cut = atlas.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
        filename = f'{prefix}-style-{direction}.png'
        if kind == 'curupira':
            Image.open(ROOT / 'assets/sprites/comfyui-110/meta/curupira-style-reference.png').resize((canvas_size, canvas_size)).save(INPUT / filename)
        else:
            prepare(nightmare_material(cut) if kind == 'wolf-hardcore' else cut, filename, canvas_size)
        reference[direction] = filename
    rendered, amber = {}, set()
    for action, poses in definition['actions'].items():
        for direction, pose in poses.items():
            if samples and (action != 'idle' or direction not in ['down', 'right', 'up']):
                continue
            pending = [(index, f) for index, f in enumerate(pose['frames']) if (f['x'], f['y'], f['w'], f['h']) not in rendered]
            for batch_start in range(0, len(pending), batch_size):
                batch = pending[batch_start:batch_start + batch_size]
                prepared, canvases = [], []
                name = f'{prefix}-{action}-{direction}-batch{batch_start}'
                for index, f in batch:
                    cut = atlas.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
                    frame_name = f'{prefix}-{action}-{direction}-{index}'
                    offset, size = prepare(nightmare_material(cut) if kind == 'wolf-hardcore' else cut, frame_name + '.png', canvas_size)
                    canvases.append(Image.open(INPUT / (frame_name + '.png')).copy())
                    prepared.append((f, cut, offset, size, frame_name))
                filename = name + '.webp'
                canvases[0].save(INPUT / filename, save_all=True, append_images=canvases[1:], lossless=True, duration=100, loop=0)
                description = DIRECTIONS[direction] + ', ' + action + ' pose. ' + config['prompt']
                workflow = make_workflow(filename, reference[direction], description, config, 'release/' + name)
                if kind == 'curupira':
                    workflow['4']['inputs']['text'] = NEGATIVE.replace('human body, clothes, ', '')
                if direction == 'up':
                    workflow['3']['inputs']['text'] = workflow['3']['inputs']['text'].replace('black eye sockets with glowing amber slits, long ivory fangs, ', '').replace('expressive oval eyes, ', '')
                    workflow['4']['inputs']['text'] += (', (visible eyes:1.4), (visible face:1.4)' if config.get('edition') == 112 else ', visible eyes, visible face') + ', visible nose, visible mouth'
                results = generate(workflow, name)
                assert len(results) == len(prepared), (name, len(results), len(prepared))
                for result, (f, cut, offset, size, frame_name) in zip(results, prepared):
                    if samples:
                        result.save(folder / (frame_name + '-raw.png'))
                    result = result.crop((*offset, offset[0] + size[0], offset[1] + size[1])).resize(cut.size, Image.Resampling.NEAREST).convert('RGBA')
                    result.putalpha(cut.getchannel('A'))
                    # Keep the authored outline and footprint to prevent sliding or extra limbs.
                    old, new = cut.load(), result.load()
                    inner = cut.getchannel('A').filter(ImageFilter.MinFilter(3)).load() if config.get('boundaryOnly') else None
                    for y in range(cut.height):
                        for x in range(cut.width):
                            r, g, b, a = old[x, y]
                            if a > 200 and max(r, g, b) < 48 and (inner is None or inner[x, y] < 200):
                                new[x, y] = (r, g, b, a)
                            if kind == 'wolf-hardcore' and y < cut.height * .55:
                                r, g, b, a = new[x, y]
                                if a and r > 120 and g > 65 and b < r * .48 and r > g * 1.1:
                                    amber.add((f['x'] + x, f['y'] + y))
                    result.save(folder / (frame_name + '.png'))
                    target.paste(result, (f['x'], f['y']))
                    rendered[(f['x'], f['y'], f['w'], f['h'])] = True
            print(f'{kind}: {action}/{direction} ({len(rendered)} quadros)', flush=True)
    if samples:
        return
    alpha = target.getchannel('A')
    target = target.quantize(colors=63 if kind == 'wolf-hardcore' else 64, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert('RGBA')
    target.putalpha(alpha)
    # Keep the tiny generated amber details from being merged into the dark fur.
    for point in amber:
        target.putpixel(point, (238, 180, 58, target.getpixel(point)[3]))
    payload = target.tobytes()
    digest = hashlib.sha256(payload).hexdigest()[:12]
    source = f'{DEST.relative_to(ROOT).as_posix()}/runtime/{kind}-{digest}.png'
    (ROOT / source).parent.mkdir(parents=True, exist_ok=True)
    target.save(ROOT / source)
    new_definition = copy.deepcopy(definition)
    new_definition.update({'provider': 'comfyui', 'edition': config.get('edition', 110), 'source': source})
    for poses in [new_definition['poses'], *new_definition['actions'].values()]:
        for pose in poses.values():
            for frame in pose['frames']:
                frame['src'] = source
    assert all(len(poses) == 8 for poses in new_definition['actions'].values())
    write_json(DEST / 'meta' / (kind + '.json'), {'id': kind, 'definition': new_definition,
        'sourceDefinition': definition['source'], 'workflow': 'scripts/generate-comfyui-cast.py',
        'settings': config, 'frames': len(rendered), 'silhouettePreserved': True})
    print(kind + ': atlas completo ' + source, flush=True)


if __name__ == '__main__':
    samples = '--samples' in sys.argv
    kinds = [arg for arg in sys.argv[1:] if arg in CONFIG] or list(CONFIG)
    for kind in kinds:
        redraw(kind, samples)
    if not samples:
        installed = {Path(json.loads(file.read_text())['definition']['source']).name for file in (DEST / 'meta').glob('*.json')}
        superseded = CACHE / 'superseded-atlases'
        superseded.mkdir(parents=True, exist_ok=True)
        for file in (DEST / 'runtime').glob('*.png'):
            if file.name not in installed:
                assert file.resolve().parent == (DEST / 'runtime').resolve()
                assert superseded.resolve().is_relative_to(ROOT.resolve())
                file.replace(superseded / file.name)
