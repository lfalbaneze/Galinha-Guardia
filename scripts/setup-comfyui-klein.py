"""Install official free reference-editing weights in the project-local ComfyUI."""
import concurrent.futures
import hashlib
from pathlib import Path
import urllib.request

ROOT=Path(__file__).resolve().parents[1]/'.cache/comfyui/ComfyUI/models'
FILES=[
 ('diffusion_models/flux-2-klein-4b-fp8.safetensors',
  'https://huggingface.co/black-forest-labs/FLUX.2-klein-4b-fp8/resolve/main/flux-2-klein-4b-fp8.safetensors',
  '97ed34fe0567e436200f2faee3939b88f2b5d99f8af2a4dc16532c4245c0ccb6'),
 ('text_encoders/qwen_3_4b_fp4_flux2.safetensors',
  'https://huggingface.co/Comfy-Org/Flux-2-Klein-4B/resolve/main/split_files/text_encoders/qwen_3_4b_fp4_flux2.safetensors',
  '3eab03a77adb0ee5304a4e677d5c10ac22f9049c1d7c894adca4f8bb39206ca8'),
 ('vae/flux2-vae.safetensors',
  'https://huggingface.co/Comfy-Org/Flux-2-Klein-4B/resolve/main/split_files/vae/flux2-vae.safetensors',
  '868fe7b343cc8f3a19dbcfcafbc3d5f888802be3f89bd81b65b3621a066ce8f3')]
def sha(path):
    with path.open('rb') as file:return hashlib.file_digest(file,'sha256').hexdigest()
def download(item):
    name,url,digest=item;target=ROOT/name;target.parent.mkdir(parents=True,exist_ok=True)
    assert target.resolve().is_relative_to(ROOT.resolve())
    if target.is_file() and sha(target)==digest:return name+' verified'
    partial=target.with_suffix('.part');done=partial.stat().st_size if partial.exists() else 0
    headers={'Range':f'bytes={done}-'} if done else {}
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=120) as response:
        if response.status!=206:done=0
        with partial.open('ab' if done else 'wb') as output:
            report=done
            while chunk:=response.read(4*1024*1024):
                output.write(chunk);done+=len(chunk)
                if done-report>=512*1024*1024:print(f'{name}: {done/2**30:.1f} GiB',flush=True);report=done
    assert sha(partial)==digest,'Checksum mismatch: '+name
    partial.replace(target);return name+' verified'
if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(download,FILES):print(result,flush=True)
