const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const window={};
for(const file of ['epilogue-stage.js','epilogue.js'])vm.runInNewContext(fs.readFileSync('game/'+file,'utf8'),{window});
function setup(){const film=new window.GurovEpilogue(),sound={voiceActive:false,voicePending:false,heard:[],speak(actor,text){this.heard.push({actor,text});}};return {film,sound};}
function tick(f,seconds,active=true){for(let i=0;i<Math.round(seconds*100);i++)f.film.update(.01,f.sound,active);}
test('an offline clip still decoding holds its caption after the nominal duration',()=>{const f=setup();f.sound.voicePending=true;tick(f,25);assert.equal(f.film.index,0);assert.equal(f.film.phase,'line');assert.equal(f.sound.heard.length,1);});
test('speech ending is followed by a quiet beat, then a caption dissolve and the next voice',()=>{
 const f=setup();f.sound.voiceActive=true;tick(f,20);f.sound.voiceActive=false;tick(f,.8);assert.equal(f.film.phase,'line');tick(f,.12);assert.equal(f.film.phase,'out');tick(f,.25);assert.ok(f.film.captionOpacity>.35&&f.film.captionOpacity<.55);tick(f,.26);assert.equal(f.film.phase,'gap');assert.equal(f.film.captionOpacity,0);tick(f,.18);assert.equal(f.film.index,1);assert.equal(f.sound.heard[1].actor,'roman');assert.ok(f.film.captionOpacity<.05);
});
test('an inactive window freezes poses, the chalk and page transitions',()=>{const f=setup();tick(f,6);const before=JSON.stringify(f.film.status),pose=JSON.stringify(f.film.stage.weights);tick(f,80,false);assert.equal(JSON.stringify(f.film.status),before);assert.equal(JSON.stringify(f.film.stage.weights),pose);});
test('all eight lines complete once when muted and written proofs persist across lines',()=>{
 const f=setup();let previous=[0,0,0,0],dips=0;
 for(let i=0;i<9500&&!f.film.done;i++){f.film.update(.01,f.sound,true);f.film.stage.progress.forEach((p,j)=>{if(p<previous[j])dips++;});previous=[...f.film.stage.progress];}
 assert.equal(dips,0);assert.deepEqual(previous,[1,1,1,1]);assert.equal(f.sound.heard.length,8);assert.equal(f.film.done,true);assert.ok(f.film.elapsed<90);
});
test('pose weights continue through line changes without size or animation resets',()=>{
 const f=setup();tick(f,15.9);assert.equal(f.film.index,1);assert.ok(f.film.stage.weights.gurov>0);const before=f.film.stage.weights.gurov;f.film.update(.01,f.sound,true);assert.ok(Math.abs(before-f.film.stage.weights.gurov)<.04);assert.ok(Math.abs(f.film.stage.lecture.reduce((a,b)=>a+b,0)-1)<1e-8);
});
test('standing and seated pose registration uses one reference scale per character',()=>{
 const frame=h=>({canvas:{},l:0,t:0,w:120,h});window.GurovActing={sprites:{lectureFinal:[frame(200),frame(198),frame(210),frame(195),frame(210),frame(207),frame(205),frame(202)],classroom:[frame(230),frame(250),frame(235),frame(232),frame(246),frame(233)]}};
 const s=new window.GurovEpilogueStage(),draws=[],c={drawImage(...a){draws.push(a);},save(){},restore(){},translate(){},scale(){}};
 for(let i=0;i<4;i++)s.standingPose(c,i,234);for(const a of draws){assert.ok(Math.abs(a[7]/a[3]-234/200)<1e-10);assert.ok(Math.abs(a[6]+a[8]-310)<1e-8);}
 draws.length=0;s.seatedPose(c,1,201,false);s.seatedPose(c,4,201,false);assert.equal(draws[0][7]/draws[0][3],draws[1][7]/draws[1][3]);
});
test('chalk detail fades in before lettering and does not jump at a dialogue boundary',()=>{
 const f=setup();tick(f,2.5);assert.equal(f.film.stage.detail,0);tick(f,.5);assert.ok(f.film.stage.detail>0&&f.film.stage.detail<1);assert.equal(f.film.stage.progress[0],0);tick(f,1);assert.ok(f.film.stage.progress[0]>0);assert.ok(f.film.stage.detail>.98);
});
