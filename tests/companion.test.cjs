const test=require('node:test'),assert=require('node:assert/strict');
const {World,PLAYER_H,RAVIL_LINES,RAVIL_BATTLE_LINES}=require('../game/engine');
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
test('Ravil reserves combat replies only during a live Ivan fight; ordinary chatter stays in the corridor',()=>{
 const w=new World(3),b=w.level.boss,c=w.companion;
 for(const state of ['inactive','intro','live','exhausted','defeated']){
  b.active=state!=='inactive';b.exhausted=state==='exhausted';b.defeated=state==='defeated';w.intro=state==='intro'?{}:null;
  c.speechCool=0;w.events=[];w.updateCompanion(.01);
  assert.deepEqual(w.events.filter(e=>e.type==='companionSpeech'),state==='live'?[{type:'companionSpeech',combat:true}]:[],state);
 }
 const v=corridor(300);v.companion.speechCool=0;v.updateCompanion(.01);
 assert.equal(v.events.find(e=>e.type==='companionSpeech').speech,RAVIL_LINES[0]);
});
test('battle lines cycle without repeats before exhaustion and switch to academic threats in phase two',()=>{
 const w=new World(3),b=w.level.boss;b.active=true;
 const regular=RAVIL_BATTLE_LINES.normal.map(()=>w.companionBattleLine());
 assert.deepEqual(regular,RAVIL_BATTLE_LINES.normal);
 assert.equal(w.companionBattleLine(),regular[0]);
 b.academic=true;w.intro={};assert.equal(w.companionBattleLine(),null);
 w.intro=null;assert.deepEqual(RAVIL_BATTLE_LINES.academic.map(()=>w.companionBattleLine()),RAVIL_BATTLE_LINES.academic);
 assert.equal(w.companion.lineIndex,0,'battle does not consume affectionate corridor lines');
 b.exhausted=true;assert.equal(w.companionBattleLine(),null);
});
