require('node:fs').mkdirSync('tests/.output',{recursive:true});
const {chromium}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({offline:true,viewport:{width:1280,height:720}}),errors=[],warnings=[],external=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')warnings.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
  await page.addInitScript(require('./campaign-clock.cjs'));
  await page.addInitScript(()=>{for(const [name,key]of[['GurovSound','__sound'],['GurovPrologue','__opening']]){let type;Object.defineProperty(window,name,{configurable:true,get(){return type;},set(api){type=class extends api{constructor(...a){super(...a);window[key]=this;}};}});}});
  const entry=require('node:url').pathToFileURL(path.resolve(process.argv[2]||'game/index.html')).href,tag=process.argv[3]||'source',dir='tests/.output/prologue-'+tag;fs.mkdirSync(dir,{recursive:true});
  const ready=()=>page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});
  await page.goto(entry);await ready();
  await page.evaluate(()=>__advance(200));await page.screenshot({path:dir+'/menu.png'});
  assert.equal(await page.title(),'Гуров — Последний удовл');assert.equal(await page.evaluate(()=>gurov.state.campaignCleared),false);
  await page.evaluate(()=>{__advance(200);__sound.enabled=false;__sound.stopSpeech();document.getElementById('start').click();__advance(240);});
  assert.equal(await page.evaluate(()=>gurov.state.mode),'prologue');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gurov-last-lemma-v1')).pendingPrologue),true);
  const shots=[];
  for(const [index,time,name]of[[0,2,'auditorium'],[1,2,'angry-professor'],[2,.6,'ivan-rises'],[2,1.7,'tomato-flight'],[2,2.15,'tomato-impact'],[2,5.2,'evacuation'],[3,4,'exit-aisle'],[4,5,'chase']]){
   await page.evaluate(({index,time})=>{let frames=0;while((__opening.index<index||__opening.time<time)&&frames++<15000)__advance(1);if(frames>=15000)throw Error('Opening stalled');},{index,time});
   await page.screenshot({path:dir+'/'+name+'.png'});shots.push(await page.evaluate(()=>gurov.state.prologue));
  }
  assert.equal(shots[0].seated,30);assert.equal(shots[4].tomatoHit,true);assert.equal(shots.at(-1).seated,0);
  await page.evaluate(()=>{while(__opening.phase!=='title')__advance(1);__advance(100);});await page.screenshot({path:dir+'/title.png'});
  await page.evaluate(()=>__advance(800));assert.equal(await page.evaluate(()=>gurov.state.mode),'modal');assert.equal(await page.evaluate(()=>gurov.state.level),0);
  assert.equal(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('gurov-last-lemma-v1')).pendingPrologue),false);
  await page.evaluate(()=>{document.querySelector('#modal-actions button').click();__advance(330);});
  await page.screenshot({path:dir+'/courtyard.png'});
  const perf=await page.evaluate(()=>{const c=document.getElementById('game').getContext('2d'),frames=[];for(let n=0;n<200;n++){const t=performance.now();GurovCourtyardCrowd.draw(c,{camera:450,time:n},n);frames.push(performance.now()-t);}frames.sort((a,b)=>a-b);return {capacity:GurovCourtyardCrowd.capacity,p95:frames[190]};});
  // Continuing an ordinary chapter must not repeat the defense or reset victory.
  await page.reload();await ready();await page.evaluate(()=>{__sound.enabled=false;document.getElementById('continue').click();__advance(1);});assert.equal(await page.evaluate(()=>gurov.state.mode),'play');
  // A closed unfinished prologue is safely resumable; no gameplay progress leaks.
  await page.reload();await ready();
  await page.evaluate(()=>localStorage.setItem('gurov-last-lemma-v1',JSON.stringify({version:1,campaign:3,level:0,pendingPrologue:true,stats:{elapsed:0}})));
  await page.reload();await ready();await page.evaluate(()=>{__sound.enabled=false;document.getElementById('continue').click();__advance(200);});assert.equal(await page.evaluate(()=>gurov.state.mode),'prologue');
  const paused=await page.evaluate(()=>{const before=__opening.elapsed;__opening.update(20,__sound,false);return {before,after:__opening.elapsed};});assert.equal(paused.before,paused.after);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>gurov.state.mode),'modal');
  // Decoder gates verify timing and that a skipped line can never play late.
  await page.reload();await ready();await page.evaluate(()=>localStorage.removeItem('gurov-last-lemma-v1'));await page.reload();await ready();
  await page.evaluate(()=>{__sound.init();const decode=__sound.ctx.decodeAudioData.bind(__sound.ctx);window.__gate=new Promise(r=>window.__release=r);__sound.ctx.decodeAudioData=async bytes=>{const b=await decode(bytes);await __gate;return b;};document.getElementById('start').click();__advance(1);});
  await page.waitForFunction(()=>__sound.voicePending,null,{polling:50});await page.evaluate(()=>__advance(3000));assert.equal(await page.evaluate(()=>__opening.index),0);assert.equal(await page.evaluate(()=>__opening.time),0);
  await page.locator('#prologue-skip').click();await page.evaluate(()=>{document.querySelector('#modal-actions button').click();__release();});await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>__sound.voiceActive||__sound.voicePending),false);
  // Every opening clip decodes offline with the same actor and exact text key.
  const voices=await page.evaluate(async()=>{const out=[];for(const line of GurovPrologueLines){await __sound.speak(line.actor,line.text,4);const m=GurovVoiceManifest[line.actor+'|'+line.text];if(!m||__sound.voiceKey!==m.id||!__sound.voiceActive)throw Error('Missing opening voice: '+line.actor);out.push({actor:line.actor,id:m.id,duration:m.duration});__sound.stopSpeech();}return out;});assert.equal(voices.length,5);
  // Run all five audible turns through the real cinematic state machine.
  // Simulation waits while audio plays; accelerated playback only shortens QA.
  await page.reload();await ready();await page.evaluate(()=>localStorage.removeItem('gurov-last-lemma-v1'));await page.reload();await ready();
  await page.evaluate(()=>{document.getElementById('start').click();__advance(1);});
  for(let i=0;i<5;i++){
   await page.waitForFunction(i=>__sound.voiceActive&&__opening.index===i,i,{polling:50});
   const spoken=await page.evaluate(()=>({key:__sound.voiceKey,expected:GurovVoiceManifest[GurovPrologueLines[__opening.index].actor+'|'+GurovPrologueLines[__opening.index].text].id}));assert.equal(spoken.key,spoken.expected);
   if(i===0){
    await page.evaluate(()=>dispatchEvent(new Event('blur')));await page.waitForFunction(()=>__sound.ctx.state==='suspended',null,{polling:25});
    const frozen=await page.evaluate(()=>__sound.ctx.currentTime);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>__sound.ctx.currentTime),frozen);
    await page.evaluate(()=>dispatchEvent(new Event('focus')));await page.waitForFunction(()=>__sound.ctx.state==='running',null,{polling:25});assert.equal(await page.evaluate(()=>__sound.voiceKey),spoken.key);
   }
   await page.evaluate(()=>{__advance(1400);__sound.speechSource.playbackRate.value=12;});assert.equal(await page.evaluate(()=>__opening.index),i);
   await page.waitForFunction(()=>!__sound.voiceActive,null,{polling:50});await page.evaluate(()=>__advance(165));
  }
  await page.evaluate(()=>__advance(600));assert.equal(await page.evaluate(()=>gurov.state.mode),'modal');
  const newManifest=JSON.parse(fs.readFileSync('game/assets/voices/manifest.js','utf8').split('=',2)[1].replace(/;$/,''));
  assert.equal(Object.keys(newManifest).length,141);
  assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);assert.deepEqual(external,[]);
  fs.writeFileSync('tests/.output/prologue-'+tag+'-results.json',JSON.stringify({entry,shots,perf,voices,pendingSave:true,continueSkipsPrologue:true,skipCancelsPending:true,focusPreservesAudio:true,audibleFilm:true,errors,warnings,external},null,2));console.log('PASS: defense, throw, splat, evacuation, title, courtyard; save/continue/skip; paused scene; delayed decoder; five offline voices.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
