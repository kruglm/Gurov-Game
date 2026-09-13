/* Painted performance atlases: decode and key once, never rescale a run cycle. */
(function(root){
 const bank={ready:false,sprites:{},portraits:{}};
 const specs={ivan:[3,2],erik:[3,1],moods:[2,2],team:[3,1],lecture:[2,2],ravil:[2,1],oganovHurt:[1,1],death:[3,2],academic:[1,1],classroom:[3,2],lectureFinal:[4,2],chalkHand:[1,1]};let loaded=0;
 for(const [name,grid] of Object.entries(specs)){
  const im=new Image();im.onload=()=>{
   const [cols,rows]=grid,ch=Math.floor(im.height/rows),frames=[];
   for(let i=0;i<cols*rows;i++){
    // Authored gutters in the final lecture atlas follow the wider hand gestures.
    const edges=name==='lectureFinal'&&i<4?[0,.26,.52,.77,1]:Array.from({length:cols+1},(_,j)=>j/cols);
    const sx=name==='lectureFinal'?Math.round(edges[i%cols]*im.width):i%cols*Math.floor(im.width/cols);
    const cw=name==='lectureFinal'?Math.round(edges[i%cols+1]*im.width)-sx:Math.floor(im.width/cols);
    const c=document.createElement('canvas');c.width=cw;c.height=ch;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,sx,Math.floor(i/cols)*ch,cw,ch,0,0,cw,ch);
    if(name==='ivan'||name==='erik'||name==='lecture'||name==='death'||name==='classroom'||name==='lectureFinal'||name==='chalkHand'){
     const pixels=g.getImageData(0,0,cw,ch),d=pixels.data;let l=cw,r=0,t=ch,b=0;
     for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const p=(y*cw+x)*4;if(d[p]>90&&d[p+2]>90&&d[p+1]<Math.min(d[p],d[p+2])*.6)d[p+3]=0;else if(d[p+3]>100){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}}
     g.putImageData(pixels,0,0);frames.push({canvas:c,l,t,w:r-l+1,h:b-t+1});
    }else frames.push(c);
   }
   if(name==='moods')frames.forEach((c,i)=>bank.portraits[['erik-sad','ivan-sad','erik-stern','ivan-demon'][i]]=c);
   else if(name==='team')frames.forEach((c,i)=>bank.portraits[['oganov','feoktistov','alekseev'][i]]=c);
   else if(name==='ravil'){frames.forEach((c,i)=>bank.portraits[['ravil-sad','ravil-grateful'][i]]=c);bank.portraits.ravil=frames[1];}
   else if(name==='academic')bank.portraits['ivan-academic']=frames[0];
   else if(name==='oganovHurt')bank.portraits['oganov-hurt']=frames[0];
   else bank.sprites[name]=frames;
   bank.ready=++loaded===Object.keys(specs).length;
  };im.onerror=()=>console.error('Acting atlas unavailable: '+name);im.src=root.GUROV_ACTING_DATA?.[name]||'';
 }
 bank.draw=function(c,name,index,x,feet,height,facing=1){const f=bank.sprites[name]?.[index];if(!f)return false;const scale=height/f.h;c.save();c.translate(x,feet);c.scale(facing,1);c.imageSmoothingEnabled=true;c.drawImage(f.canvas,f.l,f.t,f.w,f.h,-f.w*scale/2,-height,f.w*scale,height);c.restore();return true;};
 bank.drawDeath=function(c,index,x,feet,height,facing=1){const f=bank.sprites.death?.[index],ref=bank.sprites.death?.[0];if(!f||!ref)return false;const scale=height/ref.h;c.save();c.translate(x,feet);c.scale(facing,1);c.imageSmoothingEnabled=true;c.drawImage(f.canvas,f.l,f.t,f.w,f.h,-f.w*scale/2,-f.h*scale,f.w*scale,f.h*scale);c.restore();return true;};
 bank.peek=function(c,index,x,top,height){const f=bank.sprites.ivan?.[index],reference=bank.sprites.ivan?.[1];if(!f||!reference)return;const h=height*f.h/reference.h;bank.draw(c,'ivan',index,x,top+h,h);};
 root.GurovActing=bank;
})(window);
