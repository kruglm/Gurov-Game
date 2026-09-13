const test=require('node:test'),assert=require('node:assert/strict');
const {World,PLAYER_H}=require('../game/engine');
function corridor(x,facing=1){
 const w=new World(2);w.level.enemies=[];
 Object.assign(w.player,{x,y:610-PLAYER_H,grounded:true,facing});
 w.spawnCompanion();return w;
}
test('Ravil waits safely on either side of each department gap, in both directions',()=>{
 for(const edge of [1830,1970,3730,3870,5630,5770])for(const facing of [-1,1]){
  const x=edge%1900===1830?edge-65:edge+15;
  const w=corridor(x,facing);let lowest=0;
  for(let i=0;i<2400;i++){w.updateCompanion(1/120);lowest=Math.max(lowest,w.companion.y);}
  assert.ok(lowest<700,`edge ${edge}, facing ${facing}, y ${lowest}`);
  assert.ok(w.companion.grounded);
 }
});
test('Ravil jumps across a gap to a waiting professor instead of falling and respawning',()=>{
 const w=corridor(2070);Object.assign(w.companion,{x:1760,y:505,vx:0,vy:0,grounded:true});
 let airborne=false,lowest=0;
 for(let i=0;i<600;i++){w.updateCompanion(1/120);airborne||=!w.companion.grounded;lowest=Math.max(lowest,w.companion.y);}
 assert.ok(airborne);assert.ok(lowest<650);assert.ok(w.companion.x>=1970);assert.ok(w.companion.grounded);
});
