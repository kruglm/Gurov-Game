/* The death backdrop must depict the fatal encounter, not the reset checkpoint. */
const {chromium}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch(),errors=[],checks=[];
 try{
  for(const scene of [{level:1,cause:'damage'},{level:1,cause:'fall'},{level:0,cause:'damage'},
   {level:3,cause:'damage',academic:false,x:5900},{level:3,cause:'damage',academic:true,x:11800},
   {level:3,cause:'damage',academic:true,x:12800},{level:3,cause:'fall',academic:true,x:24000}]){
   const context=await browser.newContext({offline:true,viewport:{width:1280,height:720}}),page=await context.newPage();
   page.on('pageerror',e=>errors.push(String(e)));
   await page.addInitScript(require('./campaign-clock.cjs'));
   await page.addInitScript(()=>{window.__testHidden=false;Object.defineProperty(document,'hidden',{get(){return __testHidden;}});});
   await page.addInitScript(level=>{
    if(!localStorage.getItem('gurov-last-lemma-v1'))localStorage.setItem('gurov-last-lemma-v1',JSON.stringify({version:1,campaign:3,level,checkpoint:level===1?1:0,upgrade:'homing'}));
    window.__draws=[];window.__floors=[];let engine,Cast;
    const fill=CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect=function(x,y,w,h){if(this.canvas.id==='game'&&this.fillStyle==='#b5b68c')__floors.push({x,y,w,h});return fill.call(this,x,y,w,h);};
    Object.defineProperty(window,'GurovEngine',{get(){return engine;},set(api){engine={...api,World:class extends api.World{
     constructor(...a){super(...a);window.__world=this;}
     die(...a){window.__fatalBefore={camera:this.camera,boss:this.level.boss?structuredClone(this.level.boss):null,runner:this.runner?{...this.runner}:null,platforms:structuredClone(this.level.platforms)};__draws=[];__floors=[];super.die(...a);}
    }};}});
    Object.defineProperty(window,'GurovCast',{get(){return Cast;},set(api){Cast=class extends api{
     motion(ctx,actor,pose,x,y,...rest){__draws.push({actor,pose,x,y});return super.motion(ctx,actor,pose,x,y,...rest);}
    };}});
   },scene.level);
   await page.goto(pathToFileURL(path.resolve(process.argv[2]||'game/index.html')).href);
   await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});await page.locator('#continue').click();
   await page.evaluate(s=>{
    const w=__world;w.level.enemies=[];w.level.items=[];w.companion=null;w.intro=null;w.updateBoss=()=>{};w.updateRunner=()=>{};
    Object.assign(w.player,{x:s.x||(s.level===1?2450:900),y:487,vx:0,vy:0,inv:0,hp:1,grounded:true});
    w.camera=s.level===1?1950:500;
    if(w.runner)Object.assign(w.runner,{x:1200,y:610,escaped:s.level===1,vx:150,facing:1});
    if(w.level.boss)Object.assign(w.level.boss,{x:s.level===1?2680:w.player.x+420,active:true,academic:!!s.academic,hp:12,phase:'windup',vx:0});
    if(s.level===3){w.updateRoof();w.camera=w.player.x-450;}
    __draws=[];
    if(s.cause==='fall')w.player.y=1000;
    else w.enemyShot(s.level===1?'erik':s.level===3?'ivan':'roman',s.level===1?'hold':'tomato',w.player.x,w.player.y+25,0,0,28,28,{damage:2});
    __advance(2);
   },scene);
   const fatal=await page.evaluate(()=>({state:gurov.state,draws:__draws,floors:__floors,before:__fatalBefore}));
   assert.equal(fatal.state.mode,'dying');assert.equal(fatal.state.deathScreen,null);
   const freeze=async()=>{
    const before=await page.evaluate(()=>({mode:gurov.state.mode,death:gurov.state.playerDeath,screen:gurov.state.deathScreen,player:gurov.state.player}));
    await page.evaluate(()=>{dispatchEvent(new Event('blur'));__testHidden=true;document.dispatchEvent(new Event('visibilitychange'));__advance(600);});
    assert.deepEqual(await page.evaluate(()=>({mode:gurov.state.mode,death:gurov.state.playerDeath,screen:gurov.state.deathScreen,player:gurov.state.player})),before);
    await page.evaluate(()=>{__testHidden=false;document.dispatchEvent(new Event('visibilitychange'));dispatchEvent(new Event('focus'));__advance(1);});
    assert.equal(await page.evaluate(()=>gurov.state.mode),before.mode);
   };
   await freeze();
   if(scene.level===1)assert.equal(fatal.draws.filter(d=>d.actor==='ivan').length,0,'escaped Ivan must not reappear in Erik death backdrop');
   if(scene.level===0)assert.ok(fatal.draws.some(d=>d.actor==='ivan'),'a runner actually present at death stays visible');
   if(scene.level!==0){
    const b=fatal.before.boss,actor=scene.level===3?(scene.academic?'ivan-academic':'ivan'):'erik';
    const draw=fatal.draws.find(d=>d.actor===actor);assert.ok(draw,actor+' must remain in the death backdrop');
    assert.equal(draw.pose,9,'fatal attack pose survives checkpoint reset');
    assert.equal(draw.x,b.x+b.w/2-fatal.before.camera);
   }
   if(scene.level===3){
    const expected=fatal.before.platforms.filter(p=>p.kind==='floor').map(p=>({...p,x:Math.round(p.x-fatal.before.camera),h:7})).filter(p=>p.x+p.w>=0&&p.x<=1280);
    assert.deepEqual(fatal.floors,expected.map(({x,y,w,h})=>({x,y,w,h})),'fatal roof uses every visible original chunk');
    for(let x=0;x<1280;x++)assert.ok(fatal.floors.some(p=>p.x<=x&&p.x+p.w>=x),'no floor gap at screen x='+x);
   }
   await page.evaluate(()=>__advance(180));
   assert.equal(await page.evaluate(()=>gurov.state.mode),'dying');
   fs.mkdirSync('tests/.output/death-scene',{recursive:true});
   const name=`${scene.level}-${scene.cause}-${scene.x||0}`;
   await page.screenshot({animations:'disabled',path:`tests/.output/death-scene/${name}.png`});
   await page.evaluate(()=>__advance(400));
   const theme=scene.cause==='fall'?'fall':scene.level===1?'erik':scene.level===3?'ivan':'roman';
   assert.equal(await page.evaluate(()=>gurov.state.deathScreen.theme),theme);
   if(theme==='ivan'){
    const portrait=scene.academic?'ivan-academic-mocking':'ivan-mocking',phase=scene.academic?'academic':'normal';
    assert.deepEqual(await page.evaluate(()=>({phase:gurov.state.deathScreen.phase,portrait:gurov.state.deathScreen.portrait,drawn:gurov.state.deathScreen.drawn})),{phase,portrait,drawn:true});
    assert.ok(await page.evaluate(id=>GurovIllustrations.portraits[id].naturalWidth>=1000,portrait));
    await page.screenshot({animations:'disabled',path:`tests/.output/death-scene/${name}-menu.png`});
    await page.reload();await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});await page.locator('#continue').click();await page.evaluate(()=>__advance(100));
    assert.equal(await page.evaluate(()=>gurov.state.deathScreen.portrait),portrait,'saved death keeps the original phase');
   }
   await freeze();
   const shortcuts=await page.evaluate(()=>{
    const before={mode:gurov.state.mode,player:gurov.state.player,sound:gurov.state.sound};
    for(const modifier of ['metaKey','ctrlKey','altKey'])for(const code of ['KeyM','KeyR','Space','Escape'])
     dispatchEvent(new KeyboardEvent('keydown',{code,[modifier]:true,cancelable:true}));
    return {before,after:{mode:gurov.state.mode,player:gurov.state.player,sound:gurov.state.sound}};
   });
   assert.deepEqual(shortcuts.after,shortcuts.before,'system shortcuts cannot activate death-menu actions');
   await page.locator('#death-checkpoint').click();
   assert.equal(await page.evaluate(()=>gurov.state.mode),'play');
   assert.equal(await page.evaluate(()=>gurov.state.awaitingRespawn),false);
   checks.push({...scene,theme,actors:fatal.draws});await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync('tests/.output/death-scene.json',JSON.stringify({checks,errors},null,2));
  console.log('PASS: fatal scene preserves escaped/present runner and boss pose, then correct death theme and retry.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
