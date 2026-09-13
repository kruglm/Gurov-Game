/* Trailer-only animated illustrations and title plates, rendered at 1080p. */
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{once}=require('node:events');
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url');
const dir=path.resolve('research/video-v2/cards');fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.GUROV_BROWSER_EXECUTABLE?{executablePath:process.env.GUROV_BROWSER_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}});await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto(pathToFileURL(path.resolve('game/index.html')).href);await page.waitForFunction(()=>gurov.state.assetReady);
  await page.evaluate(async url=>{
   __sound=undefined;
   window.movieCast=new GurovCast();window.movieArt=new Image();movieArt.src=url;await movieArt.decode();
   document.body.innerHTML='<canvas id="film" width="1920" height="1080"></canvas>';
   const style=document.createElement('style');style.textContent='*{margin:0;padding:0}html,body{width:1920px!important;height:1080px!important;overflow:hidden;background:#081822}#film{position:fixed;inset:0;width:1920px!important;height:1080px!important;max-width:none!important;max-height:none!important}';document.head.append(style);
  },'data:image/png;base64,'+fs.readFileSync('research/video-v2/art/lecture-opening.png').toString('base64'));
  await page.waitForFunction(()=>movieCast.ready);
  await page.evaluate(()=>{
   const c=document.getElementById('film').getContext('2d'),W=1920,H=1080;
   const ease=x=>1-Math.pow(1-Math.max(0,Math.min(1,x)),3),clamp=x=>Math.max(0,Math.min(1,x));
   const text=(s,x,y,size=30,color='#f0d8a1',align='left',font='Georgia')=>{c.font=`bold ${size}px ${font}`;c.fillStyle=color;c.textAlign=align;c.fillText(s,x,y);};
   const line=(x,y,x2,y2,color='#dfc38a',width=2)=>{c.beginPath();c.strokeStyle=color;c.lineWidth=width;c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();};
   function background(t){const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'#193949');g.addColorStop(1,'#071822');c.fillStyle=g;c.fillRect(0,0,W,H);
    c.save();c.translate(1580,520);c.rotate(t*.017);c.strokeStyle='#91b8b51c';c.lineWidth=1;for(let r=160;r<1100;r+=110){c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();}for(let i=0;i<20;i++){c.rotate(Math.PI/10);line(0,0,1500,0,'#91b8b518');}c.restore();
    c.strokeStyle='#b3a68155';c.strokeRect(42,42,W-84,H-84);line(42,42,240,42,'#eacf92',4);line(W-240,H-42,W-42,H-42,'#eacf92',4);
   }
   function dust(t){for(let i=0;i<75;i++){const x=(i*131.618+t*(8+i%5))%W,y=(i*73.719-t*(3+i%4)+H)%H;c.fillStyle=`rgba(243,207,146,${.12+.13*Math.sin(i+t)**2})`;c.beginPath();c.arc(x,y,i%3*.6+.6,0,Math.PI*2);c.fill();}}
   function paper(x,y,angle,size){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle='#efe2c4';c.shadowBlur=12;c.shadowColor='#0008';c.fillRect(-size*.35,-size*.5,size*.7,size);c.shadowBlur=0;for(let i=0;i<5;i++)line(-size*.24,-size*.27+i*size*.09,size*.22,-size*.27+i*size*.09,'#7c776977',1.2);c.restore();}
   window.drawMovie=(name,t,d)=>{
    c.clearRect(0,0,W,H);background(t);
    if(name==='opening'){
     const z=1.03+t*.006,w=W*z,h=H*z;c.drawImage(movieArt,(W-w)*.6,(H-h)*.48,w,h);
     const shade=c.createLinearGradient(0,0,1300,0);shade.addColorStop(0,'#041321db');shade.addColorStop(.7,'#0516245a');shade.addColorStop(1,'#04132100');c.fillStyle=shade;c.fillRect(0,0,W,H);
     c.save();c.globalAlpha=ease(t/.6);text('ВМК / ОДНА НЕОБЫЧНАЯ ЗАЩИТА',108,290,20,'#d6c8a9','left','Arial');text('ЗАЩИТА',100,425,104);text('ДИПЛОМОВ.',100,545,104);line(106,595,670,595,'#d5b674',3);text('Всё шло почти по плану.',108,652,33,'#eadfca');c.restore();
     dust(t);for(let i=0;i<3;i++)paper(1330+i*180-t*28,990-i*125+Math.sin(t+i)*21,.25*Math.sin(t*.5+i),60+i*10);
     if(t>d-1.15){const u=ease((t-(d-1.15))/.95);const x=-100+u*2400,y=330+240*Math.sin(u*Math.PI);c.save();c.translate(x,y);c.rotate(t*3);const size=50+u*120;GurovItems.draw(c,'tomato',-size/2,-size/2,size,size);c.restore();}
     if(t>d-.14){c.fillStyle=`rgba(255,219,171,${.3*clamp((t-d+.14)/.14)})`;c.fillRect(0,0,W,H);}
    }else if(name==='methods'){
     text('В КОНЦЕ ПЕРВОЙ ГЛАВЫ — ВАШ ВЫБОР',960,190,22,'#a3c9c5','center','Arial');
     text('ДВА МЕТОДА.',960,342,92,'#f1dba6','center');text('ОДНА ПОГОНЯ.',960,449,92,'#f1dba6','center');
     const phase=(t*.7)%1,x=495+Math.sin(t*.7)*18,y=674+Math.cos(t*.7)*10;drawGurovRocketJaw(c,x,y,4.5,1,t);
     for(let i=0;i<24;i++){const a=i/24*Math.PI*2;c.fillStyle='#a3dacb44';c.fillRect(x+Math.cos(a)*168,y+Math.sin(a)*108,3,3);}
     text('САМОНАВЕДЕНИЕ',490,858,30,'#aee9d7','center','Arial');
     text('ИЛИ',960,700,27,'#a9b5ac','center','Arial');
     movieCast.draw(c,'gurov-happy',14,1425,800,230,1);paper(1500,660,.16,62);
     text('РАБОТЫ ПОДОПЕЧНЫХ',1430,858,30,'#eace98','center','Arial');
    }else if(name==='title'){
     dust(t);const y=20*(1-ease(t/.6));
     text('ОТ ОДНОГО ВОПРОСА НЕ УБЕЖАТЬ',960,244+y,23,'#a8c7c5','center','Arial');
     text('ГУРОВ',960,479+y,190,'#f3dea8','center');
     text('ПОСЛЕДНИЙ УДОВЛ',960,629+y,102,'#edcf89','center');
     line(630,708,1290,708,'#c2ac71',2);text('ИГРАЙТЕ НА macOS И WINDOWS',960,794,28,'#d7ded1','center','Arial');
     text('Четыре главы. Один настойчивый профессор.',960,855,28,'#99b9b7','center');
     if(t>3.6){const x=1955-ease((t-3.6)/1)*100;GurovActing.peek(c,0,x,715,350);}
    }else if(name==='sting'){
     const im=GurovIllustrations.portraits['gurov-jaw-shock'];const h=940,w=h*im.width/im.height;c.drawImage(im,50,140,w,h);
     const shade=c.createLinearGradient(600,0,1070,0);shade.addColorStop(0,'#0b233000');shade.addColorStop(1,'#0b2330');c.fillStyle=shade;c.fillRect(600,0,1320,H);
     text('АРГУМЕНТ',1340,382,77,'#eddbaf','center');text('ВЫЛЕТЕЛ РАНЬШЕ',1340,476,66,'#eddbaf','center');text('ДОКАЗАТЕЛЬСТВА.',1340,573,66,'#eddbaf','center');
     dust(t);
    }
   };
  });
  for(const [name,duration] of [['opening',6.5],['methods',5],['title',6],['sting',4.5]]){
   if(process.argv.length>2&&!process.argv.slice(2).includes(name))continue;
   const encoder=spawn(process.env.GUROV_FFMPEG,['-y','-v','error','-f','image2pipe','-framerate','60','-vcodec','mjpeg','-i','pipe:0','-c:v','libx264','-threads','3','-preset','fast','-crf','17','-pix_fmt','yuv420p',path.join(dir,name+'.mp4')]);encoder.stderr.on('data',b=>process.stderr.write(b));
   for(let i=0;i<duration*60;i++){
    const data=await page.evaluate(({name,t,d})=>{drawMovie(name,t,d);return document.getElementById('film').toDataURL('image/jpeg',.96).split(',')[1];},{name,t:i/60,d:duration});const b=Buffer.from(data,'base64');if(!encoder.stdin.write(b))await once(encoder.stdin,'drain');
    if(i===Math.round(duration*30))fs.writeFileSync(path.join(dir,name+'.jpg'),b);
   }
   encoder.stdin.end();const [code]=await once(encoder,'close');if(code)throw Error('Encoder '+code);console.log('CARD',name,duration);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
