/* Replay verified captures into a dialogue/SFX stem, excluding the music bus. */
const fs=require('node:fs'),path=require('node:path'),{once}=require('node:events'),{spawn}=require('node:child_process');
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url');
const {World}=require('../../game/engine');
const dir=path.resolve('research/video-v2/capture');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required'],...(process.env.GUROV_BROWSER_EXECUTABLE?{executablePath:process.env.GUROV_BROWSER_EXECUTABLE}:{})});
 try{for(const name of process.argv.slice(2)){
  const record=JSON.parse(fs.readFileSync(path.join(dir,name+'-record.json'))),config=record.config;
  const page=await browser.newPage({viewport:{width:1280,height:720}});await page.addInitScript(require('./clock.cjs'),{maxSeconds:Math.ceil(record.seconds)+2});
  if(!config.menu){const save=new World(config.level,{upgrade:config.upgrade}).save();if(config.choose){save.pendingUpgrade=true;save.chapterComplete=true;}await page.addInitScript(s=>localStorage.setItem('gurov-last-lemma-v1',JSON.stringify(s)),save);}
  const suffix=process.env.GUROV_SFX_ONLY?'sfx':'fx';
  const file=path.join(dir,name+'-'+suffix+'.f32'),pcm=fs.createWriteStream(file);await page.exposeFunction('__audioChunk',async b=>{if(!pcm.write(Buffer.from(b,'base64')))await once(pcm,'drain');});
  await page.goto(pathToFileURL(path.resolve('game/index.html')).href);await page.waitForFunction(()=>gurov.state.assetReady);
  await page.evaluate(async()=>{await Promise.all(['menu','field','erik','erik-tension','ivan','ivan-tension'].map(n=>GurovMusicBank.get(n,__sound.ctx)));await __sound.effortReady;__sound.musicBus.__disconnect();});
  if(process.env.GUROV_SFX_ONLY)await page.evaluate(()=>{const play=GurovSound.prototype.playSpeechBuffer;GurovSound.prototype.playSpeechBuffer=function(...args){play.apply(this,args);this.voiceJob?.gain?.__disconnect();};});
  if(!config.menu){await page.locator('#continue').click();if(!config.choose)await page.evaluate(c=>{const w=__world;Object.assign(w.player,{x:c.x,y:487,vx:0,vy:0,grounded:true});w.camera=Math.max(0,c.x-400);if(w.companion)w.spawnCompanion();if(c.hurt){w.player.inv=0;w.damage(2);}},config);}
  const trace=record.trace.filter(e=>e.tick>0);let next=0;
  for(let i=0;i<record.frames;i++){
   while(next<trace.length&&trace[next].tick<=i*2){const e=trace[next++];await page.evaluate(e=>{if(e.kind==='click'){const b=e.id?document.getElementById(e.id):document.getElementById(e.parent)?.children[e.index];if(!b||b.disabled)throw Error('Stem replay button unavailable');b.click();}else __key(e.code,e.kind==='keydown');},e);}
   await page.evaluate(()=>__step(2));
  }
  await page.evaluate(()=>__renderAudio());pcm.end();await once(pcm,'finish');await page.close();
  const enc=spawn(process.env.GUROV_FFMPEG,['-y','-v','error','-f','f32le','-ar','48000','-ac','2','-i',file,'-c:a','pcm_s16le',path.join(dir,name+'-'+suffix+'.wav')]);enc.stderr.on('data',b=>process.stderr.write(b));const [code]=await once(enc,'close');if(code)throw Error('Stem encode');console.log('STEM',name,suffix,record.seconds);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
