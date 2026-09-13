require('node:fs').mkdirSync('tests/.output',{recursive:true});
const {chromium}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({offline:true,viewport:{width:1280,height:720}}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
  await page.addInitScript(require('./campaign-clock.cjs'));
  await page.addInitScript(()=>{
   let sound,engine;
   Object.defineProperty(window,'GurovSound',{configurable:true,get(){return sound;},set(api){sound=class extends api{constructor(...a){super(...a);window.__sound=this;}};}});
   Object.defineProperty(window,'GurovEngine',{configurable:true,get(){return engine;},set(api){engine={...api,World:class extends api.World{constructor(...a){super(...a);window.__world=this;}}};}});
  });
  const url=require('node:url').pathToFileURL(path.resolve(process.argv[2]||'game/index.html')).href;
  await page.goto(url);await page.waitForFunction(()=>window.gurov?.state.assetReady,null,{polling:50});
  await page.evaluate(()=>localStorage.setItem('gurov-last-lemma-v1',JSON.stringify({version:1,campaign:3,level:1,checkpoint:1,upgrade:'homing',courseworkObtained:true})));
  await page.reload();await page.waitForFunction(()=>window.gurov?.state.assetReady,null,{polling:50});
  await page.evaluate(async()=>{
   __sound.init();await __sound.ctx.resume();await __sound.effortReady;
   const s=__sound,decode=s.ctx.decodeAudioData.bind(s.ctx),help=GurovVoiceManifest['ravil|Профессор, спасите! Я здесь в заложниках!'];
   window.__starts=[];const play=s.playSpeechBuffer.bind(s);
   s.playSpeechBuffer=(job,resume)=>{play(job,resume);if(s.speechSource&&s.voiceJob===job)__starts.push({actor:job.actor,text:job.text,resume:!!resume,time:s.ctx.currentTime});};
   s.ctx.decodeAudioData=b=>{
    const encoded=GurovVoiceData[help.id];
    if(encoded&&b.byteLength===atob(encoded).length&&!window.__decodeRelease)return new Promise(resolve=>{window.__decodeRelease=()=>decode(b).then(resolve);});
    return decode(b);
   };
   document.getElementById('continue').click();
   __world.level.enemies=[];__world.level.items=[];__world.runner=null;__world.damage=()=>{};__world.player.inv=0;
   __advance(2);
  });
  await page.waitForFunction(()=>!!window.__decodeRelease,null,{timeout:5000,polling:50}).catch(async error=>{
   console.log(JSON.stringify(await page.evaluate(()=>({state:gurov.state,job:__sound.voiceJob?{actor:__sound.voiceJob.actor,text:__sound.voiceJob.text}:null})),null,2));throw error;
  });
  const pending=await page.evaluate(()=>{__advance(1200);return gurov.state;});
  assert.equal(pending.audio.voice.pending,true);assert.equal(pending.captive.speechTime,0);assert.equal(pending.boss.speechTime,0);
  await page.evaluate(()=>__decodeRelease());await page.waitForFunction(()=>gurov.state.audio.voice.active,null,{polling:50});
  const first=await page.evaluate(()=>{__advance(1);return gurov.state;});
  assert.equal(first.captive.speech,'Профессор, спасите! Я здесь в заложниках!');assert.ok(first.captive.speechTime>2);
  fs.mkdirSync('tests/.output/encounter',{recursive:true});
  await page.screenshot({path:'tests/.output/encounter/ravil.png'});
  await page.evaluate(()=>{__world.player.x=2005;__advance(2);});
  await page.waitForTimeout(250);
  const entrance=await page.evaluate(()=>gurov.state);
  assert.ok(entrance.intro);assert.ok(entrance.audio.voice.suspended);assert.equal(entrance.audio.voice.active,false);assert.equal(entrance.captive.speechTime,0);
  const offset=entrance.audio.voice.offset;
  const resumed=await page.evaluate(()=>{__advance(410);return gurov.state;});
  assert.equal(resumed.intro,null);assert.equal(resumed.audio.voice.offset,offset);assert.ok(resumed.audio.voice.active);assert.equal(resumed.captive.speech,first.captive.speech);
  const samples=[];let testedSuppression=false,enrage=false,rage=false;
  for(let i=0;i<400&&!rage;i++){
   await page.waitForTimeout(80);
   const sample=await page.evaluate(()=>{
    __advance(10);const g=gurov.state,s=__sound,visible=[g.boss?.speechTime>0?{actor:'erik',text:g.boss.speech}:null,g.captive?.speechTime>0?{actor:'ravil',text:g.captive.speech}:null].filter(Boolean);
    return {visible,active:s.voiceActive,paused:s.speechSuspended,pending:s.voicePending,actor:s.voiceJob?.actor,text:s.voiceJob?.text,owned:!!s.voiceJob?.owner,queue:s.voiceQueue.length,opening:g.encounterSpeech.opening};
   });
   assert.ok(sample.visible.length<=1);assert.equal(sample.queue,0);
   if(sample.visible.length){assert.ok(sample.active&&!sample.paused);assert.equal(sample.visible[0].actor,sample.actor);assert.equal(sample.visible[0].text,sample.text);}
   samples.push(sample);
   if(sample.actor==='erik'&&sample.active&&!testedSuppression){
    const result=await page.evaluate(()=>{const s=__sound,source=s.speechSource;for(let i=0;i<20;i++){s.speak('roman',GurovEngine.ROMAN_LINES[i%GurovEngine.ROMAN_LINES.length],1);s.speak('ravil',GurovEngine.RAVIL_LINES[0],1);}return {same:s.speechSource===source,queue:s.voiceQueue.length};});
    assert.ok(result.same);assert.equal(result.queue,0);testedSuppression=true;
    await page.screenshot({path:'tests/.output/encounter/erik.png'});
   }
   if(sample.opening===2&&sample.active&&sample.actor==='ravil'&&!enrage){await page.evaluate(()=>{__world.level.boss.hp=8;__advance(1);});enrage=true;}
   if(sample.actor==='erik'&&sample.text?.includes('три захода')&&sample.active)rage=true;
  }
  assert.ok(testedSuppression&&enrage&&rage,'opening and phase-change response complete in real time');
  const starts=await page.evaluate(()=>__starts);assert.deepEqual(starts.filter(s=>!s.resume).slice(0,4).map(s=>s.actor),['ravil','erik','ravil','erik']);
  // A real killing hit must cancel the captive conversation before the victory scene.
  const defeated=await page.evaluate(()=>{
   const b=__world.level.boss;b.hp=1;b.timer=2;__world.projectiles.push({x:b.x+20,y:b.y+30,w:40,h:40,vx:0,vy:0,life:1,enemy:false});__advance(2);return gurov.state;
  });
  assert.equal(defeated.mode,'boss-outro');assert.equal(defeated.captive,null);assert.equal(defeated.audio.voice.active,false);assert.equal(defeated.encounterSpeech.actor,null);assert.deepEqual(defeated.audio.voice.queue,[]);
  // An uncached clip finishing decode after rescue must never resurrect hostage speech.
  const late=await page.evaluate(async()=>{
   const s=new GurovSound();s.init();await s.ctx.resume();await s.effortReady;
   const w=new GurovEngine.World(1,{upgrade:'homing'});w.player.x=2250;w.level.boss.active=true;
   const d=new GurovEncounterSpeech(s),id=GurovVoiceManifest['ravil|Профессор, спасите! Я здесь в заложниках!'].id;GurovVoiceCache.delete(id);
   const decode=s.ctx.decodeAudioData.bind(s.ctx);let release;
   s.ctx.decodeAudioData=b=>new Promise(resolve=>{release=()=>decode(b).then(resolve);});d.update(w,'play');
   for(let i=0;i<100&&!release;i++)await new Promise(r=>setTimeout(r,20));
   if(!release)throw Error('Expected pending speech decode');
   w.level.captive=null;w.level.boss.defeated=true;d.update(w,'play');await release();await new Promise(r=>setTimeout(r,50));
   const ok=!s.voiceJob&&!s.speechSource&&!s.voiceActive&&!d.current;s.close();return ok;
  });
  assert.ok(late);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  fs.writeFileSync(process.argv[3]||'tests/.output/encounter-speech.json',JSON.stringify({runtime:url,pendingSilent:true,captionSamples:samples.length,starts,tapeStopOffset:offset,resumedSameLine:true,noBacklog:true,killingHitCancels:true,lateDecodeCancelled:late,errors,external},null,2));
  console.log('PASS: real Russian clips and captions, delayed decode, opening/phase order, tape-stop resume, no ambient backlog, real defeat and late-decode cancellation.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
