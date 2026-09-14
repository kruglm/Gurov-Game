const test=require('node:test'),assert=require('node:assert/strict');
const {World}=require('../game/engine.js');
const {route,actions}=require('./fixtures/department.json');

test('department keyboard route collects all thirteen grades with current homing damage',()=>{
 const world=new World(2,{version:1,campaign:3,level:2,upgrade:'homing'});
 const expected=world.level.items.filter(item=>item.type==='spark').map(item=>item.id);
 assert.equal(expected.length,13);
 for(const [step,id] of route.entries()){
  const action=actions[id],frames=action.frames||12;
  for(let frame=0;frame<frames;frame++){
   world.update(1/120,{...action,shoot:true,jump:!!action.jump&&frame===0,
    dash:!!action.dash&&frame===0,jumpReleased:!!action.jump&&frame===frames-1});
   world.events.length=0;
  }
  assert.equal(world.stats.deaths,0,`route step ${step}: no deaths`);
  assert.equal(world.player.hp,5,`route step ${step}: no damage`);
 }
 assert.deepEqual(world.level.items.filter(item=>item.taken).map(item=>item.id),expected);
 assert.equal(world.stats.sparks,13);
});
