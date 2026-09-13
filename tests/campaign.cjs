require('node:fs').mkdirSync('tests/.output',{recursive:true});
const finishTransition=require('./finish-transition.cjs');
/* Complete both upgrade routes through real inputs in an offline browser. */
const {chromium}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const version=require('../project.json').version,upgrade=process.env.GUROV_UPGRADE||'paper';
 
 const html=path.resolve(process.argv[2]||'game/index.html');
 const browser=await chromium.launch({headless:true});
 try {
  const context=await browser.newContext({offline:true,viewport:{width:1280,height:720}});
  const page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',r=>{if(!r.url().startsWith('data:')&&!r.url().startsWith(require('node:url').pathToFileURL(path.dirname(html)+'/').href))external.push(r.url());});
  await page.addInitScript(require('./campaign-clock.cjs'));
 await page.goto(require('node:url').pathToFileURL(html).href);await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});
  assert.ok(await page.evaluate(()=>gurov.state.castReady));
  await page.evaluate(()=>{__autoOutros=true;document.getElementById('start').click();if(gurov.state.mode==='prologue')document.getElementById('prologue-skip').click();document.querySelector('#modal-actions button').click();});
  const routeFile='tests/fixtures/campaign-'+upgrade+'.json';
  const data=JSON.parse(fs.readFileSync(routeFile,'utf8'));
  for(const chapter of data.report){
   // Execute in bounded batches so the browser can process audio and events.
   for(let start=0;start<chapter.route.length;start+=12){
    await page.evaluate(({route,actions})=>{
     for(const id of route){__drainOutros();__drainStories();while(gurov.state.intro)__advance(1);const a=actions[id];__key('KeyD',!!a.right);__key('KeyA',!!a.left);__key('KeyJ',true);if(a.interact)__key('KeyE',true);if(a.jump)__key('Space',true);if(a.dash)__key('ShiftLeft',true);__advance(11);if(a.interact)__key('KeyE',false);if(a.jump)__key('Space',false);if(a.dash)__key('ShiftLeft',false);__advance(1);}
    },{route:chapter.route.slice(start,start+12),actions:data.actions});
   }
   await page.evaluate(()=>{__drainOutros();__drainStories();});
   if(chapter.chapter===1){
    assert.equal((await page.evaluate(()=>gurov.state)).upgradeChoice,true);
    await page.locator('#modal-actions button').nth(upgrade==='paper'?1:0).click();
    assert.equal((await page.evaluate(()=>gurov.state)).upgrade,upgrade);
   } else assert.equal((await page.evaluate(()=>gurov.state)).upgrade,upgrade);
   const state=await page.evaluate(()=>gurov.state);assert.equal(state.pages,state.level<2?3:0);assert.equal(state.mode,'modal',JSON.stringify({chapter:chapter.chapter,mode:state.mode,player:state.player,boss:state.boss,stats:state.stats}));if(chapter.chapter===2||chapter.chapter===4)assert.ok(state.boss.defeated);
   if(chapter.chapter<4){await page.locator('#modal-actions button').first().click();await finishTransition(page);await page.locator('#modal-actions button').first().click();}
  }
  assert.deepEqual(await page.evaluate(()=>__outroHistory),['erik','ivan']);
  assert.deepEqual(await page.evaluate(()=>__storyHistory.map(s=>s.kind+':'+s.index)),['erik-rescue:0','erik-rescue:1','erik-rescue:2','ivan-caught:0']);
 assert.equal(await page.locator('#modal-title').textContent(),'Утро наступило.');
  assert.equal(await page.evaluate(()=>localStorage.getItem('gurov-last-lemma-v1')),null);
  await page.evaluate(()=>{document.querySelector('#modal-actions button').click();__advance(480);});
  assert.equal((await page.evaluate(()=>gurov.state)).mode,'epilogue');
  await page.locator('#epilogue-skip').click();await page.evaluate(()=>__advance(480));
  assert.equal((await page.evaluate(()=>gurov.state)).mode,'credits');
  assert.ok(await page.locator('#credits-roll').evaluate(e=>e.scrollTop)>0);
  await page.locator('#credits-menu').click();
  assert.equal((await page.evaluate(()=>gurov.state)).mode,'menu');
  assert.equal((await page.evaluate(()=>gurov.state)).menuIvan.caught,true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('gurov-last-lemma-victory-v1')),'1');
  await page.reload();await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});assert.equal((await page.evaluate(()=>gurov.state)).menuIvan.caught,true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('gurov-last-lemma-v1')),null);
  const music=await page.evaluate(async()=>{const ctx=new AudioContext();for(const name of ['menu','field','erik','erik-tension','ivan','ivan-tension'])await GurovMusicBank.get(name,ctx);await ctx.close();return GurovMusicBank.loaded;});
  assert.equal(music.length,6);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  const result={version,upgrade,format:'source local runtime',offline:true,originalProjectFilesRequested:false,allChaptersCompleted:true,bothBossesDefeated:true,bothBossFinalesBeforeDialogues:true,endingCredits:true,caughtMenuAfterRealCampaignAndReload:true,music,externalRequests:external,errors};
  fs.writeFileSync('tests/.output/campaign-'+upgrade+'.json',JSON.stringify(result,null,2)+'\n');
  console.log('PASS: offline source full campaign, both bosses, all artwork and six music chunks, zero external requests.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
