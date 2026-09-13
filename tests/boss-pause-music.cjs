/* Pause/resume must preserve actual boss AudioBufferSources, not just a label. */
const {chromium}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const checks=[],errors=[];
 try{
  for(const scenario of [
   {level:0,track:'field'},
   {level:1,track:'erik',health:1},
   {level:1,track:'erik',health:.4},
   {level:3,track:'ivan',health:1},
   {level:3,track:'ivan',health:.4,academic:true}
  ]){
   const context=await browser.newContext({offline:true,viewport:{width:1280,height:720}});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
   await page.addInitScript(require('./campaign-clock.cjs'));
   await page.addInitScript(level=>{
    localStorage.setItem('gurov-last-lemma-v1',JSON.stringify({version:1,campaign:3,level,upgrade:'homing'}));
    window.__musicRequests=[];let Sound,engine;
    Object.defineProperty(window,'GurovSound',{get(){return Sound;},set(api){Sound=class extends api{
     constructor(...args){super(...args);window.__sound=this;}
     startMusic(name){__musicRequests.push(name);return super.startMusic(name);}
    };}});
    Object.defineProperty(window,'GurovEngine',{get(){return engine;},set(api){engine={...api,World:class extends api.World{
     constructor(...args){super(...args);window.__world=this;}
    }};}});
   },scenario.level);
   await page.goto(pathToFileURL(path.resolve(process.argv[2]||'game/index.html')).href);
   await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});
   await page.locator('#continue').click();
   await page.evaluate(s=>{
    const w=__world;w.level.enemies=[];w.level.items=[];w.level.captive=null;w.runner=null;w.companion=null;
    w.intro=null;w.player.inv=999;w.updateBoss=()=>{};
    if(w.level.boss)Object.assign(w.level.boss,{active:true,academic:!!s.academic,hp:w.level.boss.maxHp*s.health});
    __advance(2);
   },scenario);
   await page.waitForFunction(s=>__sound.track?.name===s.track&&__sound.musicNodes.size===(s.level?2:1),scenario,{polling:25});
   await page.evaluate(()=>{
    __before={track:__sound.track,nodes:[...__sound.musicNodes],tension:__sound.tensionNode,requestID:__sound.requestID};
    __musicRequests=[];
   });
   for(const control of ['Escape','KeyP','button','mute']){
    if(control==='button')await page.locator('#pause').click();
    else await page.evaluate(code=>{__key(code,true);__key(code,false);},control==='mute'?'Escape':control);
    assert.equal(await page.evaluate(()=>gurov.state.mode),'modal');
    const time=await page.evaluate(()=>__world.time);
    await page.evaluate(()=>__advance(60));
    assert.equal(await page.evaluate(()=>__world.time),time,'simulation stays paused');
    if(control==='mute'){
     await page.locator('#modal-actions button').nth(1).click();
     assert.equal(await page.evaluate(()=>__sound.enabled),false);
     await page.locator('#modal-actions button').nth(1).click();
     assert.equal(await page.evaluate(()=>__sound.enabled),true);
    }
    if(control==='Escape'||control==='KeyP')await page.evaluate(code=>{__key(code,true);__key(code,false);},control);
    else await page.locator('#modal-actions button').first().click();
    // Check before the next animation frame can conceal an incorrect field request.
    assert.equal(await page.evaluate(()=>gurov.state.mode),'play');
    assert.deepEqual(await page.evaluate(()=>__musicRequests),[],JSON.stringify({scenario,control})+': no replacement music request');
    await page.evaluate(()=>__advance(2));await page.waitForTimeout(75);
    assert.ok(await page.evaluate(()=>__sound.track===__before.track&&__sound.requestID===__before.requestID&&
     __before.nodes.every(n=>__sound.musicNodes.has(n))&&__sound.tensionNode===__before.tension),'same loops and playback position');
    assert.equal(await page.evaluate(()=>__sound.tensionLevel),!!scenario.level&&scenario.health<=.5);
    checks.push({...scenario,control});
   }
   // Leaving the encounter must still select the real main-menu soundtrack.
   await page.locator('#pause').click();await page.locator('#modal-actions button').nth(2).click();
   await page.waitForFunction(()=>gurov.state.mode==='menu'&&__sound.track?.name==='menu',null,{polling:25});
   await context.close();
  }
  assert.deepEqual(errors,[]);
  fs.mkdirSync('tests/.output',{recursive:true});
  fs.writeFileSync('tests/.output/boss-pause-music.json',JSON.stringify({checks,errors},null,2));
  console.log('PASS: '+checks.length+' pause/resume cases preserve boss and tension loops; main menu changes music correctly.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
