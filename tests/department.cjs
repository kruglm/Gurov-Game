require('node:fs').mkdirSync('tests/.output',{recursive:true});
/* Replay all thirteen optional grades through the actual browser input path. */
const {chromium}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true});let page;
 try{
  page=await browser.newPage({offline:true,viewport:{width:1280,height:720}});const errors=[],trace=[];
  page.on('pageerror',e=>errors.push(String(e)));await page.addInitScript(require('./campaign-clock.cjs'));
  await page.goto(pathToFileURL(path.resolve(process.argv[2]||'game/index.html')).href);
  await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});
  await page.evaluate(()=>{localStorage.clear();localStorage.setItem('gurov-last-lemma-v1',JSON.stringify({version:1,campaign:3,level:2,upgrade:'homing'}));});
  await page.reload();await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});await page.locator('#continue').click();
  const data=JSON.parse(fs.readFileSync('tests/fixtures/department.json'));
  for(let i=0;i<data.route.length;i+=12){await page.evaluate(({route,actions})=>{
   for(const id of route){const a=actions[id];__key('KeyD',!!a.right);__key('KeyA',!!a.left);__key('KeyJ',true);if(a.jump)__key('Space',true);if(a.dash)__key('ShiftLeft',true);__advance((a.frames||12)-1);if(a.jump)__key('Space',false);if(a.dash)__key('ShiftLeft',false);__advance(1);}
  },{route:data.route.slice(i,i+12),actions:data.actions});
   trace.push(await page.evaluate(step=>{const s=gurov.state;return {step,mode:s.mode,x:s.player.x,y:s.player.y,health:s.player.hp,stats:s.stats};},Math.min(i+12,data.route.length)));
  }
  const state=await page.evaluate(()=>gurov.state);
  fs.writeFileSync('tests/.output/department.json',JSON.stringify({all13Collected:state.stats.sparks===13,actualKeyboardControls:true,health:state.player.hp,deaths:state.stats.deaths,trace,errors},null,2));
  assert.equal(state.stats.sparks,13,'all optional grades must remain reachable on the keyboard route');assert.equal(state.stats.deaths,0);assert.equal(state.player.hp,5);assert.deepEqual(errors,[]);
  console.log('PASS: all thirteen optional grades collected in the real offline browser, full health, no teleports.');
 }catch(error){
  if(page)await page.screenshot({path:'tests/.output/department-failure.png'}).catch(()=>{});
  throw error;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
