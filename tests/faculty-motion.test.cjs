const test=require('node:test'),assert=require('node:assert/strict');
const {definitions,sample}=require('../game/faculty-motion.js'),staff=require('../game/faculty-data.js'),{World}=require('../game/engine.js');
test('every current lecturer has a distinct multi-step activity and separate greeting',()=>{
 assert.deepEqual(Object.keys(definitions).sort(),staff.map(n=>n.id).sort());
 assert.equal(new Set(Object.values(definitions).map(d=>JSON.stringify(d.beats))).size,11);
 for(const n of staff){
  const poses=new Set();for(let t=0;t<35;t+=.03){const m=sample(n,t);poses.add(m.pose);assert.ok(m.blend>=0&&m.blend<=1);assert.ok(m.next>=0&&m.next<6);}
  assert.deepEqual([...poses].sort(),[0,1,2,3,4],n.id);
  const before=JSON.stringify(n),m=sample({...n,speechTime:4.3},12);assert.equal(m.pose,5);assert.equal(m.mode,'greet');assert.equal(JSON.stringify(n),before);
  assert.notEqual(sample({...n,speechTime:2},12).mode,'greet');
 }
});
test('stationary player still sees work, pause time is stable, reduced motion holds a pose',()=>{
 const w=new World(2,{upgrade:'paper'});w.level.enemies=[];
 const staff=w.level.faculty,first=staff.map(n=>sample(n,w.time));
 for(let i=0;i<240;i++)w.update(1/120,{});
 assert.ok(staff.some((n,i)=>JSON.stringify(sample(n,w.time))!==JSON.stringify(first[i])));
 const save=JSON.stringify(w.save()),snapshot=JSON.stringify(staff.map(n=>sample(n,w.time)));
 for(let i=0;i<30;i++)assert.equal(JSON.stringify(staff.map(n=>sample(n,w.time))),snapshot);
 assert.equal(JSON.stringify(w.save()),save);
 for(const n of staff){assert.deepEqual(sample({...n,speechTime:0},0,true),sample({...n,speechTime:0},100,true));assert.equal(sample({...n,speechTime:4},0,true).pose,5);}
});
