const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const window={};const context=vm.createContext({window});
vm.runInContext(fs.readFileSync('game/actor.js','utf8'),context);vm.runInContext(fs.readFileSync('game/presentation.js','utf8'),context);
test('chroma cleanup removes mixed matte only along the silhouette, keeping enclosed highlights',()=>{
 const w=9,h=9,d=new Uint8ClampedArray(w*h*4);for(let p=0;p<w*h;p++)d.set([255,0,255,255],p*4);
 for(let y=1;y<8;y++)for(let x=1;x<8;x++)d.set([30,40,55,255],(y*w+x)*4);
 const edge=(4*w+1)*4,inside=(4*w+4)*4,shirt=(3*w+2)*4;
 d.set([220,145,220,255],edge);d.set([220,145,220,255],inside);d.set([218,180,159,255],shirt);
 window.gurovDecodeChroma(d,w,h,true);assert.equal(d[3],0);assert.equal(d[edge+3],0);assert.equal(d[inside+3],255);assert.equal(d[shirt+3],255);
 assert.deepEqual([...d.slice(inside,inside+3)],[220,145,220]);
});
test('menu Ivan leaves the screen, peeks and climbs up, then stays caught',()=>{
 const r=new window.GurovMenuIvan(),phases=new Set();let outside=false;
 for(let i=0;i<4600;i++){r.update(1/120);phases.add(r.phase);outside ||= r.x>1280;assert.ok(Number.isFinite(r.x)&&Number.isFinite(r.feet));}
 assert.ok(outside);for(const phase of ['run','return','peek','bottom','hidden'])assert.ok(phases.has(phase));
 r.setCaught(true);const captured=JSON.stringify(r);for(let i=0;i<1000;i++)r.update(1/120);assert.equal(JSON.stringify(r),captured);assert.equal(r.phase,'caught');assert.equal(r.x,740);
});
test('capture returns Ivan to the floor from either screen edge',()=>{
 for(const time of [6.7,11.8]){
  const r=new window.GurovMenuIvan();r.time=0;r.update(time);assert.notEqual(r.feet,597);
  r.setCaught(true);assert.equal(r.feet,597);assert.equal(r.x,740);assert.equal(r.phase,'caught');
  r.update(30);assert.equal(r.feet,597);
  r.setCaught(false);assert.equal(r.feet,365);assert.equal(r.phase,'peek');
 }
});
test('fresh menu starts with Ivan peeking from the screen edge',()=>{
 const r=new window.GurovMenuIvan();assert.equal(r.caught,false);assert.equal(r.phase,'peek');assert.equal(r.feet,365);
 assert.ok(r.x>1240&&r.x<1320);const x=r.x;r.update(.4);assert.ok(r.x<x);assert.equal(r.phase,'peek');
});
test('caught Ivan sits at the same body scale, without a standing fallback during loading',()=>{
 const ctx={save(){},restore(){},beginPath(){},ellipse(){},fill(){}},calls=[];
 window.GurovItems={draw(){}};window.GurovActing={sprites:{},draw(...args){calls.push(args.slice(1));return true;}};
 const r=new window.GurovMenuIvan();r.setCaught(true);const cast={draw(){assert.fail('standing fallback');}};
 r.draw(ctx,cast);assert.equal(calls.length,0);
 window.GurovActing.sprites.ivan=Array.from({length:6},(_,i)=>({h:i===5?413:525}));
 r.draw(ctx,cast);assert.deepEqual(calls[0],['ivan',5,740,597,194*413/525,-1]);
});
