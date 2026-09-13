"""Reproducible trailer and chaptered gameplay showcase; every gameplay shot is 1x."""
from pathlib import Path
import concurrent.futures, json, os, shutil, subprocess, sys

ROOT=Path(__file__).resolve().parents[2]
P=ROOT/'research/video-v2';OUT=ROOT/'videos';FF=os.environ['GUROV_FFMPEG']
FONT=os.environ.get('GUROV_FONT','/System/Library/Fonts/Supplemental/Arial Bold.ttf')
OUT.mkdir(exist_ok=True);(P/'edit').mkdir(exist_ok=True)
shutil.copyfile(Path(__file__).with_name('player.html'),OUT/'index.html')
def run(args):subprocess.run([FF,'-y','-v','error',*map(str,args)],check=True)
def shot(name,source,start,duration,audio='sfx',label=None):return dict(name=name,source=source,start=start,d=duration,audio=audio,label=label,speed=1)

SHOTS=[
 shot('01-opening','cards/opening.mp4',0,6.5,None),
 shot('02-tomato','capture/prologue.mp4',21.4,6.5,'fx'),
 shot('03-chase','capture/courtyard.mp4',0,7),
 shot('04-platforms','capture/courtyard.mp4',7,4.15),
 shot('05-methods','cards/methods.mp4',0,3,None),
 shot('06-homing','capture/homing.mp4',0,4.5,'sfx','САМОНАВОДЯЩАЯСЯ ЧЕЛЮСТЬ'),
 shot('07-healing','capture/healing.mp4',.4,5.6,'sfx','СЪЕСТЬ РАБОТЫ ПОДОПЕЧНЫХ · +2 ♥'),
 shot('08-faculty','capture/faculty.mp4',0,3,None),
 shot('09-sasha','capture/sasha.mp4',1,4,'sfx'),
 shot('10-course-jaw','capture/courses.mp4',42.45,593/60,'fx'),
 shot('13-captive','capture/erik.mp4',8,2.3,'sfx'),
 shot('11-erik-intro','capture/erik.mp4',1.4,3.2,'sfx'),
 shot('12-erik-fight','capture/erik.mp4',5,5.6,'sfx'),
 shot('14-ravil','capture/erik.mp4',44.6,3,'sfx'),
 shot('15-ivan-intro','capture/ivan.mp4',2.8,3.2,'sfx'),
 shot('16-ivan-fight','capture/ivan.mp4',6,3.6,'sfx'),
 shot('17-academic','capture/ivan.mp4',9.6,3.8,'fx'),
 shot('18-ivan-fire','capture/ivan.mp4',13.4,6.4,'sfx'),
 shot('19-title','cards/title.mp4',0,6,None),
 shot('20-sting','cards/sting.mp4',0,4.5,None),
]
next(s for s in SHOTS if s['name']=='13-captive')['crop']=[720,405,560,230]
at=0
for s in SHOTS:s['at']=round(at,6);at+=s['d']
(P/'EDIT.json').write_text(json.dumps(SHOTS,ensure_ascii=False,indent=2)+'\n')

def render(s,gameplay=False):
    target=P/'edit'/((('game-' if gameplay else '')+s['name'])+'.mp4')
    filters=['setpts=PTS-STARTPTS']
    if s.get('crop'):filters.append('crop='+':'.join(map(str,s['crop'])))
    filters+=['scale=1920:1080:flags=lanczos','setsar=1']
    if s.get('label'):
        caption=P/'edit'/(s['name']+'.txt');caption.write_text(s['label'])
        # Titles appear in the quiet top margin, never across the projectile path.
        enabled=":enable='lt(t,3)'" if gameplay else ''
        filters+=['drawbox=x=0:y=0:w=iw:h=130:color=0x061521@0.9:t=fill'+enabled,f"drawtext=fontfile='{FONT}':textfile='{caption}':fontcolor=0xf5dfaa:fontsize=35:x=54:y=42"+enabled]
    if gameplay:filters+=['fade=t=in:d=0.12',f"fade=t=out:st={s['d']-.12}:d=0.12"]
    elif s['name'] in ['03-chase','11-erik-intro']:filters+=['fade=t=in:d=0.06:color=0xffe7be']
    count=round(s['d']*60)
    filters+=['fps=60','tpad=stop_mode=clone:stop_duration=0.1',f'trim=end_frame={count}','settb=expr=1/60','setpts=N','format=yuv420p']
    audio=['-c:a','aac','-b:a','256k','-ar','48000','-af',f"atrim=duration={s['d']},asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st={s['d']-.05}:d=0.05"] if gameplay else ['-an']
    run(['-ss',s['start'],'-i',P/s['source'],'-vf',','.join(filters),'-r','60','-fps_mode','cfr','-frames:v',count,'-c:v','libx264','-threads','2','-preset','fast','-crf','18',*audio,target])
    print('EDIT',s['name'],s['d'],flush=True);return target

