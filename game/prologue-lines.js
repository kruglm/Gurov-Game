/* Shared by the cinematic and the offline voice inventory. */
(function(root){
 const lines=[
  {actor:'gurov',name:'СЕРГЕЙ ИСАЕВИЧ ГУРОВ',text:'Коллеги! Это диплом или альбом картинок? Где прикладная алгебра? Я вас спрашиваю!',duration:8,title:'БОЛЬШАЯ АУДИТОРИЯ · ЗАЩИТА ДИПЛОМОВ'},
  {actor:'gurov',name:'СЕРГЕЙ ИСАЕВИЧ ГУРОВ',text:'Нейросети есть. Красивые графики есть. А доказательства где? Без прикладной алгебры — только удовл!',duration:9,title:'ПОСЛЕДНИЙ ВОПРОС К ДИПЛОМУ'},
  {actor:'ivan',name:'ИВАН ПАВЛЕНКО',text:'Ребята! Пора убегать и парить подик! Все за мной!',duration:6,title:'НЕПРЕДУСМОТРЕННОЕ ВОЗРАЖЕНИЕ'},
  {actor:'gurov',name:'СЕРГЕЙ ИСАЕВИЧ ГУРОВ',text:'Павленко! Помидор — не доказательство! Немедленно вернитесь!',duration:6,title:'ЗАЩИТА ВЫШЛА ИЗ-ПОД КОНТРОЛЯ'},
  {actor:'gurov',name:'СЕРГЕЙ ИСАЕВИЧ ГУРОВ',text:'Так, другие могут идти. Иван! У меня к вам только один вопрос!',duration:7,title:'ОДИН ПРОФЕССОР · ОДНА ПОГОНЯ'}
 ];
 if(typeof module!=='undefined'&&module.exports)module.exports=lines;else root.GurovPrologueLines=lines;
})(typeof window==='undefined'?globalThis:window);
