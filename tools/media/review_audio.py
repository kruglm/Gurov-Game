"""Check rendered Russian narration text and levels; ASR is not an acting score."""
from pathlib import Path
from difflib import SequenceMatcher
import argparse, json, re

def main():
    p=argparse.ArgumentParser();p.add_argument('--cache',required=True);p.add_argument('--out',type=Path,default=Path('research/video-v2/audio'));args=p.parse_args()
    import av
    import numpy as np
    from faster_whisper import WhisperModel
    model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=4,download_root=args.cache,local_files_only=True)
    norm=lambda s:re.sub(r'[^а-я0-9]','',s.lower().replace('ё','е'))
    results=[]
    for row in json.loads((args.out/'narration.json').read_text()):
        file=args.out/row['file'];segments,_=model.transcribe(str(file),language='ru',beam_size=5,condition_on_previous_text=False)
        text=' '.join(s.text.strip() for s in segments)
        with av.open(str(file)) as source:samples=np.concatenate([frame.to_ndarray().reshape(-1) for frame in source.decode(audio=0)]).astype(np.float32)/32768
        result={**row,'transcript':text,'similarity':SequenceMatcher(None,norm(row['text']),norm(text)).ratio(),'peak':float(np.abs(samples).max()),'rms':float(np.sqrt(np.mean(samples**2)))}
        results.append(result);print(row['id'],round(result['similarity'],3),text,flush=True)
        (args.out/'review.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':main()
