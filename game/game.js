(function(){
  'use strict';
  const {World,CHAPTERS,W,H,clamp,FINAL_LEVEL,CAMPAIGN,migrateSave,lisp}=GurovEngine;
  const $=id=>document.getElementById(id),canvas=$('game');let ctx=canvas.getContext('2d',{alpha:false});
  const sound=new GurovSound(),ambientSpeech=new GurovAmbientSpeech(sound),encounterSpeech=new GurovEncounterSpeech(sound),departmentSpeech=new GurovDepartmentSpeech(sound),actor=new GurovActor(),cast=new GurovCast(),keys=new Set(),pressed=new Set(),released=new Set();
  const SAVE='gurov-last-lemma-v1';let world=null,mode='menu',previousMode='menu',last=0,accum=0,clock=0,toastTime=0,shake=0,modalClose=null;
  const VICTORY='gurov-last-lemma-victory-v1',menuIvan=new GurovMenuIvan();let campaignCleared=false,victoryReset=false;
  let saveWarning=false,assetReady=false,story=null,credits=null,transition=null,deathScreen=null,playerDeath=null,deathBackground=null,bossOutro=null,outroBackground=null,epilogue=null,prologue=null;const hudCache={};const effects=[];let spriteFrames=[];
  const random=(n)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  let upgradeChoice=null,renderPrevious=null,backgroundPaused=document.hidden;
  const DEATH_THEMES={
    erik:{actor:'erik',pose:14,title:'Попытка\nсогласована.',cause:'Эрик оказался убедительнее. Пока что.',quote:'«Сейчас мы и тебя согласуем, Гурочка».',caption:'ЭРИК ИЛЬЯСОВ · ВСЁ СОГЛАСОВАНО',mark:'✓'},
    ivan:{actor:'ivan',pose:12,title:'Защита\nотложена.',cause:'Иван прервал погоню и снова убежал вперёд.',quote:'«Ловите помидор! А меня — в следующий раз».',caption:'ИВАН ПАВЛЕНКО · СНОВА ВПЕРЕДИ',mark:'→'},
    roman:{actor:'roman',pose:15,title:'Контекст\nисчерпан.',cause:'Роман завершил эту попытку раньше статьи.',quote:'«Триллион токенов — и Гуров готов. Статью допишет Claude Code».',caption:'РОМАН АКРАМОВ · MCP / B2B / CLAUDE CODE',mark:'</>'},
    fall:{actor:'gurov',pose:13,title:'Гравитация\nдоказана.',cause:'На этот раз прыжок не сошёлся.',quote:lisp('«В следующий раз начнём с двойного прыжка».'),caption:'ГУРОВ · ЕЩЁ ОДИН ПРЫЖОК ДО ДОКАЗАТЕЛЬСТВА',mark:'↓'},
    damage:{actor:'gurov',pose:13,title:'Доказательство\nпрервано.',cause:'У профессора закончились силы.',quote:lisp('«Это ещё не конец доказательства. Начнём ещё раз».'),caption:'ПОСЛЕДНИЙ УДОВЛ ЕЩЁ ВПЕРЕДИ',mark:'∴'}
  };
  function fit(){const s=Math.min(innerWidth/W,innerHeight/H);$('stage').style.transform=`scale(${s})`;$('stage').style.left=(innerWidth-W*s)/2+'px';$('stage').style.top=(innerHeight-H*s)/2+'px';}
  addEventListener('resize',fit);fit();
  function readSave(){try{const s=JSON.parse(localStorage.getItem(SAVE));return s?.version===1&&Number.isInteger(s.level)&&s.level>=0&&s.level<CHAPTERS.length?migrateSave(s):null;}catch(e){return null;}}
  function rememberVictory(){
    campaignCleared=true;victoryReset=false;menuIvan.setCaught(true);
    try{localStorage.setItem(VICTORY,'1');}catch(e){if(!saveWarning){saveWarning=true;toast('Победа засчитана, но сохранить её на этом устройстве не удалось.');}}
  }
  function resetVictory(){
    campaignCleared=false;victoryReset=true;menuIvan.setCaught(false);
    try{localStorage.removeItem(VICTORY);}catch(e){if(!saveWarning){saveWarning=true;toast('Новое прохождение началось, но сохранить его на этом устройстве не удалось.');}}
  }
  function refreshMenuVictory(){
    if(!victoryReset)try{campaignCleared=campaignCleared||localStorage.getItem(VICTORY)==='1';}catch(e){}
    const saved=readSave();
    // An unfinished run takes precedence over a victory left by an older run.
    if(campaignCleared&&saved&&!(saved.level===FINAL_LEVEL&&saved.bossDefeated))resetVictory();
    // A pending final dialogue in an older save is already a completed catch.
    if(!victoryReset&&!campaignCleared&&saved?.level===FINAL_LEVEL&&saved.bossDefeated)rememberVictory();
    menuIvan.setCaught(campaignCleared);
    $('menu').classList.toggle('campaign-cleared',campaignCleared);
    $('ivan-menu-status').textContent=campaignCleared?'ИВАН ПОЙМАН · СДАЁТ АЛГЕБРУ':'ИВАН ПАВЛЕНКО · ПОПРОБУЙТЕ ДОГНАТЬ';
    document.querySelector('.tagline').innerHTML=campaignCleared?'Павленко пойман. Работа возвращена.<br>Теперь — прикладная алгебра.':'Иван снова убежал с защиты.<br>У профессора остался один вопрос.';
  }
  function persist(){if(!world)return;if(world.index===FINAL_LEVEL&&world.won)rememberVictory();try{if(world.index===FINAL_LEVEL&&world.won&&!world.pendingScene){localStorage.removeItem(SAVE);return;}localStorage.setItem(SAVE,JSON.stringify({...world.save(),...(prologue?{pendingPrologue:true}:{})}));}catch(e){if(!saveWarning){saveWarning=true;toast('Сохранение недоступно. Эта сессия продолжится без него.');}}}
  function refreshContinue(){$('continue').classList.toggle('hidden',!readSave());refreshMenuVictory();}
  function toast(message,seconds=3.5){$('toast').textContent=message;$('toast').classList.add('visible');toastTime=seconds;}
  function dialog(label,title,body,buttons,onClose=null){
    $('modal').classList.remove('story-modal','upgrade-modal');
    keys.clear();pressed.clear();released.clear();previousMode=mode;mode='modal';sound.setState('pause');
    $('modal-label').textContent=label;$('modal-title').textContent=title;$('modal-body').innerHTML=body;$('modal-actions').replaceChildren();
    buttons.forEach((b,i)=>{const el=document.createElement('button');el.className=i===0?'primary':'secondary';el.textContent=b.text;el.onclick=()=>{sound.init();b.action();};$('modal-actions').append(el);});
    $('modal').classList.remove('hidden');modalClose=onClose;
    const card=document.querySelector('.modal-card');card.tabIndex=-1;card.scrollTop=0;
    requestAnimationFrame(()=>{
      if(transition){$('level-loading').focus();return;}
      if(mode!=='modal')return;
      // A long help page opens at its heading, not at the off-screen last button.
      const target=card.scrollHeight>card.clientHeight?card:$('modal-actions').querySelector('button');
      target?.focus({preventScroll:true});card.scrollTop=0;
    });
  }
  function syncGameplayMusic(){
    if(mode!=='play'||!world)return;
    const b=world.level.boss;
    sound.setContext?.(world.index,b?b.hp/b.maxHp:1);
    sound.setState(world.intro?'intro':b?.active&&!b.defeated?'boss':'play');
  }
  function closeDialog(){sound.stopSpeech(); $('modal').classList.add('hidden');$('modal').classList.remove('story-modal');mode=previousMode;modalClose=null;keys.clear();pressed.clear();released.clear();if(mode==='play')syncGameplayMusic();else sound.setState('menu'); }
  function storyPortrait(){if(story)story.portraitReady=drawGurovPortrait($('story-portrait'),cast,GurovStory[story.kind][story.index],clock-story.started);}
  function showStory(kind){
    if(story||bossOutro||!GurovStory[kind])return;
    if(kind==='course-team')GurovIllustrations.loadFaculty();
    persist();story={kind,index:0,portraitReady:false};
    const show=()=>{
      const frame=GurovStory[kind][story.index];
      dialog(frame.label,frame.name,`<canvas id="story-portrait" width="630" height="740" role="img" aria-label="Портрет: ${frame.name}"></canvas><p>${gurovDialogueText(frame)}</p>${frame.badge?`<p class="story-badge">${frame.badge}</p>`:''}${kind==='course-team'?'<canvas id="dialogue-stage" width="840" height="225" aria-label="Сценка с преподавателями"></canvas>':''}`,[{text:frame.next,action:advance}]);
      previousMode='play';$('modal').classList.add('story-modal');$('modal').style.setProperty('--speaker-color',frame.color);story.portraitReady=false;story.started=clock;story.cues=[];$('modal-actions').firstChild.disabled=!!frame.action;storyPortrait();sound.speak(frame.actor,frame.text,4);
      const replay=document.createElement('button');replay.className='voice-replay';replay.textContent='↻ Повторить реплику';replay.onclick=()=>{sound.init();sound.speak(frame.actor,frame.text,4);};$('modal-actions').append(replay);
    };
    const advance=()=>{
      const frame=GurovStory[kind][story.index];if(frame.action&&clock-story.started<2)return;
      sound.stopSpeech();if(++story.index<GurovStory[kind].length){show();return;}
      world.acknowledgeScene(kind);story=null;persist();closeDialog();
      if(world.won)complete();
      else if(kind==='erik-rescue')toast('Равиль свободен! Теперь он прикроет вас в погоне.',5);
      else if(kind==='maisuradze-tea')toast('Арчил Ивериевич ждёт вас вечером. А пока — за Иваном!',5);
      else if(kind==='sasha-coursework')toast('Курсовая Саши получена. Схема переходов теперь у вас!',5);
    };
    story.advance=advance;show();
  }
  function clearBossOutro(){bossOutro=null;outroBackground=null;sound.stopDefeat();$('boss-outro-controls').classList.add('hidden');keys.clear();pressed.clear();released.clear();}
  function beginBossOutro(kind){
    if(bossOutro||!world?.pendingBossOutro)return;
    shake=0;gameScene();outroBackground=document.createElement('canvas');outroBackground.width=W;outroBackground.height=H;
    const backdrop=outroBackground.getContext('2d');backdrop.filter='blur(5px)';backdrop.drawImage(canvas,0,0);backdrop.filter='none';
    bossOutro=new GurovBossOutro(kind,matchMedia('(prefers-reduced-motion: reduce)').matches);
    mode='boss-outro';accum=0;keys.clear();pressed.clear();released.clear();effects.length=0;toastTime=0;
    $('toast').classList.remove('visible');$('modal').classList.add('hidden');$('hud').classList.add('hidden');
    $('outro-caption').textContent=kind==='erik'?'Эрик побеждён. Щит разбит, Равиль свободен.':'Иван пойман. Погоня завершена.';
    $('outro-skip').disabled=true;$('boss-outro-controls').classList.remove('hidden');$('boss-outro-controls').focus();
    sound.stopDefeat();sound.setState('outro');persist();
  }
  function finishBossOutro(){
    if(!bossOutro)return;
    world.acknowledgeBossOutro();clearBossOutro();mode='play';$('hud').classList.remove('hidden');persist();
    showStory(world.pendingScene);
  }
  function updateBossOutro(dt){
    if(!bossOutro)return;
    for(const cue of bossOutro.update(dt,!document.hidden&&document.hasFocus()&&cast.ready))sound.bossDefeat(bossOutro.kind,cue);
    $('outro-skip').disabled=!bossOutro.canSkip;
    $('outro-skip').innerHTML=bossOutro.canSkip?'Продолжить <span>ENTER / ПРОБЕЛ</span>':`Погоня на паузе <span>${Math.ceil(bossOutro.duration-bossOutro.elapsed)} с</span>`;
  }
  $('outro-skip').onclick=()=>{if(bossOutro?.canSkip){sound.init();finishBossOutro();}};
  function enterLevel(index,saved=null,showIntro=true,prepared=null){
    if(index===0&&saved?.pendingPrologue){showPrologue(saved);return;}
    if(index===0&&!saved&&!prepared)resetVictory();
    upgradeChoice=null;renderPrevious=null;
    clearBossOutro();clearDeath();story=null;modalClose=null;keys.clear();pressed.clear();released.clear();accum=0;
    world=prepared||new World(index,saved);index=world.index;$('stage').classList.toggle('summer-yard',index===0);if(index===2)GurovIllustrations.loadFaculty();effects.length=0;Object.keys(hudCache).forEach(k=>delete hudCache[k]);mode='play';$('menu').classList.add('hidden');$('hud').classList.remove('hidden');$('modal').classList.add('hidden');
    $('chapter-no').textContent=`0${index+1} / 04`;$('chapter-name').textContent=CHAPTERS[index].name;$('chapter-subject').textContent=CHAPTERS[index].subject;
    document.querySelectorAll('.collection-stat').forEach(e=>e.classList.toggle('hidden',index===FINAL_LEVEL));$('pages-stat').classList.toggle('hidden',index>=2);$('boss-hud').classList.add('hidden');syncGameplayMusic();persist();
    if(saved?.level===index&&index>0&&saved.campaign!==CAMPAIGN)toast('Глава обновлена: начнём её с новой расстановки. Итоговый счёт сохранён.',6);
    const resume=()=>{
      if(world.awaitingRespawn)showDeath();
      else if(world.pendingBossOutro)beginBossOutro(world.pendingBossOutro);
      else if(world.pendingScene)showStory(world.pendingScene);
      else if(world.won)complete();
      else if(showIntro){dialog(`ГЛАВА 0${index+1} / ${CHAPTERS[index].subject}`,CHAPTERS[index].name,`<p>${CHAPTERS[index].intro}</p><blockquote>${index===2?CHAPTERS[index].quote:lisp(CHAPTERS[index].quote)}</blockquote>`,[{text:index===0?'Выйти во двор →':'Продолжить путь →',action:()=>{closeDialog();toast(index===FINAL_LEVEL?'Вымотайте Ивана, догоните и нажмите E. Собирать ничего не нужно.':index===2?'Через кафедру — к лестнице на крышу. Удовлы собирать необязательно.':'Соберите три больших удовла за диплом и идите за Иваном.',5);}}]);
        const lines=[{actor:'narrator',text:CHAPTERS[index].intro},{actor:index===2?'maisuradze':'gurov',text:CHAPTERS[index].quote}];
        sound.speakSequence(lines);
        const replay=document.createElement('button');replay.className='voice-replay';replay.textContent='↻ Повторить вступление';replay.onclick=()=>sound.speakSequence(lines);$('modal-actions').append(replay);
      }
    };
    if(world.pendingUpgrade&&!(index===FINAL_LEVEL&&world.won)&&!world.awaitingRespawn)showUpgrade(resume);else resume();
  }
  function showUpgrade(after){
    if(upgradeChoice)return;persist();
    upgradeChoice={after};
    const choose=kind=>{if(!upgradeChoice||!world.chooseUpgrade(kind))return;const next=upgradeChoice.after;upgradeChoice=null;persist();closeDialog();mode='play';next();};
    dialog('НОВАЯ ЛЕММА · ВЫБОР ДО КОНЦА ИГРЫ','Как продолжим погоню?',`<p>${world.index===0?'Иван скрылся за дверью. Есть минута доработать метод.':'Перед продолжением выберите новое улучшение для этого сохранения.'}</p><div class="upgrade-grid"><article><canvas id="homing-preview" width="380" height="145" aria-label="Челюсть с ракетным соплом"></canvas><h3>Зубная баллистика</h3><p>Челюсть сама поворачивает к ближайшему противнику. Сопло и пламя показывают направление полёта.</p><p class="upgrade-tradeoff"><strong>Урон в 2 раза ниже, чем у обычной челюсти (−50%).</strong></p><small>J / X · работает при каждом выстреле<br>Щиты и земляные стенки остаются препятствиями.</small></article><article><canvas id="paper-preview" width="380" height="145" aria-label="Гуров ест работы подопечных"></canvas><h3>Съесть работы подопечных</h3><p>Нажмите H, чтобы съесть работы подопечных и восстановить 2 сердца за 1,2 секунды.</p><small>20 секунд с начала попытки · работы не заканчиваются<br>Нужно стоять на земле. Удар, прыжок или рывок прервёт еду.</small></article></div><p class="upgrade-note">Выберите одно улучшение. Его нельзя заменить до новой игры.</p>`,[{text:'Выбрать самонаведение →',action:()=>choose('homing')},{text:'Выбрать: съесть работы подопечных →',action:()=>choose('paper')}]);
    $('modal').classList.add('upgrade-modal');previousMode='play';
    const c=$('homing-preview').getContext('2d');drawGurovRocketJaw(c,190,70,3,1,0);
    cast.draw($('paper-preview').getContext('2d'),'gurov-happy',14,190,139,125,1);
    const card=document.querySelector('.modal-card');card.tabIndex=-1;requestAnimationFrame(()=>card.focus());
  }
  function clearDeath(){deathScreen=null;playerDeath=null;deathBackground=null;$('death-screen').classList.add('hidden');keys.clear();pressed.clear();released.clear();}
  function drawDeath(){
    if(!deathScreen||deathScreen.drawn||!cast.ready||!GurovActing.ready)return;
    const theme=deathScreen.theme,art=DEATH_THEMES[theme];
    const c=$('death-portrait').getContext('2d');c.clearRect(0,0,460,460);c.imageSmoothingEnabled=true;
    if(theme==='erik'){
      c.fillStyle='#41695844';c.beginPath();c.moveTo(23,370);c.lineTo(86,89);c.lineTo(302,44);c.lineTo(429,376);c.closePath();c.fill();
      c.strokeStyle='#9ec9aa22';c.lineWidth=2;c.beginPath();c.moveTo(86,89);c.lineTo(172,277);c.lineTo(302,44);c.moveTo(172,277);c.lineTo(429,376);c.stroke();
      [[80,220,1],[365,195,2],[390,333,0]].forEach(([x,y,v])=>GurovItems.draw(c,'hold',x,y,49,43,-.2,v));
      c.save();c.translate(37,93);c.rotate(-.13);c.strokeStyle='#a2d9ac88';c.lineWidth=2;c.strokeRect(0,-28,188,42);c.fillStyle='#b4e4bd';c.font='bold 17px monospace';c.fillText('СОГЛАСОВАНО',12,0);c.restore();
    }else if(theme==='ivan'){
      c.fillStyle='#55485855';c.fillRect(28,344,142,50);c.fillRect(291,358,141,40);c.fillStyle='#bf847b44';c.fillRect(22,337,156,7);c.fillRect(284,351,154,7);
      c.strokeStyle='#efc4b733';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.moveTo(38+i*6,135+i*34);c.lineTo(158+i*9,118+i*34);c.stroke();}
      GurovItems.draw(c,'tomato',78,193,64,64,-.35);GurovItems.draw(c,'tomato',388,295,53,53,.4);
    }else if(theme==='roman'){
      c.fillStyle='#152936';c.fillRect(27,56,280,99);c.strokeStyle='#bdcaa244';c.strokeRect(27,56,280,99);
      c.fillStyle='#a4d3b7';c.font='12px monospace';c.fillText('> MCP SERVER   ONLINE',42,80);c.fillStyle='#daccaa';c.fillText('> B2B PROJECT  DEPLOYED',42,105);c.fillStyle='#d3b17b';c.fillText('> TOKENS: 1 000 000 000 000',42,131);
      GurovItems.draw(c,'coursework',380,350,65,76,.18);
    }else if(theme==='fall'){
      c.fillStyle='#a7c5df55';c.font='italic 30px Georgia';c.fillText('y = gt² / 2',38,109);
      c.strokeStyle='#accce638';c.setLineDash([5,9]);c.beginPath();c.moveTo(80,157);c.bezierCurveTo(189,117,344,155,382,302);c.stroke();c.setLineDash([]);
    }
    c.fillStyle='#070c1366';c.beginPath();c.ellipse(235,387,141,15,0,0,Math.PI*2);c.fill();
    if(art.actor==='gurov')GurovItems.draw(c,'diploma',115,383,55,64,-.23);
    if(theme==='erik'){
      const im=GurovIllustrations.portraits['erik-mocking'];if(!im?.width)return;
      const scale=460/im.width;c.drawImage(im,0,0,460,im.height*scale);
      const shade=c.createLinearGradient(0,350,0,460);shade.addColorStop(0,'#09141c00');shade.addColorStop(1,'#09141c');c.fillStyle=shade;c.fillRect(0,350,460,110);
    }else cast.draw(c,art.actor,art.pose,251,382,320,1);
    if(art.actor==='gurov')drawGurovJaw(c,352,389,1.35,0,.12);
    if(theme==='ivan')GurovItems.draw(c,'tomato',138,392,48,48,.15);
    deathScreen.drawn=true;
  }
  function beginPlayerDeath(fatal){
    if(playerDeath||deathScreen)return;
    const checkpoint=world;
    world=Object.assign(Object.create(checkpoint),fatal.scene,{player:fatal.player,camera:fatal.camera});
    try{
      shake=0;gameScene(true);
      playerDeath=new GurovPlayerDeath(fatal,world.level.platforms,matchMedia('(prefers-reduced-motion: reduce)').matches);
    }finally{world=checkpoint;}
    deathBackground=document.createElement('canvas');deathBackground.width=W;deathBackground.height=H;deathBackground.getContext('2d').drawImage(canvas,0,0);
    mode='dying';story=null;accum=0;keys.clear();pressed.clear();released.clear();effects.length=0;toastTime=0;
    ['menu','modal','hud','low-health'].forEach(id=>$(id).classList.add('hidden'));$('toast').classList.remove('visible');sound.setState('pause');sound.stopSpeech();persist();
  }
  function showDeath(){
    playerDeath=null;deathBackground=null;
    if(deathScreen)return;
    mode='dead';story=null;modalClose=null;accum=0;shake=0;effects.length=0;
    keys.clear();pressed.clear();released.clear();sound.setState('pause');
    const theme=world.deathCause==='fall'?'fall':world.deathSource||'damage',art=DEATH_THEMES[theme];
    deathScreen={elapsed:0,ready:false,drawn:false,theme};
    ['menu','modal','hud'].forEach(id=>$(id).classList.add('hidden'));
    $('death-attempt').textContent=`/ ПОПЫТКА ${world.stats.deaths}`;
    $('death-screen').dataset.theme=theme;$('death-title').textContent=art.title;
    $('death-cause').textContent=art.cause;$('death-quote').textContent=art.quote;
    $('death-art-caption').textContent=art.caption;$('death-mark').textContent=art.mark;
    $('death-portrait').setAttribute('aria-label',art.actor==='gurov'?'Гуров собирается с силами для новой попытки':`Победитель: ${art.caption.split(' · ')[0]}`);
    $('death-chapter').textContent=`ГЛАВА 0${world.index+1} / ${CHAPTERS[world.index].name.toUpperCase()}`;
    $('death-checkpoint-note').textContent=`${world.checkpoint?'Последняя зажжённая лампа.':'Лампа у входа в главу.'} Предметы и сюжетный прогресс сохранятся.`;
    document.querySelectorAll('.death-actions button').forEach(el=>el.disabled=true);
    $('death-screen').classList.remove('hidden');$('death-screen').focus();drawDeath();persist();
  }
  function updateDeath(dt){
    drawDeath();if(!deathScreen||document.hidden||!document.hasFocus())return;
    deathScreen.elapsed+=dt;
    if(!deathScreen.ready&&deathScreen.elapsed>=.6){deathScreen.ready=true;document.querySelectorAll('.death-actions button').forEach(el=>el.disabled=false);$('death-checkpoint').focus();}
  }
  function retryDeath(restart=false){
    if(!deathScreen?.ready||!world?.awaitingRespawn)return;
    sound.init();
    if(restart){const fresh=world.restartLevel();enterLevel(fresh.index,null,false,fresh);sound.sfx('respawn');toast('Новая попытка. Глава началась заново.',3);}
    else{clearDeath();world.resumeCheckpoint();mode='play';$('hud').classList.remove('hidden');syncGameplayMusic();events();if(world.pendingScene)showStory(world.pendingScene);}
  }
  $('death-checkpoint').onclick=()=>retryDeath();$('death-restart').onclick=()=>retryDeath(true);
  $('death-menu').onclick=()=>{if(deathScreen?.ready)mainMenu();};
  function clearTransition(){transition=null;$('level-loading').classList.add('hidden');$('stage').removeAttribute('aria-busy');keys.clear();pressed.clear();released.clear();}
  function transitionToLevel(index,saved){
    if(transition)return;
    sound.stopSpeech();
    // Prepare and save the destination once. Its simulation stays paused;
    // the existing canvas holds the outgoing scene until the card covers it.
    world=new World(index,saved);persist();mode='loading';modalClose=null;
    keys.clear();pressed.clear();released.clear();accum=0;sound.setState('pause');
    transition={index,elapsed:0,phase:'cover',reveal:0,error:false};
    $('modal').classList.add('hidden');$('hud').classList.add('hidden');
    $('loading-number').textContent=String(index+1).padStart(2,'0');
    $('loading-title').textContent=CHAPTERS[index].name;
    $('loading-chapter').textContent=`ГЛАВА 0${index+1} / 04`;
    $('loading-status').textContent='Загружаем следующую главу';
    $('loading-actions').classList.add('hidden');
    [...$('loading-route').children].forEach((el,i)=>{el.classList.toggle('passed',i<index);el.classList.toggle('current',i===index);});
    $('level-loading').style.setProperty('--chapter-color',CHAPTERS[index].color);
    $('level-loading').style.opacity='0';$('level-loading').classList.remove('hidden');$('level-loading').focus();$('stage').setAttribute('aria-busy','true');
    if(index===2)GurovIllustrations.loadFaculty();
  }
  function updateTransition(dt){
    const tr=transition;if(!tr||document.hidden||!document.hasFocus())return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(tr.phase==='cover'){
      tr.elapsed+=dt;$('level-loading').style.opacity=reduced?'1':String(Math.min(1,tr.elapsed/.35));
      if(tr.index===2&&GurovIllustrations.failed){
        if(!tr.error){tr.error=true;$('loading-status').textContent='Не удалось загрузить изображения главы.';$('loading-actions').classList.remove('hidden');$('loading-retry').focus();}
        return;
      }
      if(tr.elapsed<2.65||(tr.index===2&&!GurovIllustrations.ready))return;
      tr.phase='reveal';enterLevel(tr.index,null,true,world);$('level-loading').focus();
    }else{
      tr.reveal+=dt;$('level-loading').style.opacity=reduced?'1':String(Math.max(0,1-tr.reveal/.35));
      if(tr.reveal>=.35){clearTransition();$('modal-actions').querySelector('button')?.focus();}
    }
  }
  $('loading-retry').onclick=()=>{if(!transition)return;transition.error=false;transition.elapsed=0;$('loading-actions').classList.add('hidden');$('loading-status').textContent='Загружаем следующую главу';$('level-loading').focus();GurovIllustrations.loadFaculty(true);};
  $('loading-menu').onclick=()=>{clearTransition();mainMenu();};
  function showPrologue(saved=null){
    sound.stopSpeech();resetVictory();clearBossOutro();clearDeath();
    world=new World(0,saved);prologue=new GurovPrologue();mode='prologue';story=null;modalClose=null;
    keys.clear();pressed.clear();released.clear();accum=0;effects.length=0;
    ['menu','hud','modal','credits'].forEach(id=>$(id).classList.add('hidden'));
    $('stage').classList.remove('summer-yard');sound.init();sound.setState('menu');
    $('prologue-skip').classList.remove('hidden');$('prologue-skip').focus();persist();
  }
  function finishPrologue(){
    if(!prologue)return;const saved=world.save();prologue=null;sound.stopSpeech();
    $('prologue-skip').classList.add('hidden');keys.clear();pressed.clear();released.clear();
    enterLevel(0,saved,true);
  }
  $('prologue-skip').onclick=finishPrologue;
  function startNew(){sound.init();const saved=readSave();if(saved){dialog('НОВОЕ ПРИКЛЮЧЕНИЕ','Начать с чистой доски?','<p>Текущее сохранение будет заменено. Вы снова начнёте с первой главы.</p>',[{text:'Начать заново',action:()=>showPrologue()},{text:'Назад',action:closeDialog}],closeDialog);}else showPrologue();}
  function mainMenu(){persist();prologue=null;$('prologue-skip').classList.add('hidden');upgradeChoice=null;renderPrevious=null;epilogue=null;$('epilogue-skip').classList.add('hidden');clearBossOutro();clearDeath();mode='menu';$('stage').classList.remove('summer-yard');world=null;credits=null;actor.resetMenu();$('credits').classList.add('hidden');$('modal').classList.add('hidden');$('hud').classList.add('hidden');$('menu').classList.remove('hidden');sound.setState('menu');keys.clear();pressed.clear();released.clear();refreshContinue();$('start').focus();}
  function showEpilogue(){
    sound.stopSpeech();
    persist();story=null;modalClose=null;mode='epilogue';keys.clear();pressed.clear();released.clear();
    ['menu','hud','modal'].forEach(id=>$(id).classList.add('hidden'));epilogue=new GurovEpilogue();sound.init();sound.setState('menu');$('epilogue-skip').classList.remove('hidden');$('epilogue-skip').focus();
  }
  $('epilogue-skip').onclick=showCredits;
  function refreshCreditsControl(){$('credits-pause').textContent=credits.done?'Ещё разок ↺':credits.paused?'Продолжить титры ▷':'Офтановить титры Ⅱ';}
  function showCredits(){
    epilogue=null;$('epilogue-skip').classList.add('hidden');sound.stopSpeech();persist();world=null;story=null;modalClose=null;mode='credits';keys.clear();pressed.clear();released.clear();actor.resetMenu();
    credits={elapsed:0,offset:0,paused:matchMedia('(prefers-reduced-motion: reduce)').matches,done:false};
    ['menu','hud','modal'].forEach(id=>$(id).classList.add('hidden'));$('credits').classList.remove('hidden');$('credits-roll').scrollTop=0;
    sound.init();sound.setState('menu');refreshCreditsControl();$('credits-pause').focus();
  }
  function toggleCredits(){
    if(!credits)return;
    if(credits.done){credits.elapsed=0;credits.offset=0;credits.done=false;credits.paused=false;$('credits-roll').scrollTop=0;}
    else credits.paused=!credits.paused;
    refreshCreditsControl();
  }
  function pauseCreditsScroll(){if(credits&&!credits.done){credits.paused=true;refreshCreditsControl();}}
  function updateCredits(dt){
    if(!credits||credits.paused||credits.done||document.hidden||!document.hasFocus())return;
    credits.elapsed+=dt;if(credits.elapsed<3)return;
    const roll=$('credits-roll'),end=roll.scrollHeight-roll.clientHeight;
    // Keep fractional pixels: rounding scrollTop each frame stalls slow rolls.
    credits.offset=Math.min(end,credits.offset+dt*22);roll.scrollTop=credits.offset;
    if(credits.offset>=end){credits.done=true;refreshCreditsControl();}
  }
  $('show-credits').onclick=()=>campaignCleared?showEpilogue():showCredits();$('credits-menu').onclick=mainMenu;$('credits-pause').onclick=toggleCredits;
  $('credits-roll').addEventListener('wheel',pauseCreditsScroll,{passive:true});
  $('credits-roll').addEventListener('touchstart',pauseCreditsScroll,{passive:true});
  $('credits-roll').addEventListener('pointerdown',pauseCreditsScroll);
  $('credits-roll').addEventListener('scroll',()=>{if(credits?.paused)credits.offset=$('credits-roll').scrollTop;});
  function pause(){if(mode!=='play')return;persist();dialog('ПАУЗА','Мысль не потеряна.',`<p>Прогресс сохранён. После перезапуска вы вернётесь к последней контрольной точке с собранными удовлами за диплом.</p><p class="fineprint">Esc — продолжить · M — включить или выключить звук</p>`,[{text:'Продолжить →',action:closeDialog},{text:sound.enabled?'Выключить звук':'Включить звук',action:()=>{sound.toggle();closeDialog();pause();}},{text:'В главное меню',action:mainMenu}],closeDialog);}
  function howto(){dialog('ПОЛЕВЫЕ ЗАМЕТКИ','У каждого действия есть смысл.',`<div class="controls-grid"><span><kbd>A</kbd><kbd>D</kbd> / <kbd>←</kbd><kbd>→</kbd></span><span>Передвигаться</span><span><kbd>S</kbd> / <kbd>↓</kbd></span><span>Удерживайте, чтобы пригнуться под высокими снарядами. Можно медленно идти и стрелять. Прыжок и рывок поднимают Гурова.</span><span><kbd>ПРОБЕЛ</kbd> / <kbd>W</kbd></span><span>Прыжок. Повторное нажатие — второй в воздухе.</span><span><kbd>J</kbd> / <kbd>X</kbd></span><span>Выплюнуть челюсть. Удерживайте для серии плевков.</span><span><kbd>SHIFT</kbd> / <kbd>K</kbd></span><span>Рывок в сторону взгляда. Даёт короткую защиту от ударов.</span><span><kbd>H</kbd></span><span>Съесть работы подопечных после выбора улучшения: +2 сердца за 1,2 секунды, перезарядка 20 секунд.</span><span><kbd>E</kbd></span><span>Поговорить, принять курсовую; в финале — поймать Ивана</span><span><kbd>ESC</kbd> / <kbd>P</kbd></span><span>Пауза</span><span><kbd>M</kbd></span><span>Звук</span></div><p class="fineprint" style="margin-top:22px">В первых двух главах соберите по три больших удовла за диплом. Маленькие удовлы дают очки. В третьей главе пройдите через кафедру ММП — сбор необязателен. На бесконечной крыше ничего собирать не нужно: вымотайте Ивана попаданиями, подойдите и нажмите E. Чай восстанавливает две единицы здоровья, лампа сохраняет точку возвращения. Обычное попадание снимает 2 сердца; сильный рывок, тяжёлый снаряд и ударная волна — 3. Перед атакой противник делает заметный замах. Перепрыгивайте волны и помидоры-ловушки; ловушки можно сбить челюстью. После падения можно пробовать снова сколько угодно.</p>`,[{text:'Всё понятно →',action:closeDialog}],closeDialog);}
  function lore(){dialog('ИСТОРИЯ И ГЕРОЙ','Один вопрос после защиты.',`<p>На защите дипломов Гуров требует прикладной алгебры. Иван Павленко отвечает помидором, поднимает весь зал и сбегает. Остальные студенты профессора уже не волнуют: у него остался один вопрос именно к Ивану. Вымышленный профессор Гуров идёт за ним по рассыпанным удовлам за диплом, проходит через ночной скалодром и кафедру ММП, а затем догоняет беглеца на бесконечной крыше. По пути придётся искать проходы, разговаривать со встречными и доказывать, что от одного вопроса не убежишь.</p><p>Внешность героя нарисована по открытому фотопортрету <strong>Сергея Исаевича Гурова</strong> с сайта ВМК МГУ. Там он указан как доцент кафедры математических методов прогнозирования; темы игры отсылают к его курсам и научным интересам.</p><p>Рисованные образы других персонажей созданы по фотографиям, предоставленным автором идеи. Кого встретит профессор — узнаете по дороге.</p><p class="fineprint">Приключение, звание персонажа и все его реплики вымышлены. Это самостоятельная фанатская игра, не официальный проект МГУ. Портрет-референс: факультет ВМК МГУ, CC BY 4.0. <a href="https://cs.msu.ru/persons/gurov-s-i" target="_blank" rel="noopener">Официальная страница и фотография ↗</a></p>`,[{text:'Вернуться →',action:closeDialog}],closeDialog);}
  $('start').onclick=startNew;$('continue').onclick=()=>{sound.init();const s=readSave();if(s)enterLevel(s.level,s,false);};$('howto').onclick=howto;$('lore').onclick=lore;$('pause').onclick=pause;
  function refreshSoundButton(){
    const active=sound.ctx?.state==='running';
    $('menu-sound').textContent=!sound.enabled?'♫ Звук выкл.':active?'♫ Звук вкл.':'♫ Включить музыку';
    $('menu-sound').setAttribute('aria-pressed',String(sound.enabled&&active));
  }
  function toggleSound(){
    // A first activation unlocks blocked audio instead of accidentally muting it.
    if(sound.enabled&&sound.ctx?.state!=='running')sound.init();else sound.toggle();
    refreshSoundButton();
  }
  sound.onChange=refreshSoundButton;
  $('menu-sound').onclick=toggleSound;refreshContinue();
  const handled=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyS','KeyA','KeyD','KeyW','KeyJ','KeyX','KeyK','KeyH','ShiftLeft','ShiftRight','KeyE','Enter','Escape','KeyP','KeyM'];
  addEventListener('keydown',e=>{
    if(prologue){
      if(handled.includes(e.code)||e.code==='Tab')e.preventDefault();if(e.repeat)return;
      if(e.code==='KeyM')toggleSound();else if(e.code==='Tab')$('prologue-skip').focus();
      else if(e.code==='Escape'||['Enter','Space'].includes(e.code)&&prologue.elapsed>1)finishPrologue();return;
    }
    if(upgradeChoice){
      if(['ArrowLeft','ArrowRight','Tab','Enter','Space','Escape','KeyM'].includes(e.code)||handled.includes(e.code))e.preventDefault();if(e.repeat)return;
      const buttons=[...$('modal-actions').children],i=buttons.indexOf(document.activeElement);
      if(['ArrowLeft','ArrowRight','Tab'].includes(e.code)){const d=e.code==='ArrowLeft'||e.shiftKey?-1:1;buttons[i<0?(d<0?1:0):(i+d+2)%2].focus();}
      else if(['Enter','Space'].includes(e.code)&&i>=0)buttons[i].click();
      else if(e.code==='KeyM')toggleSound();
      else if(e.code==='Escape'){upgradeChoice=null;mainMenu();}
      return;
    }
    if(bossOutro){
      if(handled.includes(e.code)||e.code==='Tab')e.preventDefault();
      if(e.repeat)return;
      if(e.code==='KeyM')toggleSound();
      else if(e.code==='Tab'&&bossOutro.canSkip)$('outro-skip').focus();
      else if(['Enter','Space'].includes(e.code)&&bossOutro.canSkip){sound.init();finishBossOutro();}
      return;
    }
    if(mode==='dying'){if(handled.includes(e.code)||e.code==='Tab')e.preventDefault();if(e.code==='KeyM'&&!e.repeat)toggleSound();return;}
    if(mode==='dead'){
      if(handled.includes(e.code)||['KeyR','Tab','ArrowDown'].includes(e.code))e.preventDefault();
      if(e.repeat)return;
      if(e.code==='KeyM'){toggleSound();return;}
      if(!deathScreen?.ready)return;
      const buttons=[...document.querySelectorAll('.death-actions button')],selected=buttons.indexOf(document.activeElement);
      if(e.code==='Tab'||e.code==='ArrowDown'||e.code==='ArrowUp'){const direction=e.code==='ArrowUp'||(e.code==='Tab'&&e.shiftKey)?-1:1;buttons[(selected+direction+buttons.length)%buttons.length].focus();}
      else if(e.code==='KeyR')retryDeath(true);
      else if(e.code==='Escape')mainMenu();
      else if(['Enter','Space'].includes(e.code))(buttons[selected]||buttons[0]).click();
      return;
    }
    if(transition){
      if(e.code==='KeyM'){e.preventDefault();if(!e.repeat)toggleSound();return;}
      if(transition.error&&e.code==='Tab')return;
      if(transition.error&&['Enter','Space'].includes(e.code)&&e.target.closest?.('#loading-actions button')){e.preventDefault();if(!e.repeat)e.target.click();return;}
      if(handled.includes(e.code)||e.code==='Tab')e.preventDefault();return;
    }
    if(mode==='epilogue'){if(e.code==='KeyM'){e.preventDefault();if(!e.repeat)toggleSound();}else if(['Escape','Enter','Space'].includes(e.code)){e.preventDefault();if(!e.repeat&&epilogue?.elapsed>1)showCredits();}return;}
    if(mode==='modal'&&e.code==='Tab'){
      const controls=[...$('modal').querySelectorAll('button:not(:disabled),a[href]')],i=controls.indexOf(document.activeElement);
      if(controls.length){e.preventDefault();controls[(i+(e.shiftKey?-1:1)+controls.length)%controls.length].focus();}return;
    }
    if(story&&['Enter','Space'].includes(e.code)){
      e.preventDefault();if(!e.repeat){sound.init();const button=e.target.closest?.('#modal-actions button');if(button)button.click();else story.advance();}return;
    }
    if(mode==='modal'&&!story&&e.target===document.querySelector('.modal-card')&&['ArrowUp','ArrowDown','PageUp','PageDown','Home','End','Space'].includes(e.code))return;
    if(e.target.closest?.('#menu-sound')&&['Enter','Space'].includes(e.code)){e.preventDefault();if(!e.repeat)toggleSound();return;}
    if(mode!=='play'&&e.target.closest?.('button')&&['Enter','Space'].includes(e.code)){e.preventDefault();if(!e.repeat)e.target.closest('button').click();return;}
    if(mode==='credits'&&e.code!=='KeyM'){
      if(e.code==='Escape'){e.preventDefault();if(!e.repeat)mainMenu();}
      else if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.code)){pauseCreditsScroll();$('credits-roll').focus();}
      else if(e.code==='Space'){e.preventDefault();if(!e.repeat)toggleCredits();}
      return;
    }
    if(handled.includes(e.code))e.preventDefault();if(e.repeat)return;
    if(e.code!=='KeyM')sound.init();keys.add(e.code);pressed.add(e.code);
    if(e.code==='Escape'||e.code==='KeyP'){if(mode==='play')pause();else if(mode==='modal'&&modalClose)modalClose();}
    if(e.code==='KeyM')toggleSound();
    if(e.code==='KeyE'&&mode==='play'&&!world.nearCatch&&world.nearNpc){const repeat=world.nearNpc.helped;world.talkToCameo();events();showStory(repeat?'sasha-repeat':'sasha-coursework');}
    else if(e.code==='KeyE'&&mode==='play'&&world.nearFaculty){if(world.talkToFaculty()){events();showStory(world.pendingScene);}}
    else if(e.code==='KeyE'&&mode==='play'&&!world.nearCatch&&world.nearSign){const s=world.nearSign;dialog(s.heading,'Заметка на полях',`<p>${s.text}</p>`,[{text:'Продолжить →',action:closeDialog}],closeDialog);}
  });
  addEventListener('keyup',e=>{keys.delete(e.code);released.add(e.code);});
  addEventListener('pointerdown',e=>{if(sound.enabled&&!e.target.closest?.('#menu-sound'))sound.init();});
  function suspendWindow(){
    keys.clear();pressed.clear();released.clear();
    if(backgroundPaused)return;
    backgroundPaused=true;persist();sound.suspend();
  }
  function resumeWindow(){
    if(document.hidden)return;
    // Discard time spent away even when the browser stopped requesting frames.
    if(backgroundPaused)last=null;
    backgroundPaused=false;sound.resume();
  }
  addEventListener('blur',suspendWindow);
  addEventListener('focus',resumeWindow);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendWindow();else if(document.hasFocus())resumeWindow();});
  addEventListener('beforeunload',()=>{persist();sound.close();});
  function input(){return {crouch:keys.has('KeyS')||keys.has('ArrowDown'),heal:pressed.has('KeyH'),interact:pressed.has('KeyE'),skipIntro:pressed.has('Enter')||pressed.has('Space'),left:keys.has('KeyA')||keys.has('ArrowLeft'),right:keys.has('KeyD')||keys.has('ArrowRight'),jump:['Space','KeyW','ArrowUp'].some(k=>pressed.has(k)),jumpReleased:['Space','KeyW','ArrowUp'].some(k=>released.has(k)),shoot:keys.has('KeyJ')||keys.has('KeyX'),dash:['ShiftLeft','ShiftRight','KeyK'].some(k=>pressed.has(k))};}
  function burst(x,y,color,count=12){for(let i=0;i<count;i++){const a=random(i+clock)*Math.PI*2,s=35+random(i+clock+4)*150;effects.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5+random(i+9)*.5,max:1,color,size:2+random(i)*4});}}
  function complete(){
    persist();
    if(world.pendingUpgrade&&world.index<FINAL_LEVEL){showUpgrade(complete);return;}
    const ending=GurovCompletion.scene(world.index,world.courseworkObtained);
    if(world.index<FINAL_LEVEL){const next=world.index+1,stats={...world.stats},courseworkObtained=world.courseworkObtained,companionUnlocked=world.companionUnlocked;dialog(`ГЛАВА 0${world.index+1} ЗАВЕРШЕНА`,ending.title,`<p>${ending.paragraph}</p><div class="result-grid"><div><strong>${world.index<2?world.pages+' / 3':'ММП'}</strong><span>${world.index<2?'ДИПЛОМЫ':'КАФЕДРА ПРОЙДЕНА'}</span></div><div><strong>${stats.sparks}</strong><span>УДОВЛЫ</span></div><div><strong>${formatTime(stats.elapsed)}</strong><span>В ПУТИ</span></div></div>`,[{text:'Следующая глава →',action:()=>transitionToLevel(next,{stats,courseworkObtained,companionUnlocked,upgrade:world.upgrade,paperCooldown:world.paperCooldown})}]);}
    else {const s=world.stats;try{localStorage.removeItem(SAVE);}catch(e){}dialog('Q. E. D. / ЧТО И ТРЕБОВАЛОСЬ ДОКАЗАТЬ',ending.title,`<p>${ending.paragraph}</p><blockquote>${ending.quote}</blockquote><div class="result-grid"><div><strong>${s.diplomas||6} / 6</strong><span>ДИПЛОМЫ</span></div><div><strong>${s.sparks}</strong><span>УДОВЛЫ</span></div><div><strong>${formatTime(s.elapsed)}</strong><span>В ПУТИ</span></div><div><strong>${s.deaths}</strong><span>ВОЗВРАЩЕНИЯ</span></div></div><p class="fineprint">${ending.fineprint}</p>`,[{text:'Последняя лекция · мультфильм →',action:showEpilogue},{text:'Ещё одно доказательство →',action:()=>showPrologue()}]);}
    sound.speakSequence(ending.lines);
    const replay=document.createElement('button');replay.className='voice-replay';replay.textContent='↻ Повторить рассказ';replay.onclick=()=>sound.speakSequence(ending.lines);$('modal-actions').append(replay);
  }
  function formatTime(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}
  function events(){for(const e of world.events){
    if(e.type==='save'){persist();continue;}
    if(!bossOutro&&!['bossIntro','bossDefeated','ivanCaught'].includes(e.type)&&!(world.pendingBossOutro&&['companionJoined','complete','hit'].includes(e.type))&&!(e.type==='hurt'&&world.awaitingRespawn))sound.sfx(e.type==='enemy'&&e.owner==='roman'?'romanDefeat':({combatTell:'shield',groundSlam:'land',holdImpact:'land',bossRage:'bossShot'})[e.type]||e.type,e);
    if(e.type==='jump')burst(e.x,e.y,e.second?'#9fe2d6':'#acbfb9',7);
    if(e.type==='dash')burst(e.x,e.y+45,'#9ee6d8',16);
    if(['spark','page','tea'].includes(e.type))burst(e.x,e.y,'#f7d58a',e.type==='page'?24:8);
    if(['enemy','hit'].includes(e.type))burst(e.x,e.y,'#d7a2eb',e.type==='enemy'?20:8);
    if(e.type==='shield')burst(e.x,e.y,'#a8c8e1',5);
    if(e.type==='shoot')burst(e.x,e.y,'#efe5bd',5);
    if(e.type==='paperEat')sound.sfx('paperBite');
    if(e.type==='paperInterrupted')toast('Поедание работ прервано. Найдите момент поспокойнее.',2);
    if(e.type==='heal'){sound.sfx('tea');effects.push({x:e.x,y:e.y-45,vx:0,vy:-35,life:1.3,label:`+${e.amount} ♥`,color:'#a3efba'});}
    if(e.type==='jawClack')burst(e.x,e.y,'#e7cba4',4);
    if(e.type==='step')burst(e.x,e.y,'#a4b5a1',3);
    if(e.type==='land')burst(e.x,e.y,'#b7c0a6',Math.round(5+e.force*8));
    if(e.type==='tomatoSplat')burst(e.x,e.y,'#ea6248',16);
    if(e.type==='hurt'){shake=e.damage>=3?.34:.22;effects.push({x:e.x+27,y:e.y-9,vx:0,vy:-65,life:.8,label:`−${e.damage} ♥`});}
    if(e.type==='groundSlam'){shake=.25;burst(e.x,e.y,'#efbd88',20);}
    if(e.type==='holdImpact')burst(e.x,e.y,'#dda373',10);
    if(e.type==='bossRage')toast(`${e.name}: вторая фаза! Следите за новыми приёмами.`,4);
    if(e.type==='death')beginPlayerDeath(e);
    if(e.type==='page')toast(`Удовл за диплом ${e.count} / 3.${e.count===3?' Все большие удовлы собраны!':''}`);
    if(e.type==='tea')toast('Глоток чая. Силы восстановлены.',3);
    if(e.type==='checkpoint')toast('Лампа зажжена. Точка возвращения сохранена.');
    if(e.type==='respawn')toast('Попытка — тоже часть доказательства. Продолжим.',3);
    if(e.type==='locked')toast(e.pages<3?`Найдите все три больших удовла за диплом. Собрано ${e.pages} / 3.`:`Сначала завершите спор: ${world.level.boss.name} ещё не сдался.`);
    if(e.type==='bossDefeated')beginBossOutro('erik');
    if(e.type==='coursework'){burst(e.x,e.y,'#bfd3e0',22);toast('Саша передал курсовую. Схема переходов теперь у вас!',5);}
    if(e.type==='ivanExhausted')toast('Иван выдохся! Подойдите к нему и нажмите E, чтобы поймать.',7);
    if(e.type==='ivanCaught')beginBossOutro('ivan');
    if(e.type==='companionJoined'&&!bossOutro){burst(e.x,e.y,'#9feee0',34);toast('Равиль Абдраманов присоединился! Он прикрывает вас леммами.',6);}
    if(e.type==='companionShot')burst(e.x,e.y,'#9feee0',4);
    if(e.type==='bossIntro'){sound.bossEntrance(e.kind);}
    if(e.type==='bossStart'){sound.resumeSpeech();toast(e.name==='Эрик Ильясов'?'Эрик Ильясов · атакуйте после согласования!':'Иван Павленко · догоняйте и уворачивайтесь от помидоров!',4);}
    if(e.type==='academicPhase'){sound.bossEntrance('ivan');ambientSpeech.defer(world,'ivan',world.level.boss,e.speech);toast('ФАЗА II · стенки разбиваются двумя попаданиями. Лечение прерывается атакой.',7);}
    if(e.type==='earthRise'||e.type==='earthBreak'){burst(e.x,e.y,'#c99f77',18);sound.sfx('land');}
    if(e.type==='summonTell'&&world.level.boss.summonTurn===0)toast('Иван призывает Романов! Фиолетовый круг предупреждает о появлении.',4);
    if(e.type==='summonOpen'||e.type==='summonReady')burst(e.x,e.y-12,'#d49aff',18);
    if(e.type==='summonFade')burst(e.x,e.y-45,'#b17ade',12);
    if(e.type==='ivanHeal'){burst(e.x,e.y,'#a3edb0',12);toast('Иван восстановил 2 здоровья. Не давайте ему оторваться!',3);}
    if(e.type==='bossSpeech')ambientSpeech.say(world,world.level.boss.kind,world.level.boss,e.speech,2);
    if(e.type==='romanSpeech')ambientSpeech.say(world,'roman',world.level.enemies.find(n=>n.speech===e.speech&&n.speechTime>0),e.speech);
    if(e.type==='companionSpeech'){if(e.combat)ambientSpeech.replyToIvan(world);else ambientSpeech.say(world,'ravil',world.companion,e.speech);}
    if(e.type==='runnerSpeech')ambientSpeech.say(world,'ivan',world.runner,e.speech);
    if(e.type==='facultySpeech')sound.speak(e.id,e.speech,2);
    if(e.type==='cameo')sound.speak('sasha','Профессор! Заберите курсовую!',2);
    if(e.type==='cameo')toast('Саша Ситников: «Профессор, заберите курсовую!»  ·  E — принять',5);
    if(e.type==='complete'&&!bossOutro){if(world.pendingScene)showStory(world.pendingScene);else complete();}
  }world.events.length=0;}
  function updateHud(){
    const p=world.player,b=world.level.boss;
    const cinema=!!world.intro;if(hudCache.cinema!==cinema){$('hud').classList.toggle('cinematic',cinema);hudCache.cinema=cinema;}
    syncGameplayMusic();
    const set=(id,value)=>{if(hudCache[id]!==value){$(id).textContent=value;hudCache[id]=value;}};
    if(hudCache.hp!==p.hp){$('health').innerHTML='♥'.repeat(p.hp)+`<span class="lost-heart">${'♥'.repeat(5-p.hp)}</span>`;$('health').setAttribute('aria-label',`Здоровье ${p.hp} из 5`);hudCache.hp=p.hp;}
    set('pages',world.pages+' / 3');set('sparks',world.stats.sparks);
    const dash=Math.round((1-p.dashCool/.9)*100);if(hudCache.dash!==dash){$('dash-fill').style.width=dash+'%';hudCache.dash=dash;}
    $('upgrade-status').classList.toggle('hidden',!world.upgrade);
    set('upgrade-status',world.upgrade==='homing'?'J · САМОНАВОДЯЩАЯСЯ ЧЕЛЮСТЬ':p.eating>0?'H · ЖУЁМ РАБОТЫ ПОДОПЕЧНЫХ…':world.paperCooldown>0?`H · РАБОТЫ ПОДОПЕЧНЫХ · ЧЕРЕЗ ${Math.ceil(world.paperCooldown)} С`:p.hp>=5?'H · РАБОТЫ ПОДОПЕЧНЫХ · ЗДОРОВЬЕ ПОЛНОЕ':'H · СЪЕСТЬ РАБОТЫ ПОДОПЕЧНЫХ · +2 ♥');
    $('upgrade-status').classList.toggle('ready',world.upgrade==='paper'&&world.paperCooldown<=0&&p.hp<5);
    $('low-health').classList.toggle('hidden',p.hp>GurovEngine.UPGRADES.lowHealth||world.won||world.awaitingRespawn||cinema);
    let objective=world.index===FINAL_LEVEL?(b.exhausted?'ИВАН ВЫДОХСЯ · подойдите и нажмите E':'ПОЙМАТЬ ИВАНА · вымотайте его попаданиями'):world.index===2?'ЧЕРЕЗ КАФЕДРУ ММП · лестница на крышу справа':'ПОГОНЯ ЗА ИВАНОМ · соберите 3 удовла за диплом';
    if(world.courseworkObtained){const r=b?.kind==='ivan'?b:world.runner;objective+=' · КУРСОВАЯ '+(r&&r.x<world.player.x?'←':'→');}set('chase-objective',objective);
    const near=world.nearCatch?'catch':world.nearNpc?(world.nearNpc.helped?'sasha-thanks':'sasha'):world.nearFaculty?(world.nearFaculty.group?'course-team':'maisuradze'):world.nearSign?'sign':'';
    if(hudCache.near!==near){$('sign-prompt').classList.toggle('hidden',!near);$('sign-prompt').innerHTML=near==='catch'?'<kbd>E</kbd> Поймать Ивана':near==='sasha'?'<kbd>E</kbd> Саша · принять курсовую':near==='course-team'?'<kbd>E</kbd> Обсудить прак, DL и байесы':near==='maisuradze'?'<kbd>E</kbd> Поговорить с Майсурадзе':near==='sasha-thanks'?'<kbd>E</kbd> Поговорить с Сашей':'<kbd>E</kbd> Прочитать заметку';hudCache.near=near;}
    const bossVisible=!!b?.active&&!b.defeated&&!world.intro;
    if(hudCache.bossVisible!==bossVisible){$('boss-hud').classList.toggle('hidden',!bossVisible);$('toast').style.top=bossVisible?'153px':'119px';hudCache.bossVisible=bossVisible;}
    if(b?.active){const hp=b.hp/b.maxHp*100;if(hudCache.bossHP!==hp){$('boss-bar').style.width=hp+'%';hudCache.bossHP=hp;}set('boss-name',b.name.toUpperCase());let hint=b.kind==='ivan'?(b.phase==='summon'?'ПРИЗЫВ РОМАНА · ОТОЙДИТЕ ОТ КРУГА':b.phase==='heal'?'ЛЕЧИТСЯ · ПОПАДАНИЕ ПРЕРВЁТ':b.phase==='earthWindup'?'ЗЕМЛЯНАЯ СТЕНА · ПРЫЖОК ИЛИ 2 ПОПАДАНИЯ':b.exhausted?'ВЫДОХСЯ · ПОДОЙДИТЕ И НАЖМИТЕ E':b.phase==='trapWindup'?'ПОМИДОРЫ-ЛОВУШКИ · ПРЫЖОК ИЛИ ЧЕЛЮСТЬ':b.phase==='windup'?(b.enraged?'ДВОЙНОЙ БРОСОК · УВОРАЧИВАЙТЕСЬ':'ЗАМАХ · УВОРАЧИВАЙТЕСЬ'):'ДОГОНЯЙТЕ · J — ЧЕЛЮСТЬ'):b.slamWarning?'УДАР ПО ЗЕМЛЕ · ПРЫГАЙТЕ':world.bossOpen()?'АТАКУЙТЕ · J':'СОГЛАСОВЫВАЕТ · ЩИТ';set('boss-state',(b.enraged&&!b.exhausted?'ФАЗА II · ':'')+hint);}
  }
  // Source atlases may have a baked preview checkerboard. Treat the neutral
  // connected border as a render-time color key, leaving the source untouched.
  function prepareSprites(img){
    const atlas=document.createElement('canvas');atlas.width=img.width;atlas.height=img.height;const a=atlas.getContext('2d',{willReadFrequently:true});a.drawImage(img,0,0);
    try {const im=a.getImageData(0,0,img.width,img.height),d=im.data,w=img.width,h=img.height;
      if(d[3]===255){const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
        const eligible=p=>{const i=p*4,r=d[i],g=d[i+1],b=d[i+2];return Math.min(r,g,b)>143&&Math.max(r,g,b)-Math.min(r,g,b)<24;};
        const add=p=>{if(!seen[p]&&eligible(p)){seen[p]=1;queue[tail++]=p;}};
        for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
        while(head<tail){const p=queue[head++];d[p*4+3]=0;const x=p%w;if(x)add(p-1);if(x<w-1)add(p+1);if(p>=w)add(p-w);if(p<w*(h-1))add(p+w);}
        a.putImageData(im,0,0);
      }
    }catch(e){console.warn('Sprite color key unavailable',e);}
    const boxes=[[63,40,237,455],[426,44,328,457],[810,43,318,454],[1193,24,320,460],[25,557,357,437],[392,590,389,397],[822,549,310,444],[1214,514,306,480]];
    spriteFrames=boxes.map(([x,y,w,h])=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(atlas,x,y,w,h,0,0,w,h);return c;});assetReady=true;
  }
  const sprite=new Image();sprite.onload=()=>prepareSprites(sprite);sprite.onerror=()=>{console.error('Cannot load professor sprite');$('start').disabled=true;$('start').textContent='Не удалось загрузить модель';};sprite.src=window.GUROV_SPRITE_DATA||'assets/gurov-sprites.png';
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
  function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function text(s,x,y,color,size=12,font='monospace',align='left'){ctx.fillStyle=color;ctx.font=`${size}px ${font}`;ctx.textAlign=align;ctx.fillText(s,x,y);ctx.textAlign='left';}
  const glowCache=new Map(),sceneCache=new Map();
  function layer(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;const previous=ctx;ctx=c.getContext('2d');try{paint();}finally{ctx=previous;}return c;}
  function glow(x,y,r,color){
    if(x+r<0||x-r>1280||y+r<0||y-r>720)return;
    if(!glowCache.has(color))glowCache.set(color,layer(128,128,()=>{const g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);}));
    ctx.drawImage(glowCache.get(color),Math.round(x-r),Math.round(y-r),r*2,r*2);
  }
  function star(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r*.3,y-r*.3);ctx.lineTo(x+r,y);ctx.lineTo(x+r*.3,y+r*.3);ctx.lineTo(x,y+r);ctx.lineTo(x-r*.3,y+r*.3);ctx.lineTo(x-r,y);ctx.lineTo(x-r*.3,y-r*.3);ctx.closePath();ctx.fill();}
  function university(x,y,scale,alpha=1){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha=alpha;
    const body='#344756',edge='#50616a';
    rect(-245,-85,490,85,body);rect(-175,-150,350,150,body);rect(-80,-210,160,210,body);rect(-50,-275,100,275,body);rect(-34,-312,68,45,body);rect(-17,-342,34,32,body);rect(-4,-398,8,61,edge);star(0,-404,8,'#d9cba1');
    rect(-248,-89,496,5,edge);rect(-177,-153,354,5,edge);rect(-83,-215,166,6,edge);rect(-53,-279,106,5,edge);
    for(let row=0;row<12;row++)for(let col=-3;col<=3;col++){if(row>8&&Math.abs(col)>1)continue;const yy=-20-row*21;rect(col*19-4,yy,7,10,random(row*8+col)> .38?'#b9a778':'#263b4d');}
    for(let side=-1;side<=1;side+=2){rect(side*155-26,-184,52,184,body);rect(side*155-16,-201,32,20,body);rect(side*155-2,-225,4,29,edge);for(let row=0;row<6;row++)for(let col=0;col<9;col++)rect(side*(93+col*16)-4,-19-row*20,6,9,random(row*27+col)>.62?'#a09270':'#273c4d');}
    ctx.restore();
  }
  function skyRaw(cam=0,menu=false){
    const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#101c31');grad.addColorStop(.55,'#284657');grad.addColorStop(1,'#557177');ctx.fillStyle=grad;ctx.fillRect(0,0,1840,H);
    glow(982-cam*.03,167,190,'#c8d5ba1c');ctx.fillStyle='#dae2c0';ctx.beginPath();ctx.arc(1010-cam*.025,129,29,0,Math.PI*2);ctx.fill();ctx.fillStyle='#244052';ctx.beginPath();ctx.arc(998-cam*.025,121,28,0,Math.PI*2);ctx.fill();
    for(let i=0;i<80;i++){const x=(random(i+4)*1600-cam*.05+1600)%1600,y=30+random(i+20)*350;rect(x,y,i%7===0?2:1,i%7===0?2:1,`rgba(218,231,213,${.18+random(i)*.5+Math.sin(clock*.6+i)*.08})`);}
    for(let i=0;i<14;i++){const x=i*145-cam*.09%145,y=385+random(i)*90;rect(x,y,132,H-y,'#263e50');for(let k=0;k<8;k++)rect(x+12+k*14,y+18+random(i+k)*60,4,6,'#70878845');}
    university(menu?797:860-cam*.14,menu?547:535,menu?.95:.79,.78);
    for(let i=0;i<8;i++){const xx=i*265-cam*.18%265;rect(xx,520+random(i)*22,220,210,'#253d46');rect(xx,512+random(i)*22,220,8,'#3d5358');}
    const mist=ctx.createLinearGradient(0,410,0,665);mist.addColorStop(0,'#43656a00');mist.addColorStop(.6,'#49686566');mist.addColorStop(1,'#132534');ctx.fillStyle=mist;ctx.fillRect(0,410,1840,280);
  }
  function sky(cam=0,menu=false){const key=menu?'menu-sky':'game-sky';if(!sceneCache.has(key))sceneCache.set(key,layer(1840,H,()=>skyRaw(0,menu)));ctx.drawImage(sceneCache.get(key),Math.round(menu?0:-cam*.14),0);}
  function drawProfessor(x,feet,height,frame=0,facing=1,alpha=1,motion={}){
    if(!assetReady)return;const img=spriteFrames[frame];ctx.save();ctx.globalAlpha=alpha;ctx.translate(Math.round(x),Math.round(feet));ctx.rotate((motion.lean||0)*facing);ctx.scale(facing*(motion.sx||1),motion.sy||1);ctx.imageSmoothingEnabled=false;const width=img.width/img.height*height;ctx.drawImage(img,-width/2,-height,width,height);ctx.restore();
  }
  function menuScene(){
    sky(0,true);
    // A quiet rooftop terrace: long depth lines, brass rail, and a lit study.
    rect(0,597,1280,123,'#152735');rect(0,592,1280,5,'#738375');
    for(let i=0;i<13;i++)line(i*140-260,720,640+(i*140-640)*1.3,596,'#72857c13');
    for(let y=625;y<720;y+=31)rect(0,y,1280,1,'#72857c1b');
    rect(720,527,560,7,'#4e6564');rect(720,537,560,2,'#223b44');for(let x=735;x<1280;x+=52){rect(x,531,5,62,'#425b5d');rect(x+2,531,1,62,'#6a7a6b');}
    rect(744,527,8,66,'#8c9274');rect(1202,527,8,66,'#8c9274');
    glow(968,414,224,'#d5b37018');
    // Blackboard suspended in the night, deliberately delicate.
    ctx.save();ctx.translate(1100,225);ctx.rotate(.06);rect(-74,-40,181,146,'#64796729');rect(-69,-35,171,136,'#142c3490');text('a + (b + c)',-54,-6,'#bbd0ba66',17);text('= (a + b) + c',-54,27,'#bbd0ba66',16);text('∴  Q.E.D.',-30,79,'#e1d1a47a',20);ctx.restore();
    // Warm spotlight and long shadow ground the character.
    if(mode==='menu')menuIvan.draw(ctx,cast);
    ctx.fillStyle='#09162090';ctx.beginPath();ctx.ellipse(1000,600,94,12,0,0,Math.PI*2);ctx.fill();
    actor.drawMenu(ctx,984,597,362,clock,drawProfessor,cast);
    const caption=actor.menuState==='jaw-in-hand'?'Челюсть требует слова.':actor.menuState==='spit'?'Аргумент вылетел сам собой.':['eat-papers','chew'].includes(actor.menuState)?'Перерабатывает собственные статьи.':'Конспект. Челюсть. Непоколебимая логика.';
    const label=document.querySelector('.hero-caption small');if(label.textContent!==caption)label.textContent=caption;
    const g=ctx.createLinearGradient(0,0,780,0);g.addColorStop(0,'#0c172ac9');g.addColorStop(.65,'#101e2a88');g.addColorStop(1,'#101e2a00');ctx.fillStyle=g;ctx.fillRect(0,0,790,720);
    for(let i=0;i<21;i++){const x=610+random(i)*640,y=100+(random(i+8)*550-clock*(4+random(i)*9))%550;rect(x,y,2,2,'#e6d39566');}
    text('∑',678,244,'#c9dcb328',44,'Georgia');text('∀',1170,471,'#c9dcb328',35,'Georgia');text('λ',772,350,'#c9dcb32b',28,'Georgia');
  }
  function archWindow(x,y,w,h,index){
    rect(x-9,y-11,w+18,h+21,'#61717436');rect(x-4,y-6,w+8,h+11,'#101e2bd9');
    const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'#2e5366');g.addColorStop(1,'#496d7299');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
    rect(x+w/2-3,y,6,h,'#334954');rect(x,y+h*.58,w,6,'#334954');rect(x-13,y+h+5,w+26,10,'#657775');rect(x-14,y+h+15,w+28,4,'#172d38');
    // Distant window lights and rain on the glass.
    for(let i=0;i<7;i++)rect(x+11+i*15,y+90+random(i+index)*60,4,7,'#a3b8a24c');
    for(let i=0;i<7;i++)line(x+12+random(i+index)*110,y+12+random(i+4)*190,x+10+random(i+index)*110,y+27+random(i+4)*190,'#b1c8c414');
  }
  function arcadeBay(i,index){
      const x=0;rect(x,140,30,480,'#203542');rect(x+5,147,20,460,'#304855');rect(x+10,148,4,458,'#51646440');rect(x-7,138,44,14,'#64746d');rect(x-4,589,38,19,'#59706d');
      if(i%2===0){archWindow(x+70,183,139,253,i);rect(x+253,229,96,136,'#657261');rect(x+258,234,86,126,'#193e40');text(index===0?'a ∈ R':index===1?'A ∨ ¬A':'f(x) → y',x+269,264,'#c2d7ad92',13);text(index===0?'a + 0 = a':index===1?'¬(A ∧ ¬A)':'error → 0',x+266,289,'#c2d7ad72',11);line(x+267,312,x+330,312,'#cad6ae4f');text('□',x+324,343,'#c2d7ad92',14);}
      else {archWindow(x+80,183,190,253,i);}
      rect(x+67,470,233,10,'#263e49');rect(x+72,480,7,100,'#1a2e3b');rect(x+285,480,7,100,'#1a2e3b');
      // Small groups of books, each with a highlight on its spine.
      for(let b=0;b<6;b++){const bx=x+84+b*13,by=447-random(i*6+b)*20;rect(bx,by,11,470-by,['#957455','#517773','#936669','#b29b6c'][Math.abs(i+b)%4]);rect(bx+2,by+4,1,470-by-7,'#ddc89b42');}
      rect(x+324,165,4,32,'#0e2330');rect(x+311,194,29,4,'#b29765');rect(x+315,198,21,7,'#f3d598');glow(x+326,215,85,'#f4c87922');
      if(i%3===1){rect(x+281,543,20,54,'#142e36');for(let k=0;k<5;k++){ctx.fillStyle='#3e665c';ctx.beginPath();ctx.ellipse(x+289+(k-2)*10,527+Math.abs(k-2)*7,7,25,(k-2)*.32,0,Math.PI*2);ctx.fill();}}
  }
  function drawCourseTeam(){
    const group=world.level.faculty.filter(n=>n.group==='course-team');if(!group.length)return;
    const center=group[1].x-world.camera;if(center<-330||center>W+330)return;
    const key='course-team-corner';
    if(!sceneCache.has(key))sceneCache.set(key,layer(530,466,()=>{
      rect(0,0,530,466,'#213942');rect(8,8,514,450,'#6c7869');rect(17,16,496,442,'#2b484a');
      rect(40,30,450,82,'#9c9971');rect(46,36,438,70,'#183942');
      text('ММП · КОМАНДА ПРАКТИКУМА',265,65,'#d3d8b6',17,'Georgia','center');
      text('У доски после последней пары',265,92,'#96b7aa',12,'monospace','center');
      rect(28,127,474,92,'#a79c76');rect(34,133,462,80,'#173d40');
      text('ПРАК  →  DL  →  БАЙЕС',265,163,'#e1d9ac',23,'monospace','center');
      text('ОБСУЖДАЕМ НОВЫЕ КУРСЫ',265,190,'#9bc5b2',12,'monospace','center');
      rect(43,420,444,14,'#536b5d');rect(17,433,496,8,'#1a353a');rect(0,458,530,8,'#91967b');
    }));
    ctx.drawImage(sceneCache.get(key),Math.round(center-265),135);
    const speaker=group.find(n=>n.speechTime>0),activity=speaker&&GurovFacultyMotion.sample(speaker,world.time);
    if(speaker){
      const lane=group.indexOf(speaker),bx=center-196+lane*130;
      line(bx,336,bx+118,336,speaker.color,3);
      if(speaker.id==='oganov'&&activity.mode==='greet'){line(bx+94,330,bx+118,336,speaker.color,2);line(bx+94,342,bx+118,336,speaker.color,2);}
    }
    for(const n of group){
      const x=n.x-world.camera,active=n.speechTime>0;
      if(active)glow(x,506,85,n.color+'20');
      rect(x-65,362,130,40,active?'#203e46':'#18343c');rect(x-65,362,130,2,active?n.color:'#799282');
      const [first,...rest]=n.shortName.split(' ');
      text(first,x,379,active?n.color:'#d4dcc6',12,'monospace','center');text(rest.join(' '),x,396,active?n.color:'#d4dcc6',15,'Georgia','center');
      ctx.save();ctx.translate(-world.camera,0);GurovIllustrations.draw(ctx,n,world.time);ctx.restore();
    }
  }
  function department(){
    const cam=world.camera;
    GurovEnvironments.drawCorridor(ctx,world,clock);
    // Compact workstations sit one step behind the playable corridor.
    for(const n of world.level.faculty){
      if(n.group)continue;
      const x=n.x-cam;if(x<-310||x>W+310)continue;
      const graph=n.id==='kitov',key='faculty-desk-'+n.id;
      if(!sceneCache.has(key))sceneCache.set(key,layer(410,375,()=>GurovEnvironments.paintOffice(ctx,n.id)));
      ctx.drawImage(sceneCache.get(key),Math.round(x-205),200);
      if(graph){
        const nodes=[[x-150,270],[x-104,247],[x-50,286],[x-119,320],[x-7,254]];
        for(const [a,b] of [[0,1],[1,2],[0,3],[2,3],[1,4],[2,4]]){line(...nodes[a],...nodes[b],'#83bca2',1);const u=(world.time*.6+a*.2)%1;ctx.fillStyle='#eace87';ctx.beginPath();ctx.arc(nodes[a][0]*(1-u)+nodes[b][0]*u,nodes[a][1]*(1-u)+nodes[b][1]*u,2,0,7);ctx.fill();}
        nodes.forEach(([nx,ny])=>{ctx.fillStyle='#75b8a4';ctx.beginPath();ctx.arc(nx,ny,5,0,7);ctx.fill();});
      }
      const [surname,...rest]=n.name.split(' ');
      if(n.speechTime>0){rect(x-184,362,354,75,'#102b38ee');rect(x-184,362,3,75,n.color);glow(x+88,450,66,n.color+'18');}
      text(surname,x-172,385,n.speechTime>0?n.color:'#e3d3ad',17,'Georgia');text(rest.join(' '),x-172,406,'#b8c8bb',12,'Georgia');
      text(n.topic,x-172,426,'#8bb09f',9,'monospace');
      // The tabletop hides the old seated legs and anchors the figure in its room.
      ctx.save();ctx.translate(72-cam,0);GurovIllustrations.draw(ctx,n,world.time);ctx.restore();
      rect(x-64,517,237,8,'#b09a73');rect(x-58,525,225,33,'#73694f');rect(x-58,558,8,11,'#344747');rect(x+159,558,8,11,'#344747');
      rect(x-48,508,45,9,'#b8b69c');line(x-43,511,x-7,511,'#526a62');
      drawFacultyWork(n,x);
      if(n.id==='maisuradze')text('E · ПОГОВОРИТЬ',x,594,'#d6b7bc',10,'monospace','center');
    }
    drawCourseTeam();rect(0,607,W,3,'#89977d');
    for(const n of world.level.faculty)if(n.speechTime>0)bubble((n.shortName||n.name.split(' ')[0])+': '+n.speech,n.x+(n.group?0:72)-cam,218,n.color||'#e9d5a8');
  }
  function drawFacultyWork(n,x){
    const m=GurovFacultyMotion.sample(n,world.time,matchMedia('(prefers-reduced-motion: reduce)').matches),u=m.progress;
    // Effects stay on the desk/board, away from faces and collectible lanes.
    if(n.id==='vorontsov'){
      const px=x-117+u*138,py=339-52*Math.exp(-u*3);glow(px,py,12,'#efd18544');rect(px-2,py-2,4,4,'#e5ca85');
    }else if(n.id==='maisuradze'){
      ctx.save();ctx.strokeStyle='#ede1c060';ctx.lineWidth=1.3;for(let i=0;i<2;i++){const y=329-((world.time*7+i*11)%29);ctx.beginPath();ctx.moveTo(x+69+i*5,y);ctx.quadraticCurveTo(x+74+i*5,y-7,x+70+i*5,y-14);ctx.stroke();}ctx.restore();
    }else if(n.id==='kitov'){
      rect(x-40,495,68,21,'#16333c');text(m.pose===3||m.mode==='greet'?'GRAPH ✓':'GNN…',x-6,510,'#a6d5bd',10,'monospace','center');
    }else if(n.id==='mestetsky'){
      ctx.save();ctx.strokeStyle='#e7cc89';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x-71,333,22,Math.PI,Math.PI+u*Math.PI*.8);ctx.stroke();ctx.restore();
    }else if(n.id==='dyukova'){
      for(let i=0;i<3;i++)rect(x-40+i*3,505-i*3,31,4,'#ddd3b1');if(m.pose>=3&&m.mode==='work')text('✓',x-24,501,'#b94d49',16,'Georgia','center');
    }else if(n.id==='senko'){
      ctx.strokeStyle='#b98467';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x-112,301,5+Math.sin(u*Math.PI)*3,0,Math.PI*2);ctx.stroke();
    }else if(n.id==='grabovoy'){
      rect(x-46,494,46,21,'#e0d4b7');for(let i=0;i<3;i++)line(x-41,499+i*5,x-8,499+i*5,'#728273');if(m.pose===2)line(x-40,506,x-40+u*32,506,'#b46d60',2);
    }else if(n.id==='ishchenko'){
      rect(x-45,487,67,29,'#17343d');rect(x-39,505,55,4,'#4a686e');rect(x-39,505,55*Math.min(1,u*2),4,'#a0c9ab');text(m.pose===4?'ГОТОВО':'ЗАПУСК',x-11,499,'#b8d3b5',9,'monospace','center');
    }
  }
  function environment(){
    const L=world.level,cam=world.camera;if(L.index===0){GurovEnvironments.drawSummer(ctx,world,clock);return;}if(L.index===2){department();return;}sky(L.endless?0:cam);
    if(L.index===FINAL_LEVEL){
      const dawn=ctx.createLinearGradient(0,0,0,H);dawn.addColorStop(0,'#b176751a');dawn.addColorStop(1,'#f3b58688');ctx.fillStyle=dawn;ctx.fillRect(0,0,W,H);
      for(let i=-1;i<8;i++){const x=i*220-(cam+world.distanceOffset)*.4%220;rect(x,479,5,133,'#53686b');rect(x,485,220,5,'#899286');for(let j=0;j<6;j++)rect(x+j*37,489,2,123,'#526973');}
      for(let i=-1;i<3;i++){const x=i*850-((cam+world.distanceOffset)%850);rect(x,244,310,42,'#244450dc');text('ПОГОНЯ ПРОДОЛЖАЕТСЯ  →',x+155,271,'#f0c899',15,'monospace','center');}
      rect(0,590,W,20,'#263e45');return;
    }
    // An open arcade frames the university beyond, with classroom alcoves.
    rect(0,90,W,39,'#243945');rect(0,126,W,5,'#61716a');rect(0,133,W,8,'#142934');
    for(let i=Math.floor(cam*.8/390)-1;i<Math.ceil((cam*.8+W)/390);i++){
      const variant=((i%6)+6)%6,key='arcade-'+L.index+'-'+variant;
      if(!sceneCache.has(key))sceneCache.set(key,layer(410,500,()=>{ctx.translate(8,-130);arcadeBay(variant,L.index);}));
      ctx.drawImage(sceneCache.get(key),Math.round(i*390-cam*.8-8),130);
    }
    if(L.index===1){
      if(!sceneCache.has('climbing-wall'))sceneCache.set('climbing-wall',layer(1540,380,()=>{
        const face=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
        face([[0,380],[0,170],[65,60],[215,32],[360,85],[500,12],[730,30],[875,76],[1040,18],[1275,55],[1450,20],[1540,120],[1540,380]],'#4d6063');
        const facets=[[[0,170],[65,60],[215,32],[155,220]],[[155,220],[215,32],[360,85],[410,300]],[[360,85],[500,12],[575,200],[410,300]],[[500,12],[730,30],[680,275],[575,200]],[[730,30],[875,76],[940,220],[680,275]],[[875,76],[1040,18],[1120,310],[940,220]],[[1040,18],[1275,55],[1320,185],[1120,310]],[[1275,55],[1450,20],[1540,120],[1320,185]],[[155,220],[410,300],[320,380],[0,380]],[[680,275],[940,220],[1080,380],[575,380]],[[1320,185],[1540,120],[1540,380],[1120,310]]];
        facets.forEach((f,i)=>face(f,['#5b6d6b','#394e57','#667771','#475e65','#536b69'][i%5]));
        for(let i=0;i<12;i++){const x=45+i*126;line(x,330,x+38,287,'#a4aea344',2);line(x+38,287,x+61,303,'#283f4855',2);}
        // Eight holds, half the former count, mounted on the same rock surface.
        for(let k=0;k<8;k++){const col=k%4;GurovItems.draw(ctx,'hold',105+col*360,Math.floor(k/4)?260+(col%2)*20:108-(col%2)*18,43,39,k*.6,k%4);}
        rect(0,353,1540,27,'#263c46');for(let i=0;i<8;i++)rect(i*193+4,359,184,15,'#4a666b');
      }));
      ctx.drawImage(sceneCache.get('climbing-wall'),Math.round(1880-cam),238);
      for(let i=0;i<4;i++){const x=2000+i*380-cam;rect(x,149,175,73,'#28564f');rect(x+5,154,165,63,'#1d3938');text('СОГЛАСОВАНО',x+87,183,'#b0d7ac',17,'monospace','center');text('СКАЛОДРОМ · ММП',x+87,203,'#a7bdaa',10,'monospace','center');}
    }
    rect(0,590,W,20,'#1c313a');
    // Subtle floating symbols keep each chapter visually distinct.
    const symbols=L.index===0?['∑','λ','∈','+']:L.index===1?['∀','¬','∧','∨']:['∇','ƒ','≈','δ'];
    for(let i=0;i<12;i++)text(symbols[i%4],(i*297-cam*.45+6000)%1800-100,202+random(i)*260+Math.sin(clock+i)*8,'#a7cbbb16',18+random(i)*16,'Georgia');
  }
  function platforms(){
    for(const p of world.level.platforms){const x=Math.round(p.x-world.camera);if(x+p.w<0||x>W)continue;
      if(world.index===0){GurovEnvironments.drawSummerPlatform(ctx,p,world.camera);continue;}
      if(p.kind==='floor'){
        rect(x,p.y,p.w,p.h,'#22353e');rect(x,p.y,p.w,7,'#b5b68c');rect(x,p.y+7,p.w,9,'#617570');rect(x,p.y+17,p.w,5,'#142a34');
        for(let row=0;row<3;row++)for(let bx=Math.max(0,Math.floor(-x/72)*72);bx<Math.min(p.w,W-x+72);bx+=72){const xx=x+bx-(row%2)*36;line(Math.max(x,xx),p.y+26+row*31,Math.min(x+p.w,xx+69),p.y+26+row*31,'#59716b35');if(xx>x&&xx<x+p.w)rect(xx,p.y+26+row*31,2,30,'#0e25322f');}
      }else{
        rect(x,p.y+7,p.w,17,p.kind==='moving'?'#3e7774':'#405853');rect(x,p.y,p.w,6,p.kind==='moving'?'#9ce4d4':'#b8bb91');rect(x+3,p.y+7,p.w-6,3,'#6b8773');rect(x+8,p.y+24,7,14,'#223d43');rect(x+p.w-15,p.y+24,7,14,'#223d43');
        for(let k=0;k<p.w;k+=24)rect(x+k,p.y+11,1,10,'#213a4380');
        if(p.kind==='moving')glow(x+p.w/2,p.y,65,'#76e8dc13');
      }
    }
    // Bottomless areas have a visible, animated violet current.
    if(world.index!==0)for(let x=0;x<W;x+=55)glow(x,722+Math.sin(clock+x)*5,50,'#b692d51b');
  }
  function drawItems(){
    for(const i of world.level.items){if(i.taken)continue;const x=i.x-world.camera,y=i.y+Math.sin(world.time*2+i.x)*3;if(x<-60||x>W+60)continue;
      if(i.type==='spark'&&world.level.items.some(j=>j.type==='page'&&!j.taken&&Math.abs(j.x-i.x)<25&&Math.abs(j.y-i.y)<25))continue;
      if(i.type==='spark'){glow(x+9,y+9,24,'#eed18925');GurovItems.draw(ctx,'grade',x+9,y+9,33,37,Math.sin(world.time+i.x)*.08,Number(i.id.split('-').pop())%2);}
      if(i.type==='page'){glow(x+15,y+17,55,'#f7d89138');GurovItems.draw(ctx,'diploma',x+15,y+18,46,52,Math.sin(world.time+i.x)*.05);}
      if(i.type==='tea')GurovItems.draw(ctx,'tea',x+13,y+15,37,39);
    }
  }
  function drawEnemy(e){
    const x=e.x+e.w/2-world.camera;if(x<-100||x>W+100)return;
    const moving=e.hp>0&&(e.phase==='rush'||(e.phase==='patrol'&&e.wait<=0)),windup=e.phase==='rushWindup'||e.phase==='burstWindup';
    const pose=e.hp<=0?15:e.hit>0?11:e.phase==='rushWindup'?12:e.phase==='burstWindup'?9:e.phase==='burst'?10:e.phase==='recover'?13:moving?-1:e.emote>0?14:0;
    if(windup&&e.hp>0){
      const rush=e.phase==='rushWindup',color=rush?'#ffa78b':'#a6e5e3';
      text(rush?'РЫВОК · 3 ♥':'MCP-ЗАЛП · 2 ♥',x,e.y-50,color,11,'monospace','center');
      ctx.setLineDash([6,7]);
      if(rush){const end=clamp(e.x+e.facing*(e.summoned?176.4:155),e.min,e.max)+e.w/2-world.camera;line(x,604,end,604,color,4);text(e.facing>0?'›':'‹',end,604,color,30,'monospace','center');}
      else if(e.aim)line(x,e.y+24,e.aim.x-world.camera,e.aim.y,color+'88',2);
      ctx.setLineDash([]);
    }
    if(e.summoned){
      const s=GurovSummonEffects.state(e),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,feet=e.y+e.h;
      GurovSummonEffects.before(ctx,e,x,feet,world.time,reduced);
      ctx.save();ctx.beginPath();ctx.rect(x-120,feet-230,240,230);ctx.clip();
      const rise=s.emerging?Math.pow(1-s.progress,2)*142:0,lift=s.dissolving?(1-s.alpha)*32:0;
      cast.motion(ctx,'roman',s.emerging?12:s.dissolving?11:pose,x,feet+rise-lift,134,e.facing||1,e.gait,moving,(e.hit>0?.65:1)*s.alpha*(s.emerging?.35+s.progress*.65:1),true);
      ctx.restore();GurovSummonEffects.after(ctx,e,x,feet,world.time,reduced);
      if(!s.emerging&&!s.dissolving&&!windup)text('ТЁМНЫЙ РОМАН',x,e.y-56,'#dcadff',10,'monospace','center');
    }else cast.motion(ctx,'roman',pose,x,e.y+e.h,134,e.facing||1,e.gait,moving,e.hit>0?.65:1);
    if(e.hp>0&&!windup&&e.phase!=='emerge'){for(let i=0;i<e.maxHp;i++)rect(x-(e.maxHp*10-3)/2+i*10,e.y-43,7,3,i<e.hp?(e.summoned?'#d49bff':'#dccb94'):'#4b5960');}
    if(e.speechTime>0&&e.hp>0&&e.phase==='patrol')bubble(e.speech,x,e.y-51,'#dbdfac');
  }
  function drawCompanion(){
    const c=world.companion;if(!c)return;const x=c.x+c.w/2-world.camera,moving=Math.abs(c.vx)>24&&c.grounded;
    const pose=c.cast>.27?9:c.cast>.17?10:!c.grounded?12:c.affection>0&&!moving?14:moving?-1:world.time%10>8?15:0;
    cast.motion(ctx,'ravil',pose,x,c.y+c.h,134,c.facing,c.gait,moving);
    text('РАВИЛЬ · ПОМОЩНИК',x,c.y-35,'#a8efde',10,'monospace','center');
    if(c.speechTime>0)bubble(c.speech,x,c.y-75,'#f1bbc9');
    if(c.affection>0)GurovItems.draw(ctx,'lemma',x+35,c.y-15-Math.sin(world.time*3)*5,19,19);
  }
  function drawCaptive(){
    const c=world.level.captive;if(!c)return;const x=c.x-world.camera;if(x<-140||x>W+140){if(c.speechTime>0)bubble('Равиль: '+c.speech,x,393,'#9edbd0');return;}
    rect(x-72,414,144,196,'#102833e8');rect(x-76,408,152,9,'#8e9276');
    cast.drawCaptive(ctx,x,602,world.time,c.speechTime>0);
    for(let i=0;i<4;i++)rect(x-66+i*44,418,3,190,'#859790aa');
    rect(x-72,601,148,9,'#8e9276');rect(x-6,571,19,23,'#d3b575');rect(x-2,565,11,10,'#d3b575');rect(x+2,578,4,9,'#293d48');
    text('РАВИЛЬ · В ЗАЛОЖНИКАХ',x,635,'#eccb8b',10,'monospace','center');
    if(c.speechTime>0)bubble('Равиль: '+c.speech,x,393,'#9edbd0');
  }
  function drawRunner(){
    const r=world.runner;if(!r||r.escaped)return;const x=r.x-world.camera;if(x<-120||x>W+120)return;
    ctx.save();
    if(r.phase==='enter'){const door=world.level.exit;ctx.beginPath();ctx.rect(door.x-world.camera,door.y,door.w,door.h);ctx.clip();}
    cast.motion(ctx,'ivan',r.phase==='jump'?12:r.phase==='enter'?14:-1,x,r.y,132,r.facing,r.gait,!!r.vx,r.phase==='enter'?Math.max(0,1-r.doorTime/.65):1);ctx.restore();
    if(r.speechTime>0)bubble(world.index===0?'Я на крышу! Рецензию потом!':'Задержите его! Я пробегу первым!',x,r.y-165,'#eec0c2');
  }
  function bubble(message,x,y,color='#e7d4aa'){
    ctx.font='15px monospace';const lines=[];let row='';
    for(const word of message.split(' ')){if(row&&ctx.measureText(row+' '+word).width>490){lines.push(row);row=word;}else row+=(row?' ':'')+word;}if(row)lines.push(row);
    const width=Math.min(520,Math.max(...lines.map(l=>ctx.measureText(l).width))+28),height=lines.length*21+16;
    x=clamp(x,width/2+12,W-width/2-12);const top=Math.max(154,y-height);
    rect(x-width/2,top,width,height,'#102532ed');rect(x-width/2,top,width,2,color);
    lines.forEach((l,i)=>text(l,x,top+25+i*21,color,15,'monospace','center'));
    ctx.fillStyle='#102532ed';ctx.beginPath();ctx.moveTo(x-6,top+height);ctx.lineTo(x,top+height+8);ctx.lineTo(x+6,top+height);ctx.fill();
  }
  function drawBoss(){
    const b=world.level.boss;if(!b)return;const x=b.x+b.w/2-world.camera;
    const open=world.bossOpen(),erik=b.kind==='erik';
    for(const wall of b.walls||[]){const wx=wall.x-world.camera;if(wx<-60||wx>W+60)continue;ctx.save();ctx.globalAlpha=Math.min(1,wall.life);rect(wx,wall.y,wall.w,wall.h,'#896341');for(let i=0;i<5;i++){rect(wx-3+(i%2)*5,wall.y+i*30,wall.w+4,25,i%2?'#b08a59':'#a17c51');line(wx+8,wall.y+i*30+5,wx+22,wall.y+i*30+16,'#644c37',2);}text(wall.hp+' / 2',wx+26,wall.y-12,'#ffe0a1',12,'monospace','center');ctx.restore();}
    if(b.wallTell){const wx=b.wallTell.x-world.camera;glow(wx+26,607,70,'#eab35b66');line(wx,606,wx+52,606,'#ffdf8e',6);text('↑ СТЕНА',wx+26,570,'#ffe0a1',12,'monospace','center');}
    if(b.warning){for(const target of (b.warning.targets||[b.warning.x]).slice(b.warning.next||0)){const wx=target-world.camera;glow(wx,596,65,'#ee745544');rect(wx-48,604,96,6,'#ff967a');text('↓ 3 ♥',wx,581,'#ffd1a9',12,'monospace','center');ctx.setLineDash([7,8]);line(wx,258,wx,561,'#eb987a77',2);ctx.setLineDash([]);}}
    if(b.slamWarning){line(x-220,607,x+220,607,'#ffc68c',5);text('↑ ПРЫГАЙТЕ · 3 ♥',clamp(x,140,W-140),564,'#ffd1a9',14,'monospace','center');}
    if(b.trapTargets){for(const target of b.trapTargets){const tx=target-world.camera;ctx.strokeStyle='#efb29b';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.ellipse(tx,604,25,7,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);text('↓ ПОМИДОР',tx,574,'#ffc3a7',10,'monospace','center');}}
    if(x>W+180||x<-180){if(erik&&b.speechTime>0)bubble('Эрик: '+b.speech,x,b.y-38,'#abebc9');return;}
    if(b.active&&!b.defeated){
      glow(x,b.y+65,90,erik&&!open?'#80ddbb35':'#edb08413');
      if(erik&&!open){ctx.strokeStyle='#8ce0b5';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,b.y+50,71,83,0,0,Math.PI*2);ctx.stroke();text('СОГЛАСОВАНО',x,b.y+137,'#99e8c5',10,'monospace','center');}
    }
    let pose=0;
    if(b.defeated)pose=15;
    else if(b.exhausted)pose=13;
    else if(b.hit>0)pose=11;
    else if(erik)pose=b.phase==='talk'?14:b.phase==='slamWindup'?12:b.phase==='recover'?13:['stamp','windup'].includes(b.phase)?9:b.phase==='throw'?10:Math.abs(b.vx)>1?-1:0;
    else pose=b.phase==='summon'?9:b.phase==='earthWindup'?13:b.phase==='heal'?15:b.escape>0?12:b.phase==='trapWindup'?13:b.phase==='trapThrow'?10:b.phase==='windup'?9:b.phase==='throw'?10:Math.abs(b.vx)>0?-1:14;
    ctx.fillStyle='#09192377';ctx.beginPath();ctx.ellipse(x,613,40,7,0,0,Math.PI*2);ctx.fill();
    const facing=!erik&&(pose===9||pose===10)?(world.player.x<b.x?-1:1):b.facing;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    GurovIvanEffects.before(ctx,b,x,b.y+b.h,cast,pose,facing,world.time,reduced);
    if(!(b.exhausted||b.defeated)||!GurovActing.draw(ctx,b.kind,erik?0:4,x,b.y+b.h,erik?112:132,erik?1:-1))cast.motion(ctx,b.academic&&!b.exhausted&&!b.defeated?'ivan-academic':b.kind,pose,x,b.y+b.h,132,facing,b.gait,Math.abs(b.vx)>10&&!b.exhausted&&b.escape<=0,b.hit>0?.65:1);
    GurovIvanEffects.after(ctx,b,x,b.y+b.h,world.time,reduced);
    if(b.academic&&!b.exhausted&&!b.defeated){if(b.phase==='heal'){glow(x,b.y+55,88,'#9fec9677');text('+2 · ПЕРЕРЫВ',x,b.y-18,'#c4ffb1',13,'monospace','center');}}
    if(b.speechTime>0)bubble((erik?'Эрик: ':'')+b.speech,x,b.y-38,erik?'#abebc9':'#f1c4c1');
    else if(!b.active)text(b.name,x,b.y-40,'#e2d1b2',13,'monospace','center');
  }
  function drawCameo(){
    const n=world.level.npc;if(!n)return;const x=n.x-world.camera;
    if(x<-120||x>W+120)return;
    const bench=n.anchor-world.camera;
    rect(bench-64,591,122,8,'#6a796c');rect(bench-56,599,7,14,'#435a59');rect(bench+48,599,7,14,'#435a59');
    const near=world.nearNpc,pose=n.handoff>1.1?10:n.helped?15:Math.abs(n.vx)>1?-1:near?(world.time%4>2?9:10):world.time%8>4?14:0;
    cast.motion(ctx,'sasha',pose,x,n.y,148,Math.abs(n.vx)>1?Math.sign(n.vx):world.player.x<n.x?-1:1,n.gait,Math.abs(n.vx)>1);
    if(near)bubble(n.helped?'Моя курсовая теперь у вас!':'Профессор! Заберите курсовую!',x,435,'#e8cf98');
    text('САША СИТНИКОВ',x,635,'#decca4',11,'monospace','center');
  }
  function props(){const cam=world.camera;
    for(const c of world.level.checkpoints){const x=c.x-cam;rect(x-12,c.y-44,45,44,'#3c5158');rect(x-17,c.y-49,55,6,'#929878');rect(x+12,c.y-80,3,32,'#a49b73');rect(x+1,c.y-83,25,6,c.active?'#e6c686':'#70888c');if(c.active){glow(x+13,c.y-88,80,'#eaca8133');rect(x+6,c.y-89,15,6,'#f9dc98');}text('✦',x+7,c.y-15,c.active?'#d9c38a':'#758c91',17);}
    for(const s of world.level.signs){const x=s.x-cam,near=world.nearSign===s;glow(x+8,s.y-63,near?82:62,near?'#ffd16b99':'#ffd87955');rect(x+5,s.y-54,6,54,'#937449');ctx.save();ctx.shadowColor='#ffce65';ctx.shadowBlur=near?24:12;rect(x-17,s.y-87,52,39,'#ffda82');ctx.restore();rect(x-12,s.y-82,42,29,'#263b42');text('i',x+9,s.y-61,'#ffe6a9',25,'Georgia','center');}
    const e=world.level.exit;if(!e)return;const x=e.x-cam,ready=world.pages>=(world.level.requiredPages??3)&&(!world.level.boss||world.level.boss.defeated);
    glow(x+42,e.y+75,105,ready?'#b8ebc548':'#e1c57d14');rect(x-12,e.y-14,109,156,'#798779');rect(x-6,e.y-8,97,150,'#c0b58c');rect(x,e.y,85,142,ready?'#709992':'#294550');rect(x+9,e.y+10,67,120,ready?'#a0c7ad':'#20353f');
    for(let i=0;i<(world.level.requiredPages??3);i++)star(x+19+i*23,e.y-29,5,i<world.pages?'#f5d28a':'#576d6b');rect(x+65,e.y+76,5,5,'#d8c184');text(ready?'ЗА ИВАНОМ':'3 УДОВЛА ЗА ДИПЛОМ',x+43,e.y-52,'#dbcba4',10,'monospace','center');
  }
  function gameScene(hidePlayer=false){
    environment();ctx.save();if(shake>0)ctx.translate((random(clock)-.5)*shake*22,(random(clock+4)-.5)*shake*15);
    props();platforms();GurovSummonEffects.warning(ctx,world.level.boss,world.camera,world.time,matchMedia('(prefers-reduced-motion: reduce)').matches);drawRunner();drawCameo();drawCaptive();drawCompanion();drawItems();world.level.enemies.forEach(drawEnemy);drawBoss();
    for(const s of world.projectiles){
      const x=s.x+s.w/2-world.camera,y=s.y+s.h/2;if(x<-100||x>W+100)continue;
      if(s.type==='hold'||s.type==='bigHold')GurovItems.draw(ctx,'hold',x,y,s.w+12,s.h+12,s.age*(s.vx<0?-3:3),s.variant);
      else if(s.type==='tomato')GurovItems.draw(ctx,'tomato',x,y,34,34,s.age*(s.vx<0?-5:5));
      else if(s.type==='mcp'){if(s.sinister){glow(x,y,28,'#c56dff55');ctx.save();ctx.filter='hue-rotate(85deg)';}GurovItems.draw(ctx,'mcp',x,y,37,31,Math.sin(s.age*10)*.14);if(s.sinister)ctx.restore();}
      else if(s.type==='shockwave')GurovItems.draw(ctx,'shockwave',x,y,82,38,0);
      else if(s.type==='tomatoTrap'){ctx.strokeStyle=s.arm>0?'#eed893':'#f07f65';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,606,25,6,0,0,Math.PI*2);ctx.stroke();GurovItems.draw(ctx,'tomato',x,y,37,37,Math.sin(s.age*5)*.06);}
      else if(s.type==='lemma'){glow(x,y,25,'#7cfce933');GurovItems.draw(ctx,'lemma',x,y,27,27,Math.sin(s.age*8)*.15);}
      else if(s.homing)drawGurovRocketJaw(ctx,x,y,.91,s.age*38,Math.atan2(s.vy,s.vx));
      else{const direction=Math.sign(s.vx);drawGurovJaw(ctx,x,y,.91,s.age*38,s.age*direction*6);ctx.globalAlpha=.15;drawGurovJaw(ctx,x-direction*24,y-3,.65,s.age*38-1,s.age*direction*6-.3);ctx.globalAlpha=1;}
    }
    const p=world.player,x=p.x+p.w/2-world.camera;
    if(!hidePlayer){drawGurovHealTrail(ctx,p,world.camera);
    ctx.fillStyle='#09192366';ctx.beginPath();ctx.ellipse(x,p.y+p.h+2,p.grounded?24:19,5,0,0,Math.PI*2);ctx.fill();
    if(world.won)cast.draw(ctx,'gurov',15,x,p.y+p.h,146,p.facing);
    else if(actor.ready)actor.drawPlayer(ctx,p,x,world.time,drawProfessor,cast);
    else drawProfessor(x,p.y+p.h,146,0,p.facing);}
    if(world.courseworkFlight>0&&world.level.npc){const n=world.level.npc,u=1-world.courseworkFlight/1.35;GurovItems.draw(ctx,'coursework',(n.x-world.camera)*(1-u)+x*u,(n.y-88)*(1-u)+(p.y+56)*u-Math.sin(u*Math.PI)*110,55,60,Math.sin(u*Math.PI)*.25);}
    for(const e of effects){ctx.globalAlpha=clamp(e.life*1.5,0,1);if(e.label)text(e.label,e.x-world.camera,e.y,e.color||'#ffc5af',19,'monospace','center');else rect(e.x-world.camera,e.y,e.size,e.size,e.color);}ctx.globalAlpha=1;ctx.restore();
    // Drifting dust in the foreground provides motion without obscuring jumps.
    for(let i=0;i<22;i++){const x=(random(i)*W-world.camera*.2+clock*(i%2?4:-3)+W*10)%W,y=165+random(i+10)*430+Math.sin(clock*.6+i)*12;rect(x,y,2,2,'#d6dab638');}
  }
  function loop(t){
    const dt=last===null?0:Math.min((t-last)/1000||0,.05);last=t;
    // Do not change scene mode: speech coordinators would release their current
    // speaker on a modal pause. Keep captions and every scene clock frozen too.
    if(backgroundPaused){requestAnimationFrame(loop);return;}
    clock+=dt;shake=Math.max(0,shake-dt);sound.update();
    if(mode==='play'&&world){accum+=dt;let first=true;while(accum+1e-9>=1/120){const i=input();if(!first){i.jump=false;i.dash=false;i.jumpReleased=false;i.heal=false;}renderPrevious=GurovRender.capture(world);world.update(1/120,i);events();accum-=1/120;first=false;if(mode!=='play'){accum=0;break;}}if(!first){pressed.clear();released.clear();}for(const e of effects){e.life-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy+=150*dt;}for(let i=effects.length-1;i>=0;i--)if(effects[i].life<=0)effects.splice(i,1);updateHud();}
    else {accum=0;pressed.clear();released.clear();}
    ambientSpeech.update(world,mode);encounterSpeech.update(world,mode);departmentSpeech.update(world,mode);
    if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('visible');}
    if(story){if(!story.portraitReady)storyPortrait();const frame=GurovStory[story.kind][story.index],elapsed=clock-story.started;if(story.kind==='course-team'){drawGurovDialogueStage($('dialogue-stage'),cast,frame,elapsed);$('modal-actions').firstChild.disabled=!!frame.action&&elapsed<2;}if(frame.action){const cue=frame.action==='jaw-hit'?'hit':'jawClack';if(elapsed>=1.35&&!story.cues.includes(cue)){story.cues.push(cue);sound.sfx(cue);}}}
    if(bossOutro)updateBossOutro(dt);
    if(transition)updateTransition(dt);
    if(playerDeath){if(playerDeath.update(dt,!document.hidden&&document.hasFocus()))sound.sfx('bodyFall');if(playerDeath.done)showDeath();}
    if(mode==='dead')updateDeath(dt);
    if(mode==='credits')updateCredits(dt);
    if(prologue){prologue.update(dt,sound,!document.hidden&&document.hasFocus());if(prologue.done)finishPrologue();}
    if(epilogue){epilogue.update(dt,sound,!document.hidden&&document.hasFocus());if(epilogue.done)showCredits();}
    $('low-health').style.animationPlayState=mode==='play'?'running':'paused';
    if(!world&&(mode==='menu'||mode==='credits'))actor.updateMenu(dt,sound);
    if(!world&&mode==='menu'&&!document.hidden)menuIvan.update(dt);
    if(prologue)prologue.draw(ctx,cast);
    else if(playerDeath)playerDeath.draw(ctx,cast,deathBackground);
    else if(epilogue)epilogue.draw(ctx,cast);
    else if(bossOutro)bossOutro.draw(ctx,cast,outroBackground);
    else if(mode!=='dead'&&(!transition||transition.phase==='reveal')){if(world){const simulation=world;if(mode==='play')world=GurovRender.between(world,renderPrevious,accum*120);gameScene();drawGurovBossIntro(ctx,world.intro,cast);world=simulation;}else menuScene();}requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  // Native shells permit autoplay; browsers can unlock the same context on a gesture.
  if(!document.hidden)sound.init();else{sound.suspend();refreshSoundButton();}
  // Small read-only diagnostics for automated smoke tests and bug reports.
  window.gurov={get state(){return {mode,backgroundPaused,prologue:prologue?.status||null,ambientSpeech:ambientSpeech.status,encounterSpeech:encounterSpeech.status,departmentSpeech:departmentSpeech.status,playerDeath:playerDeath?{elapsed:playerDeath.elapsed,duration:playerDeath.duration,pose:playerDeath.pose,landed:playerDeath.landed,cause:playerDeath.cause}:null,upgradeChoice:!!upgradeChoice,upgrade:world?.upgrade,playerMood:actor.playerMood,paperCooldown:world?.paperCooldown,epilogue:epilogue?epilogue.status:null,actingReady:GurovActing.ready,bossOutro:bossOutro?{kind:bossOutro.kind,elapsed:bossOutro.elapsed,duration:bossOutro.duration,phase:bossOutro.phase,cues:[...bossOutro.cues],canSkip:bossOutro.canSkip,reduced:bossOutro.reduced,paused:bossOutro.paused}:null,pendingBossOutro:world?.pendingBossOutro,campaignCleared,menuIvan:{...menuIvan},menuProfessorSource:actor.menuState==='idle'?'gurov-actions-v3':'gurov-animation-v2',deathScreen:deathScreen?{...deathScreen}:null,awaitingRespawn:!!world?.awaitingRespawn,deathCause:world?.deathCause,deathSource:world?.deathSource,checkpoint:world?.checkpoint,transition:transition?{...transition}:null,credits:credits?{...credits}:null,story:story?{kind:story.kind,index:story.index,elapsed:clock-story.started,portraitReady:story.portraitReady,expression:GurovStory[story.kind][story.index].expression||'normal'}:null,pendingScene:world?.pendingScene,illustrations:{portraits:Object.fromEntries(Object.entries(GurovIllustrations.portraits).map(([id,im])=>[id,{width:im.naturalWidth,height:im.naturalHeight}])),facultyReady:GurovIllustrations.ready,facultyCount:Object.keys(GurovIllustrations.faculty).length},faculty:world?.level.faculty?.map(n=>({...n,performance:GurovFacultyMotion.sample(n,world.time)})),endless:!!world?.level.endless,distance:world?world.distanceOffset+world.player.x:0,platformCount:world?.level.platforms.length,itemCount:world?.level.items.length,captive:world?.level.captive?{...world.level.captive}:null,assetReady:assetReady&&actor.ready&&cast.ready&&GurovEnvironments.ready&&GurovActing.ready&&GurovPrologueArt.ready,environment:{summerReady:GurovEnvironments.ready,failed:GurovEnvironments.failed,cachedSections:GurovEnvironments.cache.size,officeVariants:[...sceneCache.keys()].filter(k=>k.startsWith('faculty-desk-')).length},castReady:cast.ready,coursework:!!world?.courseworkObtained,nearCatch:!!world?.nearCatch,nearFaculty:world?.nearFaculty?.id||null,runner:world?.runner?{...world.runner}:null,enemies:world?.level.enemies.map(e=>({...e})),intro:world?.intro?{...world.intro}:null,companion:world?.companion?{...world.companion}:null,boss:world?.level.boss?structuredClone(world.level.boss):null,cameo:world?.level.npc?{...world.level.npc}:null,animationReady:actor.ready,menuAnimation:actor.menuState,menuTime:actor.menuTime,runFrame:actor.runFrame,enemyProjectiles:world?.projectiles.filter(s=>s.enemy).map(s=>({...s})),projectiles:world?.projectiles.filter(s=>!s.enemy).map(s=>({type:s.type,homing:s.homing,seeking:s.seeking,x:s.x,y:s.y,vx:s.vx,vy:s.vy,age:s.age,bounces:s.bounces})),level:world?.index,player:world?{...world.player}:null,pages:world?.pages,stats:world?{...world.stats}:null,canvas:{width:W,height:H},audio:sound.status,sound:sound.enabled};}};
})();
