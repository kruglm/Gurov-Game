/* Six unique poses per lecturer. Decode once when entering the department. */
(function(root){
 const bank={portraits:{},faculty:{},loading:false,ready:false,failed:false};
 for(const [id,src] of Object.entries(root.GUROV_ILLUSTRATION_DATA?.portraits||{})){const im=new Image();im.src=src;bank.portraits[id]=im;}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function prepare(im){
  // 320 px per cell is enough for the 126/146 px figures and bounds decoded memory.
  const cw=320,ch=320,c=document.createElement('canvas');c.width=cw*3;c.height=ch*2;
  const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,c.width,c.height);
  const pixels=g.getImageData(0,0,c.width,c.height),d=pixels.data;
  root.gurovDecodeChroma(d,c.width,c.height,false);
  for(let i=0;i<d.length;i+=4)if(d[i]>90&&d[i+2]>90&&d[i+1]<Math.min(d[i],d[i+2])*.55)d[i+3]=0;
  g.putImageData(pixels,0,0);
  const bounds=[];
  for(let pose=0;pose<6;pose++){
   const ox=pose%3*cw,oy=Math.floor(pose/3)*ch;let top=ch,bottom=-1;
   const solid=(x,y)=>d[((oy+y)*c.width+ox+x)*4+3]>100;
   for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(solid(x,y)){top=Math.min(top,y);bottom=Math.max(bottom,y);}
   if(bottom<top)throw Error('Empty faculty animation cell '+pose);
   // Feet, rather than a reaching hand or raised page, define the horizontal anchor.
   let left=cw,right=0;
   for(let y=Math.max(top,Math.floor(bottom-(bottom-top)*.09));y<=bottom;y++)for(let x=0;x<cw;x++)if(solid(x,y)){left=Math.min(left,x);right=Math.max(right,x);}
   bounds.push({ox,oy,top,bottom,anchor:(left+right)/2});
  }
  const height=Math.max(...bounds.map(b=>b.bottom-b.top+1));
  const frames=bounds.map(b=>{
   const f=document.createElement('canvas');f.width=cw;f.height=height;
   f.getContext('2d').drawImage(c,b.ox,b.oy,cw,ch,cw/2-b.anchor,height-1-b.bottom,cw,ch);
   return f;
  });
  return frames;
 }
 bank.loadFaculty=function(retry=false){
  if(bank.loading&&!retry)return;bank.loading=true;bank.failed=false;
  const entries=Object.entries(root.GUROV_ILLUSTRATION_DATA?.faculty||{}).filter(([id])=>root.GurovFacultyData.some(n=>n.id===id));
  const failed=id=>{bank.failed=true;console.error('Faculty illustration failed: '+id);};
  bank.ready=Object.keys(bank.faculty).length===root.GurovFacultyData.length;
  if(entries.length!==root.GurovFacultyData.length){failed('incomplete bank');return;}
  for(const [id,src] of entries){if(bank.faculty[id])continue;const im=new Image();im.onload=()=>{try{bank.faculty[id]=prepare(im);bank.ready=Object.keys(bank.faculty).length===entries.length;}catch(e){failed(id);}};im.onerror=()=>failed(id);im.src=src;}
 };
 bank.draw=function(c,n,t){
  const frames=bank.faculty[n.id];if(!frames)return;
  const motion=root.GurovFacultyMotion.sample(n,t,reduced.matches);
  const height=n.group==='course-team'?146:126,s=height/frames[0].height;
  c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.translate(n.x,568);
  c.scale(n.id==='alekseev'?-1:1,1);
  // A single cel keeps faces/hands crisp; alpha cross-fades produce double eyes.
  const f=frames[motion.blend>=.5?motion.next:motion.pose];
  c.drawImage(f,-f.width*s/2,-height,f.width*s,height);
  c.restore();
 };
 root.GurovIllustrations=bank;
})(window);
