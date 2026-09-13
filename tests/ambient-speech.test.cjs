const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const root={};vm.runInNewContext(fs.readFileSync('game/ambient-speech.js','utf8'),root);
function setup(){
 const enemy={x:200,hp:3,speechTime:3.2},boss={kind:'ivan',x:400,hp:20},w={time:0,index:0,player:{x:100},level:{enemies:[enemy],boss}};
 const s={enabled:true,ctx:{state:'running',currentTime:0},voiceQueue:[],speak(actor,text,priority,o){this.voiceJob={actor,text,...o,buffer:{duration:8},offset:0,started:0};return Promise.resolve(true);},stopSpeech(){const j=this.voiceJob;this.voiceJob=null;this.voiceActive=false;j?.onFinish('cancelled');}};
 const d=new root.GurovAmbientSpeech(s);return {s,d,w,enemy,boss};
}
test('caption waits for decoded audio, lasts its actual duration, preserves its text and never queues another actor',()=>{
 const {s,d,w,enemy,boss}=setup();d.say(w,'roman',enemy,'Статья после триллиона токенов');d.update(w,'play');assert.equal(enemy.speechTime,0);
 s.voiceActive=true;s.ctx.currentTime=4.5;w.time=20;enemy.speech='Следующая ещё не произнесённая фраза';d.update(w,'play');assert.equal(enemy.speechTime,3.5);assert.equal(enemy.speech,'Статья после триллиона токенов');
 d.say(w,'ivan',boss,'Вторая фраза');assert.equal(s.voiceJob.actor,'roman');assert.equal(boss.speechTime,0);assert.equal(s.voiceQueue.length,0);
 s.stopSpeech();d.update(w,'play');assert.equal(enemy.speechTime,0);
});
test('boss entrance hides caption and resumes from audio offset',()=>{
 const {s,d,w,enemy}=setup();d.say(w,'roman',enemy,'Фраза');s.voiceActive=true;w.intro={};s.speechSuspended=true;d.update(w,'play');assert.equal(enemy.speechTime,0);assert.ok(d.current);
 w.intro=null;s.speechSuspended=false;s.voiceJob.offset=3;s.voiceJob.started=4;s.ctx.currentTime=5;d.update(w,'play');assert.equal(enemy.speechTime,4);
});
test('death, a defeated speaker, leaving range and a modal cancel captions and voice together',()=>{
 for(const kind of ['death','speaker','range','modal']){const {s,d,w,enemy}=setup();d.say(w,'roman',enemy,'Фраза');s.voiceActive=true;if(kind==='death')w.awaitingRespawn=true;if(kind==='speaker')enemy.hp=0;if(kind==='range')w.player.x=2000;d.update(w,kind==='modal'?'modal':'play');assert.equal(s.voiceJob,null,kind);assert.equal(enemy.speechTime,0);}
});
test('muted fallback stays readable and yields one turn; faculty and encounter owners retain their channel',()=>{
 const {s,d,w,enemy,boss}=setup();s.enabled=false;d.say(w,'roman',enemy,'Короткая фраза');d.say(w,'ivan',boss,'Не одновременно');d.update(w,'play');assert.ok(enemy.speechTime>=3.2);assert.equal(boss.speechTime,0);w.time=4;d.update(w,'play');assert.equal(enemy.speechTime,0);
 s.enabled=true;s.speechOwner={};d.say(w,'roman',enemy,'Не перебиваем');assert.equal(d.current,null);assert.equal(s.voiceJob,undefined);
});
test('academic announcement waits for entrance and the previous phrase, then gets its own caption',()=>{
 const {s,d,w,enemy,boss}=setup();d.say(w,'roman',enemy,'Начатая фраза');d.defer(w,'ivan',boss,'Я ухожу в академический отпуск!');w.intro={};d.update(w,'play');assert.equal(s.voiceJob.actor,'roman');s.stopSpeech();d.update(w,'play');assert.equal(s.voiceJob,null);
 w.intro=null;d.update(w,'play');s.voiceActive=true;d.update(w,'play');assert.equal(s.voiceJob.actor,'ivan');assert.equal(boss.speech,'Я ухожу в академический отпуск!');assert.ok(boss.speechTime>0);assert.equal(enemy.speechTime,0);
});
test('exhaustion stops Ivan\'s old taunt and preserves the new surrender prompt',()=>{
 const {s,d,w,boss}=setup();d.say(w,'ivan',boss,'Догоните сначала!');s.voiceActive=true;d.update(w,'play');
 boss.hp=0;boss.exhausted=true;boss.speech='Всё, запыхался... Только один вопрос!';boss.speechTime=8;
 d.update(w,'play');assert.equal(s.voiceJob,null);assert.equal(d.current,null);assert.equal(boss.speechTime,8);assert.equal(boss.speech,'Всё, запыхался... Только один вопрос!');
});
