/* Decode generated sprite atlases; original PNG assets stay untouched. */
(function(root){
  class Cast {
    constructor(){
      this.actors={};this.captive=null;this.ready=false;
      for(const name of ['gurov','gurov-tired','gurov-happy','erik','ivan','sasha','roman','ravil','ivan-academic']){
        const image=new Image();image.onload=()=>{this.actors[name]=this.prepare(image,4,name);this.checkReady();};
        image.onerror=()=>console.error('Cannot load character: '+name);
        image.src=root.GUROV_ACTION_DATA?.[name]||(name==='ivan-academic'?'assets/acting/ivan-academic-v2.5.4.png':name==='gurov-tired'||name==='gurov-happy'?`assets/acting/${name}-v2.1.png`:`assets/${name}-actions-v${name==='ivan'||name==='roman'?4:3}.png`);
      }
      const captive=new Image();captive.onload=()=>{this.captive=this.prepare(captive,1,'ravil-captive',2);this.checkReady();};
      captive.onerror=()=>console.error('Cannot load captive Ravil');
      captive.src=root.GUROV_CAPTIVE_DATA||'assets/ravil-captive-v1.7.4.png';
    }
    checkReady(){this.ready=Object.keys(this.actors).length===9&&!!this.captive;}
    prepare(image,rows,name,columns=4){
      const width=rows===4?1280:Math.round(image.width/columns)*columns,height=rows===4?1280:Math.round(image.height/rows)*rows;
      const atlas=document.createElement('canvas');atlas.width=width;atlas.height=height;
      const ctx=atlas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,width,height);
      const pixels=ctx.getImageData(0,0,width,height),d=pixels.data;
      root.gurovDecodeChroma(d,width,height,name.startsWith('gurov'));
      ctx.putImageData(pixels,0,0);
      const cw=width/columns,ch=height/rows,frames=[];
      for(let k=0;k<rows*columns;k++){
        const ox=k%columns*cw,oy=Math.floor(k/columns)*ch;let x0=cw,y0=ch,x1=0,y1=0;
        // Discard small fragments of a neighbouring pose crossing a cell edge.
        const seen=new Uint8Array(cw*ch),alpha=p=>d[((oy+Math.floor(p/cw))*width+ox+p%cw)*4+3];
        for(let start=0;start<seen.length;start++){
          if(seen[start]||alpha(start)<=100)continue;
          const queue=[start];seen[start]=1;let border=false;
          for(let head=0;head<queue.length;head++){
            const p=queue[head],x=p%cw,y=Math.floor(p/cw);if(x<6||x>cw-7)border=true;
            const neighbours=[];if(x>0)neighbours.push(p-1);if(x<cw-1)neighbours.push(p+1);if(y>0)neighbours.push(p-cw);if(y<ch-1)neighbours.push(p+cw);
            for(const n of neighbours)if(!seen[n]&&alpha(n)>100){seen[n]=1;queue.push(n);}
          }
          if(queue.length<cw*ch*.035)for(const p of queue)d[((oy+Math.floor(p/cw))*width+ox+p%cw)*4+3]=0;
        }
        // Upload only this cleaned cell, rather than the whole 16-pose atlas.
        ctx.putImageData(pixels,0,0,ox,oy,cw,ch);
        for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(d[((oy+y)*width+ox+x)*4+3]>100){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
        const frame=document.createElement('canvas');frame.width=x1-x0+1;frame.height=y1-y0+1;
        frame.getContext('2d').drawImage(atlas,ox+x0,oy+y0,frame.width,frame.height,0,0,frame.width,frame.height);
        let anchor=cw*.5-x0;
        if(name==='ivan'||name==='ivan-academic'){
          // Turn around the torso, not the sometimes off-centre atlas cell.
          let left=cw,right=0;
          for(let y=Math.round(y0+(y1-y0)*.53);y<=Math.round(y0+(y1-y0)*.66);y++)for(let x=x0;x<=x1;x++)if(d[((oy+y)*width+ox+x)*4+3]>100){left=Math.min(left,x);right=Math.max(right,x);}
          if(left<=right)anchor=(left+right)/2-x0;
        }
        frames.push({image:frame,anchor});
      }
      return {frames,height:frames[0].image.height,runHeight:Math.max(...frames.slice(0,9).map(f=>f.image.height))};
    }
    drawCaptive(ctx,x,feet,time,speaking){
      if(!this.captive)return;
      const frames=this.captive.frames,frame=frames[speaking&&Math.floor(time*3)%2?1:0];
      // Both seated poses share one scale and a fixed floor contact.
      const scale=Math.min(104/Math.max(...frames.map(f=>f.image.height)),126/Math.max(...frames.map(f=>f.image.width)));
      ctx.save();ctx.translate(Math.round(x),Math.round(feet));ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
      ctx.drawImage(frame.image,-frame.anchor,-frame.image.height);ctx.restore();
    }
    motion(ctx,name,pose,x,feet,height,facing,gait=0,moving=false,alpha=1){
      const stride=1+(Math.floor(gait*8)%8+8)%8;
      // Brief whole-body actions preserve arms and silhouette. Callers resume
      // the distance-based stride immediately after the release accent.
      this.draw(ctx,name,pose===-1?stride:pose,x,feet,height,facing,0,alpha);
    }
    draw(ctx,name,index,x,feet,height,facing=-1,bob=0,alpha=1){
      const actor=this.actors[name];if(!actor)return;
      const f=actor.frames[index];if(!f)return;
      // One reference scale for the complete character, with a cap on run height.
      // Fix one scale across the complete cycle; no per-frame size pumping.
      const base=name.startsWith('gurov-')?this.actors.gurov:actor;
      const reference=base.runHeight;
      const scale=height/reference;
      ctx.save();ctx.translate(x,feet+bob);const native=name==='roman'?[-1,-1,-1,1,-1,-1,-1,1,-1,-1,1,1,-1,-1,-1,1][index]:name==='ravil'?[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1,1,-1,-1,-1,1][index]:1;ctx.scale(facing/native*scale,scale);ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=true;
      ctx.drawImage(f.image,-f.anchor,-f.image.height);ctx.restore();
    }
  }
  root.GurovCast=Cast;
})(window);
