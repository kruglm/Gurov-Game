/* Play the encoded deliveries at 1x, checking decoder errors, stalls and seeking. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const output='research/video-v2/review';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required'],...(process.env.GUROV_BROWSER_EXECUTABLE?{executablePath:process.env.GUROV_BROWSER_EXECUTABLE}:{})});
 try{
  const reports=await Promise.all(['trailer','gameplay'].map(async kind=>{
   const page=await browser.newPage({viewport:{width:1280,height:850}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto('http://127.0.0.1:8786/');
   if(kind==='gameplay')await page.locator('#gameplay').click();
   if(await page.locator('#chapters').isVisible()!==(kind==='gameplay'))throw Error('Incorrect chapter visibility');
   await page.locator('video').evaluate(v=>v.play());
   let last=-1,stalled=0;
   while(true){
    await page.waitForTimeout(1000);
    const state=await page.locator('video').evaluate(v=>({time:v.currentTime,duration:v.duration,ended:v.ended,error:v.error?.message,ready:v.readyState,rate:v.playbackRate,quality:v.getVideoPlaybackQuality().toJSON?.()??{total:v.getVideoPlaybackQuality().totalVideoFrames,dropped:v.getVideoPlaybackQuality().droppedVideoFrames}}));
    if(state.error||state.rate!==1)throw Error(JSON.stringify(state));
    stalled=state.time===last&&!state.ended?stalled+1:0;if(stalled>10)throw Error(kind+' playback stalled');last=state.time;
    if(state.ended){
     await page.locator('video').evaluate(v=>{v.currentTime=v.duration/2;});
     await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.seeking&&v.readyState>=2;});
     await page.screenshot({path:output+'/'+kind+'-player.jpg',type:'jpeg',quality:90});
     await page.close();return {kind,...state,errors,seek:true};
    }
   }
  }));
  fs.writeFileSync(output+'/player.json',JSON.stringify(reports,null,2)+'\n');console.log(JSON.stringify(reports));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
