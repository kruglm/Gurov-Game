/* The death backdrop must depict the fatal encounter, not the reset checkpoint. */
const {chromium}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch(),errors=[],checks=[];
 try{
  for(const scene of [{level:1,cause:'damage'},{level:1,cause:'fall'},{level:0,cause:'damage'},{level:3,cause:'damage'}]){
   const context=await browser.newContext({offline:true,viewport:{width:1280,height:720}}),page=await context.newPage();
   page.on('pageerror',e=>errors.push(String(e)));
   await page.addInitScript(require('./campaign-clock.cjs'));
   await page.addInitScript(level=>{
    localStorage.setItem('gurov-last-lemma-v1',JSON.stringify({version:1,campaign:3,level,checkpoint:level===1?1:0,upgrade:'homing'}));
    window.__draws=[];let engine,Cast;
    Object.defineProperty(window,'GurovEngine',{get(){return engine;},set(api){engine={...api,World:class extends api.World{
     constructor(...a){super(...a);window.__world=this;}
     die(...a){window.__fatalBefore={camera:this.camera,boss:this.level.boss?structuredClone(this.level.boss):null,runner:this.runner?{...this.runner}:null};super.die(...a);}
    }};}});
    Object.defineProperty(window,'GurovCast',{get(){return Cast;},set(api){Cast=class extends api{
     motion(ctx,actor,pose,x,y,...rest){__draws.push({actor,pose,x,y});return super.motion(ctx,actor,pose,x,y,...rest);}
    };}});
   },scene.level);
   await page.goto(pathToFileURL(path.resolve(process.argv[2]||'game/index.html')).href);
   await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});await page.locator('#continue').click();
   await page.evaluate(s=>{
    const w=__world;w.level.enemies=[];w.level.items=[];w.companion=null;w.intro=null;w.updateBoss=()=>{};w.updateRunner=()=>{};
    Object.assign(w.player,{x:s.level===1?2450:900,y:487,vx:0,vy:0,inv:0,hp:1,grounded:true});
    w.camera=s.level===1?1950:500;
    if(w.runner)Object.assign(w.runner,{x:1200,y:610,escaped:s.level===1,vx:150,facing:1});
    if(w.level.boss)Object.assign(w.level.boss,{x:s.level===1?2680:1300,active:true,academic:s.level===3,hp:12,phase:'windup',vx:0});
    __draws=[];
    if(s.cause==='fall')w.player.y=1000;
    else w.enemyShot(s.level===1?'erik':s.level===3?'ivan':'roman',s.level===1?'hold':'tomato',w.player.x,w.player.y+25,0,0,28,28,{damage:2});
    __advance(2);
   },scene);
   const fatal=await page.evaluate(()=>({state:gurov.state,draws:__draws,before:__fatalBefore}));
   assert.equal(fatal.state.mode,'dying');assert.equal(fatal.state.deathScreen,null);
   if(scene.level===1)assert.equal(fatal.draws.filter(d=>d.actor==='ivan').length,0,'escaped Ivan must not reappear in Erik death backdrop');
   if(scene.level===0)assert.ok(fatal.draws.some(d=>d.actor==='ivan'),'a runner actually present at death stays visible');
   if(scene.level!==0){
    const b=fatal.before.boss,actor=scene.level===3?'ivan-academic':'erik';
    const draw=fatal.draws.find(d=>d.actor===actor);assert.ok(draw,actor+' must remain in the death backdrop');
    assert.equal(draw.pose,9,'fatal attack pose survives checkpoint reset');
    assert.equal(draw.x,b.x+b.w/2-fatal.before.camera);
   }
   await page.evaluate(()=>__advance(180));
   assert.equal(await page.evaluate(()=>gurov.state.mode),'dying');
   fs.mkdirSync('tests/.output/death-scene',{recursive:true});
   await page.screenshot({path:`tests/.output/death-scene/${scene.level}-${scene.cause}.png`});
   await page.evaluate(()=>__advance(400));
   const theme=scene.cause==='fall'?'fall':scene.level===1?'erik':scene.level===3?'ivan':'roman';
   assert.equal(await page.evaluate(()=>gurov.state.deathScreen.theme),theme);
   await page.locator('#death-checkpoint').click();
   assert.equal(await page.evaluate(()=>gurov.state.mode),'play');
   assert.equal(await page.evaluate(()=>gurov.state.awaitingRespawn),false);
   checks.push({...scene,theme,actors:fatal.draws});await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync('tests/.output/death-scene.json',JSON.stringify({checks,errors},null,2));
  console.log('PASS: fatal scene preserves escaped/present runner and boss pose, then correct death theme and retry.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
