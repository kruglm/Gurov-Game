"""Package a prepared web folder and verify the itch.io limits and all bytes."""
from pathlib import Path
import hashlib
import json
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def main():
    folder = Path(sys.argv[1]).resolve()
    assert folder.is_relative_to(ROOT / '.build')
    version = json.loads((folder / 'build-info.json').read_text())['version']
    target = ROOT / 'dist/itch' / f'Gurov-{version}-HTML5.zip'
    target.parent.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in folder.rglob('*') if p.is_file())
    assert len(files) <= 1000
    assert sum(p.stat().st_size for p in files) < 500_000_000
    assert max(p.stat().st_size for p in files) < 200_000_000
    assert max(len(str(p.relative_to(folder))) for p in files) < 240
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for p in files:
            z.write(p, str(p.relative_to(folder)))
    with zipfile.ZipFile(target) as z:
        assert z.testzip() is None
        for p in files:
            assert z.read(str(p.relative_to(folder))) == p.read_bytes()
    report = {'version': version, 'files': len(files), 'bytes': target.stat().st_size,
              'unpacked': sum(p.stat().st_size for p in files),
              'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'crc': 'pass',
              'preparedFolderMatchesArchive': True}
    (target.parent / 'package-check.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
