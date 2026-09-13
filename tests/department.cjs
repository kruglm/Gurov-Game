require('node:fs').mkdirSync('tests/.output',{recursive:true});
/* Replay all thirteen optional grades through the actual browser input path. */
const {chromium}=require('./browser.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({offline:true,viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));await page.addInitScript(require('./campaign-clock.cjs'));
  await page.goto(pathToFileURL(path.resolve(process.argv[2]||'game/index.html')).href);
  await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});
  await page.evaluate(()=>{localStorage.clear();localStorage.setItem('gurov-last-lemma-v1',JSON.stringify({version:1,campaign:3,level:2,upgrade:'homing'}));});
  await page.reload();await page.waitForFunction(()=>gurov.state.assetReady,null,{polling:50});await page.locator('#continue').click();
  const data=JSON.parse(fs.readFileSync('tests/fixtures/department.json'));
  for(let i=0;i<data.route.length;i+=12)await page.evaluate(({route,actions})=>{
   for(const id of route){const a=actions[id];__key('KeyD',!!a.right);__key('KeyA',!!a.left);__key('KeyJ',true);if(a.jump)__key('Space',true);if(a.dash)__key('ShiftLeft',true);__advance((a.frames||12)-1);if(a.jump)__key('Space',false);if(a.dash)__key('ShiftLeft',false);__advance(1);}
  },{route:data.route.slice(i,i+12),actions:data.actions});
  const state=await page.evaluate(()=>gurov.state);assert.equal(state.stats.sparks,13);assert.equal(state.stats.deaths,0);assert.equal(state.player.hp,5);assert.deepEqual(errors,[]);
  fs.writeFileSync('tests/.output/department.json',JSON.stringify({all13Collected:true,actualKeyboardControls:true,health:state.player.hp,deaths:state.stats.deaths,errors},null,2));
  console.log('PASS: all thirteen optional grades collected in the real offline browser, full health, no teleports.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
