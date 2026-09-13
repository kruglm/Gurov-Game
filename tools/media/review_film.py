"""Decode complete films, produce timed review sheets and measure delivery audio."""
from pathlib import Path
import argparse,json,math,os,subprocess
import av
from PIL import Image,ImageDraw,ImageFont

def main():
    parser=argparse.ArgumentParser();parser.add_argument('video',type=Path);parser.add_argument('--interval',type=float,default=1);parser.add_argument('--prefix');args=parser.parse_args()
    root=Path('research/video-v2/review');root.mkdir(parents=True,exist_ok=True);name=args.prefix or args.video.stem
    with av.open(str(args.video)) as source:
        v=source.streams.video[0];meta={'file':args.video.name,'width':v.width,'height':v.height,'fps':float(v.average_rate),'frames':v.frames,'seconds':float(v.duration*v.time_base),'codec':v.codec_context.name}
        if source.streams.audio:meta['audioRate']=source.streams.audio[0].rate
        count=0
        for frame in source.decode(video=0):
            count+=1
        meta['decodedFrames']=count
    raw=subprocess.check_output([os.environ['GUROV_FFMPEG'],'-v','error','-i',str(args.video),'-vf',f'fps=1/{args.interval},scale=384:216','-pix_fmt','rgb24','-f','rawvideo','-'])
    size=384*216*3
    images=[(i*args.interval,Image.frombytes('RGB',(384,216),raw[i*size:(i+1)*size])) for i in range(len(raw)//size)]
    font=ImageFont.load_default()
    for p in range(math.ceil(len(images)/16)):
        sheet=Image.new('RGB',(1536,960),'#071722');draw=ImageDraw.Draw(sheet)
        for i,(t,im) in enumerate(images[p*16:(p+1)*16]):
            x=i%4*384;y=i//4*240;sheet.paste(im,(x,y));draw.text((x+8,y+220),f'{int(t)//60:02}:{t%60:05.2f}',font=font,fill='#f0dba4')
        sheet.save(root/f'{name}-{p+1:02}.jpg',quality=92)
    log=subprocess.run([os.environ['GUROV_FFMPEG'],'-v','info','-i',str(args.video),'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-f','null','-'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True,check=True).stderr
    (root/(name+'-loudness.log')).write_text(log)
    start=log.rfind('{');end=log.rfind('}')
    if start>=0:meta['loudness']=json.loads(log[start:end+1])
    (root/(name+'-metadata.json')).write_text(json.dumps(meta,indent=2)+'\n');print(json.dumps(meta),flush=True)

if __name__=='__main__':main()
