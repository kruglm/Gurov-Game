/* Small illustrated props are rasterized once; flight only transforms cached tiles. */
(function(root){
 const cache=new Map(),colors=['#ef9251','#66c7bf','#b69be5','#edbd57'];
 const polygon=(c,points)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();};
 function tile(kind,variant=0){
  const key=kind+variant;if(cache.has(key))return cache.get(key);
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d');
  c.lineJoin='round';c.lineCap='round';
  if(kind==='hold'){
   const outlines=[[[17,83],[24,42],[50,20],[92,25],[113,55],[105,100],[66,111],[28,104]],[[18,99],[26,48],[45,30],[70,20],[103,44],[116,86],[102,107]],[[18,92],[40,26],[85,18],[111,99],[66,111]],[[14,78],[29,30],[66,20],[102,43],[116,92],[85,108],[38,101]]];
   c.translate(0,4);polygon(c,outlines[variant%4]);c.fillStyle='#142532';c.fill();c.translate(0,-4);polygon(c,outlines[variant%4]);c.fillStyle=colors[variant%4];c.lineWidth=6;c.strokeStyle='#172c36';c.fill();c.stroke();
   c.strokeStyle='#fff1cb99';c.lineWidth=6;c.beginPath();c.moveTo(33,55);c.quadraticCurveTo(50,27,81,33);c.stroke();
   c.fillStyle='#24475388';c.beginPath();c.ellipse(67,66,23,14,-.4,0,Math.PI*2);c.fill();c.strokeStyle='#244753';c.lineWidth=5;c.stroke();
   c.fillStyle='#d3d4c4';c.beginPath();c.arc(68,83,8,0,Math.PI*2);c.fill();c.fillStyle='#334954';polygon(c,[[65,78],[72,80],[73,86],[68,89],[63,85]]);c.fill();
   c.fillStyle='#fff0d255';for(let i=0;i<9;i++)c.fillRect(28+i*7,88+(i%3)*5,3,2);
  }else if(kind==='mcp'){
   c.fillStyle='#102633';c.fillRect(12,19,104,90);c.strokeStyle='#96dcd6';c.lineWidth=5;c.strokeRect(12,19,104,90);c.fillStyle='#507b7c';c.fillRect(15,22,98,19);c.fillStyle='#d5e8c2';c.font='bold 16px monospace';c.fillText('MCP',24,37);c.font='bold 38px monospace';c.fillText('{ }',27,85);
  }else if(kind==='shockwave'){
   polygon(c,[[5,110],[14,71],[35,92],[48,26],[67,78],[88,50],[105,89],[121,110]]);c.fillStyle='#d99b58';c.strokeStyle='#784934';c.lineWidth=6;c.fill();c.stroke();
   c.strokeStyle='#ffdda1';c.lineWidth=8;c.beginPath();c.moveTo(12,104);c.quadraticCurveTo(64,3,115,104);c.stroke();
  }else if(kind==='grade'||kind==='diploma'){
   const large=kind==='diploma';polygon(c,[[20,10],[92,10],[110,28],[110,111],[20,111]]);c.fillStyle=large?'#f4e8c8':'#ecdcba';c.lineWidth=5;c.strokeStyle='#674d3c';c.fill();c.stroke();
   polygon(c,[[92,10],[92,29],[110,29]]);c.fillStyle='#c9b28b';c.fill();c.strokeStyle='#a29473';c.lineWidth=2;c.strokeRect(29,19,70,83);
   c.textAlign='center';c.fillStyle='#2c4c58';c.font='bold 12px Georgia';c.fillText('ДИПЛОМ',64,36);c.fillStyle='#ad4b40';c.font='bold 51px Georgia';c.fillText('3',64,81);c.font='bold 13px monospace';c.fillText('УДОВЛ',64,99);
   if(large){c.fillStyle='#ba7348';polygon(c,[[87,94],[83,125],[96,118],[108,123],[104,93]]);c.fill();c.beginPath();c.arc(96,93,12,0,Math.PI*2);c.fillStyle='#d8ab58';c.fill();c.strokeStyle='#785637';c.stroke();}
  }else if(kind==='tomato'){
   c.fillStyle='#922f35';c.beginPath();c.ellipse(65,77,50,43,0,0,Math.PI*2);c.fill();c.lineWidth=5;c.strokeStyle='#542a32';c.stroke();
   c.fillStyle='#e8573f';c.beginPath();c.ellipse(59,65,46,39,-.12,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#ffae73';c.beginPath();c.ellipse(38,50,12,7,-.55,0,Math.PI*2);c.fill();
   polygon(c,[[64,35],[36,29],[50,45],[27,53],[54,51],[61,65],[69,48],[96,43],[77,35],[78,22]]);c.fillStyle='#63834b';c.strokeStyle='#294f40';c.lineWidth=3;c.fill();c.stroke();c.beginPath();c.moveTo(63,39);c.quadraticCurveTo(58,23,68,16);c.lineWidth=7;c.stroke();
  }else if(kind==='lemma'){
   c.translate(64,64);c.beginPath();c.moveTo(0,39);c.bezierCurveTo(-75,-9,-32,-59,0,-25);c.bezierCurveTo(32,-59,75,-9,0,39);c.fillStyle='#79d8cc';c.lineWidth=7;c.strokeStyle='#173b50';c.fill();c.stroke();
   c.strokeStyle='#d6fff0';c.lineWidth=3;c.stroke();c.fillStyle='#19465b';c.font='bold 48px Georgia';c.textAlign='center';c.fillText('λ',0,16);
  }else if(kind==='coursework'){
   c.fillStyle='#122b3d';c.fillRect(19,12,86,103);c.fillStyle='#60758b';c.fillRect(28,20,79,91);c.fillStyle='#eadfbe';c.fillRect(31,27,79,87);c.fillStyle='#28475d';c.fillRect(20,10,84,98);c.fillStyle='#86aca9';c.fillRect(26,10,7,98);c.fillStyle='#e8d7a0';c.fillRect(42,31,49,34);c.fillStyle='#324858';c.textAlign='center';c.font='bold 9px monospace';c.fillText('КУРСОВАЯ',66,47);c.fillText('С. СИТНИКОВ',66,58);c.fillStyle='#d2ae63';c.fillRect(81,80,10,32);
  }else if(kind==='tea'){
   c.fillStyle='#162a34';c.fillRect(31,25,67,15);polygon(c,[[34,40],[95,40],[86,111],[45,111]]);c.fillStyle='#e2d3ad';c.fill();c.fillStyle='#638c88';c.fillRect(41,60,48,27);c.fillStyle='#ecddbb';c.font='bold 16px Georgia';c.fillText('ЧАЙ',45,80);c.fillStyle='#fcf1d2';c.fillRect(37,23,53,6);
  }
  cache.set(key,canvas);return canvas;
 }
 root.GurovItems={draw(c,kind,x,y,w,h=w,rotation=0,variant=0){const image=tile(kind,variant);c.save();c.translate(x,y);c.rotate(rotation);c.drawImage(image,-w/2,-h/2,w,h);c.restore();},get cached(){return cache.size;}};
})(window);
