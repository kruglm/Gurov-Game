"""Check shipped content, checksums and binary architecture without claiming Windows execution."""
from pathlib import Path
import hashlib
import json
import struct
import zipfile
from sys import path as import_path
ROOT = Path(__file__).resolve().parents[1]
import_path.insert(0, str(ROOT))
from tools.release_files import runtime_files

version = json.loads((ROOT / 'project.json').read_text(encoding='utf-8'))['version']
manifest = json.loads((ROOT / 'dist/releases' / ('manifest-' + version + '.json')).read_text(encoding='utf-8'))
(ROOT / 'tests/.output').mkdir(parents=True, exist_ok=True)
records = []
for name, metadata in manifest['files'].items():
    file = ROOT / 'dist/releases' / name
    assert hashlib.sha256(file.read_bytes()).hexdigest() == metadata['sha256']
    with zipfile.ZipFile(file) as z:
        assert z.testzip() is None
        names = z.namelist()
        assert not any('/research/' in n or '-reference.' in n or '__pycache__' in n for n in names)
        index = next(n for n in names if n.endswith('/index.html'))
        prefix = index.removesuffix('index.html')
        for source, relative in runtime_files(ROOT / 'game'):
            assert z.read(prefix + relative.as_posix()) == source.read_bytes(), (name, str(relative))
        if 'Windows' in name:
            exe = z.read(next(n for n in names if n.endswith('/Gurov.exe')))
            assert exe[:2] == b'MZ'
            pe = struct.unpack_from('<I', exe, 0x3c)[0]
            assert exe[pe:pe + 4] == b'PE\0\0'
            assert struct.unpack_from('<H', exe, pe + 4)[0] == 0x8664
            assert any(n.endswith('/resources/app/main.cjs') for n in names)
            assert any(n.endswith('/LICENSES.chromium.html') for n in names)
        records.append({'archive':name,'bytes':file.stat().st_size,'crc':'pass','runtimeMatchesSource':True})
(ROOT / 'tests/.output/releases.json').write_text(json.dumps({'version':version,'archives':records,'windowsExecutionTested':False},indent=2)+'\n')
print('PASS: archive CRCs, SHA-256, exact runtime copies, Windows PE x64 and runtime licenses; no source photos.')
