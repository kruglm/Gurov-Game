#!/usr/bin/env python3
"""Check tracked and not-ignored source files before publication. Does not stage or upload."""
from pathlib import Path
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]

def main():
    result = subprocess.run(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'],
                            cwd=ROOT, stdout=subprocess.PIPE, check=True)
    names = sorted(set(result.stdout.decode('utf-8').strip('\0').split('\0')) - {''})
    errors = []
    total = 0
    largest = (0, '')
    private_roots = {'.build', 'dist', 'releases', 'research', 'videos', 'node_modules', '.venv', 'private'}
    local_paths = re.compile('/' + r'(?:Users|Applications|var/folders)/')
    credentials = re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|sk-proj-[A-Za-z0-9_-]{40,}')
    text_types = {'.py', '.js', '.cjs', '.json', '.swift', '.md', '.html', '.css', '.yml', '.yaml', '.command', '.txt'}
    for name in names:
        path = ROOT / name
        if not path.is_file() or path.is_symlink():
            errors.append(name + ': missing file or symlink'); continue
        size = path.stat().st_size; total += size; largest = max(largest, (size, name))
        if size >= 50 * 1024**2:
            errors.append(name + ': at least 50 MiB; keep large outputs outside Git')
        if Path(name).parts[0] in private_roots or path.suffix in {'.mp4', '.ogg', '.wav', '.safetensors', '.key', '.pem'} or path.name.startswith('.env'):
            errors.append(name + ': local output or private source material')
        if path.suffix in text_types:
            text = path.read_text(encoding='utf-8')
            if local_paths.search(text): errors.append(name + ': machine-specific absolute path')
            if credentials.search(text): errors.append(name + ': possible credential; inspect locally')
    project = json.loads((ROOT / 'project.json').read_text(encoding='utf-8'))
    for name in ['package.json', 'package-lock.json', 'desktop/package.json']:
        if json.loads((ROOT / name).read_text(encoding='utf-8'))['version'] != project['version']:
            errors.append(name + ': version differs from project.json')
    art = json.loads((ROOT / 'game/assets/art-manifest.json').read_text(encoding='utf-8'))
    sources = set()
    def collect(value):
        if isinstance(value, dict):
            for item in value.values(): collect(item)
        else: sources.add('game/' + value)
    for generated, value in art.items():
        if 'game/' + generated in names: errors.append(generated + ': generated image bank belongs outside Git')
        collect(value)
    for name in sources - set(names): errors.append(name + ': required art missing from Git source inventory')
    for name in set(names) - sources:
        if name.startswith('game/assets/') and name.endswith('.png'): errors.append(name + ': unused PNG')
    print(f'Source inventory: {len(names)} files, {total / 1024**2:.1f} MiB; {len(sources)} current PNGs')
    print(f'Largest file: {largest[1]} ({largest[0] / 1024**2:.1f} MiB)')
    for error in errors: print('ERROR:', error)
    if errors: return 1
    print('PASS: source inventory, sizes, art, versions and basic private-material checks')
    return 0

if __name__ == '__main__':
    sys.exit(main())
