"""Create four genuinely different empty stages, using the same local art pipeline."""
import hashlib
from pathlib import Path
from runpy import run_path
from PIL import Image

pipeline = run_path(str(Path(__file__).with_name('generate-comfyui-cast.py')))
generate, write_json = pipeline['generate'], pipeline['write_json']

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets/cinematics/endings-110'
SCENES = {
    'easy': ('Explorador', 'sunny apple orchard picnic meadow, apple trees framing both sides, little pond in the far right background, wildflowers, a picnic basket and red blanket at left edge, warm clear afternoon'),
    'normal': ('Aventura', 'rustic red barn dance courtyard, wooden dance platform with empty center, colorful festival flags and warm hanging lanterns, hay bales at the far edges, late golden afternoon'),
    'hard': ('Contra o tempo', 'farm windmill courtyard at dawn, large timber windmill at the right edge, pumpkin cart and tools at the left edge, scattered autumn leaves around empty dirt clearing, distant rolling fields'),
    'hardcore': ('Última luz', 'haunted forest farm clearing at midnight, twisted huge dead tree at the left edge, broken wooden fence at the right edge, distant tiny warm farmhouse windows, crescent moon behind clouds, pale ground fog lighting the empty center, ominous blue black woods')
}

if __name__ == '__main__':
    DEST.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for i, (key, (title, scene)) in enumerate(SCENES.items()):
        reference = pipeline['INPUT'] / ('ending-layout-' + key + '.png')
        Image.open(ROOT / '.cache/secret-boss-release/stages' / (key + '.png')).resize((768, 512), Image.Resampling.NEAREST).save(reference)
        prompt = ('(pixel art:1.4), (16 bit game background:1.3), high oblique overhead camera, wide empty clearing centered in lower middle, '
                  'open foreground, crisp dark outlines, flat muted colors, consistent pixel size, charming hand drawn cartoon. ' + scene)
        workflow = {
            '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': 'DreamShaper_8_pruned.safetensors'}},
            '3': {'class_type': 'CLIPTextEncode', 'inputs': {'clip': ['1', 1], 'text': prompt}},
            '4': {'class_type': 'CLIPTextEncode', 'inputs': {'clip': ['1', 1], 'text': 'border, frame, photograph, realistic, 3d, glossy, painting, blur, characters, people, animals, wolf, chicken, crowd, text, letters, logo, watermark, close up, side view'}},
            '5': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['1', 2]}},
            '6': {'class_type': 'IPAdapterUnifiedLoader', 'inputs': {'model': ['1', 0], 'preset': 'PLUS (high strength)'}},
            '7': {'class_type': 'IPAdapterAdvanced', 'inputs': {'model': ['6', 0], 'ipadapter': ['6', 1], 'image': ['10', 0],
                'weight': .65, 'weight_type': 'linear', 'combine_embeds': 'concat', 'start_at': 0.0, 'end_at': 1.0, 'embeds_scaling': 'V only'}},
            '10': {'class_type': 'LoadImage', 'inputs': {'image': reference.name}},
            '8': {'class_type': 'KSampler', 'inputs': {'model': ['7', 0], 'positive': ['3', 0], 'negative': ['4', 0], 'latent_image': ['5', 0],
                'seed': 20261101 + i, 'steps': 22, 'cfg': 6.5, 'sampler_name': 'dpmpp_2m', 'scheduler': 'karras', 'denoise': .42}},
            '9': {'class_type': 'VAEDecode', 'inputs': {'samples': ['8', 0], 'vae': ['1', 2]}},
            '11': {'class_type': 'SaveImage', 'inputs': {'images': ['9', 0], 'filename_prefix': 'endings/' + key}}
        }
        image = generate(workflow, 'ending-' + key)[0]
        assert image.size == (768, 512)
        digest = hashlib.sha256(image.tobytes()).hexdigest()[:12]
        source = f'assets/cinematics/endings-110/{key}-{digest}.png'
        image.save(ROOT / source)
        manifest[key] = {'title': title, 'src': source, 'provider': 'comfyui', 'workflow': workflow}
        print(key + ': ' + source, flush=True)
    write_json(DEST / 'manifest.json', manifest)
    rejected = ROOT / '.cache/secret-boss-release/rejected-ending-studies'
    rejected.mkdir(parents=True, exist_ok=True)
    installed = {Path(scene['src']).name for scene in manifest.values()}
    for file in DEST.glob('*.png'):
        if file.name not in installed:
            assert file.resolve().parent == DEST.resolve()
            assert rejected.resolve().is_relative_to(ROOT.resolve())
            file.replace(rejected / file.name)
