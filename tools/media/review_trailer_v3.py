"""Audit the v3 edit, unchanged gameplay film and spoken cuts in the encoded MP4."""
from pathlib import Path
from difflib import SequenceMatcher
import argparse, hashlib, json, os, re, subprocess

ROOT = Path(__file__).resolve().parents[2]
P = ROOT / 'research/video-v3'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', help='Optional local faster-whisper small cache')
    args = parser.parse_args()
    edit = json.loads((P / 'EDIT.json').read_text())
    mix = json.loads((P / 'audio/MIX.json').read_text())
    saved = json.loads((P / 'gameplay-preserved.json').read_text())
    digest = hashlib.sha256()
    with (ROOT / saved['file']).open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    assert digest.hexdigest() == saved['sha256'], 'Gameplay v2 changed'
    assert edit['dynamicFraction'] >= .74
    assert edit['maxGameplayZoom'] <= 1.43
    assert all(s['speed'] == 1 for s in edit['shots'])
    assert mix['maxSimultaneousMusic'] == 1
    music = sorted(mix['music'], key=lambda s: s['at'])
    chase = next(s for s in edit['shots'] if s['name']=='chase')
    title = next(s for s in edit['shots'] if s['name']=='title')
    fast = [s for s in music if s['name']=='ivan']
    assert len(fast)==1 and fast[0]['at']==chase['at'] and fast[0]['end']==title['at'], 'Fast theme must cover the whole chase montage'
    assert not any(s['name']=='field' for s in music), 'Slower field theme returned'
    speech = sorted(mix['speech'], key=lambda s: s['at'])
    for rows in [music, speech]:
        assert all(a['end'] <= b['at'] for a, b in zip(rows, rows[1:])), 'Overlapping sources'
    jaw = next(s for s in edit['shots'] if s['name'] == 'jaw')
    assert not any(s['at'] < jaw['at'] + jaw['d'] and s['end'] > jaw['at'] for s in speech)
    sting = edit['shots'][-1]
    assert sting['name'] == 'sting' and speech[-1]['at'] >= sting['at']
    assert speech[-1]['end'] <= edit['duration']
    assert music[-1]['end'] <= sting['at']
    captures = []
    sources = sorted(set(s['source'] for s in edit['shots'] if '/capture/' in '/' + s['source']))
    for source in sources:
        file = P / source
        name = file.stem
        record = json.loads(file.with_name(name + '-record.json').read_text())
        assert not record.get('crossings') and not record['errors'], name
        used = [s for s in edit['shots'] if s['source'] == source]
        states = [s for s in record['states'] if any(
            take['start'] - .2 <= s['at'] <= take['start'] + take['d'] + .2 for take in used)]
        hp = min(s['p']['hp'] for s in states)
        assert hp >= (3 if name == 'healing' else 5), (name, hp)
        assert all(s['mode'] not in ['dead', 'dying'] for s in states), name
        companion_y = max((s['c']['y'] for s in states if s.get('c')), default=0)
        assert companion_y <= 650, (name, 'Companion below ground', companion_y)
        for take in used:
            selected = [s for s in record['states'] if take['start'] <= s['at'] <= take['start'] + take['d']]
            if name in ['roman-forward', 'tokens-forward', 'courtyard-clean']:
                assert selected[-1]['p']['x'] - selected[0]['p']['x'] > 500, name
                assert not any(s.get('intro') for s in selected), name
            if name in ['courtyard-clean', 'homing-clean']:
                assert selected[0]['p']['inv'] == 0, 'Visible spawn blinking'
            for s in selected:
                b = s.get('b')
                if b and b['kind'] == 'ivan' and s['mode'] == 'play':
                    assert b['x'] > s['p']['x'] + 100, (name, 'Boss crosses the player')
        captures.append(dict(name=name, minSelectedHP=hp, runnerCrossings=len(record.get('crossings', [])),
                             companionMaxY=companion_y))
    # A new take must show the actual actor saying the requested line, not just
    # pass an audio-only check against the later replacement voice track.
    bank=json.loads((ROOT/'game/assets/voices/manifest.js').read_text().split('=',1)[1].removesuffix(';'))
    for name, prefix in [('roman-forward', 'Сейчас целиком'), ('tokens-forward', 'Я потратил')]:
        ident=next(value['id'] for key,value in bank.items() if key.startswith('roman|'+prefix))
        record = json.loads((P / 'capture' / (name + '-record.json')).read_text())
        voice = record['states'][0]['voice']
        assert voice['actor'] == 'roman' and voice['id'] == ident, name
    report = dict(duration=edit['duration'], dynamicFraction=edit['dynamicFraction'],
                  fastMusicStart=fast[0]['at'],fastMusicSeconds=fast[0]['end']-fast[0]['at'],
                  gameplaySHA256=digest.hexdigest(), captures=captures, speech=[])
    output = P / 'review/v3-audit.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    if args.cache:
        from faster_whisper import WhisperModel
        model = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=4,
                             download_root=args.cache, local_files_only=True)
        normalize = lambda s: re.sub(r'[^а-яa-z0-9]', '', s.lower().replace('ё', 'е'))
        for i, row in enumerate(speech):
            clip = P / 'review' / f'encoded-speech-{i:02}.wav'
            subprocess.run([os.environ['GUROV_FFMPEG'], '-y', '-v', 'error',
                '-ss', str(max(0, row['at'] - .05)), '-i', str(ROOT / 'videos/Gurov-Trailer-v3.mp4'),
                '-t', str(row['end'] - row['at'] + .1), '-vn', '-ac', '1', '-ar', '16000', str(clip)], check=True)
            segments, _ = model.transcribe(str(clip), language='ru', beam_size=5,
                                            condition_on_previous_text=False)
            transcript = ' '.join(s.text.strip() for s in segments)
            result = dict(**row, transcript=transcript,
                          similarity=SequenceMatcher(None, normalize(row['text']), normalize(transcript)).ratio())
            report['speech'].append(result)
            output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
            print(round(row['at'], 2), transcript, flush=True)
    print('PASS: unchanged gameplay, 1x captures, separated tracks, silent insert and voiced final gag.', flush=True)

if __name__ == '__main__':
    main()
