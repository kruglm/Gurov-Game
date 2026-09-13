/* The displayed ending and its recording always use the same story variant. */
(function(root){
 const engine=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.GurovEngine;
 function scene(index,coursework){
  if(index<engine.FINAL_LEVEL){
   const title='Иван снова ушёл вперёд.';
   const paragraph=index===1&&!coursework?engine.CHAPTERS[index].outro.replace('По схеме переходов путь ведёт','Следы Ивана ведут'):engine.CHAPTERS[index].outro;
   return {title,paragraph,lines:[{actor:'narrator',text:title+' '+paragraph}]};
  }
  const title='Утро наступило.',opening='Гуров ловит Ивана за рукав:',first='«Всё. Теперь мой вопрос».',quote='«Ну что ж. Теперь можно начать с определений».',fineprint='Спасибо за игру. Все события и реплики вымышлены.';
  const middle='Павленко возвращает папку и готов сдавать прикладную алгебру. Эрик получает «удовлетворительно» за диплом. '+(coursework?'Саша ждёт отзыва на свою курсовую':'Саша ждёт внизу со своей курсовой')+', а спасённый Равиль остаётся рядом с любимым профессором и мечтает о тропической алгебре. До первой лекции ещё семь минут.';
  return {title,paragraph:opening+' '+engine.lisp(first)+' '+middle,quote:engine.lisp(quote),fineprint,lines:[
   {actor:'narrator',text:title+' '+opening},{actor:'gurov',text:first},
   {actor:'narrator',text:middle},{actor:'gurov',text:quote},{actor:'narrator',text:fineprint}
  ]};
 }
 const api={scene};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GurovCompletion=api;
})(typeof window==='undefined'?globalThis:window);
