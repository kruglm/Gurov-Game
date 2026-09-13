"""Beat-led v3 trailer. Gameplay v2 is never rewritten by this editor."""
from pathlib import Path
import base64, concurrent.futures, json, os, re, subprocess, sys, wave
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
P=ROOT/'research/video-v3'; OLD=P/'source-v2'; A=P/'audio'; EDIT=P/'edit'
FF=os.environ['GUROV_FFMPEG']; SR=48000
FONT=os.environ.get('GUROV_FONT','/System/Library/Fonts/Supplemental/Arial Bold.ttf')
for folder in [A,EDIT]:folder.mkdir(parents=True,exist_ok=True)
def run(args):subprocess.run([FF,'-y','-v','error',*map(str,args)],check=True)
def shot(name,source,start,d,audio=None,label=None,crop=None,subtitle=None):
    return dict(name=name,source=source,start=start,d=d,audio=audio,label=label,crop=crop,subtitle=subtitle)

# Preserve the approved picture/voice timings. The 160 BPM score now enters
# with the chase; changing music must not speed up the recorded gameplay.
bar=240/132
shots=[shot('opening','source-v2/cards/opening.mp4',0,6.5),shot('tomato','source-v2/capture/prologue.mp4',21.4,3.5)]
block=[
 ('chase','capture/courtyard-clean.mp4',0,2.5,'sfx',None,None,None),
 ('platforms','source-v2/capture/faculty.mp4',10.7,1,None,None,None,None),
 ('roman','capture/roman-forward.mp4',0,2,'sfx',None,None,'РОМАН · Сейчас целиком напишу статью с Claude Code!'),
 ('homing','capture/homing-clean.mp4',0,2,'sfx','САМОНАВОДЯЩАЯСЯ ЧЕЛЮСТЬ',[896,504,100,140],None),
 ('healing','capture/healing.mp4',.35,2,'sfx','СЪЕСТЬ РАБОТЫ ПОДОПЕЧНЫХ · +2 ♥',[896,504,0,144],None),
 ('crouch','capture/crouch.mp4',.35,1.5,'sfx','ПРИГНИСЬ. ПРИЦЕЛЬСЯ. РЫВОК!',[896,504,100,144],None),
 ('tokens','capture/tokens-forward.mp4',0,2.5,'sfx',None,None,'РОМАН · Я потратил триллион токенов. Это только введение.'),
 ('sasha','source-v2/capture/sasha.mp4',1,2,'sfx',None,None,None),
 ('faculty','source-v2/capture/faculty.mp4',4,1,None,None,None,None),
 ('jaw','source-v2/capture/courses.mp4',42.65,1,None,None,None,None),
 ('erik-intro','capture/erik.mp4',.25,1,'sfx',None,None,None),
 ('erik-dodge','capture/erik.mp4',3.6,1,'sfx',None,None,None),
 ('erik-fight','capture/erik.mp4',5.416666666666667,2,'sfx',None,None,None),
 ('captive','capture/erik.mp4',9.05,1,'sfx',None,None,None),
 ('ravil','source-v2/capture/erik.mp4',44.6,1.5,'sfx',None,None,None),
]
for name,source,start,bars,audio,label,crop,subtitle in block:shots.append(shot(name,source,start,bars*bar,audio,label,crop,subtitle))
assert abs(sum(row[3] for row in block)-24)<1e-8
shots += [
 shot('ivan-intro','source-v2/capture/ivan.mp4',2.8,3,'sfx'),
 shot('ivan-fight','source-v2/capture/ivan.mp4',6.1,3,'sfx'),
 shot('academic-intro','source-v2/capture/ivan.mp4',9.6,3,'sfx'),
 shot('summon','capture/academic.mp4',1.3,3,'sfx'),
 shot('walls','capture/academic.mp4',4.8,3,'sfx'),
 shot('dash','capture/crouch.mp4',2.65,1,'sfx'),
 shot('erik-hit','capture/erik.mp4',10.8,1,'sfx'),
 shot('academic-last','capture/academic.mp4',8,1,'sfx'),
 shot('title','source-v2/cards/title.mp4',0,6),
 shot('sting','source-v2/cards/sting.mp4',0,4.5),
]
time=0
for s in shots:
    start=round(time*60);time+=s['d'];end=round(time*60)
    s.update(at=start/60,d=(end-start)/60,frames=end-start,speed=1)
