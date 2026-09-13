/* Dedicated high-resolution dialogue illustrations, bundled for offline play. */
(function(root){
 root.GurovStory={
  'maisuradze-tea':[
   {actor:'maisuradze',name:'Арчил Ивериевич Майсурадзе',label:'ЧАЙ ПОСЛЕ СЕМИНАРА',text:'Сергей Исаевич, вы опять за Павленко? Присядьте хоть на минутку. Я как раз собирался предложить вам чай.',next:'Остановиться на минутку →',color:'#d6b7bc'},
   {actor:'gurov',name:'С. И. Гуров',label:'ОДНА МИНУТКА НА ЧАЙ',text:'Арчил Ивериевич, я бы с радостью. Только Иван снова сбежал с защиты. Сейчас поймаю его — и можно спокойно поговорить.',next:'Послушать Арчила Ивериевича →',color:'#eac988'},
   {actor:'maisuradze',expression:'blush',name:'Арчил Ивериевич Майсурадзе',label:'НЕСКОЛЬКО НЕЛОВКОЕ ПРИГЛАШЕНИЕ',text:'Я… вообще-то хотел позвать вас к себе домой. Сегодня вечером. Чай, варенье… и никаких срочных семинаров. Мне просто очень приятно проводить с вами время.',next:'Ответить →',color:'#e6a6b5'},
   {actor:'gurov',expression:'blush',name:'С. И. Гуров',label:'ПРОФЕССОР СМУТИЛСЯ',text:'Ох… Вы меня совсем смутили. Я тоже хотел бы побыть с вами. Поймаю Ивана, закончу с защитой — и с удовольствием зайду. Только чай покрепче, пожалуйста.',next:'Договориться о вечере →',color:'#e6b6a7'},
   {actor:'maisuradze',expression:'blush',transition:false,name:'Арчил Ивериевич Майсурадзе',label:'ДО ВЕЧЕРА',text:'Конечно. Я буду ждать, Сергей Исаевич… Павленко побежал к лестнице справа. И не задерживайтесь слишком долго, хорошо?',next:'Попрощаться →',color:'#e6a6b5'},
   {actor:'gurov',expression:'blush',transition:false,name:'С. И. Гуров',label:'ДО ВСТРЕЧИ ЗА ЧАЕМ',text:'Спасибо за приглашение, Арчил Ивериевич. Обязательно приду. До вечера… А вы, Иван, далеко не убегайте — у меня теперь ещё и планы!',next:'Продолжить погоню →',color:'#e6b6a7'}
  ],
  'sasha-coursework':[
   {actor:'sasha',name:'Саша Ситников',label:'КУРСОВАЯ И КОРОТКИЙ ПУТЬ',text:'Профессор, заберите мою курсовую! В приложении — схема переходов через кафедру на крышу. Павленко побежал туда. Если кто-то преградит путь, следите за замахом и отвечайте в паузе!',next:'Забрать курсовую →',color:'#b7d8e4'},
   {actor:'gurov',name:'С. И. Гуров',label:'РАБОТА ПРИНЯТА',text:'Спасибо, Саша. Курсовую забираю, схему посмотрю по дороге. Сначала поймаем Ивана, а потом вернёмся к вашей защите. Подготовьте определения — скоро начнём.',badge:'КУРСОВАЯ ПОЛУЧЕНА · СХЕМА ПЕРЕХОДОВ С ВАМИ',next:'Продолжить погоню →',color:'#eac988'}
  ],
  'sasha-repeat':[
   {actor:'sasha',name:'Саша Ситников',label:'ДО ВСТРЕЧИ НА ЗАЩИТЕ',text:'Курсовая уже у вас, профессор. Как поймаете Ивана, возвращайтесь — я готов защищаться! И не забудьте про схему в приложении: через кафедру попадёте на крышу.',next:'До встречи, Саша →',color:'#b7d8e4'}
  ],
  'erik-rescue':[
   {actor:'erik',pose:15,name:'Эрик Ильясов',label:'ПОСЛЕ СОГЛАСОВАНИЯ',text:'Гурочка, прости! Я увлёкся согласованиями и запер Равиля. Больше никого не держу. Может, всё-таки согласуем мне хорошую оценку за диплом?',next:'Ответ Гурова →',color:'#eac988'},
   {actor:'gurov',pose:15,name:'С. И. Гуров',label:'ОЦЕНКА ЗА ДИПЛОМ',text:'Извинения приняты. Равиля освобождаем немедленно. А за диплом — удовлетворительно. Оценку нужно заслужить доказательствами, Эрик.',badge:'3 · УДОВЛЕТВОРИТЕЛЬНО',next:'Освободить Равиля →',color:'#eac988'},
   {actor:'ravil',pose:15,expression:'grateful',transition:false,name:'Равиль Абдраманов',label:'НАКОНЕЦ-ТО НА СВОБОДЕ',text:'Гуров, спасибо за спасение! Я так хотел заниматься тропической алгеброй, а Эрик меня не отпускал. Я вас люблю! Теперь пойду с вами — сначала поймаем Ивана, потом займёмся алгеброй.',next:'Вместе за Иваном →',color:'#9edbd0'}
  ],
  'ivan-caught':[
   {actor:'ivan',pose:15,name:'Иван Павленко',label:'БЕГСТВО ЗАКОНЧИЛОСЬ',text:'Всё, сдаюсь… Вы меня поймали, профессор. Больше не убегаю! Теперь я готов сдать прикладную алгебру. Давайте билет — начну с определений.',badge:'ГОТОВ СДАТЬ ПРИКЛАДНУЮ АЛГЕБРУ',next:'На экзамен →',color:'#e5b1be'}
  ]
 };
 root.gurovDialogueText=frame=>frame.actor==='gurov'?root.GurovEngine.lisp(frame.text):frame.text;
 root.drawGurovPortrait=function(canvas,cast,frame,elapsed=0){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const gradient=c.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#355768');gradient.addColorStop(1,'#102330');c.fillStyle=gradient;c.fillRect(0,0,w,h);
  c.strokeStyle=frame.color+'44';c.lineWidth=2;
  for(let i=0;i<9;i++){c.beginPath();c.moveTo(-50,i*48);c.lineTo(w,i*48-140);c.stroke();}
  const image=root.GurovActing.portraits[frame.actor]||root.GurovIllustrations.portraits[frame.actor];
  const expressive=frame.expression?(root.GurovActing.portraits[frame.actor+'-'+frame.expression]||root.GurovIllustrations.portraits[frame.actor+'-'+frame.expression]):null;
  const draw=(im,alpha)=>{if(!im?.width)return;c.save();c.globalAlpha=alpha;const scale=Math.max(w/im.width,h/im.height);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(im,(w-im.width*scale)/2,0,im.width*scale,im.height*scale);c.restore();};
  draw(image,1);
  const expressionAt=frame.expressionAt??0;
  if(expressive&&elapsed>=expressionAt)draw(expressive,frame.transition===false?1:Math.max(0,Math.min(1,(elapsed-expressionAt-.85)/.8)));
  const shade=c.createLinearGradient(0,h*.78,0,h);shade.addColorStop(0,'#10233000');shade.addColorStop(1,'#102330');c.fillStyle=shade;c.fillRect(0,0,w,h);
  c.fillStyle=frame.color;c.fillRect(0,h-4,w,4);
  return !!image?.width&&(!frame.expression||!!expressive?.width&&elapsed>=expressionAt&&(frame.transition===false||elapsed>=expressionAt+1.65));
 };
})(window);
