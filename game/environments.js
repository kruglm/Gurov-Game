/* Static environment art is cached once; only a few leaves/LEDs move per frame. */
(function(root){
  const palettes={vorontsov:['#536b66','#273f40','#b7ae88'],maisuradze:['#71635e','#433f45','#c9a17c'],kitov:['#485f69','#213849','#8daaa8'],mestetsky:['#69716b','#374a49','#c3b99a'],dyukova:['#746c56','#464b3f','#c7b48b'],senko:['#536875','#2c414e','#a6beb8'],grabovoy:['#6d6660','#3e4545','#c6aa83'],ishchenko:['#526868','#263b43','#a2b5a0']};
  const bank={ready:false,failed:false,cache:new Map(),panorama:null};
  const random=i=>{const v=Math.sin(i*117.23+29)*43758.54;return v-Math.floor(v);};
  function pen(c){return {
    rect:(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);},
    line:(x,y,xx,yy,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();},
    text:(s,x,y,color,size=12)=>{c.fillStyle=color;c.font=`${size}px Georgia`;c.fillText(s,x,y);},
    oval:(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
  };}
  function cached(key,w,h,paint){
    if(!bank.cache.has(key)){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;paint(canvas.getContext('2d'));bank.cache.set(key,canvas);}
    return bank.cache.get(key);
  }
  function windowPane(c,x,y,w,h){
    const p=pen(c);p.rect(x-6,y-6,w+12,h+12,'#b8b39a');p.rect(x,y,w,h,'#6e959e');
    p.rect(x,y,w,h*.42,'#a9bbad');p.oval(x+w*.73,y+h*.2,15,15,'#e8cc9c');
    for(let i=0;i<7;i++){p.oval(x+i*w/6,y+h*.78+(i%2)*9,w*.15,h*.21,['#698576','#57776e','#44685f'][i%3]);}
    p.rect(x+w/2-3,y,6,h,'#cecab0');p.rect(x,y+h*.52,w,5,'#cecab0');p.rect(x-10,y+h,w+20,9,'#d2c8a8');
  }
  function books(c,x,y,w,rows=3,seed=0){
    const p=pen(c);p.rect(x-5,y-10,w+10,rows*43+15,'#293b3c');
    for(let row=0;row<rows;row++){
      for(let i=0;i<Math.floor(w/13);i++){const h=21+random(i+row*19+seed)*16;const xx=x+i*13,yy=y+row*43+28-h;p.rect(xx,yy,10,h,['#bb916e','#829d8c','#8d747d','#b4b48f','#668995'][(i+row+seed)%5]);p.rect(xx+2,yy+4,1,h-8,'#e6dcc04d');}
      p.rect(x-5,y+row*43+29,w+10,5,'#b8a27d');
    }
  }
  function plant(c,x,y,size=1){
    const p=pen(c);p.rect(x-12*size,y-29*size,24*size,29*size,'#ae8b68');p.rect(x-15*size,y-31*size,30*size,5*size,'#d0b58c');
    for(let i=0;i<5;i++){const xx=x+(i-2)*12*size,yy=y-(51+Math.abs(i-2)*9)*size;p.line(x,y-28*size,xx,yy,'#547460',2*size);p.oval(xx,yy,8*size,18*size,['#81976b','#637f62','#9baa79'][i%3]);}
  }
  function kettle(c,x,y){const p=pen(c);p.oval(x,y,22,16,'#c8d2c2');p.rect(x-16,y-20,32,8,'#94aeaa');p.oval(x,y-22,5,4,'#546f71');p.line(x+21,y+2,x+35,y-14,'#c8d2c2',6);c.strokeStyle='#a3b6a9';c.lineWidth=4;c.beginPath();c.arc(x-20,y-3,16,1.8,4.7);c.stroke();}
  bank.paintOffice=function(c,id){
    const p=pen(c),colors=palettes[id]||palettes.vorontsov;
    p.rect(0,0,410,375,colors[1]);p.rect(8,8,394,350,colors[0]);p.rect(8,222,394,136,colors[1]+'99');p.rect(8,217,394,4,colors[2]);
    p.rect(8,357,394,18,colors[2]);p.rect(16,15,378,3,colors[2]+'80');
    // The lower middle stays clear for name labels and the seated portrait.
    if(id==='maisuradze'){
      windowPane(c,32,33,161,122);p.rect(225,150,144,9,'#b69876');p.rect(227,159,6,50,'#3b4947');kettle(c,276,132);
      p.rect(319,132,17,17,'#dcc19d');p.oval(327,131,9,3,'#5a4b43');plant(c,366,212,.73);
      p.rect(233,38,114,58,'#4a4a4e');p.text('ЧАЙ ПОСЛЕ ПАР',244,63,'#ead5b1',11);p.text('теоремы подождут',242,81,'#bcbfb0',10);
    }else if(id==='kitov'){
      p.rect(28,33,220,118,'#93acaa');p.rect(33,38,210,108,'#183746');p.rect(282,29,92,181,'#26353d');
      for(let i=0;i<5;i++){p.rect(291,40+i*32,74,24,'#496069');for(let j=0;j<4;j++)p.rect(300+j*9,47+i*32,3,3,j===0?'#c4d796':'#86bcae');p.line(341,55+i*32,356,55+i*32,'#203941',2);}
      p.rect(42,151,193,18,'#233f47');p.text('MESSAGE PASSING →',53,164,'#a2c7b6',11);
    }else if(id==='mestetsky'){
      p.rect(26,28,239,140,'#b7ab8c');p.rect(32,34,227,128,'#ded4b4');
      for(let x=45;x<250;x+=18)p.line(x,37,x,159,'#a2b9ad55');for(let y=48;y<160;y+=18)p.line(35,y,255,y,'#a2b9ad55');
      p.line(58,154,134,58,'#416976',3);p.line(134,58,232,147,'#416976',3);p.line(232,147,58,154,'#416976',3);p.oval(144,130,31,31,'#c1b48066');p.text('∂Ω',172,87,'#5d6d69',19);
      books(c,294,40,73,3,2);p.rect(290,193,82,7,'#b9a47e');
    }else if(id==='dyukova'){
      p.rect(27,29,215,135,'#baa27d');p.rect(33,35,203,123,'#354c45');p.text('ЛОГИКА ПРИЗНАКОВ',48,60,'#e4d9b4',12);
      p.text('A   B   A ∧ B',54,86,'#c6d4b4',16);for(let i=0;i<3;i++){p.text(['0   0     0','0   1     0','1   1     1'][i],54,109+i*23,'#a7c3ab',14);}
      books(c,277,34,101,4,3);p.rect(35,246,198,9,'#aa926c');p.rect(45,235,64,10,'#c1b89b');
    }else if(id==='senko'){
      p.rect(29,28,229,140,'#a9b7ac');p.rect(35,34,217,128,'#e0dbc2');p.text('ДАННЫЕ → ВЫВОД',48,55,'#4c6970',12);
      p.line(49,155,143,155,'#608084',2);p.line(49,155,49,76,'#608084',2);
      for(let i=0;i<23;i++)p.oval(54+random(i)*79,145-random(i+13)*60,2,2,i%3?'#5e8d86':'#ba8e75');
      for(let i=0;i<5;i++){const h=25+random(i+61)*60;p.rect(161+i*15,156-h,10,h,['#839d87','#bba271'][i%2]);}books(c,292,36,80,3,0);
    }else if(id==='grabovoy'){
      p.rect(26,29,238,136,'#a38d6a');p.rect(32,35,226,124,'#736e59');
      for(let i=0;i<6;i++){const x=43+(i%3)*70,y=40+Math.floor(i/3)*63;p.rect(x,y,57,53,i%2?'#d3d8c0':'#e4d5b3');p.oval(x+27,y+4,3,3,'#b16d5e');for(let j=0;j<4;j++)p.line(x+7,y+18+j*9,x+48-(j%2)*12,y+18+j*9,'#778c83');}
      p.rect(291,151,79,43,'#bec6b5');p.rect(299,163,64,8,'#405559');p.rect(305,128,48,30,'#e2dac0');books(c,292,42,75,2,4);
    }else if(id==='ishchenko'){
      windowPane(c,32,34,205,120);p.rect(280,28,94,188,'#243c44');p.rect(287,35,80,173,'#54747a');
      for(let i=0;i<6;i++){p.rect(294,45+i*25,66,19,'#2f4c55');p.rect(301,52+i*25,4,3,'#d3c482');p.line(316,53+i*25,352,53+i*25,'#80a69e',2);}
    }else{
      p.rect(27,30,231,138,'#b9af8c');p.rect(33,36,219,126,'#2e4c48');p.text('ОБУЧЕНИЕ БЕЗ СПЕШКИ',47,60,'#d2d9b7',12);
      p.line(52,146,228,146,'#91aaa0');p.line(52,146,52,80,'#91aaa0');
      for(let i=0;i<12;i++)p.line(53+i*14,139-52*Math.exp(-i*.3),67+i*14,139-52*Math.exp(-(i+1)*.3),'#e0c68d',2);
      p.text('train / validation',72,95,'#acc8b1',12);books(c,291,37,82,3,1);
    }
    p.rect(277,231,98,5,colors[2]);p.rect(319,211,4,20,'#b3aa86');p.rect(301,202,40,10,'#e2cd9a');
    p.rect(21,169,248,68,colors[1]+'cc');
  };
  function connector(c,type){
    const p=pen(c);p.rect(0,0,340,410,'#334a4c');p.rect(0,0,340,5,'#b6af8f');p.rect(0,370,340,40,'#294044');
    if(type===0||type===6){
      windowPane(c,29,31,282,249);p.rect(20,337,302,9,'#bdac84');p.rect(32,346,7,42,'#273c43');p.rect(301,346,7,42,'#273c43');plant(c,54,337,.55);
      p.text(type===6?'НА КРЫШУ  →':'ЛЕТНИЙ ВЕЧЕР',type===6?185:153,326,'#d4d6b6',15);
    }else if(type===1){
      p.rect(20,39,300,262,'#b39c77');p.rect(27,46,286,248,'#796f5c');p.text('СЕМИНАРЫ / ММП',61,74,'#e9dfbf',19);
      for(let i=0;i<6;i++){const x=40+(i%3)*91,y=96+Math.floor(i/3)*91;p.rect(x,y,77,77,['#d7d4b4','#aac4b9','#d7b89c'][i%3]);p.oval(x+38,y+5,3,3,'#ab6b63');p.text(['ML','∑','DL','ПРАК','БАЙЕС','GNN'][i],x+11,y+29,'#385d60',14);for(let k=0;k<3;k++)p.line(x+11,y+42+k*9,x+64,y+42+k*9,'#68847e');}
      plant(c,292,391,.9);
    }else if(type===2){
      p.rect(19,38,302,237,'#6e6860');p.rect(31,55,278,126,'#87978b');p.text('ЧАЙНАЯ ПАУЗА',87,84,'#f0e1bd',19);p.text('Пять минут — и обратно к леммам',49,111,'#e2d7b7',12);
      p.rect(25,219,290,12,'#c7b38b');p.rect(34,231,273,87,'#657571');p.line(171,235,171,310,'#3d575b',2);kettle(c,99,198);p.rect(161,200,19,19,'#dbc9a1');p.rect(195,199,21,20,'#a7c6bb');plant(c,270,219,.58);
      p.rect(50,352,240,17,'#83988a');p.rect(64,369,10,20,'#354e52');p.rect(276,369,10,20,'#354e52');
    }else if(type===3){
      p.rect(21,31,298,326,'#b09a76');books(c,34,60,272,6,1);p.text('БИБЛИОТЕКА КАФЕДРЫ',56,332,'#e3d7ba',16);
      p.rect(31,365,281,12,'#8c7c61');
    }else if(type===4){
      p.rect(21,39,299,281,'#a4b1a5');p.rect(28,46,285,267,'#203b47');p.text('ВЫЧИСЛИТЕЛЬНАЯ',62,78,'#c1d7c1',16);
      for(let i=0;i<3;i++){p.rect(46+i*88,105,72,181,'#527279');for(let j=0;j<7;j++){p.rect(52+i*88,113+j*24,60,18,'#294a55');p.line(71+i*88,120+j*24,102+i*88,120+j*24,'#769a9b',2);}}
      p.line(172,49,270,306,'#c2d8cc22',12);p.text('эксперимент идёт…',70,351,'#94bab0',16);
    }else{
      p.text('НАУКА НА ПОЛЯХ',70,57,'#d8d5b5',20);
      for(let i=0;i<3;i++){
        const x=18+i*108;p.rect(x,86,98,172,'#b1a27f');p.rect(x+5,91,88,162,['#7d9d98','#9ea78a','#bdad8c'][i]);p.text(['∫ f(x) dx','P(A | B)','V − E + F'][i],x+9,121,'#23484d',13);
        c.strokeStyle='#e0dbc1';c.lineWidth=2;c.beginPath();for(let j=0;j<6;j++){const xx=x+48+Math.cos(j*Math.PI/3)*29,yy=185+Math.sin(j*Math.PI/3)*31;if(j)c.lineTo(xx,yy);else c.moveTo(xx,yy);}c.closePath();c.stroke();
      }plant(c,271,387,1.03);p.rect(27,351,164,11,'#b6a483');p.rect(36,362,8,29,'#2b4348');p.rect(174,362,8,29,'#2b4348');
    }
  }
  bank.drawCorridor=function(c,world,t){
    const p=pen(c),cam=world.camera;
    p.rect(0,0,1280,720,'#233c43');p.rect(0,105,1280,502,'#41575a');p.rect(0,105,1280,8,'#b6b092');p.rect(0,570,1280,40,'#2d464a');p.line(0,585,1280,585,'#728b82');
    for(let i=0;i<7;i++){
      const x=750+i*780-cam;if(x<-340||x>1280)continue;
      c.drawImage(cached('connector-'+i,340,410,ctx=>connector(ctx,i)),Math.round(x),174);
      if(i===4)for(let j=0;j<3;j++)p.rect(x+58+j*88,294,4,4,Math.sin(t*1.2+j)>0?'#dbd694':'#698e82');
    }
    const foyer=70-cam;if(foyer>-260&&foyer<1280){p.rect(foyer,184,228,347,'#2e474c');p.rect(foyer+8,192,212,331,'#647c74');p.text('КАФЕДРА ММП',foyer+22,235,'#e5dcb8',23);p.text('МАТЕМАТИКА И ПРАКТИКА',foyer+23,265,'#b8cec0',11);p.rect(foyer+29,299,166,143,'#254950');p.text('→  КАБИНЕТЫ',foyer+43,337,'#e4d3a8',18);p.text('→  ПРАКТИКУМ',foyer+43,375,'#bdcbb1',17);p.text('→  НА КРЫШУ',foyer+43,411,'#bdcbb1',17);plant(c,foyer+190,563,1);}
    const end=6490-cam;if(end>-500&&end<1280){windowPane(c,end+15,201,380,248);p.text('КОМНАТА ПРАКТИКУМА  →',end+28,490,'#d3d4b2',20);plant(c,end+375,568,.9);}
    for(let i=0;i<10;i++){const x=280+i*780-cam;if(x<-200||x>1380)continue;p.rect(x,127,200,5,'#91a59c');p.rect(x+12,132,176,5,'#ddd2a8');}
  };
  bank.drawSummer=function(c,world,t){
    const p=pen(c),cam=world.camera;p.rect(0,0,1280,720,'#a9c3b8');
    if(bank.panorama)c.drawImage(bank.panorama,Math.round(-cam*.25),-28);
    root.GurovCourtyardCrowd?.draw(c,world,world.time);
    p.rect(0,580,1280,30,'#b1ae87');p.line(0,580,1280,580,'#e1d2a7',4);p.rect(0,610,1280,110,'#293c39');
    const x=world.level.exit.x-135-cam;
    if(x<1280&&x> -500)c.drawImage(cached('courtyard-entry',460,420,ctx=>{
      const q=pen(ctx);q.rect(0,0,460,420,'#adad95');q.rect(7,8,453,399,'#d1c6a3');q.rect(0,0,460,12,'#e8d5aa');
      for(let i=0;i<5;i++){q.rect(18+i*88,24,63,145,'#446673');q.rect(19+i*88,25,61,12,'#6f8d8c');q.rect(46+i*88,25,4,143,'#babda5');q.rect(19+i*88,86,61,4,'#b5b8a0');}
      q.rect(85,190,229,43,'#365657');q.text('ВМК · ВХОД',118,209,'#f0dfb9',18);q.rect(99,242,147,178,'#89917e');q.rect(84,233,180,11,'#e5d1a3');
    }),Math.round(x),190);
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
      for(let i=0;i<8;i++){const x=((i*271+t*(13+i%3*6)-cam*.38)%1600+1600)%1600-100,y=165+random(i)*340+Math.sin(t*.7+i)*18;c.save();c.translate(x,y);c.rotate(Math.sin(t+i)*.5);p.oval(0,0,4,2,'#d7cd8066');c.restore();}
      for(let i=0;i<2;i++){const x=((t*20+i*730-cam*.08)%1550+1550)%1550-80,y=130+i*34+Math.sin(t*.6+i)*9,wing=Math.sin(t*6+i)*4;p.line(x-7,y+wing,x,y,'#496e7480',1.4);p.line(x,y,x+7,y+wing,'#496e7480',1.4);}
    }
  };
  bank.drawSummerPlatform=function(c,platform,cam){
    const p=pen(c),x=Math.round(platform.x-cam),y=platform.y,w=platform.w;
    if(platform.kind==='floor'){
      p.rect(x,y,w,platform.h,'#857a5f');p.rect(x,y,w,6,'#e6d5a6');p.rect(x,y+6,w,8,'#b9b08b');p.rect(x,y+14,w,6,'#667659');
      for(let row=0;row<3;row++)for(let k=Math.max(0,Math.floor(-x/82)*82);k<Math.min(w,1280-x+82);k+=82){const xx=x+k;p.line(xx,y+35+row*31,Math.min(x+w,xx+80),y+35+row*31,'#aa9f7b55');p.line(xx,y+22+row*31,xx,y+34+row*31,'#625e4f44');}
    }else{
      p.rect(x,y+5,w,19,'#685c43');p.rect(x,y,w,6,'#f0d6a1');p.rect(x+3,y+7,w-6,5,'#b59a67');
      for(let i=0;i<w;i+=29)p.line(x+i,y+7,x+i,y+24,'#3c574d',2);
      p.rect(x+9,y+24,6,19,'#40665a');p.rect(x+w-15,y+24,6,19,'#40665a');p.line(x+9,y+39,x+32,y+24,'#40665a',3);p.line(x+w-9,y+39,x+w-32,y+24,'#40665a',3);
    }
  };
  const image=new Image();image.onload=()=>{bank.panorama=document.createElement('canvas');bank.panorama.width=2000;bank.panorama.height=Math.round(2000*image.height/image.width);const c=bank.panorama.getContext('2d');c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(image,0,0,bank.panorama.width,bank.panorama.height);bank.ready=true;};image.onerror=()=>{bank.failed=true;console.error('Summer courtyard artwork failed to load');};
  image.src=root.GUROV_ENVIRONMENT_DATA?.courtyard||'assets/backgrounds/vmk-summer-v1.9.png';
  root.GurovEnvironments=bank;
})(window);
