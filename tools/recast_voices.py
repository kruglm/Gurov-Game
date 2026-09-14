#!/usr/bin/env python3
"""Render selected consented voices locally; validate before replacing runtime banks.

No reference recordings or model weights belong in the repository. Supply a local
staging directory with references.json (actor -> file, text, sha256, consent).
The engine's exact text keys are preserved; spoken overrides only affect audio.
"""
import argparse, base64, hashlib, json, os, pathlib, re, shutil, subprocess, time
ROOT = pathlib.Path(__file__).resolve().parent.parent
VOICE_DIR = ROOT / 'game/assets/voices'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def manifest():
    return json.loads((VOICE_DIR / 'manifest.js').read_text().split('=', 1)[1].rstrip(';\n'))

def spoken_text(actor, text):
    for src, dst in [('NumPy','нампай'), ('DL','ди эл'), ('GNN','джи эн эн'), ('LLM','эл эл эм')]:
        text = text.replace(src, dst)
    text = re.sub(r'\){2,}', '.', text).replace('«', '').replace('»', '')
    if actor == 'gurov':
        text = text.translate(str.maketrans({'с':'ф','ш':'ф','С':'Ф','Ш':'Ф'}))
        text = re.sub(r'\b([Фф])\s+(?=[А-Яа-яЁё])', r'\1', text)
    return text

def inventory(stage, version):
    refs = json.loads((stage / 'references.json').read_text())
    overrides = json.loads((stage/'overrides.json').read_text()) if (stage/'overrides.json').exists() else {}
    rows = []
    for key, entry in manifest().items():
        actor = entry['actor']
        if actor not in refs:
            continue
        ref = refs[actor]
        if not ref.get('consent'):
            raise ValueError('Missing consent record for '+actor)
        path = stage / ref['file']
        if sha(path) != ref['sha256']:
            raise ValueError('Reference changed: '+actor)
        voice = f'Qwen3-TTS-1.7B-Base/{actor}-human-v{version}'
        ident = hashlib.sha256((key+voice+ref['sha256']).encode()).hexdigest()[:16]
        override = overrides.get(key, {})
        text = key.split('|',1)[1]
        rows.append({**entry,'key':key,'text':text,'id':ident,'voice':voice,
                     'origin':'consented-reference','reference':ref['file'],
                     'reference_sha256':ref['sha256'],'reference_text':ref['text'],
                     'spoken':override.get('spoken',spoken_text(actor,text)),
                     'seed':override.get('seed',int(ident[:8],16)),
                     'temperature':override.get('temperature',.7)})
    (stage/'inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
    return rows

def render(args):
    import mlx.core as mx
    import numpy as np
    import soundfile as sf
    from mlx_audio.tts.utils import load_model
    rows = inventory(args.stage,args.version)
    model = load_model(str(args.model))
    dest = args.stage/'generated'; dest.mkdir(exist_ok=True)
    for row in rows:
        if args.actors and row['actor'] not in args.actors: continue
        if args.ids and row['id'] not in args.ids: continue
        out = dest/(row['id']+'.mp3'); meta=out.with_suffix('.json')
        if out.exists() and meta.exists() and not args.force:
            old=json.loads(meta.read_text())
            if old.get('seed')==row['seed'] and old.get('spoken')==row['spoken'] and sha(out)==old['sha256']:
                continue
        mx.random.seed(row['seed']); start=time.time()
        budget=max(150,min(1200,int(len(row['spoken'])*1.3+130)))
        result=list(model.generate(text=row['spoken'],lang_code='Russian',
            ref_audio=str(args.stage/row['reference']),ref_text=row['reference_text'],
            temperature=row['temperature'],max_tokens=budget,verbose=False))
        samples=np.concatenate([np.asarray(r.audio).reshape(-1) for r in result])
        seconds=len(samples)/24000
        if not np.isfinite(samples).all() or not .25<seconds<max(10,len(row['spoken'])/6+6):
            raise ValueError('Invalid generated audio: '+row['id'])
        wav=out.with_suffix('.wav');sf.write(str(wav),samples,24000)
        subprocess.run([str(args.ffmpeg),'-hide_banner','-loglevel','error','-y','-i',str(wav),
            '-af','highpass=f=65,loudnorm=I=-19:TP=-2:LRA=9','-ar','24000','-ac','1',
            '-c:a','libmp3lame','-b:a','96k',str(out)],check=True)
        meta.write_text(json.dumps({**row,'seconds':seconds,'sha256':sha(out),
            'wall_seconds':time.time()-start},ensure_ascii=False,indent=2))
        print('RENDERED',row['actor'],row['emotion'],row['id'],round(seconds,2),row['text'],flush=True)
        mx.clear_cache()

def bundle(args):
    rows=inventory(args.stage,args.version); original=manifest(); updated=dict(original); banks={}
    validated=json.loads((args.stage/'qa-approved.json').read_text())
    # Approval is a local QA record, not a request for additional user consent.
    for row in rows:
        if args.actors and row['actor'] not in args.actors: continue
        path=args.stage/'generated'/(row['id']+'.mp3'); meta=json.loads(path.with_suffix('.json').read_text())
        digest=sha(path)
        if digest!=meta['sha256'] or validated.get(row['id'])!=digest:
            raise ValueError('Clip has not passed current QA: '+row['id'])
        if meta['spoken']!=row['spoken'] or meta['seed']!=row['seed']:
            raise ValueError('Stale render: '+row['id'])
        banks.setdefault(row['actor'],{})[row['id']]=base64.b64encode(path.read_bytes()).decode()
        updated[row['key']]={**original[row['key']],**{k:row[k] for k in ('id','voice','origin')},
                             'duration':meta['seconds'],'synthetic':True}
    for actor,bank in banks.items():
        expected=sum(x['actor']==actor for x in original.values())
        if len(bank)!=expected: raise ValueError('Incomplete actor bank: '+actor)
    backup=args.stage/'runtime-before'
    if not backup.exists(): shutil.copytree(VOICE_DIR,backup)
    for actor,bank in banks.items():
        (VOICE_DIR/(actor+'.js')).write_text('window.GurovVoiceData=window.GurovVoiceData||{};Object.assign(window.GurovVoiceData,'+json.dumps(bank)+');')
    (VOICE_DIR/'manifest.js').write_text('window.GurovVoiceManifest='+json.dumps(updated,ensure_ascii=False)+';')
    print('BUNDLED',sum(map(len,banks.values())),'lines for',', '.join(banks))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase',choices=['inventory','render','bundle'])
    parser.add_argument('--stage',type=pathlib.Path,required=True)
    parser.add_argument('--version',default='2.10')
    parser.add_argument('--model',type=pathlib.Path)
    parser.add_argument('--ffmpeg',type=pathlib.Path,default=os.environ.get('GUROV_FFMPEG','ffmpeg'))
    parser.add_argument('--actors',nargs='*'); parser.add_argument('--ids',nargs='*')
    parser.add_argument('--force',action='store_true')
    args=parser.parse_args(); args.stage=args.stage.resolve()
    if args.phase=='render':
        if not args.model: parser.error('--model is required for rendering')
        render(args)
    elif args.phase=='bundle':bundle(args)
    else:print('INVENTORY',len(inventory(args.stage,args.version)))
