"""Check the encoded delivery, including timestamps, black frames and MP4 faststart."""
from pathlib import Path
import argparse, json, struct
import av
import numpy as np

def main():
    p=argparse.ArgumentParser()
    p.add_argument('video',type=Path)
    p.add_argument('--out',type=Path,required=True)
    args=p.parse_args()
    atoms=[]
    with args.video.open('rb') as f:
        size=args.video.stat().st_size
        while f.tell()+8<=size:
            start=f.tell();length,kind=struct.unpack('>I4s',f.read(8))
            if length==1:length=struct.unpack('>Q',f.read(8))[0]
            if length==0:length=size-start
            assert length>=8 and start+length<=size,'Invalid MP4 box'
            atoms.append(kind.decode('ascii'));f.seek(start+length)
    assert atoms.index('moov')<atoms.index('mdat'),'Video cannot start before full download'
    with av.open(str(args.video)) as source:
        stream=source.streams.video[0];fps=float(stream.average_rate)
        duration=float(stream.duration*stream.time_base)
        count=0;max_error=0;black=[];duplicates=0;longest_duplicate=0;previous=None
        for frame in source.decode(video=0):
            at=float(frame.pts*frame.time_base)
            max_error=max(max_error,abs(at-count/fps))
            thumbnail=frame.reformat(width=96,height=54,format='gray').to_ndarray()
            if float(thumbnail.mean())<5:black.append(at)
            same=previous is not None and np.array_equal(previous,thumbnail)
            duplicates=duplicates+1 if same else 0
            longest_duplicate=max(longest_duplicate,duplicates)
            previous=thumbnail;count+=1
        assert count==stream.frames
        assert max_error<1/fps/10,'Irregular frame timestamps'
        assert all(t>=duration-.2 for t in black),'Unexpected black frame before final fade'
    with av.open(str(args.video)) as source:
        audio=source.streams.audio[0]
        peak=0;sum_squares=0;values=0;start=None;end=0
        for frame in source.decode(audio=0):
            data=frame.to_ndarray().astype(np.float64)
            if frame.format.name.startswith('s16'):data/=32768
            if frame.format.name.startswith('s32'):data/=2147483648
            peak=max(peak,float(np.abs(data).max()));sum_squares+=float((data*data).sum());values+=data.size
            at=float(frame.pts*frame.time_base)
            if start is None:start=at
            end=at+frame.samples/frame.sample_rate
        assert start is not None and abs(start)<.025
        assert abs(end-duration)<.04,'Audio/video length mismatch'
        assert peak<1,'Decoded audio clips'
    report=dict(file=args.video.name,frames=count,fps=fps,duration=duration,maxTimestampError=max_error,
                blackFrames=black,maxIdenticalThumbnailRun=longest_duplicate/fps,
                faststart=True,mp4Atoms=atoms,audioStart=start,audioEnd=end,
                decodedAudioPeak=peak,decodedAudioRMS=(sum_squares/values)**.5)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)

if __name__=='__main__':main()
