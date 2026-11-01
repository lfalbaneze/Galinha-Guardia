"""Start the project-local ComfyUI install without changing the system Python."""
import json
import os
import subprocess
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / '.cache/comfyui'
PYTHON = ROOT / 'venv/Scripts/python.exe'
APP = ROOT / 'ComfyUI'
URL = 'http://127.0.0.1:8188'


def ready():
    try:
        with urllib.request.urlopen(URL + '/system_stats', timeout=1) as response:
            return bool(json.load(response)['system']['comfyui_version'])
    except (OSError, KeyError, ValueError):
        return False


if __name__ == '__main__':
    if not PYTHON.is_file() or not (APP / 'main.py').is_file():
        raise SystemExit('ComfyUI não está instalado em .cache/comfyui.')
    if ready():
        print('ComfyUI já está disponível: ' + URL)
        raise SystemExit(0)
    with (ROOT / 'server.log').open('w') as stdout, (ROOT / 'server-error.log').open('w') as stderr:
        process = subprocess.Popen(
            [str(PYTHON), 'main.py', '--listen', '127.0.0.1', '--port', '8188', '--offline',
             '--disable-all-custom-nodes', '--whitelist-custom-nodes', 'ComfyUI_IPAdapter_plus',
             '--lowvram', '--fp32-vae'], cwd=APP, stdout=stdout, stderr=stderr,
            env={**os.environ, 'HF_HUB_OFFLINE': '1'}, creationflags=subprocess.CREATE_NO_WINDOW)
    (ROOT / 'server.pid').write_text(str(process.pid), encoding='utf8')
    for _ in range(40):
        if process.poll() is not None:
            print((ROOT / 'server-error.log').read_text(encoding='utf8', errors='replace')[-4000:])
            raise SystemExit('O ComfyUI encerrou durante a inicialização.')
        if ready():
            print('ComfyUI disponível: ' + URL)
            break
        time.sleep(1)
    else:
        raise SystemExit('ComfyUI ainda iniciando; confira .cache/comfyui/server-error.log.')
