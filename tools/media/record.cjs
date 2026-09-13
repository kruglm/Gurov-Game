/* Fresh audiovisual takes. Each shot has its own initial checkpoint/entry point.
 * Motion thereafter comes exclusively from normal inputs, at real game speed. */
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{once}=require('node:events');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {World}=require('../../game/engine');
const {actions,plan}=require('./control.cjs');
const ffmpeg=process.env.GUROV_FFMPEG;if(!ffmpeg)throw Error('Set GUROV_FFMPEG');
const dir=path.resolve('research/video-v2/capture');fs.mkdirSync(dir,{recursive:true});
const selected=process.argv.slice(2);
const definitions={
 prologue:{menu:true},
 courtyard:{level:0,x:120},
 homing:{level:0,x:275,upgrade:'homing'},
 healing:{level:1,x:1940,upgrade:'paper',hurt:true},
 choice:{level:0,choose:true},
 sasha:{level:1,x:1730,upgrade:'homing'},
 erik:{level:1,x:1840,upgrade:'homing'},
 faculty:{level:2,x:4050,upgrade:'homing'},
 tea:{level:2,x:1280,upgrade:'homing'},
 courses:{level:2,x:7000,upgrade:'homing'},
 ivan:{level:3,x:120,upgrade:'homing'}
};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling'],...(process.env.GUROV_BROWSER_EXECUTABLE?{executablePath:process.env.GUROV_BROWSER_EXECUTABLE}:{})});
 try{for(const name of selected.length?selected:Object.keys(definitions)){
  const config=definitions[name];if(!config)throw Error(name);
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],markers=[],states=[];let frameCount=0;
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(require('./clock.cjs'),{maxSeconds:240});
  if(!config.menu){const save=new World(config.level,{upgrade:config.upgrade}).save();if(config.choose){save.pendingUpgrade=true;save.chapterComplete=true;}await page.addInitScript(s=>localStorage.setItem('gurov-last-lemma-v1',JSON.stringify(s)),save);}
  const pcm=fs.createWriteStream(path.join(dir,name+'.f32'));
  await page.exposeFunction('__audioChunk',async b=>{if(!pcm.write(Buffer.from(b,'base64')))await once(pcm,'drain');});
  await page.goto(pathToFileURL(path.resolve('game/index.html')).href);await page.waitForFunction(()=>gurov.state.assetReady);
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(['menu','field','erik','erik-tension','ivan','ivan-tension'].map(n=>GurovMusicBank.get(n,__sound.ctx)));await __sound.effortReady;});
  if(!config.menu){await page.locator('#continue').click();if(!config.choose)await page.evaluate(c=>{
   const w=__world;Object.assign(w.player,{x:c.x,y:487,vx:0,vy:0,grounded:true});w.camera=Math.max(0,c.x-400);
   if(w.companion)w.spawnCompanion();if(c.hurt){w.player.inv=0;w.damage(2);}
  },config);}
  await page.mouse.move(1279,0);
  const encoder=process.env.GUROV_DRY?null:spawn(ffmpeg,['-y','-v','error','-f','image2pipe','-framerate','60','-vcodec','mjpeg','-i','pipe:0','-c:v','libx264','-threads','3','-preset','fast','-crf','18','-pix_fmt','yuv420p',path.join(dir,name+'-silent.mp4')]);
  encoder?.stderr.on('data',b=>process.stderr.write(b));
  const cdp=await page.context().newCDPSession(page);
  let lastTag='';
  async function frame(){
   await page.evaluate(()=>__step(2));
   if(encoder){const r=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:95,fromSurface:true});const b=Buffer.from(r.data,'base64');if(!encoder.stdin.write(b))await once(encoder.stdin,'drain');if(frameCount%300===0)fs.writeFileSync(path.join(dir,name+'-latest.jpg'),b);}
   if(frameCount%12===0){const s=await page.evaluate(()=>gurov.state);states.push({at:frameCount/60,mode:s.mode,p:s.player,c:s.companion,b:s.boss,projectiles:s.projectiles,hostile:s.enemyProjectiles,voice:s.audio.voice});
    const tag=s.prologue?'prologue:'+s.prologue.index:s.story?'story:'+s.story.kind+':'+s.story.index:s.intro?'intro:'+s.intro.kind+':'+!!s.intro.academic:s.bossOutro?'outro:'+s.bossOutro.kind:s.mode;
    if(tag!==lastTag){markers.push({at:frameCount/60,tag});lastTag=tag;console.log(name,frameCount/60,tag);}
    if(['dead','dying'].includes(s.mode))throw Error(name+' recording died at '+frameCount/60);
   }
   frameCount++;
  }
  const seconds=async n=>{for(let i=0;i<Math.round(n*60);i++)await frame();};
  const state=()=>page.evaluate(()=>gurov.state);
  const held=new Set();
  async function keys(codes=[]){for(const k of new Set([...held,...codes])){const down=codes.includes(k);if(held.has(k)!==down)await page.evaluate(({k,down})=>__key(k,down),{k,down});if(down)held.add(k);else held.delete(k);}}
  async function hold(n,codes=[]){await keys(codes);await seconds(n);}
  async function voiceWait(min=1){let quiet=0;for(let i=0;i<3600;i++){await frame();const v=(await state()).audio.voice;quiet=v.active||v.pending||v.queue.length?0:quiet+1;if(i>=min*60&&quiet>40)return;}throw Error('Voice did not finish');}
  async function scenes(){
   let s=await state();
   if(s.intro){await keys();while((await state()).intro)await frame();}
   if((await state()).bossOutro){await keys();while(!(await state()).bossOutro.canSkip)await frame();await seconds(1.5);await page.locator('#outro-skip').click();}
   while((s=await state()).story){await keys();await voiceWait(2);await page.locator('#modal-actions button').first().click();await frame();}
  }
  async function tickAction(a,combat=false){
   const s=await state(),p=s.player;
   const shoot=combat?!s.boss?.exhausted:s.enemies.some(e=>e.hp>0&&Math.abs(e.x-p.x)<440&&Math.sign(e.x-p.x)===p.facing);
   const list=[];if(a.right)list.push('KeyD');if(a.left)list.push('KeyA');if(a.jump)list.push('Space');if(shoot)list.push('KeyJ');if(combat&&s.boss?.exhausted)list.push('KeyE');
   await keys(list);await seconds(11/60);await keys(list.filter(k=>k!=='Space'&&k!=='KeyE'));await frame();
  }
  async function navigate(x,y=487){
   for(let i=0;i<180;i++){
    await scenes();const w=Object.assign(Object.create(World.prototype),await page.evaluate(()=>JSON.parse(JSON.stringify(__world))));
    if(Math.abs(w.player.x-x)<38&&Math.abs(w.player.y-y)<20&&w.player.grounded){await keys();return;}
    const [id]=plan(w,{x,y});await tickAction(actions[id]);
   }throw Error('Navigation stalled '+name+' '+x);
  }
  async function fight(){
   for(let i=0;i<600;i++){
    await scenes();const w=Object.assign(Object.create(World.prototype),await page.evaluate(()=>JSON.parse(JSON.stringify(__world))));
    if(w.level.boss.defeated){await keys();return;}
    const [id]=plan(w,null,true);await tickAction(actions[id],true);
   }throw Error('Fight stalled '+name);
  }
  const replay=process.env.GUROV_REPLAY&&path.join(process.env.GUROV_REPLAY,name+'.json');
  if(replay&&fs.existsSync(replay)){
   const route=JSON.parse(fs.readFileSync(replay)),events=route.trace.filter(e=>e.tick>0);let next=0;
   for(let i=0;i<route.frames;i++){
    while(next<events.length&&events[next].tick<=i*2){
     const e=events[next++];
     if(e.kind==='click')await page.evaluate(e=>{const button=e.id?document.getElementById(e.id):document.getElementById(e.parent)?.children[e.index];if(!button||button.disabled)throw Error('Replay button unavailable');button.click();},e);
     else await page.evaluate(e=>__key(e.code,e.kind==='keydown'),e);
    }
    await frame();
   }
  }else if(name==='prologue'){
   await seconds(3);await page.locator('#start').click();while((await state()).mode==='prologue')await frame();await voiceWait(1);
  }else if(name==='choice'){await seconds(7);}
  else if(name==='courtyard'){
   await hold(.8);await navigate(355);await hold(.6,['KeyJ']);await navigate(480,392);await hold(.85);await navigate(744,302);await hold(1.3);await navigate(1170,397);await hold(.8);
  }else if(name==='homing'){
   await hold(.3);await hold(.8,['KeyJ']);await hold(1.2);await hold(.6,['KeyD']);await hold(1.6);
  }else if(name==='healing'){await hold(1.4);await hold(.1,['KeyH']);await hold(4.5);}
  else if(name==='sasha'){await hold(1);await hold(.05,['KeyE']);await scenes();await hold(2);}
  else if(name==='erik'){await hold(.7);await navigate(2190);await scenes();await fight();await scenes();await hold(2.5);}
  else if(name==='faculty'){await hold(4);await navigate(4250);await hold(5);await navigate(4590);await hold(3);}
  else if(name==='tea'){await hold(1);await hold(.05,['KeyE']);await scenes();await hold(2);}
  else if(name==='courses'){await hold(1);await hold(.05,['KeyE']);await scenes();await hold(2);}
  else if(name==='ivan'){await hold(.8);await navigate(730);await scenes();await fight();await scenes();await hold(2);}
  await keys();
  const record={name,config,frames:frameCount,seconds:frameCount/60,markers,states,errors,trace:await page.evaluate(()=>__inputTrace)};
  fs.writeFileSync(path.join(dir,name+'-record.json'),JSON.stringify(record));
  if(encoder){encoder.stdin.end();const [ec]=await once(encoder,'close');if(ec)throw Error('Encoder '+ec);record.audio=await page.evaluate(()=>__renderAudio());pcm.end();await once(pcm,'finish');
   const mux=spawn(ffmpeg,['-y','-v','error','-i',path.join(dir,name+'-silent.mp4'),'-f','f32le','-ar','48000','-ac','2','-i',path.join(dir,name+'.f32'),'-c:v','copy','-c:a','aac','-b:a','256k','-t',String(frameCount/60),'-movflags','+faststart',path.join(dir,name+'.mp4')]);mux.stderr.on('data',b=>process.stderr.write(b));const [mc]=await once(mux,'close');if(mc)throw Error('Mux '+mc);
  }else pcm.end();
  fs.writeFileSync(path.join(dir,name+'-record.json'),JSON.stringify(record));await page.close();console.log('FINISHED',name,frameCount/60);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
