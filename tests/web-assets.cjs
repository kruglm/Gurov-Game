/* Prepared web sprites must preserve pixels, dimensions and animation anchors. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http');
const {chromium}=require('./browser.cjs');
(async()=>{
 const web=path.resolve(process.argv[2]||'.build/web-'+JSON.parse(fs.readFileSync('project.json')).version);
 let served;
 const server=http.createServer((req,res)=>{
  const file=path.resolve(served,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html');
  if(!file.startsWith(served+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 try{
  const signatures=[];
  for(const folder of [path.resolve('game'),web]){
   served=folder;
   const context=await browser.newContext(),page=await context.newPage();
   await page.addInitScript(()=>{
    for(const [name,key] of [['GurovCast','__cast'],['GurovActor','__actor']]){
     let value;Object.defineProperty(window,name,{configurable:true,get(){return value;},set(Type){value=class extends Type{constructor(...args){super(...args);window[key]=this;}};}});
    }
   });
   await page.goto('http://127.0.0.1:'+server.address().port+'/');
   await page.waitForFunction(()=>gurov.state.assetReady,null,{timeout:120000});
   signatures.push(await page.evaluate(async()=>{
    async function frame({image,...meta}){
     const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d'),hash=[];
     // Composite over opaque backgrounds to ignore meaningless RGB under alpha=0.
     for(const color of ['#000','#fff']){
      g.fillStyle=color;g.fillRect(0,0,c.width,c.height);g.drawImage(image,0,0);
      hash.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',g.getImageData(0,0,c.width,c.height).data))).map(x=>x.toString(16).padStart(2,'0')).join(''));
     }
     return {meta,width:c.width,height:c.height,hash};
    }
    async function actor(a){return {height:a.height,runHeight:a.runHeight,bodyHeight:a.bodyHeight,cellW:a.cellW,cellH:a.cellH,frames:await Promise.all(a.frames.map(frame))};}
    const out={};for(const [name,a] of Object.entries({...__cast.actors,captive:__cast.captive,crouch:__cast.crouch,menu:__actor}))out[name]=await actor(a);return out;
   }));await context.close();
  }
  assert.deepEqual(signatures[1],signatures[0]);
  console.log('PASS: all prepared web actor frames match source pixels, size, feet anchors and animation scales.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
