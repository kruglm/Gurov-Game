/* Real browser touch events, with the same simulation clock as campaign QA. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{chromium}=require('./browser.cjs');
const safari=process.env.GUROV_MOBILE_ENGINE==='webkit';
const output='tests/.output/mobile'+(safari?'-webkit':'');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const remote=/^https?:\/\//.test(process.argv[2]||'');
 const source=remote?null:path.resolve(process.argv[2]||'game/index.html');let server,url=remote?process.argv[2]:pathToFileURL(source).href;
 const requests=[];
 if(source&&fs.statSync(source).isDirectory()){
  server=http.createServer((req,res)=>{
   const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html',file=path.resolve(source,name);
   if(!file.startsWith(source+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
   const bytes=fs.readFileSync(file);requests.push({name,bytes:bytes.length});res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(bytes);
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port+'/';
 }
 const browser=await (safari?require('playwright').webkit:chromium).launch({headless:true});let page;
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,offline:!server&&!remote});
  page=await context.newPage();const errors=[],warnings=[];
  // A cold public CDN download can exceed Playwright's 30 s navigation default.
  // Local checks keep the shorter bound; gameplay assertions are unchanged.
  if(remote)page.setDefaultNavigationTimeout(120000);
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',e=>{if(e.type()==='error')warnings.push(e.text());});
  await page.addInitScript(require('./campaign-clock.cjs'));
  await page.addInitScript(()=>{
   window.__autoStories=false;
   let sound,engine;
   Object.defineProperty(window,'GurovSound',{configurable:true,get(){return sound;},set(Type){sound=class extends Type{constructor(...a){super(...a);window.__mobileSound=this;}};}});
   Object.defineProperty(window,'GurovEngine',{configurable:true,get(){return engine;},set(api){const World=api.World;api.World=class extends World{constructor(...a){super(...a);window.__mobileWorld=this;}};engine=api;}});
  });
  const start=Date.now();await page.goto(url);await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50,timeout:120000});
  const readyMs=Date.now()-start;await page.evaluate(()=>{__mobileSound.enabled=false;__mobileSound.stopSpeech();__advance(2);});
  assert.equal(await page.evaluate(()=>gurov.state.mobile.rotationPaused),true);
  await page.screenshot({path:output+'/portrait.png'});
  await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>!gurov.state.mobile.rotationPaused,null,{polling:50});await page.evaluate(()=>__advance(2));
  assert.equal(await page.evaluate(()=>gurov.state.mobile.enabled),true);
  assert.equal(await page.locator('#rotate-phone').isVisible(),false);
  await page.screenshot({path:output+'/menu.png'});
  await page.locator('#start').tap();await page.evaluate(()=>__advance(180));
  await page.screenshot({path:output+'/prologue.png'});
  await page.locator('#prologue-skip').tap();await page.evaluate(()=>__advance(2));
  await page.screenshot({path:output+'/chapter-intro.png'});
  await page.locator('#modal-actions button').first().tap();await page.evaluate(()=>__advance(2));
  if(!safari){
  const point=async(selector,id)=>{const b=await page.locator(selector).boundingBox();assert(b,'visible '+selector);return {id,x:b.x+b.width/2,y:b.y+b.height/2};};
  const client=await context.newCDPSession(page),touch=async(type,points)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({...p,radiusX:5,radiusY:5,force:1}))});
  const right=await point('.touch-right',1),left=await point('.touch-left',1),jump=await point('.touch-jump',2),jaw=await point('.touch-jaw',3),dash=await point('.touch-dash',4);
  const initial=await page.evaluate(()=>gurov.state.player.x);
  await touch('touchStart',[right]);await page.evaluate(()=>__advance(36));
  assert((await page.evaluate(()=>gurov.state.player.x))>initial+35,'holding right moves the player');
  await touch('touchStart',[right,jump,jaw]);await page.evaluate(()=>__advance(2));
  const airborne=await page.evaluate(()=>gurov.state);assert(airborne.player.vy<0,'jump works while running');assert(airborne.projectiles.length>0,'third finger shoots');
  await touch('touchEnd',[right,jaw]);await page.evaluate(()=>__advance(8));
  await touch('touchStart',[right,jaw,jump]);await page.evaluate(()=>__advance(2));assert((await page.evaluate(()=>gurov.state.player.vy))<0,'second tap jumps again');
  await touch('touchStart',[right,jaw,jump,dash]);await page.evaluate(()=>__advance(2));assert((await page.evaluate(()=>gurov.state.player.dash))>0,'dash works with other contacts held');
  await page.screenshot({path:output+'/multitouch.png'});
  await touch('touchCancel',[]);await page.evaluate(()=>__advance(2));assert.equal(await page.evaluate(()=>gurov.state.mobile.pointers),0);
  await touch('touchStart',[right]);await touch('touchMove',[left]);await page.evaluate(()=>__advance(60));assert((await page.evaluate(()=>gurov.state.player.vx))<0,'slide changes direction');
  await touch('touchCancel',[]);await page.evaluate(()=>__advance(10));
  // The pause button cancels held touches; resuming cannot restore a stale press.
  await touch('touchStart',[right]);await page.evaluate(()=>__advance(2));
  const pausePoint=await point('#pause',5);await touch('touchStart',[right,pausePoint]);await touch('touchEnd',[right]);await page.evaluate(()=>__advance(2));
  assert.equal(await page.evaluate(()=>gurov.state.mode),'modal');assert.equal(await page.locator('#touch-controls').isVisible(),false);
  await touch('touchCancel',[]);await page.locator('#modal-actions button').first().tap();await page.evaluate(()=>__advance(50));assert(Math.abs(await page.evaluate(()=>gurov.state.player.vx))<1);
  }else{await page.evaluate(()=>__advance(36));await page.locator('.touch-jump').tap();await page.evaluate(()=>__advance(2));assert((await page.evaluate(()=>gurov.state.player.vy))<0,'Safari tap jumps');}
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>gurov.state.mobile.rotationPaused,null,{polling:50});const distance=await page.evaluate(()=>gurov.state.distance);await page.evaluate(()=>__advance(600));assert.equal(await page.evaluate(()=>gurov.state.distance),distance,'rotation freezes simulation');
  await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>!gurov.state.mobile.rotationPaused,null,{polling:50});await page.evaluate(()=>__advance(2));assert.equal(await page.evaluate(()=>gurov.state.mobile.rotationPaused),false);
  // Inspect actual dialog, upgrade, heal, intro and death UI through supported saves.
  async function saved(data){await page.goto('about:blank');await page.goto(url);await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});await page.evaluate(data=>localStorage.setItem('gurov-last-lemma-v1',JSON.stringify({version:1,campaign:3,level:0,...data})),data);await page.reload();await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});await page.evaluate(()=>{__mobileSound.enabled=false;__autoStories=false;__advance(2);});await page.locator('#continue').tap();await page.evaluate(()=>__advance(4));}
  await saved({level:1,pendingScene:'erik-rescue',bossDefeated:true,upgrade:'paper'});assert(await page.locator('#story-portrait').isVisible());await page.screenshot({path:output+'/dialogue.png'});
  await saved({level:2,pendingScene:'course-team',upgrade:'paper'});await page.waitForFunction(()=>GurovIllustrations.ready,null,{polling:50});await page.evaluate(()=>__advance(2));await page.screenshot({path:output+'/course-dialogue.png'});
  await saved({level:1,pendingUpgrade:true});assert(await page.locator('.upgrade-grid').isVisible());await page.screenshot({path:output+'/upgrade.png'});await page.locator('#modal-actions button').nth(1).tap();await page.evaluate(()=>__advance(2));
  await saved({upgrade:'paper'});await page.evaluate(()=>{__mobileWorld.player.hp=2;__mobileWorld.paperCooldown=0;__advance(3);});
  await page.locator('#touch-heal').tap();await page.evaluate(()=>__advance(160));assert.equal(await page.evaluate(()=>gurov.state.player.hp),4,'touch healing restores health');assert(await page.locator('#touch-heal').isDisabled());
  await saved({level:3,awaitingRespawn:true,deathCause:'damage',deathSource:'ivan',deathBossPhase:'academic',upgrade:'homing'});await page.evaluate(()=>__advance(400));await page.screenshot({path:output+'/death.png'});assert(await page.locator('#death-checkpoint').isEnabled());await page.locator('#death-checkpoint').tap();await page.evaluate(()=>__advance(3));assert.equal(await page.evaluate(()=>gurov.state.mode),'play');
  const layouts=[];
  for(const [width,height] of [[667,375],[844,390],[915,412],[1024,768]]){
   await page.setViewportSize({width,height});await saved({});
   const metrics=await page.evaluate(()=>({buttons:[...document.querySelectorAll('#touch-controls button')].filter(e=>!e.closest('.hidden')).map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute('aria-label'),x:r.x,y:r.y,width:r.width,height:r.height};}),vw:innerWidth,vh:innerHeight,scroll:document.documentElement.scrollWidth}));
   for(const b of metrics.buttons){assert(b.width>=44&&b.height>=44,b.label+' is finger sized');assert(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,b.label+' fits viewport');}
   assert.equal(metrics.scroll,width);layouts.push({width,height,...metrics});await page.screenshot({path:output+`/play-${width}x${height}.png`});
  }
  // An unlocked spoken line survives rotation with the same audio offset/key.
  await page.evaluate(()=>{__mobileSound.enabled=true;__mobileSound.stopSpeech();});await page.locator('#pause').tap();await page.locator('#modal-actions button').first().tap();
  await page.evaluate(()=>__mobileSound.speak('gurov',GurovPrologueLines[0].text,4));
  await page.waitForFunction(()=>__mobileSound.voiceActive&&__mobileSound.ctx.state==='running',null,{polling:50});
  const voice=await page.evaluate(()=>__mobileSound.voiceKey);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>__mobileSound.ctx.state==='suspended',null,{polling:50});
  const offset=await page.evaluate(()=>__mobileSound.ctx.currentTime);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>__mobileSound.ctx.currentTime),offset);
  await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>__mobileSound.ctx.state==='running',null,{polling:50});assert.equal(await page.evaluate(()=>__mobileSound.voiceKey),voice);
  assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);
  fs.writeFileSync(output+'/report.json',JSON.stringify({url,readyMs,layouts,requests,errors,warnings,engine:safari?'webkit':'chromium',realHardware:false,multitouch:!safari,rotationAudio:true,rotationPause:true,heal:true,dialogs:true,deathRetry:true},null,2));
  console.log('PASS: mobile multi-touch movement/jump/shoot/dash, slide, cancellation, pause, rotation, healing, dialogs, upgrade, death retry and four landscape layouts.');
 }catch(e){if(page)await page.screenshot({path:output+'/failure.png'}).catch(()=>{});throw e;}
 finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
