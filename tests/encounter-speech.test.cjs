const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {World}=require('../game/engine.js');
const window={};vm.runInNewContext(fs.readFileSync('game/encounter-speech.js','utf8'),{window});
class Sound{
 constructor(){this.enabled=true;this.ctx={currentTime:10,state:'running'};this.voiceQueue=[];this.voiceJob=null;this.voiceActive=false;this.speechSuspended=false;this.history=[];}
 speak(actor,text,priority,options){
  this.voiceJob={actor,text,priority,...options,buffer:null,offset:0};this.history.push({actor,text});return Promise.resolve(true);
 }
 start(duration=6){const j=this.voiceJob;j.buffer={duration};j.started=this.ctx.currentTime;this.voiceActive=true;}
 end(){const j=this.voiceJob;this.voiceJob=null;this.voiceActive=false;j.onFinish('ended');}
 stopSpeech(){const j=this.voiceJob;this.voiceJob=null;this.voiceActive=false;this.speechSuspended=false;this.voiceQueue=[];j?.onFinish?.('cancelled');}
}
function setup(){const w=new World(1,{upgrade:'homing'});w.player.x=2250;w.level.boss.active=true;const s=new Sound(),d=new window.GurovEncounterSpeech(s);d.update(w,'play');return {w,s,d};}
function advance(f,seconds=2){f.w.time+=seconds;f.s.ctx.currentTime+=seconds;f.d.update(f.w,'play');}
function finish(f){f.s.end();advance(f);}
test('captions wait for decoding and use the audio clock instead of game timers',()=>{
 const f=setup(),{w,s,d}=f;assert.equal(w.level.captive.speechTime,0);assert.equal(s.voiceJob.actor,'ravil');
 s.start(9);d.update(w,'play');assert.equal(w.level.captive.speech,s.voiceJob.text);assert.equal(w.level.captive.speechTime,9);
 w.time+=30;d.update(w,'play');assert.equal(w.level.captive.speechTime,9);assert.equal(s.history.length,1);
 s.ctx.currentTime+=8;d.update(w,'play');assert.equal(w.level.captive.speechTime,1);assert.equal(w.level.boss.speechTime,0);
 s.end();d.update(w,'play');assert.equal(w.level.captive.speechTime,0);
});
test('help, agreement and plea form an opening, followed by spaced alternating replies',()=>{
 const f=setup();finish(f);assert.equal(f.s.voiceJob.actor,'erik');finish(f);assert.equal(f.s.voiceJob.actor,'ravil');
 f.s.end();advance(f,6);assert.equal(f.s.voiceJob,null);advance(f,1.1);assert.equal(f.s.voiceJob.actor,'erik');finish(f);assert.equal(f.s.voiceJob.actor,'ravil');
 assert.match(f.s.voiceJob.text,/не требует согласования/);assert.equal(f.s.voiceQueue.length,0);
 f.s.end();advance(f,7.1);finish(f);assert.match(f.s.voiceJob.text,/забрал ключ/);
 assert.deepEqual(f.s.history.slice(0,3).map(l=>l.actor),['ravil','erik','ravil']);
});
test('entrance freezes captions and preserves the in-progress line for its audio resume',()=>{
 const {w,s,d}=setup();s.start();const job=s.voiceJob;w.intro={time:0};s.speechSuspended=true;s.voiceActive=false;
 d.update(w,'play');assert.equal(w.level.captive.speechTime,0);assert.equal(s.voiceJob,job);assert.ok(job.isValid());
 w.intro=null;s.speechSuspended=false;s.voiceActive=true;d.update(w,'play');assert.equal(w.level.captive.speech,job.text);assert.equal(s.history.length,1);
});
test('rage waits for the current speaker, then gets one timely response without a backlog',()=>{
 const f=setup();f.s.start();f.w.level.boss.hp=5;f.d.update(f.w,'play');assert.equal(f.s.voiceJob.actor,'ravil');
 finish(f);assert.match(f.s.voiceJob.text,/три захода/);finish(f);assert.equal(f.s.voiceJob.actor,'ravil');assert.match(f.s.voiceJob.text,/выпусти/);
 assert.equal(f.s.voiceQueue.length,0);
});
for(const change of ['rescue','death','menu','retreat','chapter','respawn'])test(`${change} cancels even a pending decode and clears captions`,()=>{
 const {w,s,d}=setup(),job=s.voiceJob;s.start();d.update(w,'play');let mode='play',next=w;
 if(change==='rescue'){w.level.boss.defeated=true;w.level.captive=null;}
 if(change==='death')w.awaitingRespawn=true;
 if(change==='menu'){next=null;mode='menu';}
 if(change==='retreat')w.player.x=100;
 if(change==='chapter')next=new World(3,{upgrade:'homing'});
 if(change==='respawn')w.spawn();
 d.update(next,mode);assert.equal(s.voiceJob,null);assert.equal(s.speechOwner,null);assert.equal(job.isValid(),false);assert.equal(d.current,null);
});
test('mute keeps readable turn-taking and unmuting never queues old phrases',()=>{
 const f=setup();f.s.stopSpeech();f.s.enabled=false;advance(f);assert.ok(f.d.status.fallback);assert.ok(f.w.level.captive.speechTime>=3.2);
 advance(f,5);advance(f);assert.equal(f.d.current.actor,'erik');f.s.enabled=true;advance(f,.1);assert.equal(f.s.voiceJob,null,'do not dub a caption already halfway through');
 advance(f,5);advance(f);assert.equal(f.s.voiceJob.actor,'ravil');assert.equal(f.s.voiceQueue.length,0);
});
test('pausing cancels the line; returning restarts that same turn without old captions',()=>{
 const f=setup(),line=f.s.voiceJob.text;f.s.start();f.d.update(f.w,'modal');assert.equal(f.s.voiceJob,null);assert.equal(f.w.level.captive.speechTime,0);
 advance(f);assert.equal(f.s.voiceJob.text,line);
});
test('speech errors fall back to timed text and the conversation continues',()=>{
 const f=setup(),job=f.s.voiceJob;f.s.voiceJob=null;job.onFinish('error');f.d.update(f.w,'play');assert.ok(f.w.level.captive.speechTime>=3.2);
 advance(f,5);advance(f);assert.equal(f.s.voiceJob.actor,'erik');
});
test('this encounter leaves Ivan, faculty and freed-companion captions alone',()=>{
 const f=setup();for(const level of [0,2,3]){const w=new World(level,{upgrade:'homing'});if(w.level.boss)w.level.boss.speechTime=3;if(w.companion)w.companion.speechTime=4;f.d.update(w,'play');if(w.level.boss)assert.equal(w.level.boss.speechTime,3);if(w.companion)assert.equal(w.companion.speechTime,4);}
});
