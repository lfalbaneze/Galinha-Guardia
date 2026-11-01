"""Prepare the reviewed drawings of the active Revoada do Caos cast."""
import json
import sys
from pathlib import Path
from runpy import run_path

ROOT = Path(__file__).resolve().parents[1]
pipeline = run_path(str(Path(__file__).with_name('generate-comfyui-cast.py')))
config = json.loads((ROOT / '.cache/chaos-sprite-review/inputs/cast-config.json').read_text(encoding='utf8'))
namespace = pipeline['redraw'].__globals__
namespace['CONFIG'] = config
namespace['DEST'] = ROOT / 'assets/sprites/chaos-112'
namespace['OUT'] = ROOT / '.cache/chaos-sprite-review/cast-studies'
samples = '--samples' in sys.argv
selected = [arg for arg in sys.argv[1:] if arg in config] or list(config)
for key in selected:
    pipeline['redraw'](key, samples)
