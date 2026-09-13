"""Explicit runtime allowlist, shared by the Mac, Windows and browser builds."""
from pathlib import Path
import re
import shutil

CUES = ('menu', 'field', 'erik', 'erik-tension', 'ivan', 'ivan-tension')

def runtime_files(game):
    game = Path(game).resolve()
    html = (game / 'index.html').read_text(encoding='utf-8')
    names = ['index.html'] + re.findall(r'<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"', html)
    names += ['assets/music/' + cue + '.js' for cue in CUES]
    names += ['assets/voices/'+p.name for p in sorted((game/'assets/voices').glob('*.js'))]
    for name in dict.fromkeys(names):
        source = (game / name).resolve()
        if not source.is_relative_to(game) or not source.is_file():
            raise ValueError('Missing or non-local runtime file: ' + name)
        yield source, Path(name)

def copy_runtime(game, destination):
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    for source, relative in runtime_files(game):
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
