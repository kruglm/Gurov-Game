const {chromium}=require('./browser.cjs'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({offline:true,viewport:{width:1280,height:720}}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
  await page.addInitScript(require('./campaign-clock.cjs'));
  await page.addInitScript(()=>{
   for(const [name,key]of[['GurovSound','__sound'],['GurovCast','__cast']]){
    let value;Object.defineProperty(window,name,{configurable:true,get(){return value;},set(api){value=class extends api{constructor(...a){super(...a);window[key]=this;}};}});
   }
   let engine;Object.defineProperty(window,'GurovEngine',{configurable:true,get(){return engine;},set(api){engine={...api,World:class extends api.World{constructor(...a){super(...a);window.__world=this;}}};}});
  });
  const entry=require('node:url').pathToFileURL(path.resolve(process.argv[2]||'game/index.html')).href;
  await page.goto(entry);await page.waitForFunction(()=>window.gurov?.state.assetReady,null,{polling:50});
  await page.evaluate(()=>localStorage.setItem('gurov-last-lemma-v1',JSON.stringify({version:1,campaign:3,level:3,checkpoint:0,upgrade:'homing'})));
  await page.reload();await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});
  const audio=await page.evaluate(async()=>{
   const s=__sound;s.init();await s.ctx.resume();await s.effortReady;
   await s.speak('ravil',GurovEngine.RAVIL_BATTLE_LINES.normal[0],4);const job=s.voiceJob,source=s.speechSource;let duck=0;
   const restore=s.restoreMusic.bind(s);s.restoreMusic=()=>{duck++;return restore();};
   for(const cue of ['summonTell','summonOpen','summonReady','summonFade'])s.sfx(cue);
   const result={sameVoice:job===s.voiceJob&&source===s.speechSource,duck,queue:s.voiceQueue.length};s.stopSpeech();s.enabled=false;s.restoreMusic=restore;
   document.getElementById('continue').click();const w=__world;
   Object.assign(w.player,{x:900,y:487,inv:999});w.camera=500;w.spawnCompanion();w.intro=null;
   Object.assign(w.level.boss,{active:true,academic:true,phase:'run',x:1440,summonCool:0,wallCool:100,healCool:100});
   w.updateRoof();__advance(1);return result;
  });
  assert.ok(audio.sameVoice);assert.equal(audio.duck,0);assert.equal(audio.queue,0);
  const dir='tests/.output/summons';fs.mkdirSync(dir,{recursive:true});
  const shots=[];
  for(const [frames,name]of [[30,'seam'],[115,'portal'],[60,'emerging'],[110,'dark-roman']]){
   await page.evaluate(n=>__advance(n),frames);const g=await page.evaluate(()=>gurov.state);shots.push({name,enemies:g.enemies,summon:g.boss.summon});
   await page.screenshot({path:dir+'/'+name+'.png'});
  }
  assert.equal(shots[0].enemies.length,0);assert.equal(shots[1].enemies.length,0);assert.equal(shots[2].enemies[0].phase,'emerge');assert.ok(shots[3].enemies[0].summoned);
  // Review all existing poses with the glow attached to their own glasses.
  await page.evaluate(()=>{
   const c=document.createElement('canvas');c.id='qa-poses';c.width=1000;c.height=840;Object.assign(c.style,{position:'fixed',inset:'0',zIndex:9999,width:'1000px',height:'840px'});document.body.append(c);
   const x=c.getContext('2d');x.fillStyle='#202033';x.fillRect(0,0,1000,840);
   for(let i=0;i<16;i++){__cast.draw(x,'roman',i,125+(i%4)*250,190+Math.floor(i/4)*210,175,1,0,1,true);x.fillStyle='#fff';x.font='16px monospace';x.fillText(String(i),15+i%4*250,20+Math.floor(i/4)*210);}
  });
  await page.locator('#qa-poses').screenshot({path:dir+'/poses.png'});await page.evaluate(()=>document.getElementById('qa-poses').remove());
  const counts=await page.evaluate(()=>{
   // Isolate the maximum visual load; normal campaign replays retain ally damage.
   __world.companion.cool=999;
   let max=0;for(let i=0;i<4500;i++){__world.player.x=__world.level.boss.x-350;__world.player.inv=999;__advance(1);max=Math.max(max,__world.level.enemies.filter(e=>e.hp>0).length);}
   return {max,enemies:__world.level.enemies.length,hostile:__world.projectiles.filter(s=>s.enemy).length};
  });assert.equal(counts.max,2);assert.ok(counts.enemies<=3);assert.ok(counts.hostile<=32);
  await page.screenshot({path:dir+'/two-clones.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>__advance(1));await page.screenshot({path:dir+'/reduced-motion.png'});
  await page.emulateMedia({reducedMotion:'no-preference'});
  // Yield between rendered frames, as the real RAF does; a tight synthetic loop
  // can batch GPU work and is not representative of normal frame scheduling.
  const times=[];
  for(let i=0;i<180;i++){
   times.push(await page.evaluate(()=>{const start=performance.now();__advance(2);return performance.now()-start;}));
   await page.waitForTimeout(12);
  }
  times.sort((a,b)=>a-b);const performance={frames:times.length,p95:times[171],max:times.at(-1)};
  await page.evaluate(()=>{__world.level.boss.exhausted=true;__advance(2);});await page.screenshot({path:dir+'/dissolving.png'});
  await page.evaluate(()=>__advance(120));assert.equal(await page.evaluate(()=>__world.level.enemies.length),0);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  fs.writeFileSync(dir+'/results.json',JSON.stringify({entry,audio,shots,counts,performance,errors,external},null,2));
  console.log('PASS: staged portal/emergence, sinister poses, no SFX ducking/interruption, capped clones, reduced motion and cleanup.',performance);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
