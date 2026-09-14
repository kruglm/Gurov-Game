/* Build the itch.io distribution: external art, predecoded acting, offline speech. */
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');process.chdir(root);
const project=JSON.parse(fs.readFileSync('project.json','utf8'));
const target=path.join(root,'.build','web-'+project.version);
const art=JSON.parse(fs.readFileSync('game/assets/art-manifest.json','utf8'));
async function main(){
 execFileSync('python3',['build.py','--web-only'],{stdio:'inherit'});
 const {chromium}=require('playwright');
 const browser=await chromium.launch({headless:true});let prepared;
 try{
  const page=await browser.newPage({offline:true});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{
   for(const [name,key] of [['GurovCast','__buildCast'],['GurovActor','__buildActor']]){
    let value;
    Object.defineProperty(window,name,{configurable:true,get(){return value;},set(type){value=class extends type{constructor(...a){super(...a);window[key]=this;}};}});
   }
  });
  await page.goto(pathToFileURL(path.join(root,'game/index.html')).href);
  await page.waitForFunction(()=>window.gurov?.state.assetReady,null,{timeout:120000});
  if(errors.length)throw Error(errors.join('\n'));
  prepared=await page.evaluate(()=>{
   function pack(frames,meta){
    const w=Math.max(...frames.map(f=>f.image.width)),h=Math.max(...frames.map(f=>f.image.height)),cols=4;
    const c=document.createElement('canvas');c.width=w*cols;c.height=h*Math.ceil(frames.length/cols);const g=c.getContext('2d');
    const packed=frames.map(({image,...data},i)=>{const x=(i%cols)*w,y=Math.floor(i/cols)*h;g.drawImage(image,x,y);return {...data,x,y,w:image.width,h:image.height};});
    return {png:c.toDataURL('image/png'),meta,frames:packed};
   }
   const castActor=a=>pack(a.frames,{height:a.height,runHeight:a.runHeight});
   const cast={actors:Object.fromEntries(Object.entries(__buildCast.actors).map(([k,a])=>[k,castActor(a)])),captive:castActor(__buildCast.captive),crouch:castActor(__buildCast.crouch)};
   const actor=pack(__buildActor.frames,{bodyHeight:__buildActor.bodyHeight,cellW:__buildActor.cellW,cellH:__buildActor.cellH});
   return {cast,actor};
  });
 }finally{await browser.close();}
 fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(target,{recursive:true});
 const runtime=JSON.parse(execFileSync('python3',['-c',"import json; from tools.release_files import runtime_files; print(json.dumps([str(n) for _,n in runtime_files('game')]))"],{encoding:'utf8'}));
 for(const name of runtime){const dest=path.join(target,name);fs.mkdirSync(path.dirname(dest),{recursive:true});if(!art[name])fs.copyFileSync(path.join('game',name),dest);}
 const omitted=new Set([art['assets/sprites-data.js'].GUROV_ANIMATION_DATA,art['assets/sprites-data.js'].GUROV_CAPTIVE_DATA,art['assets/sprites-data.js'].GUROV_CROUCH_DATA,...Object.values(art['assets/sprites-data.js'].GUROV_ACTION_DATA)]);
 function external(value){
  if(typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,external(v)]));
  if(omitted.has(value))return null;
  const dest=path.join(target,value);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join('game',value),dest);return value;
 }
 for(const [name,variables] of Object.entries(art))fs.writeFileSync(path.join(target,name),Object.entries(variables).map(([k,v])=>'window.'+k+'='+JSON.stringify(external(v))+';\n').join(''));
 function saveAtlas(name,spec){
  const src='assets/prepared/'+name+'.png',dest=path.join(target,src);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,Buffer.from(spec.png.split(',')[1],'base64'));delete spec.png;spec.src=src;
 }
 for(const [name,spec] of Object.entries(prepared.cast.actors))saveAtlas('cast-'+name,spec);
 for(const key of ['captive','crouch'])saveAtlas('cast-'+key,prepared.cast[key]);saveAtlas('gurov-menu',prepared.actor);
 fs.writeFileSync(path.join(target,'assets/prepared-data.js'),'window.GUROV_WEB_BUILD='+JSON.stringify(project.version)+';window.GUROV_PREPARED_DATA='+JSON.stringify(prepared)+';\n');
 let html=fs.readFileSync(path.join(target,'index.html'),'utf8');html=html.replace('<script src="assets/sprites-data.js">','<script src="assets/prepared-data.js"></script><script src="assets/sprites-data.js">');fs.writeFileSync(path.join(target,'index.html'),html);
 fs.copyFileSync('docs/ASSETS.md',path.join(target,'SOURCES.txt'));fs.copyFileSync('docs/PLAYING.md',path.join(target,'READ-ME.txt'));
 fs.writeFileSync(path.join(target,'build-info.json'),JSON.stringify({version:project.version,build:project.build,mobile:true,preparedFrames:true,externalArt:true},null,2)+'\n');
 execFileSync('python3',['tools/package_web.py',target],{stdio:'inherit'});
 console.log('Web folder:',target);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
