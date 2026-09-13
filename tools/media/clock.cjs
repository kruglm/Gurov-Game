/* Production-only deterministic audiovisual clock. Never shipped with the game.
 * Every rendered second contains 120 original physics steps and 60 full UI frames.
 * Web Audio renders the same graph offline, scheduled on that exact clock.
 */
module.exports=function({maxSeconds=900}={}){
 let now=0,raf=[],context,rendering=false;const endings=new Set(),log=[];
 window.__mediaLog=log;window.__filmTime=()=>now;
 window.__inputTrace=[];
 for(const kind of ['keydown','keyup'])addEventListener(kind,e=>__inputTrace.push({tick:Math.round(now*120),kind,code:e.code}));
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(b)__inputTrace.push({tick:Math.round(now*120),kind:'click',id:b.id,parent:b.parentElement.id,index:[...b.parentElement.children].indexOf(b)});},true);
 window.requestAnimationFrame=f=>{raf.push(f);return raf.length;};
 const RealOffline=window.OfflineAudioContext;
 window.AudioContext=function(){
  const ctx=new RealOffline(2,Math.ceil(48000*maxSeconds),48000);context=ctx;
  Object.defineProperty(ctx,'currentTime',{get:()=>now});
  Object.defineProperty(ctx,'state',{get:()=> 'running'});
  ctx.resume=async()=>{};ctx.suspend=async()=>{};ctx.close=async()=>{};
  for(const method of ['createGain','createBiquadFilter','createDynamicsCompressor','createBufferSource','createOscillator']){
   const create=ctx[method].bind(ctx);
   ctx[method]=function(...args){
    const node=create(...args);
    // onended cleanup must not erase graph edges before offline rendering.
    node.__disconnect=node.disconnect.bind(node);node.disconnect=()=>{};
    if(method==='createBufferSource'||method==='createOscillator'){
     const start=node.start.bind(node),stop=node.stop.bind(node);
     const event={at:Infinity,callback:null,done:false};
     Object.defineProperty(node,'onended',{get:()=>event.callback,set:f=>{event.callback=f;}});
     node.start=(when=now,offset=0,duration)=>{
      const rate=node.playbackRate?.value||1;
      event.at=method==='createBufferSource'&&!node.loop?when+(duration??Math.max(0,node.buffer.duration-offset))/rate:Infinity;
      endings.add(event);log.push({kind:method==='createBufferSource'?'buffer':'osc',time:when,duration:node.buffer?.duration,offset,loop:!!node.loop});
      if(method==='createBufferSource')start(when,offset,...(duration===undefined?[]:[duration]));else start(when);
     };
     node.stop=(when=now)=>{stop(when);event.at=Math.min(event.at,when);};
    }
    return node;
   };
  }
  return ctx;
 };
 let Sound;
 Object.defineProperty(window,'GurovSound',{configurable:true,get:()=>Sound,set:C=>{Sound=class extends C{constructor(...a){super(...a);window.__sound=this;}};}});
 let Engine;
 Object.defineProperty(window,'GurovEngine',{configurable:true,get:()=>Engine,set:v=>{const Base=v.World;v.World=class extends Base{constructor(...a){super(...a);window.__world=this;}};Engine=v;}});
 window.__key=(code,down)=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code}));
 const animations=new WeakMap();
 window.__step=async(n=2)=>{
  for(let i=0;i<n;i++){
   now+=1/120;
   for(const e of [...endings])if(!e.done&&e.at<=now+1e-8){e.done=true;endings.delete(e);e.callback?.();}
   const batch=raf;raf=[];batch.forEach(f=>f(now*1000));
   // Decode waits cost production time, never produce missing/silent dialogue frames.
   for(let k=0;k<100&&window.__sound?.voicePending;k++)await new Promise(r=>setTimeout(r,5));
   await Promise.resolve();
  }
  for(const a of document.getAnimations()){
   if(!animations.has(a)){animations.set(a,now);a.pause();}
   a.currentTime=(now-animations.get(a))*1000;
  }
 };
 window.__renderAudio=async()=>{
  if(now>maxSeconds)throw Error('Audio capacity exceeded');
  rendering=true;const buffer=await context.startRendering();
  const count=Math.min(buffer.length,Math.ceil(now*48000));
  for(let p=0;p<count;p+=12000){
   const n=Math.min(12000,count-p),out=new Float32Array(n*2),l=buffer.getChannelData(0),r=buffer.getChannelData(1);
   for(let j=0;j<n;j++){out[j*2]=l[p+j];out[j*2+1]=r[p+j];}
   const bytes=new Uint8Array(out.buffer);let str='';for(let j=0;j<bytes.length;j++)str+=String.fromCharCode(bytes[j]);
   await window.__audioChunk(btoa(str));
  }
  return {seconds:now,samples:count,events:log.length};
 };
};
