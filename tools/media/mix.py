"""Narrator, character excerpts, recorded gameplay Foley and original trailer SFX."""
from pathlib import Path
import base64, json, os, re, subprocess, wave
import numpy as np

ROOT=Path(__file__).resolve().parents[2];P=ROOT/'research/video-v2';A=P/'audio';FF=os.environ['GUROV_FFMPEG'];SR=48000
shots=json.loads((P/'EDIT.json').read_text());by={s['name']:s for s in shots};duration=sum(s['d'] for s in shots);N=round(duration*SR)
music=np.zeros((N,2),np.float32);voice=music.copy();effects=music.copy();speech=[]
def read(file):return np.frombuffer(subprocess.check_output([FF,'-v','error','-i',str(file),'-ar',str(SR),'-ac','2','-f','f32le','-']),np.float32).reshape(-1,2).copy()
def insert(bus,data,at,gain=1,fade=.02):
    data=data.copy()*gain;n=min(round(fade*SR),len(data)//2)
    if n:data[:n]*=np.linspace(0,1,n)[:,None];data[-n:]*=np.linspace(1,0,n)[:,None]
    lo=round(at*SR);length=min(len(data),len(bus)-lo)
    if length>0:bus[lo:lo+length]+=data[:length]
def excerpt(data,start,seconds):return data[round(start*SR):round((start+seconds)*SR)]
def loop(data,start,seconds):return data[(np.arange(round(seconds*SR))+round(start*SR))%len(data)]
def score(name):
    s=(ROOT/'game/assets/music'/f'{name}.js').read_text();encoded=re.search(r'provide\("[^"]+","([^"]+)"',s).group(1)
    file=A/(name+'-score.wav');file.write_bytes(base64.b64decode(encoded));return read(file)
def actor(actor,prefix):
    bank=ROOT/'game/assets/voices';m=json.loads((bank/'manifest.js').read_text().split('=',1)[1].removesuffix(';'))
    key=next(k for k in m if k.startswith(actor+'|'+prefix));ident=m[key]['id'];d=json.loads((bank/(actor+'.js')).read_text().split('Object.assign(window.GurovVoiceData,',1)[1][:-2])
    file=A/(actor+'-select.mp3');file.write_bytes(base64.b64decode(d[ident]));return read(file)

menu,field,erik,ivan=[score(n) for n in ['menu','field','erik','ivan']]
sections=[(0,6.5,menu,0,.32),(6.5,6.5,menu,8,.17),(13,24.25,field,0,.57),(37.25,7,menu,12,.37),(44.25,9.88,menu,17,.10),(by['11-erik-intro']['at'],14.1,erik,0,.59),(by['15-ivan-intro']['at'],17,ivan,0,.64),(by['19-title']['at'],6,menu,0,.48)]
for at,seconds,data,start,gain in sections:insert(music,loop(data,start,seconds),at,gain,.16)
# Dialogue and Foley remain in sync with the exact source frames.
for shot in shots:
    if not shot['audio']:continue
    file=P/shot['source'];stem=file.with_name(file.stem+'-'+shot['audio']+'.wav')
    data=excerpt(read(stem),shot['start'],shot['d'])
    insert(effects if shot['audio']=='sfx' else voice,data,shot['at'],1.1 if shot['audio']=='sfx' else 1)
    if shot['audio']=='fx':speech.append((shot['at'],shot['at']+shot['d']))

narration=json.loads((A/'narration.json').read_text())
cue_times={
 'opening':.55,'tomato':by['03-chase']['at']+.2,'chase':by['03-chase']['at']+5.4,
 'choice':by['05-methods']['at']+.3,'friends':by['08-faculty']['at']+.2,
 'erik':by['11-erik-intro']['at']+.15,'finale':by['15-ivan-intro']['at']+.15,'title':by['19-title']['at']+1
}
for row in narration:
    at=cue_times[row['id']];data=read(A/row['file']);insert(voice,data,at,1.12);speech.append((at,at+len(data)/SR))
e=actor('erik','Гурочка, у меня всё согласовано!');at=by['12-erik-fight']['at']+.3;insert(voice,e,at,.97);speech.append((at,at+len(e)/SR))
r=excerpt(actor('ravil','Гуров, спасибо за спасение!'),0,2.15);at=by['14-ravil']['at']+.1;insert(voice,r,at,1.1);speech.append((at,at+2.15))
# Keep the post-title gag short and complete: only the surprised final sentence.
g=excerpt(actor('gurov','Никаких потом! Прикладная алгебра'),4.76,4.4);at=by['20-sting']['at']+.04;insert(voice,g,at,1.04);speech.append((at,at+4.4))

# Distinct dry transients, low impact bodies, stereo motion and short tails.
rng=np.random.default_rng(275)
def filtered(noise,high,low=0):
    f=np.fft.rfftfreq(len(noise),1/SR);response=1/np.sqrt(1+(f/high)**4)
    if low:response*=1/np.sqrt(1+(low/np.maximum(f,1))**4)
    return np.fft.irfft(np.fft.rfft(noise)*response,n=len(noise))
def impact(at,gain=.5):
    t=np.arange(round(.9*SR))/SR
    body=np.sin(2*np.pi*(62*t-22*t*t))*np.exp(-t*8)
    crack=filtered(rng.normal(size=len(t)),2400,130)*np.exp(-t*40)
    tail=np.sin(2*np.pi*113*t)*np.exp(-t*13)
    x=(body*.30+crack*.20+tail*.07)*gain;insert(effects,np.column_stack([x,x]),at,1,.002)
def whoosh(at,seconds=.32,gain=.13):
    t=np.arange(round(seconds*SR))/SR;x=filtered(rng.normal(size=len(t)),4000,500)*np.sin(np.pi*t/seconds)**1.7*gain
    pan=np.linspace(-.85,.85,len(t));insert(effects,np.column_stack([x*np.sqrt((1-pan)/2),x*np.sqrt((1+pan)/2)]),at,1,.008)
def chime(at,note,gain=.1,seconds=.6):
    t=np.arange(round(seconds*SR))/SR;f=440*2**((note-69)/12)
    x=(np.sin(2*np.pi*f*t+np.sin(2*np.pi*2.01*f*t)*np.exp(-t*9)*1.4)+.18*np.sin(2*np.pi*f*3*t))*np.exp(-t*7)*gain
    insert(effects,np.column_stack([x,x]),at,1,.004)
for name in ['03-chase','05-methods','11-erik-intro','15-ivan-intro','17-academic','19-title']:
    at=by[name]['at'];impact(at,.5 if name!='19-title' else 1);whoosh(max(0,at-.28),.3,.10)
whoosh(5.4,.9,.16);impact(6.46,.38)
# Paper rustles in the newly illustrated opening: short, spaced, no noise bed.
for at in [1.35,3.3,4.7]:whoosh(at,.18,.035)
for i,note in enumerate([62,69,74,78]):chime(by['07-healing']['at']+2.0+i*.08,note,.08)
for i,note in enumerate([50,62,69,74,78,81]):chime(by['19-title']['at']+i*.08,note,.10,.9)
chime(by['20-sting']['at']+.8,82,.04,.12);chime(duration-.32,88,.06,.14)

duck=np.ones(N,np.float32)
for a,b in speech:
    lo=max(0,round((a-.09)*SR));hi=min(N,round((b+.2)*SR));n=hi-lo
    env=np.full(n,.31,np.float32);attack=min(round(.09*SR),n//2);release=min(round(.2*SR),n//2)
    env[:attack]=np.linspace(1,.31,attack);env[-release:]=np.linspace(.31,1,release);duck[lo:hi]=np.minimum(duck[lo:hi],env)
music*=duck[:,None]
mix=music+voice+effects
peak=float(np.abs(mix).max());mix*=min(1,.94/max(peak,.001))
def wav(name,data):
    with wave.open(str(A/name),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.clip(data,-.99,.99)*32767).astype('<i2').tobytes())
wav('trailer-premaster.wav',mix)
subprocess.run([FF,'-y','-v','error','-i',str(A/'trailer-premaster.wav'),'-af','loudnorm=I=-16:TP=-2:LRA=9','-ar',str(SR),str(A/'trailer-master.wav')],check=True)
(A/'MIX.json').write_text(json.dumps({'seconds':duration,'narrationCues':cue_times,'speechWindows':speech,'premasterPeak':peak,'music':'original game FM score, edited in phrases','effects':'replayed real SFX plus original trailer Foley','sourceSpeed':1},indent=2)+'\n')
print('MIXED',duration,'seconds; pre-normalization peak',peak)
