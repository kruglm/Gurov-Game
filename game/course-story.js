(function(root){
 root.GurovStory['course-team']=[
  {actor:'gurov',name:'С. И. Гуров',label:'НОВАЯ ПРОГРАММА',text:'Коллеги! У меня предложение. Прак заменим прикладной алгеброй. Глубокое обучение — тоже. И байесовский курс, раз уж собрались.',next:'Выслушать Сашу →',color:'#eac988'},
  {actor:'oganov',name:'Саша Оганов',label:'ДИПЛОМАТИЯ У КОФЕМАШИНЫ',text:'Да-да, Сергей Исаевич… очень интересная идея. Мы обязательно… обсудим её на следующем созвоне.',next:'А что думает Дима? →',color:'#eac988'},
  {actor:'feoktistov',name:'Дима Феоктистов',label:'ВЕЖЛИВОЕ ОТСТУПЛЕНИЕ',text:'Конечно, конечно. Только сначала закончим текущий семестр. И следующий. И сверим учебный план… Илья, у нас ведь сейчас срочная встреча?',next:'Передать слово Илье →',color:'#9edbd0'},
  {actor:'alekseev',name:'Илья Алексеев',label:'АПРИОРНАЯ ВЕРОЯТНОСТЬ ЗАМЕНЫ',text:'Да, очень срочная. Мы всё запишем, Сергей Исаевич. Саша, только расписание пока не трогай. Потом спокойно разберёмся.',next:'Профессор настаивает →',color:'#c7b4e7'},
  {actor:'gurov',name:'С. И. Гуров',label:'ОЙ! ЧЕЛЮСТЬ ВЫЛЕТЕЛА',text:'Никаких потом! Прикладная алгебра — фундамент всех… Ой. Кажется, аргумент вылетел раньше доказательства.',action:'jaw-hit',expression:'jaw-shock',expressionAt:.5,transition:false,next:'Посмотреть, куда улетела челюсть →',color:'#e6b6a7'},
  {actor:'oganov',name:'Саша Оганов',label:'ВОЗВРАТ АРГУМЕНТА',text:'Ай! Сергей Исаевич… ваша челюсть. Держите, пожалуйста. Мы всё поняли. Только давайте без наглядных пособий.',action:'jaw-return',expression:'hurt',transition:false,next:'Забрать челюсть →',color:'#eac988'},
  {actor:'gurov',name:'С. И. Гуров',label:'ДОГОВОРИЛИСЬ?',text:'Благодарю, Саша. Неловко получилось. Значит, по предметам договорились. А теперь мне пора ловить Павленко.',expression:'blush',transition:false,next:'Профессор уходит →',color:'#e6b6a7'},
  {actor:'feoktistov',name:'Дима Феоктистов',label:'ПОСЛЕ РАЗГОВОРА',text:'Он ушёл? Уф. Ничего не меняем. Прак, DL и байесы остаются. Просто кивайте, когда он снова заглянет… И Саше лёд принесите.',next:'Продолжить погоню →',color:'#9edbd0'}
 ];
 for(const kind of ['erik-rescue','ivan-caught'])Object.assign(root.GurovStory[kind][0],{expression:'sad',transition:false});
 root.drawGurovDialogueStage=function(canvas,cast,frame,t){
  const c=canvas.getContext('2d');c.clearRect(0,0,840,225);c.fillStyle='#172f3e';c.fillRect(0,0,840,225);c.fillStyle='#68807c';c.fillRect(0,207,840,3);
  const hit=frame.action==='jaw-hit',back=frame.action==='jaw-return',u=Math.max(0,Math.min(1,(t-.5)/.85));
  // Wind up, spit, then recoil in shock. The jaw appears at the mouth only on release.
  const pose=hit?(t<.5?9:t<.8?10:11):back&&u<1?11:14;
  cast.draw(c,'gurov',pose,115,209,179,1);
  for(const [id,x] of [['oganov',440],['feoktistov',601],['alekseev',737]]){
   const f=root.GurovIllustrations.faculty[id]?.[(back||hit&&t>=1.7)&&id==='oganov'?5:0];if(!f)continue;
   const h=159,s=h/f.height;c.save();c.translate(x+(hit&&id==='oganov'&&t>=1.35&&t<1.7?Math.sin(t*50)*5:0),207);c.rotate(hit&&id==='oganov'&&t>=1.35&&t<1.7?.06:0);c.drawImage(f,-f.width*s/2,-h,f.width*s,h);c.restore();
  }
  let x,y;
  if(hit&&t>=.5){
   x=156+u*269;y=86+7*u-Math.sin(u*Math.PI)*34;
   // Short, bright streaks connect the mouth and projectile without obscuring faces.
   if(u<1){c.save();c.lineCap='round';c.strokeStyle='#ffe2a8';c.lineWidth=3;c.globalAlpha=.8;for(let i=0;i<3;i++){const end=Math.max(156,x-30-i*20);c.beginPath();c.moveTo(Math.max(156,end-26),y+i*6-6);c.lineTo(end,y+i*6-6);c.stroke();}c.restore();}
   else {y=93+27*Math.min(1,(t-1.35)/.4);}
   if(t>=1.35&&t<1.7){c.fillStyle='#ffe0a0';c.font='bold 32px Georgia';c.fillText('✦',454,64);}
  }
  if(back){x=425-u*269;y=120-34*u-Math.sin(u*Math.PI)*46;}
  if((hit&&t>=.5)||(back&&u<1)){
   c.save();c.shadowColor='#f9d69b';c.shadowBlur=10;
   root.drawGurovJaw(c,x,y,1.7,u<1?t*20:0,u<1?u*(back?-1.8:1.8):.1);c.restore();
  }
  // A brief glint at the lip anchors the flight's origin and the return's destination.
  if(hit&&t>=.5&&t<.68||back&&t>=1.35&&t<1.6){c.fillStyle='#fff1c1';c.font='bold 22px Georgia';c.fillText('✧',156,88);}
  c.fillStyle='#e7d3a7';c.font='bold 13px monospace';c.fillText(back?'САША ВОЗВРАЩАЕТ ЧЕЛЮСТЬ':hit&&t>=.5?'ЧЕЛЮСТЬ ВЫЛЕТЕЛА ИЗО РТА!':'КАФЕДРА ММП · ОБСУЖДЕНИЕ ПРОГРАММЫ',20,22);
 };
})(window);
