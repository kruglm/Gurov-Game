"""Embed the explicit current art inventory for offline file:// playback."""
from pathlib import Path
import base64
import json

ROOT = Path(__file__).resolve().parents[1]

def prepare_assets(root=ROOT):
    game = root / 'game'
    manifest = json.loads((game / 'assets/art-manifest.json').read_text(encoding='utf-8'))

    def encode(value):
        if isinstance(value, dict):
            return {key: encode(item) for key, item in value.items()}
        source = (game / value).resolve()
        if not source.is_relative_to(game.resolve()) or source.suffix != '.png':
            raise ValueError('Invalid art source: ' + value)
        return 'data:image/png;base64,' + base64.b64encode(source.read_bytes()).decode('ascii')

    for relative, variables in manifest.items():
        output = (game / relative).resolve()
        if not output.is_relative_to((game / 'assets').resolve()) or not output.name.endswith('-data.js'):
            raise ValueError('Invalid generated destination: ' + relative)
        content = ''.join('window.' + key + '=' + json.dumps(encode(value)) + ';\n'
                          for key, value in variables.items())
        output.write_text(content, encoding='utf-8')
    return list(manifest)

if __name__ == '__main__':
    print('Prepared', len(prepare_assets()), 'offline art banks')
