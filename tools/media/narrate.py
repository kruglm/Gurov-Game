"""Render the trailer narrator locally from an original designed voice reference."""
from pathlib import Path
import argparse, hashlib, json, subprocess, time

LINES = [
    ('opening', 'Защита дипломов. Всё шло почти по плану.'),
    ('tomato', 'Пока один помидор не превратил защиту в погоню.'),
    ('chase', 'Поймайте Ивана Павленко. У профессора к нему всего один вопрос.'),
    ('friends', 'Спорьте с коллегами. Находите союзников. И принимайте курсовые.'),
    ('erik', 'Но кое-кто уже всё согласовал.'),
    ('choice', 'Выберите свой метод: самонаводящаяся челюсть... или съесть работы подопечных.'),
    ('finale', 'Четыре главы. Два босса. И прикладная алгебра, от которой не убежать.'),
    ('title', 'Гуров. Последний удовл.'),
]

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--model', type=Path, required=True)
    p.add_argument('--reference', type=Path, required=True)
    p.add_argument('--ffmpeg', required=True)
    p.add_argument('--out', type=Path, default=Path('research/video-v2/audio'))
    args=p.parse_args()
    import mlx.core as mx
    import numpy as np
    import soundfile as sf
    from mlx_audio.tts.utils import load_model
    args.out.mkdir(parents=True, exist_ok=True)
    reference=json.loads(args.reference.with_suffix('.json').read_text())
    model=load_model(str(args.model))
    rows=[]
    for index,(name,text) in enumerate(LINES):
        output=args.out/(name+'.wav')
        if not output.exists():
            mx.random.seed(7520+index)
            start=time.time()
            chunks=list(model.generate(text=text,lang_code='Russian',ref_audio=str(args.reference),ref_text=reference['text'],temperature=.66,max_tokens=500,verbose=False))
            samples=np.concatenate([np.asarray(c.audio) for c in chunks])
            assert np.isfinite(samples).all()
            raw=args.out/(name+'-raw.wav');sf.write(str(raw),samples,24000)
            subprocess.run([args.ffmpeg,'-y','-v','error','-i',str(raw),'-af','highpass=f=65,loudnorm=I=-18:TP=-2:LRA=8','-ar','48000',str(output)],check=True)
            print(name,round(len(samples)/24000,2),'seconds',round(time.time()-start,1),'wall seconds',flush=True)
            mx.clear_cache()
        info=sf.info(str(output))
        rows.append({'id':name,'text':text,'file':output.name,'duration':info.duration,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'voice':'original designed Russian narrator / local Qwen3-TTS 1.7B'})
        (args.out/'narration.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':main()