by={s['name']:s for s in shots};DURATION=round(time*60)/60
MUSIC=[
    dict(name='menu',at=0,end=by['chase']['at'],gain=.31),
    dict(name='ivan',at=by['chase']['at'],end=by['title']['at'],gain=.70),
    dict(name='menu',at=by['title']['at'],end=by['sting']['at'],gain=.46),
]

def plan():
    fast=next(section for section in MUSIC if section['name']=='ivan')
    data={'revision':'v3.2','duration':DURATION,'fps':60,'dynamicSeconds':by['title']['at']-10,'dynamicFraction':(by['title']['at']-10)/DURATION,'fastMusicStart':fast['at'],'fastMusicSeconds':fast['end']-fast['at'],'fastMusicBPM':160,'shots':shots,'music':MUSIC,'gameplaySpeed':1,'maxGameplayZoom':1280/896,'midJawVoice':False,'postTitleVoice':True}
    (P/'EDIT.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');return data

def render(s):
    target=EDIT/(s['name']+'.mp4');filters=['setpts=PTS-STARTPTS']
    if s['crop']:filters.append('crop='+':'.join(map(str,s['crop'])))
    filters+=['scale=1920:1080:flags=lanczos','setsar=1']
    for field in ['label','subtitle']:
        if not s[field]:continue
        file=EDIT/(s['name']+'-'+field+'.txt');file.write_text(s[field])
        top=field=='label';y=0 if top else 945;height=108 if top else 135
        filters += [f'drawbox=x=0:y={y}:w=iw:h={height}:color=0x061521@0.93:t=fill',f"drawtext=fontfile='{FONT}':textfile='{file}':fontcolor=0xf5dfaa:fontsize=42:x=48:y={y+33 if top else y+45}"]
    filters += ['fps=60','tpad=stop_mode=clone:stop_duration=0.1',f"trim=end_frame={s['frames']}",'settb=expr=1/60','setpts=N','format=yuv420p']
    if s['name']=='sting':filters += [f"fade=t=out:st={s['d']-.18}:d=0.18"]
    run(['-ss',s['start'],'-i',P/s['source'],'-vf',','.join(filters),'-an','-r',60,'-fps_mode','cfr','-frames:v',s['frames'],'-c:v','libx264','-threads',2,'-preset','fast','-crf',17,target])
    print('RENDER',s['name'],s['at'],s['d'],flush=True);return target

def read(file):return np.frombuffer(subprocess.check_output([FF,'-v','error','-i',str(file),'-ar',str(SR),'-ac','2','-f','f32le','-']),np.float32).reshape(-1,2).copy()
def excerpt(data,start,d):return data[round(start*SR):round((start+d)*SR)]
def score(name):
    text=(ROOT/'game/assets/music'/f'{name}.js').read_text();encoded=re.search(r'provide\("[^"]+","([^"]+)"',text).group(1)
    file=A/(name+'-score.wav');file.write_bytes(base64.b64decode(encoded));return read(file)
def actor(who,prefix):
    bank=ROOT/'game/assets/voices';manifest=json.loads((bank/'manifest.js').read_text().split('=',1)[1].removesuffix(';'))
    key=next(k for k in manifest if k.startswith(who+'|'+prefix));ident=manifest[key]['id'];data=json.loads((bank/(who+'.js')).read_text().split('Object.assign(window.GurovVoiceData,',1)[1][:-2])
    file=A/(who+'-'+ident+'.mp3');file.write_bytes(base64.b64decode(data[ident]));return read(file),key.split('|',1)[1]
def wav(file,data):
    with wave.open(str(file),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(data,-.999,.999)*32767).astype('<i2').tobytes())

