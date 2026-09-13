module.exports=async function finishTransition(page){
 for(let i=0;i<160;i++){
  const tr=await page.evaluate(()=>{__advance(12);return gurov.state.transition;});
  if(!tr)return;
  if(tr.error)throw Error('Chapter loading failed');
  if(tr.index===2&&tr.elapsed>=2.65&&tr.phase==='cover')await page.waitForFunction(()=>GurovIllustrations.ready||GurovIllustrations.failed,null,{polling:25,timeout:10000});
 }
 throw Error('Chapter transition did not finish');
};
