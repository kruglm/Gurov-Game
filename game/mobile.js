/* Native-sized touch UI around the same 1280 × 720 simulation. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id);
 const screens=['menu','hud','modal','credits','death-screen','boss-outro-controls','level-loading','prologue-skip','epilogue-skip'];
 class Mobile {
  constructor({input,press,release,freeze,resize}){
   this.input=input;this.press=press;this.release=release;this.freeze=freeze;this.resize=resize;
   this.enabled=false;this.rotationPaused=false;this.playing=false;this.pointers=new Map();this.epoch=input.epoch;this.cache={};this.started=performance.now();
   const host=document.createElement('div');host.id='mobile-ui';document.body.append(host);
   host.innerHTML=`<div id="touch-controls" class="hidden" role="group" aria-label="Управление игрой">
    <div class="touch-directions"><button data-code="KeyA" class="touch-left" aria-label="Идти влево">◀</button><button data-code="KeyD" class="touch-right" aria-label="Идти вправо">▶</button><button data-code="KeyS" class="touch-crouch" aria-label="Пригнуться">↓<small>ПРИСЕСТЬ</small></button></div>
    <div class="touch-actions"><button data-code="Space" class="touch-jump" aria-label="Прыжок">↑<small>ПРЫЖОК</small></button><button data-code="KeyJ" class="touch-jaw" aria-label="Бросить челюсть">◒<small>ЧЕЛЮСТЬ</small></button><button data-code="ShiftLeft" class="touch-dash" aria-label="Рывок со щитом">»<small>РЫВОК</small></button></div>
    <div class="touch-context"><button id="touch-interact" data-code="KeyE" class="hidden" aria-label="Взаимодействовать">Поговорить</button><button id="touch-heal" data-code="KeyH" class="hidden" aria-label="Съесть работы подопечных">▤ + ♥</button></div>
   </div><div id="mobile-caption" class="hidden"><strong></strong><p></p></div>
   <button id="touch-intro-skip" class="hidden" type="button">К бою →</button>`;
   const rotate=document.createElement('aside');rotate.id='rotate-phone';rotate.className='hidden';rotate.setAttribute('role','status');
   rotate.innerHTML='<span class="phone-symbol" aria-hidden="true">↻</span><p class="eyebrow">ГУРОВ · ПОСЛЕДНИЙ УДОВЛ</p><h2>Поверните телефон</h2><p>Погоня идёт по горизонтали.<br>Разверните экран — мы подождём.</p><small>Движение слева, прыжок и челюсть справа</small>';document.body.append(rotate);
   const loading=document.createElement('section');loading.id='asset-loading';loading.className='hidden';loading.setAttribute('aria-live','polite');
   loading.innerHTML='<span class="loading-emblem" aria-hidden="true">∴</span><p class="eyebrow">ПОСЛЕДНИЙ УДОВЛ</p><h2>Готовим погоню…</h2><p>Загружаем героев и аудиторию</p><div class="asset-loading-track"></div><button id="asset-retry" class="secondary hidden">Повторить загрузку</button>';document.body.append(loading);
   $('asset-retry').onclick=()=>location.reload();
   const panel=$('touch-controls');
   panel.addEventListener('pointerdown',e=>{
    const b=e.target.closest('[data-code]');if(!this.playing||!b||b.disabled||e.button>0)return;
    e.preventDefault();panel.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,b);this.press(b.dataset.code,'touch:'+e.pointerId);this.paint();
   });
   panel.addEventListener('pointermove',e=>{
    if(!this.pointers.has(e.pointerId))return;e.preventDefault();
    const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('#touch-controls [data-code]');
    const next=this.playing&&hit&&!hit.disabled?hit:null,old=this.pointers.get(e.pointerId);
    if(next!==old){this.release('touch:'+e.pointerId);this.pointers.set(e.pointerId,next);if(next)this.press(next.dataset.code,'touch:'+e.pointerId);this.paint();}
   });
   const up=e=>{if(!this.pointers.has(e.pointerId))return;this.release('touch:'+e.pointerId);this.pointers.delete(e.pointerId);this.paint();};
   for(const event of ['pointerup','pointercancel','lostpointercapture'])panel.addEventListener(event,up);
   panel.addEventListener('contextmenu',e=>e.preventDefault());
   $('touch-intro-skip').onclick=()=>{this.press('Enter','touch:intro');this.release('touch:intro');};
   // A second finger does not produce a compatibility click on every browser.
   // Pausing must work while the first thumb is still holding a direction.
   $('pause').addEventListener('pointerdown',e=>{if(this.enabled&&e.pointerType==='touch'){e.preventDefault();$('pause').click();}});
   addEventListener('blur',()=>this.clear());
   this.coarse=matchMedia('(any-pointer: coarse)');this.coarse.addEventListener('change',()=>this.layout());
   addEventListener('resize',()=>this.layout());root.visualViewport?.addEventListener('resize',()=>this.layout());
   addEventListener('orientationchange',()=>this.clear());this.layout();
  }
  clear(){for(const id of this.pointers.keys())this.release('touch:'+id);this.pointers.clear();this.paint();}
  paint(){for(const b of $('touch-controls').querySelectorAll('button'))b.classList.toggle('held',[...this.pointers.values()].includes(b));}
  adaptDialog(element){
   if(!this.enabled)return;
   const tradeoff=element.querySelector('.upgrade-tradeoff');
   if(tradeoff)element.querySelector('.upgrade-grid h3').after(tradeoff);
   const grid=element.querySelector('.controls-grid');
   if(grid){const names=['◀ / ▶','↓ Присесть','↑ Прыжок','◒ Челюсть','» Рывок','▤ Работы','Поговорить','Ⅱ Пауза','Звук в меню'];names.forEach((name,i)=>{if(grid.children[i*2])grid.children[i*2].textContent=name;});}
   const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let node;
   while((node=walker.nextNode()))node.nodeValue=node.nodeValue.replace(/нажмите E/gi,'нажмите «Поймать Ивана»').replace('Нажмите H,','Нажмите «Съесть работы»,').replace('J / X ·','Кнопка «Челюсть» ·').replace('Esc — продолжить · M — включить или выключить звук','Продолжение и звук — кнопками в этом меню.');
  }
  layout(){
   const enabled=this.coarse.matches||(navigator.maxTouchPoints>0&&Math.min(innerWidth,innerHeight)<900);
   if(enabled!==this.enabled){this.enabled=enabled;document.documentElement.classList.toggle('mobile',enabled);this.clear();for(const id of screens)(enabled?$('mobile-ui'):$('stage')).append($(id));}
   const vw=root.visualViewport?.width||innerWidth,vh=root.visualViewport?.height||innerHeight;
   document.documentElement.style.setProperty('--view-height',vh+'px');
   const rotated=enabled&&vh>vw;
   $('rotate-phone').classList.toggle('hidden',!rotated);
   if(rotated!==this.rotationPaused){this.rotationPaused=rotated;this.clear();this.freeze(rotated);}
   this.resize();
  }
  set(id,key,value){const k=id+key;if(this.cache[k]===value)return;this.cache[k]=value;$(id)[key]=value;}
  show(id,visible){this.set(id,'hidden',!visible);$(id).classList.toggle('hidden',!visible);}
  update({mode,world,transition,ready,prologue,epilogue}){
   if(this.epoch!==this.input.epoch){this.clear();this.epoch=this.input.epoch;}
   const boot=(this.enabled||root.GUROV_WEB_BUILD)&&!ready;
   this.show('asset-loading',boot);
   if(boot&&performance.now()-this.started>45000){this.show('asset-retry',true);$('asset-loading').querySelector('p:not(.eyebrow)').textContent='Загрузка затянулась. Проверьте соединение и попробуйте ещё раз.';}
   const playing=this.enabled&&!this.rotationPaused&&!boot&&mode==='play'&&!transition&&!world?.intro&&!world?.won;
   if(this.playing&&!playing)this.clear();this.playing=playing;this.show('touch-controls',playing);
   this.show('touch-intro-skip',this.enabled&&!this.rotationPaused&&!boot&&mode==='play'&&!!world?.intro&&!transition);
   if(!this.enabled)return;
   const near=world?.nearCatch||world?.nearNpc||world?.nearFaculty||world?.nearSign;
   this.show('touch-interact',playing&&!!near);
   this.set('touch-interact','textContent',world?.nearCatch?'Поймать Ивана':world?.nearSign?'Прочитать':world?.nearNpc&&!world.nearNpc.helped?'Курсовая':'Поговорить');
   this.show('touch-heal',playing&&world?.upgrade==='paper');
   const cd=Math.ceil(world?.paperCooldown||0),full=world?.player.hp>=5;
   this.set('touch-heal','disabled',cd>0||full||!world?.player.grounded||world?.player.eating>0);
   this.set('touch-heal','textContent',cd>0?'▤ '+cd+' с':full?'♥ Полное здоровье':'▤ Съесть работы + ♥');
   this.set('touch-heal','title','Съесть работы подопечных: восстановить 2 сердца');
   const line=prologue?root.GurovPrologueLines[prologue.index]:epilogue?root.GurovEpilogueLines[epilogue.index]:null;
   this.show('mobile-caption',!!line&&!this.rotationPaused&&!boot);
   if(line&&this.caption!==line){this.caption=line;const names={gurov:'ГУРОВ',ivan:'ИВАН',roman:'РОМАН',erik:'ЭРИК',sasha:'САША',ravil:'РАВИЛЬ'};$('mobile-caption').querySelector('strong').textContent=line.name||names[line.actor];$('mobile-caption').querySelector('p').textContent=line.actor==='gurov'?root.GurovEngine.lisp(line.text):line.text;}
  }
  get status(){return {enabled:this.enabled,rotationPaused:this.rotationPaused,playing:this.playing,pointers:this.pointers.size};}
 }
 root.GurovMobile=Mobile;
})(window);
