"""Original 16-bit/FM arcade score, rendered once; no per-frame music synthesis."""
from pathlib import Path
import numpy as np
import wave,json,base64,math
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'game/assets/music';DOC=ROOT/'.build/music';SR=22050
rng=np.random.default_rng(1309)
# Statement, answer, upward sequence, and dominant pickup. Original material.
melody=[[(0,74,.5),(1,69,.5),(1.5,74,.5),(2,77,.75),(3,76,.5),(3.5,74,.4)],[(0,72,1),(1.5,69,.5),(2,67,.5),(2.5,69,.5),(3,73,.9)],[(0,74,.5),(.75,77,.5),(1.5,81,1),(3,79,.5),(3.5,77,.4)],[(0,76,.75),(1,73,.5),(2,69,.75),(3,72,.35),(3.5,73,.4)]]
roots=[38,34,41,45,38,43,34,45,46,41,43,45,38,34,43,45]
chords=[[62,65,69],[62,65,70],[60,65,69],[61,64,69],[62,65,69],[62,67,70],[62,65,70],[61,64,69],[62,65,70],[60,65,69],[62,67,70],[61,64,69],[62,65,69],[62,65,70],[62,67,70],[61,64,69]]
notes={}; metrics={}
def voice(note,duration,kind):
 t=np.arange(max(2,int(duration*SR)))/SR;f=440*2**((note-69)/12);phase=2*np.pi*f*t;env=np.minimum(1,t/.006)*np.minimum(1,(duration-t)/.055)
 if kind=='lead':a=(np.sin(phase+1.7*np.exp(-t*8)*np.sin(phase*2))+.20*np.sin(phase*2+.025*np.sin(t*36)))*np.exp(-t*.85)
 elif kind=='bass':a=(np.sin(phase)+.32*np.sin(phase*2)+.15*np.sin(phase*3))*np.exp(-t*5)
 elif kind=='arp':a=np.sin(phase+2.1*np.exp(-t*16)*np.sin(phase*3))*np.exp(-t*10)
 elif kind=='pad':a=(np.sin(phase)+.28*np.sin(phase*2)+.18*np.sin(phase*1.003))*np.minimum(1,t/.055)*np.exp(-t*.5)
 elif kind=='bell':a=(np.sin(phase)+.35*np.sin(phase*2.76)+.12*np.sin(phase*4.1))*np.exp(-t*8)
 else:a=np.sin(phase)*np.exp(-t*5)
 return (a*env).astype(np.float32)
def drum(kind):
 d={'kick':.23,'snare':.16,'hat':.045,'tom':.2,'crash':.48}[kind];t=np.arange(int(d*SR))/SR;n=rng.uniform(-1,1,len(t));n=np.r_[0,np.diff(n)]*.5
 if kind=='kick':v=np.sin(2*np.pi*(49*t+2.1*(1-np.exp(-t*28))))*np.exp(-t*19)
 elif kind=='snare':v=(.6*n+.4*np.sin(t*2*np.pi*180))*np.exp(-t*25)
 elif kind=='hat':v=n*np.exp(-t*95)*.4
 elif kind=='tom':v=np.sin(2*np.pi*(88*t+2*(1-np.exp(-t*16))))*np.exp(-t*18)
 else:v=n*np.exp(-t*10)*.42
 return (v*np.minimum(1,t/.001)).astype(np.float32)
