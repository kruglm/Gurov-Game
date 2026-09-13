const test=require('node:test'),assert=require('node:assert/strict');
const Crowd=require('../game/crowd');
test('each audience member occupies a painted chair and Ivan has his own seat',()=>{
 const seats=Crowd.audience(478);assert.equal(seats.length,21);const positions=new Set();
 for(const s of seats){const row=Crowd.ROWS[s.row];assert.equal(s.x,row.x[s.col]);assert.equal(s.back,row.back[s.col]);assert.ok(!(s.row===0&&s.x===Crowd.IVAN.x));positions.add(s.row+':'+s.x);}
 assert.equal(positions.size,seats.length);
});
test('clothes are shuffled once per scene, reproducible for QA, with a balanced cast',()=>{
 const first=Crowd.audience(478);assert.deepEqual(first,Crowd.audience(478));assert.notDeepEqual(first.map(s=>s.id),Crowd.audience(479).map(s=>s.id));
 const counts=[0,0,0,0];first.forEach(s=>counts[s.id]++);assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
 assert.ok(first.some((s,i)=>i>=4&&s.id!==first[i-4].id));
 assert.ok(new Set(first.map(s=>s.delay)).size>15);assert.ok(new Set(first.map(s=>s.phase)).size>15);
});
test('evacuation starts with getting up, follows the row and joins the side aisle continuously',()=>{
 for(const s of Crowd.audience(478)){
  assert.equal(Crowd.runner(s,s.delay),null);
  const standing=Crowd.runner(s,s.delay+.15);assert.equal(standing.x,s.x);assert.equal(standing.distance,0);
  const turn=s.delay+.36+(s.aisle-s.x)/s.speed;
  const before=Crowd.runner(s,turn-1e-5),after=Crowd.runner(s,turn+1e-5);
  assert.equal(before.aisle,false);assert.equal(after.aisle,true);
  assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<.02);assert.ok(Math.abs(before.distance-after.distance)<.02);
  assert.equal(Crowd.runner(s,turn+s.exitTime+.01).done,true);
  let distance=-1;
  for(let t=s.delay+.01;t<turn+s.exitTime;t+=1/60){const r=Crowd.runner(s,t);assert.ok(r.distance>=distance);distance=r.distance;assert.ok(r.x>=s.x&&r.x<=1200);assert.ok(r.h>=101&&r.h<=s.h);}
 }
});
