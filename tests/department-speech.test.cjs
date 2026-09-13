const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {World}=require('../game/engine.js'),{sample}=require('../game/faculty-motion.js');
const window={};vm.runInNewContext(fs.readFileSync('game/department-speech.js','utf8'),{window});
class Sound{
 constructor(){this.enabled=true;this.ctx={currentTime:10,state:'running'};this.voiceQueue=[];this.voiceJob=null;this.voiceActive=false;this.history=[];}
 speak(actor,text,priority,options){this.voiceJob={actor,text,priority,...options,offset:0,buffer:null};this.history.push({actor,text});return Promise.resolve(true);}
 start(duration=6){this.voiceJob.buffer={duration};this.voiceJob.started=this.ctx.currentTime;this.voiceActive=true;}
 end(){const j=this.voiceJob;this.voiceJob=null;this.voiceActive=false;j.onFinish('ended');}
 stopSpeech(){const j=this.voiceJob;this.voiceJob=null;this.voiceActive=false;this.voiceQueue=[];j?.onFinish?.('cancelled');}
}
function setup(team=false){const w=new World(2,{upgrade:'homing'});w.player.x=team?7225:530;const s=new Sound(),d=new window.GurovDepartmentSpeech(s);d.update(w,'play');return {w,s,d};}
function advance(f,seconds=2.3){f.w.time+=seconds;f.s.ctx.currentTime+=seconds;f.d.update(f.w,'play');}
test('long faculty phrases have one caption tied to actual playback, including greeting animation',()=>{
 const f=setup(true);assert.equal(f.w.level.faculty.filter(n=>n.speechTime>0).length,0);f.s.start(10);f.d.update(f.w,'play');
 const n=f.w.level.faculty.find(n=>n.id==='oganov');assert.equal(n.speech,f.s.voiceJob.text);assert.equal(sample(n,0).mode,'greet');
 advance(f,5.2);assert.ok(Math.abs(n.speechTime-4.8)<1e-8);assert.equal(f.s.history.length,1);assert.notEqual(sample(n,5.2).mode,'greet');
 assert.equal(f.w.level.faculty.filter(n=>n.speechTime>0).length,1);assert.equal(f.s.voiceQueue.length,0);
 f.s.end();assert.equal(n.speechTime,0);
});
test('the course team answers the addressed colleague and keeps twelve distinct lines',()=>{
 const f=setup(true);
 for(let i=0;i<12;i++){assert.ok(f.s.voiceJob);f.s.end();advance(f);}
 const heard=f.s.history;
 assert.equal(heard.length,12);assert.equal(new Set(heard.map(r=>r.text)).size,12);
 assert.deepEqual(heard.slice(0,3).map(r=>r.actor),['oganov','feoktistov','alekseev']);
 const address=heard.findIndex(r=>r.text.startsWith('Илья,'));assert.equal(heard[address+1].actor,'alekseev');
 assert.equal(f.s.voiceJob,null,'quiet break after the full discussion');advance(f,22);assert.ok(f.s.voiceJob);
});
test('standing by an office does not trigger a continuous monologue',()=>{
 const f=setup(),n=f.w.level.faculty[0];f.s.start();f.s.end();advance(f,10);assert.equal(f.s.voiceJob,null);
 advance(f,2.1);assert.equal(f.s.voiceJob.text,n.lines[1]);assert.equal(f.s.history.length,2);
});
test('leaving an office discards its pending voice and selects the current office without a backlog',()=>{
 const f=setup(),old=f.s.voiceJob;f.w.player.x=2870;f.d.update(f.w,'play');
 assert.equal(old.isValid(),false);assert.equal(f.s.voiceJob,null);assert.equal(f.s.voiceQueue.length,0);
 advance(f);assert.equal(f.s.voiceJob.actor,'mestetsky');assert.ok(f.w.level.faculty.every(n=>n.speechTime===0));
});
test('nearby speakers wait for one another instead of replacing captions',()=>{
 const f=setup(),old=f.s.voiceJob;f.s.start(8);f.w.player.x=1160;advance(f,.2);assert.equal(f.s.voiceJob,old);
 assert.equal(f.w.level.faculty.filter(n=>n.speechTime>0)[0].id,'vorontsov');
 f.s.end();advance(f);assert.equal(f.s.voiceJob.actor,'maisuradze');
});
for(const reason of ['pause','death','chapter','respawn','dialogue'])test(`${reason} cancels faculty speech without affecting the next scene`,()=>{
 const f=setup(true),old=f.s.voiceJob;f.s.start();let w=f.w,mode='play';
 if(reason==='pause')mode='modal';if(reason==='death')w.awaitingRespawn=true;
 if(reason==='chapter'){w=new World(1,{upgrade:'homing'});w.level.boss.speechTime=3;}
 if(reason==='respawn')w.spawn();if(reason==='dialogue'){w.pendingScene='course-team';mode='modal';}
 f.d.update(w,mode);assert.equal(old.isValid(),false);assert.equal(f.s.voiceJob,null);
 if(reason==='chapter')assert.equal(w.level.boss.speechTime,3);
});
test('mute preserves the discussion, readable durations and the next speaker',()=>{
 const f=setup(true);f.s.stopSpeech();f.s.enabled=false;advance(f);assert.ok(f.d.status.fallback);
 assert.ok(f.w.level.faculty.find(n=>n.id==='oganov').speechTime>5);
 advance(f,12);advance(f);assert.equal(f.d.status.actor,'feoktistov');
});
test('faculty captions stay legible while companion/enemy chatter cannot cover them',()=>{
 const f=setup();f.s.start();f.w.companion.speechTime=3;for(const e of f.w.level.enemies)e.speechTime=3;
 f.d.update(f.w,'play');assert.equal(f.s.speechOwner,f.d);assert.equal(f.w.companion.speechTime,0);assert.ok(f.w.level.enemies.every(e=>e.speechTime===0));
 assert.equal(f.w.level.faculty.filter(n=>n.speechTime>0).length,1);
});
test('an audio error falls back to text and can finish its turn',()=>{
 const f=setup(),job=f.s.voiceJob;f.s.voiceJob=null;job.onFinish('error');f.d.update(f.w,'play');assert.ok(f.w.level.faculty[0].speechTime>0);
 advance(f,12);assert.equal(f.w.level.faculty[0].line,1);
});
