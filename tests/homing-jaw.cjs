require('node:fs').mkdirSync('tests/.output',{recursive:true});
const {chromium}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({offline:true,viewport:{width:1280,height:720}}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
  await page.addInitScript(require('./campaign-clock.cjs'));
  await page.addInitScript(()=>{let engine;Object.defineProperty(window,'GurovEngine',{configurable:true,get(){return engine;},set(api){engine={...api,World:class extends api.World{constructor(...args){super(...args);window.__world=this;}}};}});});
  const url=require('node:url').pathToFileURL(path.resolve(process.argv[2]||'game/index.html')).href,dir='tests/.output/homing';fs.mkdirSync(dir,{recursive:true});
  await page.goto(url);await page.waitForFunction(()=>window.gurov?.state.assetReady);
  await page.evaluate(()=>localStorage.setItem('gurov-last-lemma-v1',JSON.stringify({version:1,campaign:3,level:0,upgrade:'homing'})));
  await page.reload();await page.waitForFunction(()=>window.gurov?.state.assetReady);
  await page.evaluate(()=>{document.getElementById('continue').click();__advance(2);});
  const cases=[];
  for(const facing of [-1,1]){
   await page.evaluate(facing=>{
    const w=__world,e={...GurovEngine.levelData(0).enemies[0],x:1027-facing*300-22,y:515,w:44,h:95,hp:3,vx:0};
    w.level.enemies=[e];w.level.items=[];w.runner=null;w.level.checkpoints=[{x:0,y:610}];w.level.signs=[];
    w.level.platforms=[{x:0,y:610,w:5000,h:110,kind:'floor'}];w.projectiles=[];w.updateRoman=()=>{};
    Object.assign(w.player,{x:1000,y:610-GurovEngine.PLAYER_H,vx:0,vy:0,shoot:0,grounded:true,inv:20});
    const key=facing<0?'KeyA':'KeyD';__key(key,true);__advance(2);__key(key,false);
    __key('KeyJ',true);__advance(1);__key('KeyJ',false);
   },facing);
   const launch=await page.evaluate(()=>gurov.state);
   assert.equal(launch.mode,'play');assert.equal(launch.player.facing,facing);
   assert.equal(launch.projectiles.length,1);assert.ok(launch.projectiles[0].homing);assert.ok(launch.projectiles[0].vy<0);
   const points=await page.evaluate(()=>{const points=[];for(let i=0;i<21;i++){__advance(1);const s=gurov.state.projectiles[0];if(s)points.push(s);}return points;});
   await page.screenshot({path:dir+`/turn-${facing}.png`});
   const result=await page.evaluate(()=>{for(let i=0;i<200&&__world.projectiles.length;i++)__advance(1);return {hp:__world.level.enemies[0].hp,remaining:__world.projectiles.length};});
   assert.equal(result.hp,2);assert.equal(result.remaining,0);cases.push({facing,launch:launch.projectiles[0],points,...result});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  fs.writeFileSync('tests/.output/homing-jaw.json',JSON.stringify({runtime:url,cases,errors,external},null,2));
  console.log('PASS: actual A/D + J inputs, both backward launches turn upward and hit once; offline renderer has no errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