drums={k:drum(k) for k in ['kick','snare','hat','tom','crash']}
def render(name,bpm,mode,tension=False,sketch=False):
 beat=60/bpm;length=64*beat;count=round(length*SR);mix=np.zeros((count,2),np.float32);events=[]
 def add(at,n,d,kind,vol,pan=0):
  sig=drums[kind] if kind in drums else voice(n,d*beat,kind);start=round(at*beat*SR);ids=(start+np.arange(len(sig)))%count
  gains=np.array([math.sqrt((1-pan)/2),math.sqrt((1+pan)/2)],dtype=np.float32);np.add.at(mix,ids,sig[:,None]*gains*vol)
  events.append({'bar':int(at//4)+1,'beat':at%4,'note':n,'dur':d,'track':kind,'vel':round(vol,3)})
 for bar in range(16):
  root=roots[bar];chord=chords[bar];base=bar*4;quiet=bar in [12,13];battle=mode in ['erik','ivan']
  if tension:
   for step in range(8):add(base+step*.5,chord[(step+bar)%3]+12,.23,'arp',.13,(-1 if step%2 else 1)*.5)
   if bar%4==3:
    for j,n in enumerate([81,79,77,76]):add(base+2+j*.5,n,.4,'lead',.12,.2)
   continue
  for at,n,d in melody[bar%4]:
   shift=12 if bar in [8,9,10,11] and mode!='menu' else 0
   # Ivan compresses the answer rhythm; Erik has longer, weightier phrases.
   if mode=='ivan' and at==0:add(base+.5,n+7,.22,'bell',.12,-.35)
   add(base+at,n+shift,d*(1.12 if mode=='menu' else .85),'lead',.23 if mode!='menu' else .17,-.1)
  bassbeats=[0,1.5,2,3.5] if mode!='ivan' else [0,.75,1.5,2.5,3,3.5]
  for i,at in enumerate(bassbeats):add(base+at,root+(7 if i==len(bassbeats)-1 else 12 if i==2 else 0),.45,'bass',.32,0)
  if sketch:continue
  for j,n in enumerate(chord):add(base+j*.035,n,3.8,'pad',.065 if battle else .08,(j-1)*.55)
  if not quiet:
   for step in range(8 if mode!='menu' else 4):
    at=step*(.5 if mode!='menu' else 1);add(base+at,chord[(step+bar)%3]+12,.32,'arp',.065 if battle else .08,(-1 if step%2 else 1)*.65)
  # Counterline enters in B; held common notes bridge changing harmonies.
  if bar in [4,5,6,8,9,10,14]:
   add(base+.5,chord[1]+12,1.25,'bell',.11,.4);add(base+2.5,chord[0]+12,1.1,'bell',.10,.4)
  if mode!='menu':
   for at in ([0,2.5] if quiet else [0,1.5,2,3.25] if battle else [0,2]):add(base+at,36,.1,'kick',.40)
   for at in [1,3]:add(base+at,38,.1,'snare',.19 if not quiet else .10,-.08)
   for j in range(4 if quiet else 8):add(base+j*(1 if quiet else .5),42,.1,'hat',.14,.4)
   if bar%4==3:
    for j in range(4):add(base+3+j*.25,45,.1,'tom',.16+j*.025,(j-1.5)*.22)
   if bar in [0,8]:add(base,49,.1,'crash',.24,-.2)
  elif bar%2==0:add(base,36,.1,'kick',.12)
 # Short stereo echo; wrap tails into the loop, keeping the exact bar count.
 mix+=np.roll(mix,int(beat*.75*SR),axis=0)[:,::-1]*.14
 mix=np.tanh(mix*1.2);peak=float(np.max(np.abs(mix)));mix*=min(1.5,.86/max(peak,.001))
 if tension:mix*=.65
 pcm=(mix*32767).astype('<i2');file=DOC/(name+'.wav')
 with wave.open(str(file),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
 meta={'bpm':bpm,'meter':'4/4','scale':'D minor / harmonic minor dominant','loopBars':16,'seconds':count/SR,'sampleRate':SR,'source':'Original offline-rendered FM/additive synthesis','peak':float(np.max(np.abs(mix))),'rms':float(np.sqrt(np.mean(mix**2)))}
 notes[name]={'metadata':meta,'tracks':events};metrics[name]=meta
 if not sketch:(OUT/(name+'.js')).write_text('window.GurovMusicBank.provide('+json.dumps(name)+','+json.dumps(base64.b64encode(file.read_bytes()).decode())+','+json.dumps(meta)+');\n')
 return file
OUT.mkdir(parents=True,exist_ok=True);DOC.mkdir(parents=True,exist_ok=True)
# Prove motif + bass and loop return before applying the arrangement.
render('sketch',132,'field',sketch=True)
for name,bpm in [('menu',108),('field',132),('erik',144),('ivan',160)]:
 render(name,bpm,name)
 if name in ['erik','ivan']:render(name+'-tension',bpm,name,tension=True)
(DOC/'score.json').write_text(json.dumps(notes,indent=2)+'\n');(DOC/'render-metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
print(json.dumps(metrics,indent=2))
