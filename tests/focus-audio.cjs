/* Real offline AudioBufferSources must survive window lifecycle events intact. */
const {chromium}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({offline:true}),errors=[],checks=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(require('./campaign-clock.cjs'));
  await page.addInitScript(()=>{
   __autoStories=false;
   let sound,engine;
   Object.defineProperty(window,'GurovSound',{get(){return sound;},set(api){sound=class extends api{constructor(...a){super(...a);window.__sound=this;}};}});
   Object.defineProperty(window,'GurovEngine',{get(){return engine;},set(api){engine={...api,World:class extends api.World{constructor(...a){super(...a);window.__world=this;}}};}});
   window.__hidden=false;Object.defineProperty(document,'hidden',{get(){return __hidden;}});
   window.__snapshot=()=>({mode:gurov.state.mode,world:window.__world?.time,player:gurov.state.player,
    story:gurov.state.story,prologue:gurov.state.prologue,epilogue:gurov.state.epilogue,
    intro:gurov.state.intro,captive:gurov.state.captive,faculty:gurov.state.faculty,
    actor:__sound.voiceJob?.actor,text:__sound.voiceJob?.text,offset:__sound.voiceJob?.offset,
    queue:__sound.voiceQueue?.map(q=>q.actor+'|'+q.text)});
  });
  const url=pathToFileURL(path.resolve(process.argv[2]||'game/index.html')).href;
  const ready=async()=>{
   await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});
   // Playwright does not guarantee the order of separate initialization scripts.
   await page.evaluate(()=>{__autoStories=false;});
  };
  const active=()=>page.waitForFunction(()=>__sound.voiceActive,null,{polling:25});
  async function load(save){
   await page.goto(url);await ready();
   await page.evaluate(save=>{localStorage.clear();if(save)localStorage.setItem('gurov-last-lemma-v1',JSON.stringify({version:1,campaign:3,upgrade:'homing',...save}));},save);
   await page.reload();await ready();
   if(save)await page.evaluate(()=>document.getElementById('continue').click());
  }
  async function suspend(){
   await page.evaluate(()=>{dispatchEvent(new Event('blur'));__hidden=true;document.dispatchEvent(new Event('visibilitychange'));dispatchEvent(new Event('blur'));});
   await page.waitForFunction(()=>__sound.ctx.state==='suspended',null,{polling:25});
  }
  async function resume(muted=false){
   // A focus notification while still hidden must not resume anything.
   await page.evaluate(()=>dispatchEvent(new Event('focus')));
   assert.equal(await page.evaluate(()=>__sound.ctx.state),'suspended');
   await page.evaluate(()=>{__hidden=false;document.dispatchEvent(new Event('visibilitychange'));dispatchEvent(new Event('focus'));dispatchEvent(new Event('focus'));});
   if(!muted)await page.waitForFunction(()=>__sound.ctx.state==='running',null,{polling:25});
  }
  async function cycle(name){
   await suspend();
   const frozen=await page.evaluate(()=>{
    window.__kept={job:__sound.voiceJob,source:__sound.speechSource,queue:__sound.voiceQueue};
    return {scene:__snapshot(),time:__sound.ctx.currentTime};
   });
   // Frames may still arrive in an unfocused visible window. Neither captions
   // nor the simulation may expire; late init calls must not resume the context.
   await page.evaluate(()=>{__advance(600);__sound.init();});await page.waitForTimeout(120);
   assert.deepEqual(await page.evaluate(()=>__snapshot()),frozen.scene,name+': scene frozen');
   assert.equal(await page.evaluate(()=>__sound.ctx.currentTime),frozen.time,name+': audio frozen');
   assert.ok(await page.evaluate(()=>gurov.state.backgroundPaused));
   await resume();
   assert.ok(await page.evaluate(()=>__sound.voiceJob===__kept.job&&__sound.voiceQueue===__kept.queue&&
    (__sound.speechSource===__kept.source||__kept.job?.paused&&__sound.speechSuspended&&!__sound.speechSource)),name+': same live source and playlist');
   await page.waitForTimeout(75);
   assert.ok(await page.evaluate(t=>__sound.ctx.currentTime>t,frozen.time),name+': clock resumes');
   assert.equal(await page.evaluate(()=>gurov.state.mode),frozen.scene.mode,name+': same scene');
   await page.evaluate(()=>__advance(1));
   assert.equal(await page.evaluate(()=>window.__world?.time),frozen.scene.world,name+': no catch-up simulation');
   checks.push(name);
  }
  async function finishClip(){await page.evaluate(()=>__sound.speechSource.playbackRate.value=16);await page.waitForFunction(()=>!__sound.voiceJob,null,{polling:25});}

  // Chapter introduction: both the current narrator and queued Gurov survive.
  await load(null);
  await page.evaluate(()=>{document.getElementById('start').click();document.getElementById('prologue-skip').click();});await active();
  assert.equal(await page.evaluate(()=>__sound.voiceQueue.length),1);
  await cycle('chapter introduction and queued reply');
  await page.evaluate(()=>__sound.speechSource.playbackRate.value=16);
  await page.waitForFunction(()=>__sound.voiceActive&&__sound.voiceJob.actor==='gurov',null,{polling:25});
  await cycle('second turn of chapter playlist');await finishClip();
  await cycle('finished narration stays finished');

  // Ordinary story dialogue, including explicit Next and mute while away.
  await load({level:1,pendingScene:'sasha-coursework',courseworkObtained:true});await active();
  assert.equal(await page.evaluate(()=>gurov.state.story.kind),'sasha-coursework');
  await cycle('dialogue portrait and spoken line');await finishClip();await cycle('finished dialogue does not replay');
  await page.evaluate(()=>document.querySelector('#modal-actions button').click());await active();
  await suspend();await page.evaluate(()=>{__sound.toggle();});await resume(true);
  assert.equal(await page.evaluate(()=>!!__sound.voiceJob),false,'muted line is cancelled');
  await page.evaluate(()=>__sound.toggle());
  assert.equal(await page.evaluate(()=>!!__sound.voiceJob),false,'unmuting does not resurrect a cancelled line');
  checks.push('mute cancels suspended dialogue');

  await load({level:0});
  await page.evaluate(()=>{
   __world.runner=null;__world.damage=()=>{};const n=__world.level.enemies[0];
   __world.player.x=n.x-250;n.attackCool=10;__world.romanSpeechCool=0;__advance(2);
  });await active();
  assert.equal(await page.evaluate(()=>__sound.voiceJob.actor),'roman');
  await page.evaluate(()=>__advance(1));await cycle('Roman ambient voice and caption');

  // In-world ownership and the separate cinematic tape-stop must both survive.
  await load({level:1,checkpoint:1,courseworkObtained:true});
  await page.evaluate(()=>{__world.level.enemies=[];__world.level.items=[];__world.runner=null;__world.damage=()=>{};__advance(2);});await active();
  await page.evaluate(()=>__advance(1));assert.equal(await page.evaluate(()=>__sound.voiceJob.actor),'ravil');
  await cycle('hostage speech and caption');
  await page.evaluate(()=>{__world.player.x=2005;__advance(2);});
  await cycle('background pause during boss tape stop');
  await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>__sound.speechSuspended&&!__sound.voiceActive));
  await cycle('boss entrance keeps its independent speech pause');
  await page.evaluate(()=>__advance(410));await active();
  assert.equal(await page.evaluate(()=>__sound.voiceJob.actor),'ravil');
  await cycle('hostage phrase continues after boss entrance');await finishClip();
  await page.waitForTimeout(1550);await page.evaluate(()=>__advance(350));await active();
  assert.equal(await page.evaluate(()=>__sound.voiceJob.actor),'erik');await cycle('Erik turn without overlapping hostage');

  await load({level:2,courseworkObtained:true});
  await page.evaluate(()=>{__world.level.enemies=[];__world.damage=()=>{};__world.player.x=__world.level.faculty[0].x;__advance(2);});await active();
  await page.evaluate(()=>__advance(1));assert.ok(await page.evaluate(()=>gurov.state.departmentSpeech.actor));
  await cycle('faculty voice, caption and individual animation');

  // A pending decoder can finish while away, but cannot unfreeze audio.
  await load(null);
  await page.evaluate(async()=>{
   await __sound.effortReady;
   const decode=__sound.ctx.decodeAudioData.bind(__sound.ctx);window.__gate=new Promise(r=>window.__release=r);
   __sound.ctx.decodeAudioData=async b=>{const buffer=await decode(b);await __gate;return buffer;};
   document.getElementById('start').click();__advance(1);
  });
  await page.waitForFunction(()=>__sound.voicePending,null,{polling:25});await suspend();
  const time=await page.evaluate(()=>__sound.ctx.currentTime);
  await page.evaluate(()=>__release());await active();await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>__sound.ctx.currentTime),time);
  assert.equal(await page.evaluate(()=>__sound.ctx.state),'suspended');
  await resume();await cycle('late decoded prologue waits for foreground');
  await suspend();await page.evaluate(()=>{document.getElementById('prologue-skip').click();document.querySelector('#modal-actions button').click();});await resume();
  assert.equal(await page.evaluate(()=>!!__sound.voiceJob),false,'skip while suspended cancels prior scene');
  checks.push('skipping a suspended scene never resurrects its voice');

  await load({level:3,bossDefeated:true,pendingScene:'ivan-caught',courseworkObtained:true});
  await page.evaluate(()=>{for(let i=0;i<GurovStory['ivan-caught'].length;i++)document.querySelector('#modal-actions button').click();});await active();
  await cycle('end-of-level narration and playlist');
  await page.evaluate(()=>{document.querySelector('#modal-actions button').click();__advance(1);});await active();
  assert.equal(await page.evaluate(()=>gurov.state.mode),'epilogue');await cycle('final film and narration');

  // Rapid duplicated browser notifications must settle in the latest state.
  await page.evaluate(()=>{for(let i=0;i<6;i++){dispatchEvent(new Event('blur'));dispatchEvent(new Event('focus'));}dispatchEvent(new Event('blur'));});
  await page.waitForFunction(()=>__sound.ctx.state==='suspended',null,{polling:25});
  await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>({paused:gurov.state.backgroundPaused,context:__sound.ctx.state})),{paused:true,context:'suspended'});
  await page.evaluate(()=>{for(let i=0;i<6;i++){dispatchEvent(new Event('focus'));dispatchEvent(new Event('blur'));}dispatchEvent(new Event('focus'));});
  await page.waitForFunction(()=>__sound.ctx.state==='running',null,{polling:25});await page.waitForTimeout(100);
  assert.deepEqual(await page.evaluate(()=>({paused:gurov.state.backgroundPaused,context:__sound.ctx.state})),{paused:false,context:'running'});
  checks.push('rapid focus changes settle correctly in either direction');
  assert.deepEqual(errors,[]);
  fs.mkdirSync('tests/.output',{recursive:true});fs.writeFileSync('tests/.output/focus-audio.json',JSON.stringify({checks,errors},null,2));
  console.log('PASS: '+checks.length+' background/resume cases with real offline Russian audio, unchanged sources, playlists, captions and scene clocks.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
