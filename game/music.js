/* Lazy local chunks keep soundtrack decoding out of the render loop. */
(function(root){
 const pending=new Map(),ready=new Map();
 root.GurovMusicBank={
  provide(name,base64,meta){
   const slot=pending.get(name);if(!slot)return;
   const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
   slot.ctx.decodeAudioData(bytes.buffer).then(buffer=>{const value={buffer,meta};ready.set(name,value);slot.resolve(value);pending.delete(name);}).catch(error=>{slot.reject(error);pending.delete(name);});
  },
  get(name,ctx){
   if(ready.has(name))return Promise.resolve(ready.get(name));if(pending.has(name))return pending.get(name).promise;
   let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});pending.set(name,{ctx,promise,resolve,reject});
   if(root.GUROV_INLINE_MUSIC?.[name]){const v=root.GUROV_INLINE_MUSIC[name];this.provide(name,v.data,v.meta);}
   else{const script=document.createElement('script');script.src='assets/music/'+name+'.js';script.onload=()=>script.remove();script.onerror=()=>{reject(Error('Music chunk failed: '+name));pending.delete(name);script.remove();};document.head.append(script);}
   return promise;
  },
  get loaded(){return [...ready.keys()];}
 };
})(window);
