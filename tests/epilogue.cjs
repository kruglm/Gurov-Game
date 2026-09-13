require('node:fs').mkdirSync('tests/.output',{recursive:true});
const {chromium}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({offline:true,viewport:{width:1280,height:720}}),errors=[],warnings=[],external=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')warnings.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
  await page.addInitScript(require('./campaign-clock.cjs'));
  await page.addInitScript(()=>{for(const [name,key]of[['GurovSound','__sound'],['GurovEpilogue','__film']]){let type;Object.defineProperty(window,name,{configurable:true,get(){return type;},set(api){type=class extends api{constructor(...a){super(...a);window[key]=this;}};}});}});
  const runtime=require('node:url').pathToFileURL(path.resolve(process.argv[2]||'game/index.html')).href,tag=process.argv[3]||'source',dir='tests/.output/epilogue-'+tag;
  fs.mkdirSync(dir,{recursive:true});
  async function ready(){await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});}
  async function ending(){
   await page.goto('about:blank');await page.goto(runtime);await ready();
   await page.evaluate(()=>localStorage.setItem('gurov-last-lemma-v1',JSON.stringify({version:1,campaign:3,level:3,bossDefeated:true,pendingScene:'ivan-caught',courseworkObtained:true,upgrade:'homing'})));
   await page.reload();await ready();await page.evaluate(()=>{__autoStories=false;document.getElementById('continue').click();for(let i=0;i<GurovStory['ivan-caught'].length;i++)document.querySelector('#modal-actions button').click();});
  }
  async function film(muted=true){await page.evaluate(muted=>{if(muted){__sound.enabled=false;__sound.stopSpeech();}document.querySelector('#modal-actions button').click();__advance(1);},muted);assert.equal(await page.evaluate(()=>gurov.state.mode),'epilogue');}
  await ending();await film();const shots=[];
  for(const [index,seconds,name]of[[0,1.5,'classroom'],[0,5.6,'chalk-progress'],[1,3,'roman-question'],[3,5.6,'ivan-proof'],[4,3,'erik-apology'],[6,3,'ravil-thanks'],[7,10,'qed']]){
   await page.evaluate(({index,seconds})=>{let frames=0;while((__film.index<index||__film.time<seconds)&&frames++<14000)__advance(1);if(frames>=14000)throw Error('Film timeline stalled');},{index,seconds});
   await page.screenshot({path:dir+'/'+name+'.png'});shots.push(await page.evaluate(()=>gurov.state.epilogue));
  }
  assert.ok(shots[1].board[0]>.1&&shots[1].board[0]<1);assert.equal(shots[3].board[0],1);assert.equal(shots[3].board[1],1);assert.ok(shots[3].board[2]>.5);assert.deepEqual(shots.at(-1).board,[1,1,1,1]);
  const sizes=await page.evaluate(()=>GurovActing.sprites.classroom.map((f,i)=>({index:i,w:f.w,h:f.h,scale:201/GurovActing.sprites.classroom[i%3].h,visibleHeight:201*f.h/GurovActing.sprites.classroom[i%3].h})));
  assert.equal(sizes.length,6);assert.ok(sizes.every(f=>f.w>100&&f.h>100&&f.visibleHeight>190&&f.visibleHeight<212));
  const standing=await page.evaluate(()=>GurovActing.sprites.lectureFinal.map((f,i)=>({index:i,visibleHeight:234*f.h/GurovActing.sprites.lectureFinal[i<4?0:i<6?4:6].h})));
  assert.equal(standing.length,8);assert.ok(standing.every(f=>f.visibleHeight>222&&f.visibleHeight<247));
  const performance=await page.evaluate(()=>{const c=document.getElementById('game').getContext('2d'),samples=[];for(let i=0;i<100;i++){const t=performance.now();__film.draw(c,null);samples.push(performance.now()-t);}samples.sort((a,b)=>a-b);return {median:samples[50],p95:samples[95]};});
  await page.evaluate(()=>__advance(2000));assert.equal(await page.evaluate(()=>gurov.state.mode),'credits');
  // Keep the first film clip behind a decoder gate. The caption must wait even
  // after its old 15-second timeout, and cancellation must discard late audio.
  await ending();await page.evaluate(()=>{__sound.stopSpeech();__sound.init();const decode=__sound.ctx.decodeAudioData.bind(__sound.ctx);window.__gate=new Promise(r=>window.__release=r);__sound.ctx.decodeAudioData=async bytes=>{const b=await decode(bytes);await __gate;return b;};});
  await film(false);await page.waitForFunction(()=>__sound.voicePending,null,{polling:50});await page.evaluate(()=>__advance(2400));
  assert.equal(await page.evaluate(()=>gurov.state.epilogue.index),0);assert.equal(await page.evaluate(()=>gurov.state.epilogue.phase),'line');
  await page.evaluate(()=>__release());await page.waitForFunction(()=>__sound.voiceActive,null,{polling:50});
  assert.equal(await page.evaluate(()=>__sound.voiceJob.text),await page.evaluate(()=>GurovEpilogueLines[0].text));
  await page.evaluate(()=>__sound.speechSource.playbackRate.value=12);await page.waitForFunction(()=>!__sound.voiceActive,null,{polling:50});
  await page.evaluate(()=>__advance(70));assert.equal(await page.evaluate(()=>gurov.state.epilogue.phase),'line');
  await page.evaluate(()=>__advance(65));const fading=await page.evaluate(()=>gurov.state.epilogue);assert.equal(fading.phase,'out');assert.ok(fading.captionOpacity>0&&fading.captionOpacity<1);
  await page.screenshot({path:dir+'/soft-transition.png'});await page.evaluate(()=>__advance(100));await page.waitForFunction(()=>__sound.voiceActive&&__sound.voiceJob.actor==='roman',null,{polling:50});assert.equal(await page.evaluate(()=>gurov.state.epilogue.index),1);
  await page.locator('#epilogue-skip').click();assert.equal(await page.evaluate(()=>gurov.state.mode),'credits');assert.equal(await page.evaluate(()=>__sound.voiceActive||__sound.voicePending),false);
  await ending();await page.evaluate(()=>{__sound.stopSpeech();__sound.init();const decode=__sound.ctx.decodeAudioData.bind(__sound.ctx);window.__gate=new Promise(r=>window.__release=r);__sound.ctx.decodeAudioData=async bytes=>{const b=await decode(bytes);await __gate;return b;};});await film(false);
  await page.waitForFunction(()=>__sound.voicePending,null,{polling:50});await page.locator('#epilogue-skip').click();await page.evaluate(()=>__release());await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>__sound.voiceActive||__sound.voicePending),false);
  await page.emulateMedia({reducedMotion:'reduce'});await ending();await film();await page.evaluate(()=>__advance(670));assert.equal(await page.evaluate(()=>__film.stage.reduced),true);await page.screenshot({path:dir+'/reduced-motion.png'});await page.locator('#epilogue-skip').click();
  assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);assert.deepEqual(external,[]);
  fs.writeFileSync('tests/.output/epilogue-'+tag+'-results.json',JSON.stringify({runtime,shots,sizes,standing,performance,delayedDecodeWaits:true,quietBeat:true,captionDissolve:true,skipCancelsActiveAndPending:true,errors,warnings,external},null,2));
  console.log('PASS: continuous full ending, six seated poses, persistent progressive formulas, soft captions, delayed speech, quiet beat, active/pending cancellation, offline.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
