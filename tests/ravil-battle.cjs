/* Real offline voice banks, engine events, phase entrance and caption timing. */
const {chromium}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({offline:true,viewport:{width:1280,height:720}}),errors=[],external=[],warnings=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(['warning','error'].includes(m.type()))warnings.push(m.text());});
  page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
  await page.addInitScript(require('./campaign-clock.cjs'));
  await page.addInitScript(()=>{
   let sound,engine;
   Object.defineProperty(window,'GurovSound',{configurable:true,get(){return sound;},set(api){sound=class extends api{constructor(...a){super(...a);window.__sound=this;}};}});
   Object.defineProperty(window,'GurovEngine',{configurable:true,get(){return engine;},set(api){engine={...api,World:class extends api.World{constructor(...a){super(...a);window.__world=this;}}};}});
  });
  const entry=require('node:url').pathToFileURL(path.resolve(process.argv[2]||'game/index.html')).href;
  await page.goto(entry);await page.waitForFunction(()=>window.gurov?.state.assetReady,null,{polling:50});
  await page.evaluate(()=>localStorage.setItem('gurov-last-lemma-v1',JSON.stringify({version:1,campaign:3,level:3,checkpoint:0,upgrade:'homing',companionUnlocked:true})));
  await page.reload();await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});
  const decoded=await page.evaluate(async()=>{
   const s=__sound;s.init();await s.ctx.resume();await s.effortReady;
   const decoded=[];
   for(const text of Object.values(GurovEngine.RAVIL_BATTLE_LINES).flat()){
    const meta=GurovVoiceManifest['ravil|'+text];await s.speak('ravil',text,4);
    if(!s.voiceActive||s.voiceKey!==meta.id)throw Error('Missing voice: '+text);
    decoded.push({text,voice:meta.voice,duration:s.voiceJob.buffer.duration,expectedDuration:meta.duration});s.stopSpeech();
   }
   window.__starts=[];const play=s.playSpeechBuffer.bind(s);
   s.playSpeechBuffer=(job,resume)=>{play(job,resume);if(s.speechSource&&s.voiceJob===job)__starts.push({actor:job.actor,text:job.text,resume:!!resume,time:s.ctx.currentTime});};
   document.getElementById('continue').click();
   const w=__world;w.damage=()=>{};w.level.boss.maxHp=200;w.level.boss.hp=200;w.player.x=720;w.companion.x=615;
   __advance(2);__advance(400);return decoded;
  });
  assert.equal(decoded.length,8);assert.ok(decoded.every(r=>r.voice.endsWith('/ravil-human-v2.4-corrected')&&Math.abs(r.duration-r.expectedDuration)<.15));
  const samples=[];
  const sample=async()=>{
   await page.waitForTimeout(100);
   const result=await page.evaluate(()=>{
    __world.player.x=__world.level.boss.x-340;__advance(12);
    const s=__sound,g=gurov.state;
    return {intro:!!g.intro,active:s.voiceActive,actor:s.voiceJob?.actor,text:s.voiceJob?.text,queue:s.voiceQueue.length,
     visible:[g.boss,g.companion].filter(n=>n.speechTime>0).map(n=>({text:n.speech,time:n.speechTime})),starts:__starts};
   });
   assert.equal(result.queue,0);assert.ok(result.visible.length<=1);
   if(result.visible.length){assert.ok(result.active&&!result.intro);assert.equal(result.visible[0].text,result.text);}
   samples.push(result);return result;
  };
  let first;
  for(let i=0;i<230;i++){
   const r=await sample();
   if(r.active&&r.actor==='ravil'&&r.starts.filter(t=>t.actor==='ravil'&&!t.resume).length>=2){first=r;break;}
  }
  assert.ok(first,'Ravil gets two turns despite frequent Ivan taunts');
  fs.mkdirSync('tests/.output/ravil-battle',{recursive:true});
  await page.screenshot({path:'tests/.output/ravil-battle/normal.png'});
  await page.evaluate(()=>{__world.beginAcademicPhase();__advance(1);});await page.waitForTimeout(250);
  const paused=await page.evaluate(()=>gurov.state);assert.ok(paused.intro&&paused.audio.voice.suspended);assert.equal(paused.companion.speechTime,0);
  await page.evaluate(()=>__advance(465));
  const resumed=await page.evaluate(()=>gurov.state);assert.equal(resumed.intro,null);assert.ok(resumed.audio.voice.active);assert.equal(resumed.ambientSpeech.text,first.text);
  let academic;
  for(let i=0;i<230;i++){
   const r=await sample();
   if(r.active&&r.actor==='ravil'&&r.text.includes('Академический отпуск?')){academic=r;break;}
  }
  assert.ok(academic,'Ravil answers the phase-two announcement');
  const starts=academic.starts.filter(r=>!r.resume),announcement=starts.findIndex(r=>r.text==='Я ухожу в академический отпуск!'),reply=starts.findIndex(r=>r.text.includes('Академический отпуск?'));
  assert.ok(announcement>=0&&reply>announcement);assert.ok(starts.some(r=>r.actor==='ivan'));
  await page.screenshot({path:'tests/.output/ravil-battle/academic.png'});
  const exhausted=await page.evaluate(()=>{__world.level.boss.exhausted=true;__advance(2);return gurov.state;});
  assert.equal(exhausted.ambientSpeech,null);assert.equal(exhausted.audio.voice.active,false);assert.equal(exhausted.companion.speechTime,0);
  assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);assert.deepEqual(external,[]);
  fs.writeFileSync('tests/.output/ravil-battle/results.json',JSON.stringify({entry,decoded,starts,samples:samples.length,captionSync:true,phaseResume:true,exhaustionCancels:true,errors,warnings,external},null,2));
  console.log('PASS: eight offline Ravil clips, fair boss turns, synchronized captions, phase announcement before reply, tape-stop resume, exhaustion cancellation.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
