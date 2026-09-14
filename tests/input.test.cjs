const test=require('node:test'),assert=require('node:assert/strict'),Input=require('../game/input.js');
test('releasing one finger never releases another finger or a held keyboard key',()=>{
 const i=new Input();i.press('keyboard:Space','Space');i.press('touch:1','Space');i.press('touch:2','KeyD');
 i.pressed.clear();i.release('touch:1');assert(i.keys.has('Space'));assert(i.keys.has('KeyD'));assert(!i.released.has('Space'));
 i.release('keyboard:Space');assert(!i.keys.has('Space'));assert(i.released.has('Space'));assert(i.keys.has('KeyD'));
});
test('sliding a finger releases its old direction and presses the new one once',()=>{
 const i=new Input();assert(i.press('touch:1','KeyA'));i.pressed.clear();assert(!i.press('touch:1','KeyA'));assert.equal(i.pressed.size,0);
 assert(i.press('touch:1','KeyD'));assert(!i.keys.has('KeyA'));assert(i.released.has('KeyA'));assert(i.pressed.has('KeyD'));
});
test('scene and focus reset forgets all contacts, including late pointer releases',()=>{
 const i=new Input();i.press('touch:1','KeyD');i.press('touch:2','KeyJ');i.clear();i.release('touch:1');
 assert.equal(i.keys.size+i.pressed.size+i.released.size+i.sources.size,0);assert.equal(i.epoch,1);
});