def trailer():
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:files=list(pool.map(render,SHOTS))
    concat=P/'edit/trailer-concat.txt';concat.write_text(''.join("file '"+str(f)+"'\n" for f in files))
    run(['-f','concat','-safe','0','-i',concat,'-i',P/'audio/trailer-master.wav','-c:v','copy','-c:a','aac','-b:a','256k','-ar','48000','-t',at,'-movflags','+faststart','-metadata','title=Гуров — Последний удовл | Трейлер',OUT/'Gurov-Trailer-v2.mp4'])

def gameplay():
    sequence=[('prologue','Защита дипломов',0,45.6),('courtyard','Летний двор · движение и бой',0,None),('choice','Выбор одного улучшения',0,None),('homing','Вариант 1 · самонаведение',0,None),('healing','Вариант 2 · работы подопечных',0,None),('sasha','Курсовая Ситникова',0,None),('erik','Ночной скалодром · Эрик и Равиль',0,None),('faculty','Вечер на кафедре ММП',0,None),('tea','Чай после семинара',0,None),('courses','Прак, DL и байесы',0,None),('ivan','Бесконечная крыша · две фазы и поимка',0,41)]
    shots=[];cursor=0;chapters=[]
    for name,title,start,duration in sequence:
        record=json.loads((P/'capture'/(name+'-record.json')).read_text());duration=duration or record['seconds']
        shots.append(shot(name,'capture/'+name+'.mp4',start,duration,'original',title if name in ['courtyard','homing','healing','faculty'] else None))
        chapters.append({'at':cursor,'title':title});cursor+=duration
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:files=list(pool.map(lambda s:render(s,True),shots))
    concat=P/'edit/gameplay-concat.txt';concat.write_text(''.join("file '"+str(f)+"'\n" for f in files))
    meta=';FFMETADATA1\ntitle=Гуров — Последний удовл | Игровые эпизоды без ускорения\n'
    for i,c in enumerate(chapters):meta+=f"[CHAPTER]\nTIMEBASE=1/1000\nSTART={round(c['at']*1000)}\nEND={round((chapters[i+1]['at'] if i+1<len(chapters) else cursor)*1000)}\ntitle={c['title']}\n"
    metadata=P/'edit/gameplay-chapters.txt';metadata.write_text(meta)
    run(['-f','concat','-safe','0','-i',concat,'-i',metadata,'-map_metadata','1','-map_chapters','1','-c:v','copy','-c:a','aac','-b:a','256k','-af','loudnorm=I=-18:TP=-1.5:LRA=10','-ar','48000','-movflags','+faststart',OUT/'Gurov-Gameplay-v2.mp4'])
    (OUT/'Таймкоды.txt').write_text('\n'.join(f"{int(c['at'])//60:02}:{int(c['at'])%60:02} {c['title']}" for c in chapters)+'\n')
    (P/'GAMEPLAY.json').write_text(json.dumps({'duration':cursor,'chapters':chapters,'shots':shots,'speed':1,'format':'selected episodes, not a continuous speedrun'},ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='gameplay':gameplay()
    elif len(sys.argv)>1 and sys.argv[1]=='plan':print('Trailer duration',at)
    else:trailer()
