const {chromium}=require('./browser.cjs'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({offline:true,viewport:{width:1280,height:720}}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
  await page.addInitScript(require('./campaign-clock.cjs'));
  await page.addInitScript(()=>{
   let engine,cast;
   Object.defineProperty(window,'GurovEngine',{configurable:true,get(){return engine;},set(api){engine={...api,World:class extends api.World{constructor(...a){super(...a);window.__world=this;}}};}});
   Object.defineProperty(window,'GurovCast',{configurable:true,get(){return cast;},set(api){cast=class extends api{constructor(...a){super(...a);window.__cast=this;}};}});
  });
  await page.goto(require('node:url').pathToFileURL(path.resolve(process.argv[2]||'game/index.html')).href);
  await page.waitForFunction(()=>window.gurov?.state.assetReady,null,{polling:50});
  await page.locator('#start').click();await page.locator('#prologue-skip').click();await page.locator('#modal-actions button').first().click();
  await page.evaluate(()=>{__world.level.enemies=[];__world.runner=null;__world.level.items=[];__world.player.x=300;__advance(160);});
  const dir='tests/.output/crouch';fs.mkdirSync(dir,{recursive:true});
  await page.screenshot({path:dir+'/standing.png'});
  await page.keyboard.down('KeyS');await page.evaluate(()=>__advance(24));
  let p=await page.evaluate(()=>gurov.state.player);assert.equal(p.h,72);assert.equal(p.y+p.h,610);
  await page.screenshot({path:dir+'/crouch.png'});
  await page.keyboard.down('KeyJ');await page.evaluate(()=>__advance(2));await page.keyboard.up('KeyJ');
  const shot=await page.evaluate(()=>gurov.state.projectiles[0]);assert.ok(shot.y>540&&shot.y<565);
  await page.screenshot({path:dir+'/shoot.png'});
  await page.keyboard.down('KeyA');await page.evaluate(()=>__advance(75));await page.keyboard.up('KeyA');
  p=await page.evaluate(()=>gurov.state.player);assert.equal(p.facing,-1);assert.ok(p.vx>=-110&&p.vx<-100);assert.equal(p.h,72);
  await page.screenshot({path:dir+'/shuffle-left.png'});
  await page.keyboard.up('KeyS');await page.evaluate(()=>__advance(24));assert.equal(await page.evaluate(()=>gurov.state.player.h),123);
  // Alias works, and a quick release cannot leave the low collider latched.
  await page.keyboard.down('ArrowDown');await page.evaluate(()=>__advance(24));assert.equal(await page.evaluate(()=>gurov.state.player.h),72);
  await page.keyboard.down('Space');await page.evaluate(()=>__advance(2));await page.keyboard.up('Space');
  p=await page.evaluate(()=>gurov.state.player);assert.equal(p.h,123);assert.ok(p.vy<0);
  await page.keyboard.up('ArrowDown');await page.evaluate(()=>__advance(150));
  await page.keyboard.down('KeyS');await page.evaluate(()=>__advance(24));
  await page.keyboard.down('ShiftLeft');await page.evaluate(()=>__advance(2));await page.keyboard.up('ShiftLeft');
  p=await page.evaluate(()=>gurov.state.player);assert.equal(p.h,123);assert.ok(p.dash>0);
  await page.keyboard.up('KeyS');await page.evaluate(()=>__advance(60));
  // Review every pose, expression and facing at native gameplay scale.
  await page.evaluate(()=>{
   const c=document.createElement('canvas');c.id='qa-poses';c.width=1100;c.height=600;Object.assign(c.style,{position:'fixed',inset:'0',zIndex:9999});document.body.append(c);
   const x=c.getContext('2d');x.fillStyle='#243948';x.fillRect(0,0,1100,600);
   for(let row=0;row<3;row++)for(let col=0;col<6;col++){
    const name=['gurov','gurov-happy','gurov-tired'][row],px=95+col*180,feet=165+row*195;
    x.strokeStyle='#668a8c';x.beginPath();x.moveTo(px-70,feet);x.lineTo(px+70,feet);x.stroke();
    if(!col)__cast.draw(x,name,0,px,feet,146,1);
    else __cast.drawCrouch(x,name,{crouch:col===1?.3:1,cast:col===4?1:0,vx:col===3?100:0,gait:.3,facing:col===5?-1:1},px,feet,1);
   }
  });
  await page.locator('#qa-poses').screenshot({path:dir+'/poses.png'});await page.evaluate(()=>document.getElementById('qa-poses').remove());
  await page.keyboard.down('KeyS');await page.evaluate(()=>__advance(24));await page.keyboard.press('Escape');await page.keyboard.up('KeyS');
  assert.equal(await page.evaluate(()=>gurov.state.mode),'modal');
  await page.keyboard.press('Escape');await page.evaluate(()=>__advance(24));assert.equal(await page.evaluate(()=>gurov.state.player.h),123);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  fs.writeFileSync(dir+'/results.json',JSON.stringify({shot,errors,external},null,2));
  console.log('PASS: actual S/down crouching, low firing, shuffling, jump/dash, pause release and all twelve poses offline.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
