/* Real keyboard takeoffs and SFX mixing: jumping must not own or duck speech. */
const {chromium}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({offline:true,viewport:{width:1280,height:720}}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
  await page.addInitScript(require('./campaign-clock.cjs'));
  await page.addInitScript(()=>{
   window.__jumpSounds=[];let Sound;
   Object.defineProperty(window,'GurovSound',{configurable:true,get(){return Sound;},set(api){Sound=class extends api{
    constructor(...args){super(...args);window.__sound=this;}
    jumpEffort(second){const played=super.jumpEffort(second);if(played)__jumpSounds.push({second:!!second,name:[...this.jumpNodes][0].name});return played;}
   };}});
  });
  await page.goto(pathToFileURL(path.resolve(process.argv[2]||'game/index.html')).href);
  await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});
  await page.evaluate(async()=>{__sound.init();await __sound.effortReady;});
  const buffers=await page.evaluate(()=>[...__sound.jumpBuffers].map(([name,b])=>({name,seconds:b.duration})));
  assert.equal(buffers.length,4);assert.ok(buffers.every(b=>b.seconds>.12&&b.seconds<.8));
  assert.equal(await page.evaluate(()=>__sound.jumpEffort(false)),false,'silent in menu');
  await page.locator('#start').click();await page.locator('#prologue-skip').click();await page.locator('#modal-actions button').first().click();
  await page.evaluate(()=>__advance(40));
  await page.waitForFunction(()=>__sound.ctx.state==='running'&&__sound.track?.name==='field',null,{polling:50});
  await page.waitForTimeout(300);
  await page.evaluate(()=>{
   __gainWrites=[];__speechCalls=0;
   for(const method of ['setValueAtTime','setTargetAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime','cancelScheduledValues']){
    const original=__sound.musicBus.gain[method].bind(__sound.musicBus.gain);
    __sound.musicBus.gain[method]=(...args)=>{__gainWrites.push({method,args});return original(...args);};
   }
   const speak=__sound.speak.bind(__sound);__sound.speak=(...args)=>{__speechCalls++;return speak(...args);};
  });
  async function jump(){await page.keyboard.down('Space');await page.evaluate(()=>__advance(2));await page.keyboard.up('Space');await page.evaluate(()=>__advance(2));}
  await jump();await jump();await jump();
  assert.deepEqual(await page.evaluate(()=>__jumpSounds),[{second:false,name:'jump-1'},{second:true,name:'double-1'}],'no sound on rejected third jump');
  await page.evaluate(()=>__advance(160));await jump();await jump();
  const takeoffs=await page.evaluate(()=>__jumpSounds);
  assert.deepEqual(takeoffs.slice(2),[{second:false,name:'jump-2'},{second:true,name:'double-2'}]);
  assert.deepEqual(await page.evaluate(()=>__gainWrites),[],'no music gain automation from any jump');
  assert.equal(await page.evaluate(()=>__speechCalls),0,'jump never enters speech API');
  assert.equal(await page.evaluate(()=>__sound.voiceQueue?.length||0),0);
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>__sound.jumpNodes.size),0,'one-shots release audio nodes');
  // During a real spoken line, jumping preserves its source, position and queue.
  await page.evaluate(async()=>{await __sound.speak('roman',GurovEngine.ROMAN_LINES[0],4);});
  await page.waitForFunction(()=>__sound.voiceActive,null,{polling:50});
  const overlap=await page.evaluate(()=>{
   const s=__sound,job=s.voiceJob,speech=s.speechSource,queue=s.voiceQueue,level=s.musicBus.gain.value;
   __gainWrites=[];const played=s.jumpEffort(false),jump=[...s.jumpNodes][0];
   const roman=s.effort('throw'),independent=s.jumpNodes.has(jump)&&s.effortNodes.size===1;
   s.jumpEffort(true);
   return {played,roman,independent,romanStillPlaying:s.effortNodes.size===1,sameJob:s.voiceJob===job,sameSource:s.speechSource===speech,sameQueue:s.voiceQueue===queue,sameLevel:s.musicBus.gain.value===level,writes:__gainWrites};
  });
  assert.deepEqual(overlap,{played:true,roman:true,independent:true,romanStillPlaying:true,sameJob:true,sameSource:true,sameQueue:true,sameLevel:true,writes:[]});
  const cleanup=await page.evaluate(async()=>{
   const s=__sound;s.setState('pause');const paused=s.jumpNodes.size===0&&!s.jumpEffort(false);
   s.setState('play');s.jumpEffort(false);s.toggle();const muted=s.jumpNodes.size===0&&!s.jumpEffort(false);
   s.toggle();await s.ctx.resume();s.jumpEffort(false);s.suspend();const blurred=s.jumpNodes.size===0;
   s.resume();await s.ctx.resume();s.enabled=true;s.jumpEffort(false);s.close();return {paused,muted,blurred,closed:s.jumpNodes.size===0};
  });
  assert.deepEqual(cleanup,{paused:true,muted:true,blurred:true,closed:true});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  fs.mkdirSync('tests/.output',{recursive:true});fs.writeFileSync('tests/.output/jump-audio.json',JSON.stringify({buffers,takeoffs,overlap,cleanup,errors,external},null,2));
  console.log('PASS: four Gurov efforts on real takeoffs; no sound on rejected jump; no music ducking, speech interruption or Roman SFX collision; pause/mute/close cleanup.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
