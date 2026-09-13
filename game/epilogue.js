/* One continuous classroom shot; speech, caption fades and acting share its clock. */
(function(root){
 root.GurovEpilogueLines=[
  {actor:'gurov',text:'Итак, коллеги. От прикладной алгебры далеко не убежишь. Начнём с группы: замкнутость, ассоциативность, единица и обратный элемент.',title:'СЕМЬ МИНУТ ДО ПЕРВОЙ ЛЕКЦИИ',duration:15},
  {actor:'roman',text:'А если я напишу доказательство с Клод Код? Уже триллион токенов потратил!',title:'ПРАКТИЧЕСКИЙ ВОПРОС',duration:8},
  {actor:'gurov',text:'Роман, токены — не доказательство. Иван, обратный элемент есть. Обратного пути в академический отпуск сегодня нет.',title:'ОБРАТНЫЙ ЭЛЕМЕНТ',duration:12},
  {actor:'ivan',text:'Понял, профессор. Больше не убегаю. Давайте я сам докажу единственность единицы.',title:'ПЕРВОЕ ДОКАЗАТЕЛЬСТВО ИВАНА',duration:8},
  {actor:'erik',text:'Гурочка, теперь согласовываю только то, что могу доказать. Можно мне пересдать?',title:'СОГЛАСОВАНО С ОПРЕДЕЛЕНИЕМ',duration:8},
  {actor:'sasha',text:'Вот это лекция! Профессор, я всё записал. И курсовую тоже исправлю.',title:'ДВА САМЫХ ВЕРНЫХ СЛУШАТЕЛЯ',duration:7},
  {actor:'ravil',text:'Гуров, вы великолепны! А после лекции давайте тропическую алгебру. Я так счастлив быть рядом!',title:'АЛГЕБРА ОБЪЕДИНЯЕТ',duration:9},
  {actor:'gurov',text:'Ну вот, теперь все на месте. Спасибо за внимание. Челюсть при мне, определения при вас. Что и требовалось доказать!',title:'Q. E. D.',duration:11}
 ];
 class Epilogue {
  constructor(){
   this.index=0;this.time=0;this.elapsed=0;this.done=false;this.spoken=false;
   this.phase='line';this.fade=0;this.quiet=0;this.stage=new root.GurovEpilogueStage();
  }
  get captionOpacity(){
   const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
   if(this.phase==='gap'||this.phase==='end')return 0;
   return this.phase==='out'?1-smooth(this.fade/.5):smooth(this.time/.55);
  }
  get status(){return {index:this.index,time:this.time,elapsed:this.elapsed,phase:this.phase,captionOpacity:this.captionOpacity,board:[...this.stage.progress],poses:[...this.stage.lecture]};}
  update(dt,sound,active){
   if(!active||this.done)return;
   this.elapsed+=dt;
   if(this.phase==='line'){
    const line=root.GurovEpilogueLines[this.index];
    if(!this.spoken){this.spoken=true;this.quiet=0;sound.speak(line.actor,line.text,4);}
    this.time+=dt;
    // Loading the next offline clip counts as speech too. A real quiet beat
    // follows its ending before the caption and the speaker's gesture dissolve.
    this.quiet=sound.voiceActive||sound.voicePending?0:this.quiet+dt;
    if(this.time>=line.duration&&this.quiet>=.9){this.phase='out';this.fade=0;}
   }else{
    this.fade+=dt;
    if(this.phase==='out'&&this.fade>=.5){this.phase=this.index===root.GurovEpilogueLines.length-1?'end':'gap';this.fade=0;}
    else if(this.phase==='gap'&&this.fade>=.15){this.index++;this.time=0;this.fade=0;this.spoken=false;this.phase='line';}
    else if(this.phase==='end'&&this.fade>=1.1)this.done=true;
   }
   this.stage.update(dt,this);
  }
  draw(c,cast){this.stage.draw(c,cast,this);}
 }
 root.GurovEpilogue=Epilogue;
})(window);