def mix():
    n=round(DURATION*SR);music=np.zeros((n,2),np.float32);voice=music.copy();effects=music.copy();ownership=np.zeros(n,np.uint8);speech=[]
    def insert(bus,data,at,gain=1,fade=.02):
        data=data.copy()*gain;length=min(len(data),len(bus)-round(at*SR));data=data[:length];f=min(round(fade*SR),length//2)
        if f:data[:f]*=np.linspace(0,1,f)[:,None];data[-f:]*=np.linspace(1,0,f)[:,None]
        lo=round(at*SR);bus[lo:lo+length]+=data
    for section in MUSIC:
        # Each track owns a disjoint interval, including its reverb tail. A short
        # dip and transition impact bridge the cut; never layer independent BGM.
        at=section['at'];end=section['end'];data=score(section['name']);count=round((end-at-.04)*SR)
        clip=data[np.arange(count)%len(data)]
        insert(music,clip,at,section['gain'],.06 if at else .18)
        lo=round(at*SR);ownership[lo:lo+count]+=1
    assert ownership.max()==1,'BGM sections overlap'
    for s in shots:
        if s['audio']!='sfx':continue
        source=P/s['source'];stem=source.with_name(source.stem+'-sfx.wav')
        insert(effects,excerpt(read(stem),s['start'],s['d']),s['at'],.95,.025)
    def say(data,text,at,gain=1):
        end=at+len(data)/SR
        assert all(end<=x['at'] or at>=x['end'] for x in speech),('Overlapping speech',text)
        insert(voice,data,at,gain,.015);speech.append(dict(at=at,end=end,text=text))
    narr={r['id']:r for r in json.loads((OLD/'audio/narration.json').read_text())}
    for name,at in [('opening',.45),('tomato',6.6),('choice',by['homing']['at']+.1),('finale',by['ivan-intro']['at']+.1),('title',by['title']['at']+1)]:
        say(read(OLD/'audio'/narr[name]['file']),narr[name]['text'],at,1.05)
    for name,prefix in [('roman','Сейчас целиком'),('tokens','Я потратил')]:
        data,text=actor('roman',prefix);say(data,text,by[name]['at']+.05,1.10)
    data,text=actor('sasha','Профессор, заберите');say(excerpt(data,0,2.16),'Профессор, заберите мою курсовую!',by['sasha']['at'],1.08)
    # Match the recorded bubble, which starts around source time 7.5 s.
    data,text=actor('erik','Гурочка, у меня всё согласовано!');say(data,text,by['erik-fight']['at']+7.5-by['erik-fight']['start'],1.03)
    data,text=actor('ravil','Гуров, спасибо за спасение!');say(excerpt(data,0,2.15),'Гуров, спасибо за спасение!',by['ravil']['at']+.12,1.06)
    data,text=actor('ivan','Я ухожу в академический отпуск!');say(data,text,by['academic-intro']['at']+.85,1.04)
    # Keep the mid-film jaw beat silent; the user's requested voiced joke returns
    # only after the title, in its complete approved v2 excerpt.
    j=by['jaw'];assert not any(x['at']<j['at']+j['d'] and x['end']>j['at'] for x in speech)
    data,text=actor('gurov','Никаких потом! Прикладная алгебра');say(excerpt(data,4.76,4.4),'Ой. Кажется, аргумент вылетел раньше доказательства.',by['sting']['at']+.04,1.04)
    rng=np.random.default_rng(281)
    def filtered(x,high,low=0):
        f=np.fft.rfftfreq(len(x),1/SR);g=1/np.sqrt(1+(f/high)**4)
        if low:g*=1/np.sqrt(1+(low/np.maximum(f,1))**4)
        return np.fft.irfft(np.fft.rfft(x)*g,n=len(x))
    def impact(at,gain=.45):
        t=np.arange(round(.75*SR))/SR;x=(np.sin(2*np.pi*(62*t-22*t*t))*np.exp(-t*9)*.3+filtered(rng.normal(size=len(t)),2400,130)*np.exp(-t*45)*.18)*gain
        insert(effects,np.column_stack([x,x]),at,1,.003)
    def whoosh(at,d=.22,gain=.11):
        t=np.arange(round(d*SR))/SR;x=filtered(rng.normal(size=len(t)),4200,600)*np.sin(np.pi*t/d)**1.7*gain;pan=np.linspace(-.8,.8,len(t))
        insert(effects,np.column_stack([x*np.sqrt((1-pan)/2),x*np.sqrt((1+pan)/2)]),at,1,.008)
    def chime(at,note,gain=.08):
        t=np.arange(round(.65*SR))/SR;f=440*2**((note-69)/12);x=np.sin(2*np.pi*f*t+np.sin(2*np.pi*2.01*f*t)*np.exp(-t*9))*np.exp(-t*8)*gain
        insert(effects,np.column_stack([x,x]),at,1,.004)
    for name in ['chase','homing','crouch','erik-intro','ivan-intro','academic-intro','title']:
        at=by[name]['at'];impact(at,.8 if name=='title' else .45);whoosh(at-.22)
    for name in ['platforms','healing','faculty','dash','erik-hit','academic-last']:whoosh(by[name]['at']-.16,.18,.065)
    whoosh(5.4,.9,.13);impact(6.5,.3)
    for at in [1.35,3.3,4.7]:whoosh(at,.18,.03)
    for i,note in enumerate([62,69,74,78]):chime(by['healing']['at']+1.45+i*.08,note,.065)
    for i,note in enumerate([50,62,69,74,78,81]):chime(by['title']['at']+i*.08,note,.08)
    # Quiet prop accent, not a voiced punch line.
    chime(by['jaw']['at']+1.05,83,.022)
    duck=np.ones(n,np.float32)
    for row in speech:
        # Quiet character voices need a little more room than the narrator.
        # Keep at least 4 dB average voice/score separation without boosting peaks.
        a=round(row['at']*SR);b=round(row['end']*SR)
        vrms=float(np.sqrt(np.mean(voice[a:b]**2)));mrms=float(np.sqrt(np.mean(music[a:b]**2)))
        floor=float(np.clip(vrms/max(mrms*10**(4/20),1e-7),.25,.40))
        row['musicDuck']=floor
        lo=max(0,round((row['at']-.07)*SR));hi=min(n,round((row['end']+.16)*SR));env=np.full(hi-lo,floor,np.float32)
        attack=min(round(.07*SR),len(env)//2);release=min(round(.16*SR),len(env)//2)
        env[:attack]=np.linspace(1,floor,attack);env[-release:]=np.linspace(floor,1,release);duck[lo:hi]=np.minimum(duck[lo:hi],env)
    music*=duck[:,None];combined=music+voice+effects;peak=float(np.abs(combined).max());combined*=min(1,.94/max(.001,peak))
    for name,data in [('music',music),('voice',voice),('sfx',effects),('premaster',combined)]:wav(A/f'trailer-{name}.wav',data)
    run(['-i',A/'trailer-premaster.wav','-af','loudnorm=I=-16:TP=-2:LRA=9','-ar',SR,A/'trailer-master.wav'])
    (A/'MIX.json').write_text(json.dumps({'duration':DURATION,'music':MUSIC,'maxSimultaneousMusic':int(ownership.max()),'speech':speech,'midJawVoice':False,'postTitleVoice':True,'premasterPeak':peak,'musicSource':'Original game FM score; no layered tracks','sourceSpeed':1},ensure_ascii=False,indent=2)+'\n')
    print('MIX',DURATION,'seconds; music overlap:',int(ownership.max())-1,flush=True)

def mux():
    files=[EDIT/(s['name']+'.mp4') for s in shots]
    concat=EDIT/'concat.txt';concat.write_text(''.join("file '"+str(f)+"'\n" for f in files))
    output=ROOT/'videos/Gurov-Trailer-v3.mp4';temporary=output.with_name('.Gurov-Trailer-v3.tmp.mp4')
    run(['-f','concat','-safe',0,'-i',concat,'-i',A/'trailer-master.wav','-c:v','copy','-c:a','aac','-b:a','256k','-ar',SR,'-t',DURATION,'-movflags','+faststart','-metadata','title=Гуров — Последний удовл | Трейлер v3',temporary])
    temporary.replace(output)

def export():
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(render,shots))
    mux()

if __name__=='__main__':
    data=plan();action=sys.argv[1] if len(sys.argv)>1 else 'all'
    print('PLAN',round(DURATION,3),'s,',round(data['dynamicFraction']*100,1),'% dynamic',flush=True)
    if action in ['mix','remix','all']:mix()
    if action=='remix':mux()
    if action in ['render','all']:export()
