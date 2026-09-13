/* A deterministic browser clock; dialogs advance through their real buttons. */
module.exports=function(){
 let callbacks=[],time=0;const held=new Set();
 window.__storyHistory=[];
 window.__outroHistory=[];window.__autoOutros=false;window.__autoStories=true;
 window.requestAnimationFrame=f=>callbacks.push(f);
 window.__key=(code,down)=>{if(down)held.add(code);else held.delete(code);dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code}));};
 window.__drainStories=()=>{
  let changed=false;
  for(let i=0;i<8&&window.gurov?.state.story;i++){
   const s=gurov.state.story;__storyHistory.push({...s,speaker:document.getElementById('modal-title').textContent});
   for(let j=0;j<300&&document.querySelector('#modal-actions button').disabled;j++)frame();
   document.querySelector('#modal-actions button').click();changed=true;
  }
  if(window.gurov?.state.story)throw Error('Dialogue did not finish');
  // Dialogs clear held gameplay keys. Reapply continuous inputs, never jump/dash.
  if(changed&&gurov.state.mode==='play')for(const code of ['KeyD','KeyA','KeyJ'])if(held.has(code))dispatchEvent(new KeyboardEvent('keydown',{code}));
 };
 const frame=()=>{time+=1000/120;const batch=callbacks;callbacks=[];batch.forEach(f=>f(time));};
 window.__drainOutros=()=>{
  if(!window.gurov?.state.bossOutro)return;
  __outroHistory.push(gurov.state.bossOutro.kind);
  for(let i=0;i<1100&&gurov.state.bossOutro&&!gurov.state.bossOutro.canSkip;i++)frame();
  document.getElementById('outro-skip').click();
  if(gurov.state.bossOutro)throw Error('Boss outro did not finish');
 };
 window.__advance=n=>{for(let i=0;i<n;i++){if(__autoOutros)__drainOutros();if(__autoStories)__drainStories();frame();}};
};
