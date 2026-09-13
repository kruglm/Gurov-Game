/* Deterministic game simulation; renderer and platform independent. */
(function (root) {
  'use strict';
  const W = 1280, H = 720, PLAYER_W = 54, PLAYER_H = 123, PLAYER_ART_H = 146;
  const FINAL_LEVEL=3,CAMPAIGN=3;
  const UPGRADES=Object.freeze({paperHeal:2,paperDuration:1.2,paperCooldown:20,lowHealth:2,homingRange:760,homingSpeed:620,homingTurn:5.5});
  const COMBAT=Object.freeze({hit:2,heavy:3,romanHP:3,erikHP:18,ivanHP:20,maxHostile:32,romanTell:.65,romanRushSpeed:365,romanRushTime:.42,romanRecovery:.85,ivanCycle:2.5,ivanWallTell:.9,ivanWallLife:5,ivanWallHP:2,ivanWallCool:8,ivanHealCharges:2,ivanHealDelay:1.4,ivanHealAmount:2});
  const FACULTY=typeof module!=='undefined'&&module.exports?require('./faculty-data.js'):root.GurovFacultyData;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const lisp = text => text.replace(/[сш]/g,'ф').replace(/[СШ]/g,'Ф');
  const CHAPTERS = [
    {name:'По следам Павленко',subject:'ЛЕТНИЙ ДВОР ВМК',color:'#eccb83',
     intro:'Летний вечер во дворе ВМК. Иван Павленко прихватил папку с итоговой работой и сбежал с защиты. Гуров отправляется за ним мимо второго учебного корпуса, деревьев и скамеек. На бегу Иван роняет удовлы за диплом: соберите три больших листа с оценкой «3», чтобы открыть следующий проход. Дорожки заняты: придётся искать обходы и отбиваться на ходу. По двору бегают Романы Акрамовы. Их создаёт Иван, чтобы задержать Гурова.',
     quote:'«Иван, вернитесь. У меня всего один вопрос».',outro:'Иван проскочил в скалодром и захлопнул проход на крышу. В зале всё ещё горит свет. Нужно найти другой путь наверх.',
     note:'Соберите три больших удовла за диплом, чтобы открыть следующий проход. Маленькие удовлы дают очки. Иван мелькает впереди: идите за ним.'},
    {name:'Ночной скалодром',subject:'ПО СЛЕДАМ БЕГЛЕЦА',color:'#8ce0d2',
     intro:'Следы Ивана ведут через опустевший скалодром. Между дорожками лежат знакомые листы с оценками. Где-то впереди слышен разговор, а дверь наверх закрыта. Осмотритесь: в зале может найтись другой путь.',
     quote:'«Зацепка — ещё не доказательство».',outro:'Эрик просит прощения и получает «удовлетворительно» за диплом. Спасённый Равиль присоединяется к Гурову: пора догнать Ивана и вернуться к тропической алгебре. По схеме переходов путь ведёт через кафедру ММП к лестнице на крышу.',
     note:'Соберите три больших удовла и найдите проход наверх. Если встретите кого-нибудь, нажмите E, чтобы поговорить.'},
    {name:'Вечер на кафедре ММП',subject:'КАФЕДРА · ЧАЙ · НЕЙРОСЕТИ',color:'#b9d3a1',
     intro:'До крыши можно добраться через кафедру ММП. В кабинетах ещё горит свет: преподаватели проверяют работы, обсуждают математику и замечают пробегающего Гурова. Майсурадзе уже поставил чайник, а Китов разбирается с графовыми нейросетями. Пройдите коридор и найдите лестницу на крышу.',
     quote:'«Сергей Исаевич, зайдите ко мне на чай вечером)))»',outro:'Кафедра остаётся позади. За следующей дверью — крыша, Иван и целый запас помидоров. Погоня закончится, только когда беглец будет пойман.',
     note:'Удовлы в этой главе необязательны. Преподаватели разговаривают, когда вы проходите рядом. В коридоре обсуждают новые курсы — можно задержаться и послушать. Ищите лестницу в конце коридора.'},
    {name:'Поймать Павленко',subject:'БЕСКОНЕЧНАЯ КРЫША',color:'#efbca1',
     intro:'Иван бежит по бесконечной крыше и бросает помидоры. Здесь нечего собирать: только вы, Равиль и беглец. Попадания челюстью и леммами лишают Ивана сил. Когда он выдохнется, подойдите вплотную и нажмите E. Крыша продолжится сколько угодно — финал наступит после поимки!',
     quote:'«От вопроса далеко не убежишь».',outro:'Иван пойман и возвращает работу. Защита наконец может начаться.',
     note:'Сокращайте дистанцию рывком и стреляйте. Перепрыгивайте помидоры. Когда запас сил Ивана иссякнет, подойдите ближе и нажмите E. Сбор предметов не нужен.'}
  ];
  const ROMAN_LINES=['Я поднял MCP-сервер. Почти прод!', 'Это не коридор, это B2B-проект.', 'Сейчас целиком напишу статью с Claude Code!', 'Я потратил триллион токенов. Это только введение.', 'Claude Code, ещё триллион — и статья готова!', 'MCP-сервер пишет статью, я руковожу B2B.', 'Claude Code уже всё за меня написал.', 'Сначала созвон, потом погоня.', 'Я завернул это в MCP-сервер.', 'Гуров, давайте обсудим unit-экономику.'];
  const RAVIL_LINES=['Гуров, я вас люблю!', 'Хочу только вас, профессор.', 'Моя любимая лемма — это вы.', 'Я хочу быть рядом с вами, Гуров.', 'Я прикрою вас. Вы мне очень дороги.', 'Спасибо, что вытащили меня от Эрика!', 'Теперь никакой клетки. Только тропическая алгебра!', 'Сергей Исаевич, вы мой любимый базис.', 'Ради вас я даже доказательство перепишу.', 'Моё сердце работает над тропическим полукольцом.', 'Гуров, можно после погони остаться с вами?', 'Я хочу вас обнять. Но сначала поймаем Ивана!', 'Ваша челюсть убедительнее любого контрпримера.', 'Эрик всё согласовал. Кроме моего освобождения.', 'Профессор, я принёс конспект и всю свою любовь.', 'Вы бежите — я прикрываю. Идеальная пара!', 'Все хотят чаю. А я хочу к вам на семинар.', 'Павленко не скроется от нашей леммы!', 'Тропическая алгебра подождёт. Вы важнее.', 'Ни один помидор не разрушит наше доказательство.'];
  function migrateSave(saved){
    if(!saved||typeof saved!=='object'||Array.isArray(saved))return null;
    const stats=value=>Object.fromEntries(['sparks','diplomas','defeats','deaths','elapsed'].map(key=>{
      const n=value?.[key];return [key,Number.isFinite(n)&&n>=0?(key==='elapsed'?n:Math.floor(n)):0];
    }));
    const s={...saved,stats:stats(saved.stats),taken:Array.isArray(saved.taken)?saved.taken.filter(id=>typeof id==='string'):[],checkpoint:Number.isInteger(saved.checkpoint)?saved.checkpoint:0};
    if(saved.chapterStart?.stats&&typeof saved.chapterStart.stats==='object')s.chapterStart={...saved.chapterStart,stats:stats(saved.chapterStart.stats)};
    else delete s.chapterStart;
    if(s.campaign===2){s.stats.diplomas=s.level>=2?6:s.level*3+(s.taken||[]).filter(id=>id.startsWith('page')).length;if(s.level===2){s.level=FINAL_LEVEL;s.checkpoint=0;s.taken=[];}s.campaign=CAMPAIGN;}
    return s;
  }
  function roman(x,seed,min,max,speed,lineIndex=seed){return {x,y:515,w:50,h:95,kind:'roman',name:'Роман Акрамов',min,max,vx:speed,patrolSpeed:Math.abs(speed),facing:Math.sign(speed),hp:COMBAT.romanHP,maxHp:COMBAT.romanHP,hit:0,seed,gait:0,wait:0,speech:'',speechTime:0,emote:0,lineIndex,phase:'patrol',attackCool:1+seed*.45,actionTime:0,attackTurn:seed,aim:null};}
  function departmentLevel(){
    const width=7600,platforms=[],gaps=[[1830,1970],[3730,3870],[5630,5770]];let start=0;
    for(const [a,b] of gaps){platforms.push({x:start,y:610,w:a-start,h:160,kind:'floor'});start=b;}
    platforms.push({x:start,y:610,w:width-start,h:160,kind:'floor'});
    const items=[];
    for(let i=0;i<13;i++){
      const x=390+i*540,y=i%3===1?430:515;
      platforms.push({x,y,w:185,h:24,kind:'ledge'});
      // Upper rewards clear the office nameplates; the lower one at Dyukova
      // stays to the right of her face. Each remains above its reachable ledge.
      items.push({x:x+(i===6?160:i===9?100:70),y:y===430?320:y-40,w:18,h:18,type:'spark',id:'department-udovl-'+i,taken:false});
    }
    const enemies=[1120,2780,4580,6500].map((x,i)=>roman(x,i,x-60,x+80,70,i+2));
    let office=0,group=0;
    const faculty=FACULTY.map(n=>({...n,x:n.group==='course-team'?7090+group++*135:530+office++*780,speech:'',speechTime:0,line:0}));
    return {index:2,width,requiredPages:0,platforms,items,enemies,checkpoints:[{x:120,y:610,active:true},{x:4050,y:610,active:false}],signs:[],boss:null,npc:null,captive:null,faculty,exit:{x:width-145,y:468,w:85,h:142}};
  }
  function encounterLevel(index) {
    const erik=index===1,width=erik?3450:4900;
    const layouts=erik?[[380,515,185],[650,425,185],[1050,515,185],[1340,425,180],[1570,335,185],[2130,450,210],[2850,450,210]]:
      [[430,515,180],[720,425,185],[1260,515,180],[1580,420,185],[2000,510,200],[2420,425,200],[2800,510,185],[3140,420,200],[3500,510,185],[3940,455,210],[4430,485,180]];
    const platforms=[{x:0,y:610,w:width,h:160,kind:'floor'},...layouts.map(([x,y,w])=>({x,y,w,h:24,kind:'ledge'}))];
    const pages=erik?[[705,380],[1120,470],[1640,290]]:[[775,380],[2470,380],[3200,375]];
    const items=pages.map(([x,y],i)=>({x,y,w:30,h:36,type:'page',id:'page'+i,taken:false}));
    layouts.forEach(([x,y],i)=>[0,1,2].forEach(j=>items.push({x:x+30+j*40,y:y-40,w:18,h:18,type:'spark',id:'spark'+i+'-'+j,taken:false})));
    (erik?[1720,2990]:[1160,2730,4190]).forEach((x,i)=>items.push({x,y:565,w:26,h:30,type:'tea',id:'tea'+i,taken:false}));
    const enemies=(erik?[620,1250]:[560,1690]).map((x,i)=>roman(x,i,x-65,x+90,(i%2?-1:1)*74));
    const boss={kind:erik?'erik':'ivan',name:erik?'Эрик Ильясов':'Иван Павленко',x:erik?2560:1280,y:500,w:66,h:110,
      hp:erik?COMBAT.erikHP:COMBAT.ivanHP,maxHp:erik?COMBAT.erikHP:COMBAT.ivanHP,timer:0,active:false,defeated:false,hit:0,phase:'idle',facing:-1,vx:0,gait:0,cycle:-1,volley:-1,stamp:-1,slam:-1,followVolley:-1,
      academic:false,walls:[],wallCool:5,wallTell:null,healCharges:COMBAT.ivanHealCharges,healCool:9,healTime:0,speech:'',speechTime:0,warning:null,slamWarning:false,trapTargets:null,escape:0,escapeCool:0,exhausted:false,enraged:false,enrageAnnounced:false};
    const checkpoints=[{x:120,y:610,active:true},{x:erik?1840:2250,y:610,active:false}];
    const npc=erik?{kind:'sasha',name:'Саша Ситников',x:1740,y:610,helped:false,greeted:false,handoff:0,anchor:1740,gait:0,vx:0}:null;
    const signs=[{x:240,y:610,heading:erik?'ПОВЕСТКА ЗАСЕДАНИЯ':'ОТ РЕЦЕНЗИИ НЕ УБЕЖАТЬ',text:CHAPTERS[index].note}];
    const captive=erik?{x:2790,y:610,speech:'',speechTime:0}:null;
    return {index,width,platforms,items,enemies,checkpoints,signs,boss,npc,captive,exit:{x:width-145,y:468,w:85,h:142}};
  }
  function levelData(index) {
    if(index===2)return departmentLevel();
    if(index===FINAL_LEVEL){const l=encounterLevel(index);l.items=[];l.enemies=[];l.exit=null;l.requiredPages=0;l.endless=true;l.checkpoints=[{x:120,y:610,active:true}];l.signs=[];return l;}
    if(index>0)return encounterLevel(index);
    const width = [3650, 3950, 4300][index];
    const gaps = index === 0 ? [[930, 1090], [1880, 2050], [2760, 2910]] : index === 1 ? [[760, 920], [1560, 1750], [2570, 2760]] : [[950, 1120], [1900, 2070], [2750, 2930]];
    const platforms = [];
    let cursor = 0;
    gaps.forEach(([a,b]) => { platforms.push({ x:cursor,y:610,w:a-cursor,h:160,kind:'floor' }); cursor=b; });
    platforms.push({x:cursor,y:610,w:width-cursor,h:160,kind:'floor'});
    const layouts = [
      [[410,515,190],[690,425,180],[1150,520,160],[1380,430,170],[1600,345,170],[2120,510,190],[2390,420,180],[2670,330,170],[3040,515,190]],
      [[340,515,170],[620,425,160],[990,515,160],[1240,420,190],[1490,330,160],[1830,515,170],[2060,420,170],[2290,335,180],[2840,510,170],[3080,420,170],[3350,330,180]],
      [[380,515,170],[650,425,175],[1180,515,180],[1420,425,180],[1650,335,180],[2130,515,190],[2380,425,180],[2660,335,170],[3020,510,190],[3360,510,190],[3690,455,160],[3990,510,180]]
    ];
    layouts[index].forEach(([x,y,w]) => platforms.push({x,y,w,h:24,kind:'ledge'}));
    if (index > 0) platforms.push({x: index===1?2630:2820,y:510,w:100,h:20,kind:'moving',origin:index===1?2630:2820,phase:0});
    const pagePositions = [ [[760,380],[1670,300],[2455,375]], [[675,380],[2350,290],[3420,285]], [[710,380],[1710,290],[2720,290]] ];
    const items = pagePositions[index].map(([x,y],i) => ({x,y,w:30,h:36,type:'page',id:'page'+i,taken:false}));
    layouts[index].forEach(([x,y,w],i) => {
      [0,1,2].forEach(j => items.push({x:x+32+j*40,y:y-40,w:18,h:18,type:'spark',id:'spark'+i+'-'+j,taken:false}));
    });
    [550,2210].forEach((x,i) => items.push({x,y:565,w:26,h:30,type:'tea',id:'tea'+i,taken:false}));
    const enemyPositions = [ [660,1300,2210,3160], [490,1110,1930,2930,3580], [580,1320,2240,3130] ];
    const enemies = enemyPositions[index].map((x,i) => roman(x,i,x-80,x+115,(i%2?-1:1)*(62+index*12)));
    const checkpoints = [{x:120,y:610,active:true},{x:index===0?2110:index===1?1820:2140,y:610,active:false}];
    const signs = [
      {x:190,y:610,heading:'ДОБРО ПОЖАЛОВАТЬ НА ВМК',text:'A / D — идти. Пробел — прыгнуть. Ещё раз в воздухе — двойной прыжок.'},
      {x:520,y:515,heading:'ЗУБОДРОБИТЕЛЬНЫЙ АРГУМЕНТ',text:'J — выплюнуть вставную челюсть. Shift — рывок с короткой неуязвимостью. Прыжок на противника тоже работает.'},
      {x: index===0?2180:2200,y:510,heading:'ПОЛЯ КОНСПЕКТА',text:CHAPTERS[index].note}
    ];
    const boss = index===2?{x:3880,y:375,w:110,h:125,hp:8,maxHp:8,timer:0,shot:1.3,active:false,defeated:false,hit:0}:null;
    return {index,width,platforms,items,enemies,checkpoints,signs,boss,exit:{x:width-145,y:468,w:85,h:142}};
  }
  class World {
    constructor(index=0, saved=null) {
      const original=saved;saved=migrateSave(saved);if(original?.level===index&&saved?.level!==index)index=saved.level;
      this.level=levelData(index); this.index=index; this.time=0; this.camera=0;
      this.distanceOffset=0;this.roofChunk=null;
      this.events=[]; this.projectiles=[]; this.particles=[]; this.won=false;
      this.upgrade=['homing','paper'].includes(saved?.upgrade)?saved.upgrade:null;
      this.paperCooldown=Number.isFinite(saved?.paperCooldown)?clamp(saved.paperCooldown,0,UPGRADES.paperCooldown):0;
      this.pendingUpgrade=!this.upgrade&&(index>0||!!saved?.pendingUpgrade);
      this.pendingScene=saved?.level===index&&['erik-rescue','ivan-caught','sasha-coursework','maisuradze-tea','course-team'].includes(saved.pendingScene)?saved.pendingScene:null;
      this.stats={sparks:0,diplomas:0,defeats:0,deaths:0,elapsed:0,...saved?.stats};
      this.romanSpeechCool=1;this.nearCatch=false;this.courseworkObtained=!!saved?.courseworkObtained;this.courseworkFlight=0;this.runner=index<2?{x:760,y:610,vx:0,gait:0,phase:'run',speechTime:3,escaped:false}:null;
      this.intro=null;this.companionUnlocked=!!saved?.companionUnlocked||index>=2;this.companion=null;
      this.checkpoint=0; this.pages=0; this.nearSign=null; this.exitHint=0;
      if (saved?.level===index && (index===0 || saved.campaign===CAMPAIGN)) {
        this.checkpoint=clamp(saved.checkpoint||0,0,this.level.checkpoints.length-1);
        this.level.items.forEach(i=>{ i.taken=(saved.taken||[]).includes(i.id); });
        this.pages=this.level.items.filter(i=>i.type==='page'&&i.taken).length;
        this.level.checkpoints.forEach((c,i)=>c.active=i<=this.checkpoint);
        if(saved.bossDefeated&&this.level.boss){this.level.boss.defeated=true;this.level.boss.hp=0;if(index===1){this.companionUnlocked=true;this.level.captive=null;}if(index===FINAL_LEVEL)this.won=true;}
        if(this.level.npc){this.level.npc.helped=!!saved.courseworkObtained;this.level.npc.greeted=this.level.npc.helped;}
      }
      if(this.pendingScene==='sasha-coursework'){
        if(!this.level.npc||!this.courseworkObtained)this.pendingScene=null;
      }else if(['maisuradze-tea','course-team'].includes(this.pendingScene)){
        if(index!==2)this.pendingScene=null;
      }else if(!this.level.boss?.defeated)this.pendingScene=null;
      this.pendingBossOutro=saved?.level===index&&saved.pendingBossOutro===this.level.boss?.kind&&this.pendingScene===(index===1?'erik-rescue':'ivan-caught')?saved.pendingBossOutro:null;
      const restoring=saved?.level===index&&(index===0||saved.campaign===CAMPAIGN);
      const entry=restoring?saved.chapterStart:null;
      // Keep the score earned before this chapter so a full retry cannot farm it.
      this.chapterStart={stats:{},courseworkObtained:restoring?index>=2&&this.courseworkObtained:this.courseworkObtained,companionUnlocked:restoring?index>=2:this.companionUnlocked};
      for(const key of ['sparks','diplomas','defeats']){
        const taken=restoring?this.level.items.filter(i=>i.taken&&i.type===(key==='sparks'?'spark':key==='diplomas'?'page':'')).length:0;
        this.chapterStart.stats[key]=Math.max(0,Number.isFinite(entry?.stats?.[key])?entry.stats[key]:this.stats[key]-taken);
      }
      if(entry){this.chapterStart.courseworkObtained=!!entry.courseworkObtained;this.chapterStart.companionUnlocked=!!entry.companionUnlocked||index>=2;}
      this.awaitingRespawn=!!(restoring&&saved.awaitingRespawn&&!this.won);
      this.deathCause=this.awaitingRespawn?(saved.deathCause==='fall'?'fall':'damage'):null;
      this.deathSource=this.deathCause==='damage'&&['roman','erik','ivan'].includes(saved?.deathSource)?saved.deathSource:null;
      this.spawn();
      if(saved?.level===index&&saved.chapterComplete&&index<FINAL_LEVEL&&this.pages>=(this.level.requiredPages??3)&&(!this.level.boss||this.level.boss.defeated))this.won=true;
    }
    spawn() {
      const cp=this.level.checkpoints[this.checkpoint];
      if(this.index===FINAL_LEVEL&&this.level.boss&&!this.level.boss.active&&!this.level.boss.defeated)this.level.boss.x=Math.max(this.level.boss.x,cp.x+480);
      this.player={x:cp.x,y:cp.y-PLAYER_H,w:PLAYER_W,h:PLAYER_H,vx:0,vy:0,facing:1,grounded:false,jumps:0,coyote:0,jumpBuffer:0,hp:5,inv:1.2,shoot:0,cast:0,dash:0,dashCool:0,gait:0,landing:0,eating:0,healFlash:0};
      this.camera=clamp(this.player.x-W*.3,0,this.level.width-W);
      for(const e of this.level.enemies){e.phase='patrol';e.aim=null;e.actionTime=0;e.attackCool=Math.max(e.attackCool||0,1.2);e.vx=(e.facing||1)*e.patrolSpeed;}
      this.intro=null;this.nearCatch=false;this.nearFaculty=null;this.nearNpc=null;this.nearSign=null;if(this.runner){Object.assign(this.runner,{x:cp.x+600,y:610,vx:0,gait:0,phase:'run',facing:1,patrol:null,patrolDir:-1,escaped:false});}if(this.companionUnlocked)this.spawnCompanion();
      if(this.level.endless){this.distanceOffset=0;this.roofChunk=null;this.updateRoof();}
    }
    emit(type,data={}) { this.events.push({type,...data}); }
    save() { return {version:1,campaign:CAMPAIGN,upgrade:this.upgrade,paperCooldown:this.paperCooldown,pendingUpgrade:this.pendingUpgrade,chapterComplete:this.won&&this.index<FINAL_LEVEL,pendingScene:this.pendingScene,pendingBossOutro:this.pendingBossOutro,awaitingRespawn:this.awaitingRespawn,deathCause:this.deathCause,deathSource:this.deathSource,chapterStart:{...this.chapterStart,stats:{...this.chapterStart.stats}},courseworkObtained:this.courseworkObtained,companionUnlocked:this.companionUnlocked,cameoHelped:!!this.level.npc?.helped,level:this.index,checkpoint:this.checkpoint,taken:this.level.items.filter(i=>i.taken).map(i=>i.id),stats:{...this.stats},bossDefeated:!!this.level.boss?.defeated}; }
    chooseUpgrade(kind){if(this.upgrade||!this.pendingUpgrade||!['homing','paper'].includes(kind))return false;this.upgrade=kind;this.pendingUpgrade=false;this.emit('save');return true;}
    heal(amount,source){const p=this.player,restored=Math.min(5-p.hp,Math.max(0,amount));if(restored<=0||this.awaitingRespawn)return 0;p.hp+=restored;p.healFlash=2;this.emit('heal',{x:p.x+p.w/2,y:p.y+52,amount:restored,source});return restored;}
    eatPaper(){const p=this.player;if(this.upgrade!=='paper'||this.paperCooldown>0||p.eating>0||p.hp>=5||!p.grounded||p.dash>0||this.won||this.awaitingRespawn||this.intro)return false;p.eating=UPGRADES.paperDuration;p.cast=0;this.paperCooldown=UPGRADES.paperCooldown;this.emit('paperEat');this.emit('save');return true;}
    cancelEating(){if(this.player.eating<=0)return;this.player.eating=0;this.emit('paperInterrupted');}
    resumeCheckpoint(){if(!this.awaitingRespawn)return false;this.awaitingRespawn=false;this.deathCause=null;this.deathSource=null;this.player.healFlash=2;this.emit('heal',{x:this.player.x+this.player.w/2,y:this.player.y+52,amount:5,source:'respawn'});this.emit('respawn');this.emit('save');return true;}
    restartLevel(){return new World(this.index,{upgrade:this.upgrade,paperCooldown:this.paperCooldown,stats:{...this.chapterStart.stats,deaths:this.stats.deaths,elapsed:this.stats.elapsed},courseworkObtained:this.chapterStart.courseworkObtained,companionUnlocked:this.chapterStart.companionUnlocked});}
    acknowledgeBossOutro(){this.pendingBossOutro=null;this.emit('save');}
    acknowledgeScene(kind){if(this.pendingScene===kind){this.pendingScene=null;this.pendingBossOutro=null;this.emit('save');}}
    damage(n=COMBAT.hit,sourceX=null,attacker=null) {
      const p=this.player; if(p.inv>0||p.dash>0||this.won||this.awaitingRespawn)return;
      this.cancelEating();p.healFlash=0;
      p.hp-=n;p.inv=1.35;p.vy=-300;p.vx=sourceX===null?-p.facing*230:(p.x<sourceX?-280:280);
      this.emit('hurt',{x:p.x,y:p.y,damage:n});
      if(p.hp<=0)this.die('damage',attacker);
    }
    die(cause='damage',attacker=null) {
      if(this.awaitingRespawn||this.won)return;
      const fatal={player:{...this.player},camera:this.camera,cause,source:attacker};
      this.stats.deaths++;
      if(this.level.boss&&!this.level.boss.defeated){this.level.boss=levelData(this.index).boss;if(this.index===FINAL_LEVEL)this.level.boss.x=Math.max(this.level.boss.x,this.level.checkpoints[this.checkpoint].x+480);}
      // Prepare the checkpoint immediately, but do not simulate it until a choice.
      this.spawn();this.projectiles=[];this.awaitingRespawn=true;this.deathCause=cause==='fall'?'fall':'damage';
      this.deathSource=this.deathCause==='damage'&&['roman','erik','ivan'].includes(attacker)?attacker:null;
      this.emit('death',fatal);this.emit('save');
    }
    enemyShot(owner,type,x,y,vx,vy,w=28,h=24,extra={}){
      if(this.projectiles.filter(s=>s.enemy&&s.life>0).length>=COMBAT.maxHostile)return false;
      this.projectiles.push({type,owner,x,y,vx,vy,w,h,age:0,life:4,enemy:true,damage:COMBAT.hit,...extra});return true;
    }
    updateRoman(e,dt){
      const p=this.player,dx=p.x+p.w/2-e.x-e.w/2;
      e.attackCool=Math.max(0,e.attackCool-dt);
      if(e.phase==='rushWindup'||e.phase==='burstWindup'){
        e.vx=0;e.actionTime-=dt;if(e.actionTime>0)return;
        if(e.phase==='rushWindup'){e.phase='rush';e.actionTime=COMBAT.romanRushTime;e.vx=e.facing*COMBAT.romanRushSpeed;this.emit('enemyRush',{x:e.x,y:e.y});}
        else{
          e.phase='burst';e.actionTime=.22;
          const x=e.x+e.w/2+e.facing*28,y=e.y+24,angle=Math.atan2(e.aim.y-y,e.aim.x-x);
          [-.14,0,.14].forEach(a=>this.enemyShot('roman','mcp',x-14,y-12,Math.cos(angle+a)*330,Math.sin(angle+a)*330));this.emit('mcpShot');
        }
        return;
      }
      if(e.phase==='rush'||e.phase==='burst'){
        const old=e.x;if(e.phase==='rush'){e.x=clamp(e.x+e.vx*dt,e.min,e.max);e.gait+=Math.abs(e.x-old)/100;}
        e.actionTime-=dt;
        if(e.actionTime<=0||(e.phase==='rush'&&e.x===old)){e.phase='recover';e.vx=0;e.actionTime=COMBAT.romanRecovery;}
        return;
      }
      if(e.phase==='recover'){e.vx=0;e.actionTime-=dt;if(e.actionTime<=0){e.phase='patrol';e.attackCool=2.2+e.seed*.25;e.vx=e.facing*e.patrolSpeed;}return;}
      const visible=e.x-this.camera>35&&e.x-this.camera<W-60;
      if(e.attackCool<=0&&visible&&Math.abs(dx)<530&&Math.abs(p.y+60-e.y)<210){
        e.facing=dx<0?-1:1;
        const space=e.facing>0?e.max-e.x:e.x-e.min;
        e.phase=Math.abs(dx)<170&&Math.abs(p.y+p.h-610)<75&&space>45&&e.attackTurn++%2===0?'rushWindup':'burstWindup';
        e.aim={x:p.x+p.w/2,y:p.y+p.h*.45};e.actionTime=COMBAT.romanTell;e.vx=0;e.speechTime=0;
        this.emit('combatTell',{owner:'roman'});return;
      }
      if(e.wait<=0){e.x+=e.vx*dt;e.gait+=Math.abs(e.vx)*dt/100;}
      if(e.x<e.min||e.x>e.max){e.x=clamp(e.x,e.min,e.max);e.facing*=-1;e.vx=e.facing*e.patrolSpeed;e.wait=.35;}
    }
    update(dt,input={}) {
      if(this.won||this.awaitingRespawn)return;
      if(this.intro){this.intro.time+=Math.min(dt,1/30);if(input.skipIntro&&this.intro.time>.6)this.intro.time=this.intro.duration;if(this.intro.time>=this.intro.duration){this.intro=null;this.emit('bossStart',{name:this.level.boss.name});}return;}
      dt=clamp(dt,0,1/30); this.time+=dt;this.stats.elapsed+=dt;
      const p=this.player,L=this.level;
      if(L.endless)this.updateRoof();
      ['inv','shoot','cast','dashCool','coyote','jumpBuffer','landing','healFlash'].forEach(k=>p[k]=Math.max(0,p[k]-dt));
      this.paperCooldown=Math.max(0,this.paperCooldown-dt);
      if(input.jump||input.dash)this.cancelEating();
      if(input.heal&&!input.jump&&!input.dash)this.eatPaper();
      this.exitHint=Math.max(0,this.exitHint-dt);this.romanSpeechCool=Math.max(0,this.romanSpeechCool-dt);this.courseworkFlight=Math.max(0,this.courseworkFlight-dt);if(L.npc)L.npc.handoff=Math.max(0,L.npc.handoff-dt);
      this.updateRunner(dt);
      if(L.npc){
        const n=L.npc,near=Math.abs(p.x-n.anchor)<250;
        const target=n.helped?n.x:near?n.anchor+Math.sign(p.x-n.anchor)*42:n.anchor;
        const step=clamp(target-n.x,-58*dt,58*dt);n.vx=step/Math.max(dt,.0001);n.x+=step;n.gait+=Math.abs(step)/98;
      }
      for(const platform of L.platforms)if(platform.kind==='moving'){
        const old=platform.x;platform.x=platform.origin+Math.sin(this.time*1.1)*70;
        if(p.grounded&&Math.abs(p.y+p.h-platform.y)<3&&p.x+p.w>old&&p.x<old+platform.w)p.x+=platform.x-old;
      }
      if(input.jump)p.jumpBuffer=.13;
      if(p.grounded){p.coyote=.11;p.jumps=0;}
      if(p.jumpBuffer>0&&(p.grounded||p.coyote>0||p.jumps<2)){
        const second=!p.grounded&&p.coyote<=0;
        p.vy=second?-610:-665;p.jumps=second?2:1;p.grounded=false;p.coyote=0;p.jumpBuffer=0;
        this.emit('jump',{x:p.x+p.w/2,y:p.y+p.h,second});
      }
      if(input.jumpReleased&&p.vy<-270)p.vy=-270;
      const move=p.eating>0?0:(input.right?1:0)-(input.left?1:0);
      if(move)p.facing=move;
      if(input.dash&&p.dashCool<=0){p.dash=.18;p.dashCool=.9;this.emit('dash',{x:p.x,y:p.y});}
      if(p.dash>0){p.dash=Math.max(0,p.dash-dt);p.vx=p.facing*860;p.vy=0;}
      else { const goal=move*305;p.vx+=(goal-p.vx)*Math.min(1,dt*(p.grounded?15:8));p.vy=Math.min(950,p.vy+1850*dt); }
      if(input.shoot&&p.shoot<=0&&p.eating<=0){
        p.shoot=.34;p.cast=.27;
        const mouthX=p.x+p.w/2+p.facing*27,mouthY=p.y+25.5;
        const homing=this.upgrade==='homing';
        this.projectiles.push({type:'jaw',homing,x:mouthX-13,y:mouthY-9,w:26,h:18,vx:p.facing*(homing?UPGRADES.homingSpeed:690),vy:homing?0:70,life:homing?1.8:1.5,age:0,bounces:homing?0:2,enemy:false});
        this.emit('shoot',{x:mouthX,y:mouthY,facing:p.facing});
      }
      const previousX=p.x;p.x=clamp(p.x+p.vx*dt,0,L.width-p.w);
      for(const wall of L.boss?.walls||[])if(wall.hp>0&&overlap(p,wall)){p.x=previousX+p.w<=wall.x+8?wall.x-p.w:previousX>=wall.x+wall.w-8?wall.x+wall.w:previousX;p.vx=0;}
      for(const q of L.platforms)if(q.kind==='floor'&&overlap(p,q)&&p.y+p.h>q.y+12){p.x=p.vx>0?q.x-p.w:q.x+q.w;p.vx=0;}
      const wasGrounded=p.grounded,fallSpeed=p.vy;
      const oldBottom=p.y+p.h;p.y+=p.vy*dt;p.grounded=false;
      if(p.vy>=0)for(const q of [...L.platforms,...(L.boss?.walls||[])]){
        if(p.x+p.w>q.x+2&&p.x<q.x+q.w-2&&oldBottom<=q.y+8&&p.y+p.h>=q.y){
          p.y=q.y-p.h;p.vy=0;p.grounded=true;break;
        }
      }
      if(p.grounded){
        if(!wasGrounded&&fallSpeed>140){p.landing=.15;this.emit('land',{x:p.x+p.w/2,y:p.y+p.h,force:Math.min(1,fallSpeed/800)});}
        const oldStep=Math.floor(p.gait*2);
        if(p.dash<=0)p.gait+=Math.abs(p.vx)*dt/115;
        if(Math.floor(p.gait*2)!==oldStep&&Math.abs(p.vx)>90)this.emit('step',{x:p.x+p.w/2,y:p.y+p.h});
      }
      if(p.y>H+160){this.die('fall');return;}
      for(const e of L.enemies){
        e.speechTime=Math.max(0,(e.speechTime||0)-dt);e.emote=Math.max(0,(e.emote||0)-dt);
        if(e.hp<=0)continue;e.hit=Math.max(0,e.hit-dt);e.wait=Math.max(0,e.wait-dt);
        if(this.romanSpeechCool<=0&&Math.abs(e.x-p.x)<420&&e.phase==='patrol'){e.speech=ROMAN_LINES[e.lineIndex++%ROMAN_LINES.length];e.speechTime=3.2;e.emote=1.6;this.romanSpeechCool=6.5;this.emit('romanSpeech',{speech:e.speech});}
        this.updateRoman(e,dt);
        if(overlap(p,e)){
          if(p.vy>80&&oldBottom<e.y+22){e.hp=Math.max(0,e.hp-2);e.hit=.18;e.phase='recover';e.vx=0;e.actionTime=COMBAT.romanRecovery;p.vy=-470;this.emit('hit',{x:e.x+20,y:e.y+20});if(!e.hp){this.stats.defeats++;this.emit('enemy',{x:e.x+20,y:e.y+20,owner:e.kind});}}
          else this.damage(e.phase==='rush'?COMBAT.heavy:COMBAT.hit,e.x,e.kind);
        }
      }
      if(p!==this.player)return;
      for(const i of L.items){
        if(i.taken||!overlap(p,{...i,x:i.x-6,y:i.y-4,w:i.w+12,h:i.h+8}))continue;
        i.taken=true;
        if(i.type==='page'){this.pages++;this.stats.diplomas++;this.emit('page',{count:this.pages,x:i.x,y:i.y});}
        else if(i.type==='tea'){this.heal(2,'tea');this.emit('tea',{x:i.x,y:i.y});}
        else {this.stats.sparks++;this.emit('spark',{x:i.x,y:i.y});}
        this.emit('save');
      }
      L.checkpoints.forEach((c,i)=>{if(i>this.checkpoint&&Math.abs(p.x-c.x)<55&&p.grounded){this.checkpoint=i;c.active=true;this.heal(5,'checkpoint');this.emit('checkpoint');this.emit('save');}});
      this.nearSign=L.signs.find(s=>Math.abs(p.x-s.x)<90&&Math.abs(p.y+p.h-s.y)<95)||null;
      const b=L.boss;
      this.nearNpc=L.npc&&Math.abs(p.x-L.npc.x)<105&&Math.abs(p.y+p.h-L.npc.y)<100?L.npc:null;
      if(this.nearNpc&&!L.npc.greeted){L.npc.greeted=true;this.emit('cameo');}
      this.nearFaculty=L.faculty?.find(n=>(n.id==='maisuradze'||n.group==='course-team')&&Math.abs(p.x+p.w/2-n.x)<115&&Math.abs(p.y+p.h-610)<80)||null;
      this.updateBoss(dt);
      if(p!==this.player||this.intro)return;
      this.nearCatch=!!b?.exhausted&&!b.defeated&&Math.abs(p.x+p.w/2-b.x-b.w/2)<100&&Math.abs(p.y+p.h-b.y-b.h)<105;
      if(input.interact&&this.catchIvan())return;
      this.updateCompanion(dt);
      for(const shot of this.projectiles){
        const previousBottom=shot.y+shot.h;
        shot.arm=Math.max(0,(shot.arm||0)-dt);
        shot.age=(shot.age||0)+dt;if(shot.homing)this.guideJaw(shot,dt);else if(shot.type==='jaw'){shot.vy+=420*dt;}if(shot.type==='tomato')shot.vy+=400*dt;
        shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;
        if(shot.type==='jaw'&&shot.vy>0){
          for(const floor of L.platforms)if(shot.x+shot.w>floor.x&&shot.x<floor.x+floor.w&&previousBottom<=floor.y&&shot.y+shot.h>=floor.y){
            if(shot.bounces>0){shot.y=floor.y-shot.h;shot.vy=-Math.max(145,shot.vy*.68);shot.vx*=.92;shot.bounces--;this.emit('jawClack',{x:shot.x+13,y:shot.y+9});}
            else shot.life=0;
            break;
          }
        }
        if(shot.type==='tomato'&&shot.vy>0&&L.platforms.some(q=>shot.x+shot.w>q.x&&shot.x<q.x+q.w&&previousBottom<=q.y&&shot.y+shot.h>=q.y)){shot.life=0;this.emit('tomatoSplat',{x:shot.x+12,y:shot.y+12});}
        if(shot.type==='bigHold'&&L.platforms.some(q=>shot.x+shot.w>q.x&&shot.x<q.x+q.w&&previousBottom<=q.y&&shot.y+shot.h>=q.y)){shot.life=0;this.emit('holdImpact',{x:shot.x+shot.w/2,y:shot.y+shot.h});}
        if(shot.enemy){if(shot.life>0&&shot.arm<=0&&overlap(p,shot)){this.damage(shot.damage??COMBAT.hit,shot.x,shot.owner);if(p!==this.player)return;shot.life=0;if(['tomato','tomatoTrap'].includes(shot.type))this.emit('tomatoSplat',{x:shot.x+12,y:shot.y+12});}}
        else {
          for(const wall of b?.walls||[])if(wall.hp>0&&shot.life>0&&overlap(shot,wall)){wall.hp--;shot.life=0;this.emit('earthBreak',{x:wall.x+wall.w/2,y:wall.y+30});}
          for(const trap of this.projectiles)if(trap.type==='tomatoTrap'&&trap.life>0&&overlap(shot,trap)){trap.life=0;shot.life=0;this.emit('tomatoSplat',{x:trap.x+17,y:trap.y+14});break;}
          if(shot.life<=0)continue;
          for(const e of L.enemies)if(e.hp>0&&overlap(shot,e)){e.hp--;e.hit=.13;shot.life=0;this.emit('hit',{x:e.x+20,y:e.y+20});if(e.hp===0){this.stats.defeats++;this.emit('enemy',{x:e.x+20,y:e.y+20,owner:e.kind});}break;}
          if(shot.life>0&&b&&b.active&&!b.defeated&&!b.exhausted&&overlap(shot,b)){
            shot.life=0;
            if(this.bossOpen()){b.hp--;b.hit=.18;if(b.kind==='ivan'){b.healTime=0;b.healCool=Math.max(b.healCool,3);if(!b.academic&&b.hp<=b.maxHp/2){this.beginAcademicPhase();break;}}this.emit('hit',{x:b.x+55,y:b.y+60});if(b.hp<=0){b.hp=0;b.walls=[];b.wallTell=null;b.warning=null;b.slamWarning=false;b.trapTargets=null;b.escape=0;b.vx=0;b.y=500;b.speechTime=8;this.projectiles.forEach(s=>{if(s.enemy)s.life=0;});
              if(b.kind==='ivan'){b.exhausted=true;b.phase='exhausted';b.speech='Всё, запыхался... Только один вопрос!';this.emit('ivanExhausted');}
              else{b.defeated=true;b.speech='Прости, Гурочка...';this.pendingScene='erik-rescue';this.pendingBossOutro='erik';this.emit('bossDefeated');this.unlockCompanion();}this.emit('save');}}
            else this.emit('shield',{x:shot.x,y:shot.y});
          }
        }
      }
      this.projectiles=this.projectiles.filter(s=>s.life>0);
      if(p.eating>0){
        if(!p.grounded)this.cancelEating();
        else{p.eating=Math.max(0,p.eating-dt);if(p.eating<=0){this.heal(UPGRADES.paperHeal,'paper');this.emit('save');}}
      }
      if(L.exit&&overlap(p,L.exit)){
        if(this.pages>=(L.requiredPages??3)&&(!b||b.defeated)){this.won=true;if(this.index===0&&!this.upgrade)this.pendingUpgrade=true;this.emit('complete');}
        else if(this.exitHint<=0){this.exitHint=4;this.emit('locked',{pages:this.pages,boss:!!b&&!b.defeated});}
      }
      const target=clamp(p.x-W*.34+p.vx*.22,0,L.width-W);this.camera+=(target-this.camera)*Math.min(1,dt*5);
    }
    guideJaw(shot,dt){
      const x=shot.x+shot.w/2,y=shot.y+shot.h/2,targets=this.level.enemies.filter(e=>e.hp>0),boss=this.level.boss;
      if(boss?.active&&!boss.defeated&&!boss.exhausted)targets.push(boss);
      let target=null,distance=UPGRADES.homingRange;
      for(const e of targets){const d=Math.hypot(e.x+e.w/2-x,e.y+e.h*.45-y);if(d<distance){distance=d;target=e;}}
      shot.seeking=!!target;if(!target){shot.turnDirection=0;return;}
      const from=Math.atan2(shot.vy,shot.vx),to=Math.atan2(target.y+target.h*.45-y,target.x+target.w/2-x);
      let delta=Math.atan2(Math.sin(to-from),Math.cos(to-from));
      // A target behind the mouth is usually lower: the shortest U-turn hits the
      // floor. Commit to the upper arc until the target enters the forward half.
      if(Math.abs(delta)<=Math.PI/2)shot.turnDirection=0;
      else if(!shot.turnDirection)shot.turnDirection=Math.cos(from)>=0?-1:1;
      if(shot.turnDirection&&delta*shot.turnDirection<0)delta+=shot.turnDirection*Math.PI*2;
      // Tighten the turn near a target so the rocket cannot circle a close enemy.
      const turn=Math.max(UPGRADES.homingTurn,UPGRADES.homingSpeed*2/Math.max(60,distance))*dt;
      const angle=from+clamp(delta,-turn,turn);
      shot.vx=Math.cos(angle)*UPGRADES.homingSpeed;shot.vy=Math.sin(angle)*UPGRADES.homingSpeed;
    }
    companionTarget(){
      const p=this.player,w=44;let target=clamp(p.x-p.facing*105,0,this.level.width-w);
      // Stay on a real landing surface when the professor pauses beside a gap.
      const floor=this.level.platforms.filter(q=>q.w>=w+16&&Math.abs(q.y-p.y-p.h)<10)
        .sort((a,b)=>Math.abs(clamp(target,a.x+8,a.x+a.w-w-8)-target)-Math.abs(clamp(target,b.x+8,b.x+b.w-w-8)-target))[0];
      if(p.grounded&&floor)target=clamp(target,floor.x+8,floor.x+floor.w-w-8);
      return target;
    }
    spawnCompanion(){
      const p=this.player;this.companion={name:'Равиль Абдраманов',x:this.companionTarget(),y:p.y+p.h-105,w:44,h:105,vx:0,vy:0,facing:p.facing,grounded:false,gait:0,cool:.75,cast:0,speech:'Гуров, я с вами!',speechTime:3,speechCool:4,lineIndex:0,affection:0};
    }
    unlockCompanion(){
      this.level.captive=null;if(this.companionUnlocked)return;this.companionUnlocked=true;this.spawnCompanion();this.emit('companionJoined',{x:this.companion.x,y:this.companion.y});
    }
    updateCompanion(dt){
      const c=this.companion,p=this.player;if(!c)return;
      const target=this.companionTarget();
      if(Math.abs(p.x-c.x)>650||c.y>880){c.x=target;c.y=p.y+p.h-c.h;c.vx=0;c.vy=0;c.grounded=false;}
      const dx=target-c.x;
      c.cast=Math.max(0,c.cast-dt);c.cool=Math.max(0,c.cool-dt);c.speechTime=Math.max(0,c.speechTime-dt);c.speechCool-=dt;c.affection=Math.max(0,c.affection-dt);
      if(c.speechCool<=0&&Math.abs(p.x-c.x)<320){c.speech=RAVIL_LINES[c.lineIndex++%RAVIL_LINES.length];c.speechTime=4;c.speechCool=6.5;c.affection=2;this.emit('companionSpeech',{speech:c.speech});}
      c.vx+=(clamp(dx*4,-350,350)-c.vx)*Math.min(1,dt*8);
      if(Math.abs(c.vx)>15)c.facing=Math.sign(c.vx);
      const ahead=c.x+c.w/2+Math.sign(dx)*42;
      const support=this.level.platforms.some(q=>ahead>=q.x&&ahead<=q.x+q.w&&Math.abs(q.y-c.y-c.h)<10);
      if(c.grounded&&((p.y+p.h<c.y+c.h-48&&Math.abs(dx)<280)||(!support&&Math.abs(dx)>70)))c.vy=-670;
      const bottom=c.y+c.h;c.vy=Math.min(900,c.vy+1850*dt);c.x=clamp(c.x+c.vx*dt,0,this.level.width-c.w);c.y+=c.vy*dt;c.grounded=false;
      if(c.vy>=0)for(const q of this.level.platforms)if(c.x+c.w>q.x&&c.x<q.x+q.w&&bottom<=q.y+7&&c.y+c.h>=q.y){c.y=q.y-c.h;c.vy=0;c.grounded=true;break;}
      if(c.grounded)c.gait+=Math.abs(c.vx)*dt/112;
      const targets=this.level.enemies.filter(e=>e.hp>0);const b=this.level.boss;if(b?.active&&!b.defeated&&!b.exhausted)targets.push(b);
      const enemy=targets.filter(e=>Math.abs(e.x-c.x)<550&&Math.abs(e.y-c.y)<220).sort((a,b)=>Math.abs(a.x-c.x)-Math.abs(b.x-c.x))[0];
      if(enemy&&c.cool<=0){c.cool=1.3;c.cast=.32;c.facing=enemy.x<c.x?-1:1;const x=c.x+c.w/2,y=c.y+38,angle=Math.atan2(enemy.y+enemy.h*.45-y,enemy.x+enemy.w/2-x);
        this.projectiles.push({type:'lemma',owner:'ravil',x,y,w:18,h:18,vx:Math.cos(angle)*480,vy:Math.sin(angle)*480,life:1.4,enemy:false});this.emit('companionShot',{x,y});
      }
    }
    catchIvan(){
      const b=this.level.boss,p=this.player;
      if(!b||b.kind!=='ivan'||!b.exhausted||b.defeated||Math.abs(p.x+p.w/2-b.x-b.w/2)>=100||Math.abs(p.y+p.h-b.y-b.h)>=105)return false;
      b.defeated=true;b.phase='caught';b.speech='Сдаюсь! Готов сдать прикладную алгебру.';b.speechTime=8;this.projectiles=[];this.nearCatch=false;this.won=true;this.pendingScene='ivan-caught';this.pendingBossOutro='ivan';this.emit('ivanCaught');this.emit('complete');return true;
    }
    updateRunner(dt){
      const r=this.runner,p=this.player;if(!r||r.escaped)return;
      const dx=r.x-p.x,floors=this.level.platforms.filter(q=>q.kind==='floor');
      const inGap=!floors.some(f=>r.x>=f.x&&r.x<=f.x+f.w);
      const crossing=(r.phase!=='patrol'||inGap)&&floors.some((f,i)=>i<floors.length-1&&r.x>=f.x+f.w-75&&r.x<=floors[i+1].x+75);
      const pursuing=p.vx>28;
      const door=this.level.exit,doorX=door.x+door.w/2;
      if(r.phase==='enter'){
        r.doorTime+=dt;r.vx=0;r.y=door.y+door.h;
        if(r.doorTime>=.65)r.escaped=true;
        return;
      }
      // A waiting runner really patrols a safe piece of floor, with turns.
      // Finish any committed gap crossing before choosing that patrol interval.
      if(this.index===1||crossing||(pursuing&&dx<690)){
        r.patrol=null;r.vx=this.index===1?360:crossing?Math.max(260,pursuing&&dx<330?440:0):dx<330?440:300;
        r.x+=r.vx*dt;r.phase='run';
      }else{
        if(!r.patrol){const floor=floors.find(q=>r.x>=q.x&&r.x<=q.x+q.w);const end=floor?Math.min(floor.x+floor.w-75,doorX):doorX;const center=clamp(r.x,(floor?.x||0)+165,end-90);r.patrol={min:center-90,max:center+90};r.patrolDir=-1;}
        const bounds=r.patrol;r.x=clamp(r.x,r.patrol.min,r.patrol.max);r.vx=r.patrolDir*210;r.x+=r.vx*dt;
        if(r.x<=bounds.min||r.x>=bounds.max){r.x=clamp(r.x,bounds.min,bounds.max);r.patrolDir*=-1;r.vx=r.patrolDir*210;}
        r.phase='patrol';
      }
      r.facing=r.vx<0?-1:1;r.gait+=Math.abs(r.vx)*dt/155;r.y=610;
      for(let i=0;i<floors.length-1;i++){const a=floors[i].x+floors[i].w-75,b=floors[i+1].x+75;if(r.x>a&&r.x<b){r.y=610-Math.sin((r.x-a)/(b-a)*Math.PI)*160;r.phase='jump';}}
      r.speechTime=Math.max(0,r.speechTime-dt);if(dx<480&&r.speechTime<=0&&Math.floor(this.time)%8<1){r.speechTime=2.4;this.emit('runnerSpeech',{speech:this.index===0?'Я на крышу! Рецензию потом!':'Задержите его! Я пробегу первым!'});}
      if(r.x>=doorX){r.x=doorX;r.y=door.y+door.h;r.vx=0;r.facing=1;r.phase='enter';r.doorTime=0;r.speechTime=0;}
    }
    updateRoof(){
      const p=this.player,L=this.level,b=L.boss;if(!L.endless)return;
      // Rebase the local coordinates to keep a long session numerically stable.
      // Keep an exhausted boss reachable when the player deliberately runs past him.
      if(p.x>12288&&b.x>=8192){const shift=8192;p.x-=shift;b.x-=shift;this.camera-=shift;this.distanceOffset+=shift;if(b.trapTargets)b.trapTargets=b.trapTargets.map(x=>x-shift);for(const wall of b.walls||[])wall.x-=shift;if(b.wallTell)b.wallTell.x-=shift;for(const s of this.projectiles)s.x-=shift;if(this.companion)this.companion.x-=shift;this.roofChunk=null;}
      L.width=Math.max(4096,p.x+W*3,b.x+W*2);
      const chunk=Math.floor(p.x/1024),last=Math.floor(Math.max(p.x,b.x)/1024)+3,key=chunk+':'+last;
      if(this.roofChunk===key)return;this.roofChunk=key;L.platforms=[];
      for(let i=Math.max(0,chunk-2);i<=last;i++){
        const x=i*1024;L.platforms.push({x,y:610,w:1024,h:160,kind:'floor'});
        L.platforms.push({x:x+360,y:490+(i%2)*35,w:180,h:24,kind:'ledge'});
      }
    }
    talkToFaculty(){
      if(!this.nearFaculty)return false;
      this.pendingScene=this.nearFaculty.group==='course-team'?'course-team':'maisuradze-tea';this.emit('save');return true;
    }
    talkToCameo(){
      const n=this.nearNpc;if(!n)return null;
      if(!n.helped){n.helped=true;n.handoff=1.35;this.courseworkFlight=1.35;this.courseworkObtained=true;this.pendingScene='sasha-coursework';this.heal(5,'coursework');this.emit('coursework',{x:n.x,y:n.y-65});this.emit('save');}
      return {heading:n.name,text:'«Профессор, заберите мою курсовую! В приложении — схема переходов на крышу. Павленко побежал именно туда. Вот папка, она поможет следить за ним. А Эрик сначала согласовывает, потом швыряется зацепками — бейте в паузе!»',repeat:'«Курсовая уже у вас. Как поймаете Ивана, возвращайтесь — я готов защищаться!»'};
    }
    updateBoss(dt){
      const b=this.level.boss,p=this.player;if(!b)return;
      b.speechTime=Math.max(0,b.speechTime-dt);b.hit=Math.max(0,b.hit-dt);
      if(b.defeated)return;if(b.exhausted){b.phase='exhausted';b.vx=0;return;}
      if(!b.active&&p.x>(b.kind==='erik'?1990:680)){b.active=true;this.intro={kind:b.kind,name:b.name,time:0,duration:3.2};this.emit('bossIntro',{kind:b.kind,name:b.name});return;}
      if(!b.active)return;
      b.timer+=dt;b.enraged=b.kind==='ivan'?b.academic:b.hp<=b.maxHp/2;
      const speak=(speech,voice=false)=>{b.speech=speech;b.speechTime=3;this.emit('bossSpeech',{speech,voice});};
      if(b.enraged&&!b.enrageAnnounced){b.enrageAnnounced=true;this.emit('bossRage',{name:b.name});}
      const projectile=(type,x,y,vx,vy,w=24,h=14,variant=0,extra={})=>this.enemyShot(b.kind,type,x,y,vx,vy,w,h,{variant,...extra});
      if(b.kind==='erik'){
        const cycle=Math.floor(b.timer/6),phase=b.timer%6;
        b.slamWarning=phase>=4.45&&phase<5.15;
        b.phase=phase<1.15?'talk':phase<1.8?'windup':phase<2.02?'throw':b.slamWarning?'slamWindup':phase>=5.15?'recover':phase>3.05&&phase<4.1?'stamp':'walk';
        const oldX=b.x;b.vx=b.phase==='walk'?Math.cos(b.timer*.65)*52:0;b.x=clamp(b.x+b.vx*dt,2495,2625);b.facing=Math.abs(b.vx)>1?Math.sign(b.vx):p.x<b.x?-1:1;
        b.gait+=Math.abs(b.x-oldX)/92;
        b.cycle=cycle; // Spoken turns are scheduled by EncounterSpeech, not attacks.
        if(phase>=1.8&&b.volley!==cycle){
          b.volley=cycle;const angle=Math.atan2(p.y+42-(b.y+32),p.x+19-(b.x+33));
          (b.enraged?[-.36,-.18,0,.18,.36]:[-.24,0,.24]).forEach((a,j)=>projectile('hold',b.x+24,b.y+28,Math.cos(angle+a)*270,Math.sin(angle+a)*270,26,24,(cycle+j)%4));this.emit('climbThrow');
        }
        if(phase>=3.05&&b.stamp!==cycle&&b.warning===null){
          const x=clamp(p.x+19,1970,3280);
          b.warning={x,remaining:1.05,targets:b.enraged?[clamp(x-150,1970,3280),clamp(x+150,1970,3280),x]:[x],next:0};this.emit('combatTell',{owner:'erik'});
        }
        if(b.warning){
          b.warning.remaining-=dt;
          if(b.warning.remaining<=0){
            const warning=b.warning,targets=warning.targets||[warning.x],next=warning.next||0;
            projectile('bigHold',targets[next]-44,210,0,620,88,56,cycle%4,{damage:COMBAT.heavy});this.emit('climbThrow');
            if(next+1<targets.length){warning.next=next+1;warning.x=targets[next+1];warning.remaining=.35;}
            else{b.warning=null;b.stamp=cycle;}
          }
        }
        if(b.slamWarning&&b.slam!==cycle&&b.slamCue!==cycle){b.slamCue=cycle;this.emit('combatTell',{owner:'erik'});}
        if(phase>=5.15&&b.slam!==cycle){
          b.slam=cycle;[-1,1].forEach(dir=>projectile('shockwave',b.x+b.w/2,582,dir*345,0,64,28,0,{life:2.5,damage:COMBAT.heavy}));this.emit('groundSlam',{x:b.x+b.w/2,y:610});
        }
      }else{
        if(this.updateAcademicPhase(dt))return;
        const period=b.academic?2.35:COMBAT.ivanCycle,cycle=Math.floor(b.timer/period),phase=b.timer%period,trapTurn=cycle%3===2;
        if(cycle!==b.cycle){b.cycle=cycle;b.trapTargets=null;speak(trapTurn?'Осторожно, скользкая защита!':b.enraged?'Два помидора — два аргумента!':'Догоните сначала!');}
        const dx=b.x-p.x,distance=Math.abs(dx);
        b.escapeCool=Math.max(0,b.escapeCool-dt);
        if(!b.escape&&b.escapeCool<=0&&dx<140){b.escape=1.05;b.escapeCool=4;b.escapeDir=1;b.trapTargets=null;speak('Помидор — и я снова впереди!');}
        if(b.escape>0){
          b.escape=Math.max(0,b.escape-dt);b.vx=620;b.y=500-Math.sin((1-b.escape/1.05)*Math.PI)*150;b.phase='run';b.trapTargets=null;
        }else if(dx<-90){
          // Recover a lead by running, without teleporting or throwing backwards mid-run.
          b.y=500;b.vx=420;b.phase='run';b.trapTargets=null;
        }else{
          b.y=500;b.vx=dx<330?(phase<.9?145:280):dx<650?195:0;
          b.phase=phase>=.3&&phase<.9?(trapTurn?'trapWindup':'windup'):phase>=.9&&phase<1.25?(trapTurn?'trapThrow':'throw'):Math.abs(b.vx)>0?'run':'idle';
          if(['windup','throw','trapWindup','trapThrow'].includes(b.phase))b.vx=0;
          if(b.phase==='trapWindup'&&!b.trapTargets){b.trapTargets=(b.enraged?[90,-35,-160]:[-35,-160]).map(offset=>Math.max(30,b.x+offset));this.emit('combatTell',{owner:'ivan'});}
        }
        b.x+=b.vx*dt;b.gait+=Math.abs(b.vx)*dt/110;
        b.facing=['windup','throw','trapWindup','trapThrow'].includes(b.phase)?(p.x+p.w/2<b.x+b.w/2?-1:1):b.vx?1:b.facing;
        // Stop and wind up visibly. The quick second throw is advertised at half HP.
        if(b.phase==='throw'&&b.escape<=0&&distance<780){
          const first=b.volley!==cycle,follow=b.enraged&&phase>=1.17&&b.followVolley!==cycle;
          if(first||follow){
            if(first)b.volley=cycle;else b.followVolley=cycle;
            const x=b.x+b.w/2+b.facing*48,y=b.y+44;
            const flight=clamp(Math.abs(p.x+p.w/2-x)/470,.45,1.1);
            const targetX=p.x+p.w/2+clamp(p.vx*.16,-50,50),targetY=clamp(p.y+p.h*.6,b.y-100,580);
            const vx=(targetX-x)/flight,vy=(targetY-y-200*flight*flight)/flight-400/240;
            projectile('tomato',x-12,y-12,vx,vy,24,24);this.emit('tomatoThrow');
          }
        }
        if(b.phase==='trapThrow'&&b.escape<=0&&b.volley!==cycle&&b.trapTargets){
          b.volley=cycle;
          for(const x of b.trapTargets)if(this.projectiles.filter(s=>s.type==='tomatoTrap'&&s.life>0).length<4)projectile('tomatoTrap',x-17,579,0,0,34,31,0,{life:4.2,arm:.3});
          b.trapTargets=null;this.emit('tomatoThrow');
        }
        if(!['trapWindup','trapThrow'].includes(b.phase))b.trapTargets=null;
      }
      if(overlap(p,b))this.damage(COMBAT.hit,b.x,b.kind);
    }
    beginAcademicPhase(){
      const b=this.level.boss;b.academic=true;b.enraged=true;b.enrageAnnounced=true;b.hp=b.maxHp;b.timer=0;b.cycle=-1;b.volley=-1;b.followVolley=-1;b.escape=0;b.escapeCool=3;b.trapTargets=null;b.vx=0;b.y=500;b.phase='transform';b.healCool=9;b.wallCool=4;
      this.projectiles=[];this.player.inv=Math.max(this.player.inv,1.5);
      b.speech='Я ухожу в академический отпуск!';b.speechTime=4;
      this.intro={kind:'ivan',academic:true,name:'Иван Павленко в академическом отпуске',time:0,duration:3.8};
      this.emit('academicPhase',{speech:b.speech});
    }
    updateAcademicPhase(dt){
      const b=this.level.boss,p=this.player;if(!b.academic)return false;
      b.walls=b.walls.filter(w=>{w.life-=dt;return w.life>0&&w.hp>0;});
      b.wallCool=Math.max(0,b.wallCool-dt);b.healCool=Math.max(0,b.healCool-dt);
      if(b.wallTell){
        b.vx=0;b.phase='earthWindup';b.wallTell.time-=dt;
        if(b.wallTell.time<=0){const x=b.wallTell.x;b.wallTell=null;
          // Never materialize a wall inside the player. It does no contact damage.
          if(Math.abs(p.x+p.w/2-(x+26))>p.w/2+30&&b.walls.length<2){b.walls.push({x,y:462,w:52,h:148,hp:COMBAT.ivanWallHP,life:COMBAT.ivanWallLife});this.emit('earthRise',{x:x+26,y:610});}
        }return true;
      }
      if(b.healTime>0){
        b.vx=0;b.phase='heal';b.healTime+=dt;
        if(Math.abs(b.x-p.x)<430){b.healTime=0;b.healCool=4;return false;}
        if(b.healTime>=COMBAT.ivanHealDelay){b.hp=Math.min(b.maxHp,b.hp+COMBAT.ivanHealAmount);b.healCharges--;b.healTime=0;b.healCool=12;this.emit('ivanHeal',{x:b.x,y:b.y});}return true;
      }
      const dx=b.x-p.x;
      if(dx>560&&b.hp<b.maxHp&&b.healCharges>0&&b.healCool<=0&&b.escape<=0){b.healTime=.001;b.phase='heal';b.vx=0;b.speech='Мне нужен перерыв. Восстанавливаю силы!';b.speechTime=3;this.emit('bossSpeech',{speech:b.speech});return true;}
      if(dx>210&&dx<520&&b.wallCool<=0&&b.escape<=0&&b.walls.length<2){b.wallTell={x:b.x-116,time:COMBAT.ivanWallTell};b.wallCool=COMBAT.ivanWallCool;b.phase='earthWindup';b.vx=0;b.speech='Земляная стена! Мне пора в отпуск!';b.speechTime=3;this.emit('bossSpeech',{speech:b.speech});this.emit('combatTell',{owner:'ivan'});return true;}
      return false;
    }
    bossOpen(){const b=this.level.boss;return !!b&&b.active&&!b.defeated&&!b.exhausted&&(b.kind==='ivan'||b.timer%6>=1.15);}

  }
  const api={World,levelData,CHAPTERS,ROMAN_LINES,RAVIL_LINES,FINAL_LEVEL,CAMPAIGN,COMBAT,UPGRADES,migrateSave,W,H,PLAYER_W,PLAYER_H,PLAYER_ART_H,clamp,overlap,lisp};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GurovEngine=api;
})(typeof window!=='undefined'?window:globalThis);
