/* Short v3 pickups at 1x. Only entry states are staged; all movement is real input. */
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{once}=require('node:events');
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url');
const {World}=require('../../game/engine'),{plan,actions}=require('./control.cjs');
const dir=path.resolve('research/video-v3/capture');fs.mkdirSync(dir,{recursive:true});
const definitions={
 'courtyard-clean':{level:0,x:120,movement:'forward',target:2000,seconds:8},
 'roman-forward':{level:0,x:275,upgrade:'homing',line:2,movement:'forward',target:1150,shoot:false,seconds:5},
 'tokens-forward':{level:1,x:450,upgrade:'homing',line:3,movement:'forward',target:1710,shoot:false,seconds:5.5},
 'homing-clean':{level:0,x:275,upgrade:'homing',movement:'forward',target:860,seconds:5},
 healing:{level:1,x:1940,upgrade:'paper',rescued:true,hp:3,seconds:5},
 crouch:{level:0,x:275,upgrade:'homing',seconds:5},
 erik:{level:1,x:2200,upgrade:'homing',seconds:14},
 academic:{level:3,x:1100,upgrade:'homing',academic:true,seconds:15}
};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required'],...(process.env.GUROV_BROWSER_EXECUTABLE?{executablePath:process.env.GUROV_BROWSER_EXECUTABLE}:{})});
 try{for(const name of process.argv.slice(2).length?process.argv.slice(2):Object.keys(definitions)){
  const config=definitions[name];if(!config)throw Error(name);
  const page=await browser.newPage({viewport:{width:1280,height:720},offline:true}),errors=[],states=[],crossings=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(require('./clock.cjs'),{maxSeconds:config.seconds+3});
  const save=new World(config.level,{upgrade:config.upgrade}).save();
  if(config.rescued){save.bossDefeated=true;save.companionUnlocked=true;}
  await page.addInitScript(s=>localStorage.setItem('gurov-last-lemma-v1',JSON.stringify(s)),save);
  const pcm=fs.createWriteStream(path.join(dir,name+'-sfx.f32'));
  await page.exposeFunction('__audioChunk',async b=>{if(!pcm.write(Buffer.from(b,'base64')))await once(pcm,'drain');});
  await page.goto(pathToFileURL(path.resolve('game/index.html')).href);await page.waitForFunction(()=>gurov.state.assetReady);
  await page.evaluate(async()=>{
   await document.fonts.ready;await __sound.effortReady;
   await Promise.all(['menu','field','erik','erik-tension','ivan','ivan-tension'].map(n=>GurovMusicBank.get(n,__sound.ctx)));
   __sound.musicBus.__disconnect();
   const play=GurovSound.prototype.playSpeechBuffer;
   GurovSound.prototype.playSpeechBuffer=function(...args){play.apply(this,args);this.voiceJob?.gain?.__disconnect();};
  });
  await page.locator('#continue').click();
  await page.evaluate(c=>{
   const w=__world;Object.assign(w.player,{x:c.x,y:c.y??487,vx:0,vy:0,grounded:true,hp:c.hp||5,inv:0});w.camera=Math.max(0,c.x-400);
   // Establish a consistent mid-level entry: the pursued runner is already ahead.
   if(w.runner)Object.assign(w.runner,{x:c.x+600,y:610,vx:360,phase:'run',patrol:null});
   if(w.companion)w.spawnCompanion();
   if(c.line!==undefined){const e=w.level.enemies.find(e=>e.x>c.x);e.lineIndex=c.line;w.romanSpeechCool=0;}
   if(c.academic){const b=w.level.boss;Object.assign(b,{x:c.x+410,active:true,academic:true,phase:'run',summonCool:.5,wallCool:5});w.updateRoof();}
  },config);
  await page.mouse.move(1279,0);
  const encoder=spawn(process.env.GUROV_FFMPEG,['-y','-v','error','-f','image2pipe','-framerate','60','-vcodec','mjpeg','-i','pipe:0','-c:v','libx264','-threads','2','-preset','fast','-crf','17','-pix_fmt','yuv420p',path.join(dir,name+'.mp4')]);
  encoder.stderr.on('data',b=>process.stderr.write(b));const cdp=await page.context().newCDPSession(page);let held=[],previousDistance=null;
  async function keys(codes){for(const k of new Set([...held,...codes]))if(held.includes(k)!==codes.includes(k))await page.evaluate(({k,down})=>__key(k,down),{k,down:codes.includes(k)});held=codes;}
  for(let i=0;i<config.seconds*60;i++){
   const t=i/60;
   if(name==='healing')await keys(t>=.6&&t<.65?['KeyH']:[]);
   else if(name==='crouch')await keys(t<.4?[]:t<1.2?['KeyS']:t<1.8?['KeyS','KeyJ']:t<2.7?['KeyS','KeyD']:t<2.75?['ShiftLeft','KeyD']:t<3?['KeyD']:[]);
   else if(config.movement==='forward'){
    if(i%12===0){
     const w=Object.assign(Object.create(World.prototype),await page.evaluate(()=>JSON.parse(JSON.stringify(__world))));
     const [id]=plan(w,{x:config.target,y:487},false,{shoot:config.shoot,keepEnemies:config.shoot===false}),a=actions[id],codes=[];
     if(a.right)codes.push('KeyD');if(a.left)codes.push('KeyA');if(a.jump)codes.push('Space');
     const p=w.player,threat=w.level.enemies.some(e=>e.hp>0&&Math.abs(e.x-p.x)<440&&Math.sign(e.x-p.x)===p.facing);
     if(config.shoot!==false&&threat)codes.push('KeyJ');await keys(codes);
    }else if(i%12===11)await keys(held.filter(k=>k!=='Space'));
   }else if(i%12===0){
    const w=Object.assign(Object.create(World.prototype),await page.evaluate(()=>JSON.parse(JSON.stringify(__world))));
    if(w.intro)await keys([]);
    else{const [id]=plan(w,null,true),a=actions[id],codes=[];if(a.right)codes.push('KeyD');if(a.left)codes.push('KeyA');if(a.jump)codes.push('Space');
     // Let a portal finish before counterattacking in the dedicated summon take.
     if(name!=='academic'||t>4.5)codes.push('KeyJ');await keys(codes);}
   }else if(i%12===11)await keys(held.filter(k=>k!=='Space'));
   await page.evaluate(()=>__step(2));
   const s=await page.evaluate(()=>gurov.state),r=s.runner,p=s.player;
   if(['dying','dead'].includes(s.mode))throw Error(name+' died at '+t);
   if(r&&!r.escaped&&s.mode==='play'){
    const distance=r.x-p.x-p.w/2;
    if(distance<100||(previousDistance!==null&&distance*previousDistance<0))crossings.push({t,distance});previousDistance=distance;
   }
   if(i%12===0)states.push({at:t,mode:s.mode,p,runner:r,b:s.boss,c:s.companion,enemies:s.enemies,shots:s.projectiles,voice:s.audio.voice,intro:s.intro});
   if(!process.env.GUROV_DRY){const r=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:96,fromSurface:true});if(!encoder.stdin.write(Buffer.from(r.data,'base64')))await once(encoder.stdin,'drain');}
  }
  await keys([]);encoder.stdin.end();const [ec]=await once(encoder,'close');if(ec&&!process.env.GUROV_DRY)throw Error('Encoder '+ec);
  await page.evaluate(()=>__renderAudio());pcm.end();await once(pcm,'finish');
  const enc=spawn(process.env.GUROV_FFMPEG,['-y','-v','error','-f','f32le','-ar','48000','-ac','2','-i',path.join(dir,name+'-sfx.f32'),'-c:a','pcm_s16le',path.join(dir,name+'-sfx.wav')]);enc.stderr.on('data',b=>process.stderr.write(b));const [code]=await once(enc,'close');if(code)throw Error('Audio encode');
  fs.writeFileSync(path.join(dir,name+'-record.json'),JSON.stringify({config,seconds:config.seconds,states,crossings,errors,trace:await page.evaluate(()=>__inputTrace)}));
  if(errors.length||crossings.length)throw Error(name+' invalid take: '+JSON.stringify({errors,crossings}));
  console.log('CAPTURED',name,config.seconds,'seconds; no runner crossings');await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
