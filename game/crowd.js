/* Auditorium seat anchors and articulated crowd animation. */
(function(root){
 'use strict';
 const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const ROWS=[
  {x:[67,185,305,422,538,655,776,887,994],back:[431,439,444,448,449,449,446,441,435],width:94,height:133,depth:48,aisle:1080},
  {x:[77,226,374,518,668,814,961],back:[499,505,513,518,519,515,505],width:130,height:166,depth:66,aisle:1138},
  {x:[97,281,474,664,854,1041],back:[601,615,622,624,620,613],width:160,height:202,depth:88,aisle:1188}
 ];
 const IVAN={x:887,back:441,feet:489,height:144};
 function random(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let n=Math.imul(seed^seed>>>15,1|seed);n^=n+Math.imul(n^n>>>7,61|n);return ((n^n>>>14)>>>0)/4294967296;};}
 function audience(seed){
  const rand=random(seed),places=[];
  ROWS.forEach((r,row)=>r.x.forEach((x,col)=>{if(row===0&&x===IVAN.x)return;places.push({row,col,x,back:r.back[col],feet:r.back[col]+r.depth,h:r.height,aisle:r.aisle});}));
  const bag=places.map((_,i)=>i%4);
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  return places.map((s,i)=>({...s,id:bag[i],phase:rand()*Math.PI*2,speed:185+rand()*54,delay:.2+s.row*.25+(8-s.col)*.025+rand()*.9,exitTime:1.6+s.row*.25,lean:rand()*.026-.013}));
 }
 function runner(s,escape){
  const age=escape-s.delay;if(age<=0)return null;
  const walk=Math.max(0,age-.36),toAisle=(s.aisle-s.x)/s.speed,aisle=walk>=toAisle,u=clamp((walk-toAisle)/s.exitTime);
  const distance=Math.min(walk,toAisle)*s.speed+Math.hypot(1187-s.aisle,336-s.feet)*u;
  return {s,age,aisle,u,x:aisle?s.aisle+(1187-s.aisle)*u:s.x+walk*s.speed,y:s.feet+(336-s.feet)*u,h:s.h+(101-s.h)*u,distance,done:u>=1,alpha:1-smooth((u-.94)/.06)};
 }
 // The painted cycle uses one fixed scale. Limb extension must not make the
 // whole student grow or slide sideways when the pose changes.
 const tiles=[];const COUNT=8,names=['mustard','teal','burgundy','ivory'];
 function prepareSheet(im,id){
  const w=Math.floor(im.width/4),h=Math.floor(im.height/2),frames=[];
  for(let i=0;i<COUNT;i++){
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(im,(i%4)*w,Math.floor(i/4)*h,w,h,0,0,w,h);
   const p=c.getImageData(0,0,w,h),d=p.data;let top=h,bottom=0,left=w,right=0;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const k=(y*w+x)*4;if(d[k]>160&&d[k+2]>140&&d[k+1]<Math.min(d[k],d[k+2])*.55)d[k+3]=0;
    if(d[k+3]>100){top=Math.min(top,y);bottom=Math.max(bottom,y);if(y>h*.42&&y<h*.55){left=Math.min(left,x);right=Math.max(right,x);}}
   }
   c.putImageData(p,0,0);frames.push({canvas,top,bottom,anchor:(left+right)/2});
  }
  const median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)];
  const height=median(frames.map(f=>f.bottom-f.top)),floor=median([0,1,4,5].map(i=>frames[i].bottom));
  // Cache small copies for the many background extras; no filters/readbacks
  // run inside the animation loop.
  const scale=190/height;
  for(const f of frames){const small=document.createElement('canvas');small.width=Math.ceil(w*scale);small.height=Math.ceil(h*scale);small.getContext('2d').drawImage(f.canvas,0,0,small.width,small.height);f.canvas=small;f.anchor*=scale;}
  tiles[id]={frames,height:190,floor:floor*scale};
 }
 function run(c,id,x,feet,height,phase,facing=1,lean=0){
  const atlas=tiles[id];if(!atlas)return;const position=(((phase/(Math.PI*2))%1)+1)%1*COUNT,frame=atlas.frames[Math.floor(position)];
  c.save();c.translate(x,feet);c.scale(facing,1);c.rotate(lean);const s=height/atlas.height;
  c.drawImage(frame.canvas,-frame.anchor*s,-atlas.floor*s,frame.canvas.width*s,frame.canvas.height*s);c.restore();
 }
 const api={ROWS,IVAN,audience,runner,prepareSheet,run,names,frameCount:COUNT,count:21};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GurovCrowd=api;
})(typeof window==='undefined'?globalThis:window);
