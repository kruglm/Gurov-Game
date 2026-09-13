const test=require('node:test'),assert=require('node:assert/strict');
const {World,COMBAT,PLAYER_H}=require('../game/engine.js');

function arena(level=0){
 const w=new World(level,{upgrade:'homing'});
 w.runner=null;w.companion=null;w.level.items=[];w.level.enemies=[];
 w.level.platforms=[{x:0,y:610,w:6000,h:110,kind:'floor'}];
 Object.assign(w.player,{x:120,y:610-PLAYER_H,inv:100,grounded:true});
 // Keep targets stationary to isolate damage from movement and attack timing.
 w.updateRoman=()=>{};w.updateBoss=()=>{};
 if(w.level.boss){w.level.boss.active=true;w.level.boss.timer=2.1;}
 return w;
}
function hit(w,target,type='jaw',homing=false){
 w.projectiles.push({type,homing,x:target.x+5,y:target.y+35,w:26,h:18,vx:0,vy:0,life:1,age:0,bounces:0,enemy:false});
 w.update(1/120,{});
}

for(const hp of [COMBAT.romanHP,COMBAT.darkRomanHP]){
 test(`Roman with ${hp} HP takes twice as many homing hits and dies only once`,()=>{
  for(const homing of [false,true]){
   const w=arena(),e={x:500,y:515,w:50,h:95,hp,kind:'roman',hit:0,phase:'patrol'};w.level.enemies=[e];
   const count=hp*(homing?2:1);
   for(let i=0;i<count;i++){
    hit(w,e,'jaw',homing);
    assert.equal(e.hp,hp-(i+1)*(homing?.5:1));
    assert.equal(w.stats.defeats,i===count-1?1:0);
   }
   hit(w,e,'jaw',homing);
   assert.equal(e.hp,0);assert.equal(w.stats.defeats,1);
   assert.equal(w.events.filter(e=>e.type==='enemy').length,1);
  }
 });
}

for(const level of [1,3])test(`boss ${level} takes half damage from homing jaws, companion damage stays unchanged`,()=>{
 const w=arena(level),b=w.level.boss,hp=b.hp;
 hit(w,b);assert.equal(b.hp,hp-1);
 hit(w,b,'jaw',true);assert.equal(b.hp,hp-1.5);
 hit(w,b,'lemma');assert.equal(b.hp,hp-2.5);
 if(level===3)b.academic=true;
 b.hp=.5;hit(w,b);
 assert.equal(b.hp,0);assert.ok(level===1?b.defeated:b.exhausted);
});

test('mixed rocket and companion damage clamps fractional HP and records the defeat',()=>{
 const w=arena(),e={x:500,y:515,w:50,h:95,hp:1,kind:'roman',hit:0,phase:'patrol'};w.level.enemies=[e];
 hit(w,e,'jaw',true);assert.equal(e.hp,.5);
 hit(w,e,'lemma');assert.equal(e.hp,0);assert.equal(w.stats.defeats,1);
 assert.equal(w.events.filter(e=>e.type==='enemy').length,1);
});

test('Ivan enters the second phase at half HP after the second rocket, only once',()=>{
 const w=arena(3),b=w.level.boss;b.hp=b.maxHp/2+1;
 hit(w,b,'jaw',true);assert.equal(b.hp,b.maxHp/2+.5);assert.equal(b.academic,false);
 hit(w,b,'jaw',true);assert.equal(b.academic,true);assert.equal(b.hp,b.maxHp);assert.ok(w.intro);
 w.intro=null;hit(w,b,'jaw',true);assert.equal(b.hp,b.maxHp-.5);assert.equal(w.intro,null);
});

test('earth walls need four rockets or two ordinary jaws',()=>{
 for(const homing of [false,true]){
  const w=arena(3),wall={x:500,y:462,w:52,h:148,hp:2,life:5};w.level.boss.walls=[wall];
  for(let i=0;i<(homing?4:2);i++){
   hit(w,wall,'jaw',homing);assert.equal(wall.hp,2-(i+1)*(homing?.5:1));
   assert.equal(w.projectiles.length,0);
  }
 }
});
