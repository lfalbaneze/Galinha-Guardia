"""Apply the locally verified HUD changes with exact source and output hashes."""
from pathlib import Path
import base64, gzip, hashlib, json
root = Path.cwd()
encoded = ''.join((root / '.hud-payload' / f'part-{i}').read_text().strip() for i in range(1, 4))
encoded = encoded.replace('GhZLwmiUaYpMSEkic5/M', 'GhZLwmiUaYqMSEkicx/M').replace('t2/o+/xDX/URUXTj82', 't2/o+/xDX/URXTj82')
assert hashlib.sha256(encoded.encode()).hexdigest() == 'f83bb8418c77d87cd552e5fbb34ecddaacb42424bac22be81de12a1a5630ae78', 'Payload checksum mismatch'
rows = json.loads(gzip.decompress(base64.b64decode(encoded, validate=True)))
outputs = []
for row in rows:
    rel = Path(row['path'])
    assert not rel.is_absolute() and '..' not in rel.parts and '.git' not in rel.parts
    dest = root / rel
    if row['old'] is None:
        assert not dest.exists(), f'New file already exists: {rel}'
        old = b''
    else:
        old = dest.read_bytes()
        assert hashlib.sha256(old).hexdigest() == row['old'], f'Source changed: {rel}'
    if 'base64' in row:
        new = base64.b64decode(row['base64'], validate=True)
    else:
        text = old.decode('utf-8')
        for start, end, replacement in reversed(row['splices']):
            text = text[:start] + replacement + text[end:]
        new = text.encode('utf-8')
    assert hashlib.sha256(new).hexdigest() == row['new'], f'Output mismatch: {rel}'
    outputs.append((dest, new))
for dest, new in outputs:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(new)
(root / '.hud-files.json').write_text(json.dumps([row['path'] for row in rows]))
print(f'Applied {len(outputs)} verified files.')
