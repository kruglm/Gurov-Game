/* Each lecturer has an authored six-pose performance, timed by simulation only. */
(function(root){
 const definitions={
  vorontsov:{activity:'Проверяет модель и поправляет очки',offset:1.4,beats:[[0,2.1],[1,.45],[2,.7],[1,.25],[3,.8],[4,1.8],[0,2.2],[3,.65],[4,2.75]],reaction:'Поднимает палец: появилась идея'},
  maisuradze:{activity:'Поднимает чашку, пьёт и ставит на блюдце',offset:4.1,beats:[[0,3],[1,.7],[2,1.4],[3,.65],[4,2.3],[0,5.35]],reaction:'Приглашает Гурова на чай'},
  kitov:{activity:'Печатает и показывает вершину графа',offset:.5,beats:[[0,1.6],[1,.3],[2,.24],[1,.28],[2,.2],[1,.4],[3,1.6],[4,.5],[1,.3],[2,.22],[1,.26],[2,.2],[0,4]],reaction:'Показывает Гурову граф'},
  mestetsky:{activity:'Строит треугольник и проверяет угол',offset:5.3,beats:[[0,2],[1,.65],[2,.55],[1,.3],[2,.8],[3,2],[4,2.6],[0,3.4]],reaction:'Предъявляет геометрическое построение'},
  dyukova:{activity:'Проверяет, помечает и перекладывает работы',offset:2.5,beats:[[0,1.3],[1,.4],[2,.5],[2,.35],[3,.55],[4,.9],[0,1.2],[1,.45],[2,.65],[3,.6],[4,2.5]],reaction:'Поднимает ручку и смотрит на Гурова'},
  senko:{activity:'Сравнивает диаграммы и замечает выброс',offset:6.6,beats:[[0,2],[1,1.1],[2,1.5],[1,.8],[2,1.1],[3,1.6],[4,2.5],[0,4]],reaction:'Предлагает сравнить две выборки'},
  grabovoy:{activity:'Листает статью, подчёркивает и обдумывает правку',offset:3.2,beats:[[0,2.8],[1,.6],[2,.8],[3,2.2],[2,.7],[4,.7],[0,5]],reaction:'Показывает замечание к статье'},
  ishchenko:{activity:'Запускает эксперимент, ждёт и радуется результату',offset:7.7,beats:[[0,2],[1,.4],[2,4.8],[3,1.2],[4,1.1],[0,5.7]],reaction:'Подтверждает удачный запуск'},
  oganov:{activity:'Объясняет схему нового практикума',offset:2.8,beats:[[0,2.5],[1,.5],[2,.6],[3,1.2],[2,.45],[3,.8],[4,.6],[0,4.15]],reaction:'Обращается к коллегам с маркером'},
  feoktistov:{activity:'Запускает обучение и проверяет результат',offset:5.1,beats:[[0,2],[1,.5],[2,.3],[3,2.5],[1,.5],[2,.3],[4,1.2],[0,4.8]],reaction:'Отвечает коллегам, придерживая ноутбук'},
  alekseev:{activity:'Листает блокнот, пишет и обдумывает формулу',offset:8.3,beats:[[0,2],[1,.6],[2,1.2],[3,2.6],[4,1.1],[2,.8],[0,4.8]],reaction:'Показывает коллегам запись в блокноте'}
 };
 const mod=(n,d)=>(n%d+d)%d;
 function sample(n,t,reduced=false){
  const d=definitions[n.id];if(!d)return {pose:0,next:0,blend:0,activity:'',mode:'idle',progress:0};
  const elapsed=n.speechElapsed??(4.8-(n.speechTime||0)),greeting=n.speechTime>0&&elapsed<1.65;
  // A greeting briefly interrupts work; after speaking they continue their own cycle.
  if(reduced)return {pose:greeting?5:0,next:greeting?5:0,blend:0,activity:greeting?d.reaction:d.activity,mode:greeting?'greet':'rest',progress:0};
  const total=d.beats.reduce((a,b)=>a+b[1],0),phase=mod(t+d.offset,total);let cursor=0;
  for(let i=0;i<d.beats.length;i++){
   const [pose,duration]=d.beats[i];if(phase<cursor+duration){
    const within=phase-cursor,next=d.beats[(i+1)%d.beats.length][0];
    const blend=pose===next?0:Math.max(0,(within-duration+.14)/.14);
    if(greeting){
     const fadeIn=Math.max(0,Math.min(1,elapsed/.14)),fadeOut=Math.max(0,Math.min(1,(elapsed-1.51)/.14));
     return {pose:fadeIn<1?pose:5,next:fadeIn<1?5:fadeOut>0?pose:5,blend:fadeIn<1?fadeIn:fadeOut,activity:d.reaction,mode:'greet',progress:Math.max(0,elapsed)/1.65};
    }
    return {pose,next,blend,activity:d.activity,mode:pose===0?'rest':'work',progress:phase/total};
   }cursor+=duration;
  }
 }
 const api={definitions,sample};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GurovFacultyMotion=api;
})(typeof window!=='undefined'?window:globalThis);
