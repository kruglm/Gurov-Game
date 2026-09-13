/* Erik's encounter is a conversation, independent of the attack-cycle clock. */
(function(root){
 const HELP='Профессор, спасите! Я здесь в заложниках!';
 const AGREED='Гурочка, у меня всё согласовано!',RAGE='Гурочка, теперь согласуем в три захода!';
 const PLEA='Эрик, выпусти! Хочу тропическую алгебру!';
 const REPLIES=[
  'Эрик, любовь к Гурову не требует согласования!',
  'Эрик забрал ключ. Но не мою любовь к алгебре.',
  'Гуров! Здесь нет даже нормального полукольца!',
  'Я обещал профессору доказательство, а не побег!',
  'Хочу заниматься тропической алгеброй!',
  'Сергей Исаевич, я ждал только вас!'
 ];
 class EncounterSpeech{
  constructor(sound){this.sound=sound;this.world=null;this.current=null;}
  clearCaption(){
   if(this.world?.index!==1)return;
   if(this.boss)this.boss.speechTime=0;
   if(this.captive)this.captive.speechTime=0;
  }
  release(){
   this.clearCaption();this.current=null;
   if(this.sound.voiceJob?.owner===this)this.sound.stopSpeech();
   if(this.sound.speechOwner===this)this.sound.speechOwner=null;
  }
  attach(w){
   this.release();this.world=w;this.player=w?.player;this.boss=w?.level.boss;this.captive=w?.level.captive;
   this.opening=0;this.reply=0;this.turn='erik';this.rageSaid=false;this.rageObserved=false;this.nextAt=0;
  }
  relevant(){
   const w=this.world;
   return !!w&&w.index===1&&w.player===this.player&&!w.awaitingRespawn&&!w.pendingScene&&
    w.level.boss===this.boss&&!this.boss.defeated&&w.level.captive===this.captive&&!!this.captive&&
    w.player.x>1810&&Math.abs(w.player.x-this.boss.x)<1000;
  }
  valid(){return this.relevant()&&this.mode==='play';}
  enraged(){return this.boss.hp<=this.boss.maxHp/2;}
  choose(){
   if(this.opening===0)return {actor:'ravil',text:HELP,kind:'opening'};
   if(this.enraged()&&!this.rageSaid)return {actor:'erik',text:RAGE,kind:'rage'};
   if(this.opening<3)return {actor:this.opening===1?'erik':'ravil',text:this.opening===1?AGREED:PLEA,kind:'opening'};
   return this.turn==='erik'?{actor:'erik',text:this.enraged()?RAGE:AGREED,kind:'taunt'}:
    {actor:'ravil',text:REPLIES[this.reply%REPLIES.length],kind:'reply'};
  }
  finish(token,reason){
   if(this.current!==token)return;
   if(reason==='error'){this.fallback(token);return;}
   this.current=null;this.clearCaption();let gap=.9;
   if(reason==='ended'){
    if(token.kind==='opening'){this.opening++;if(this.opening===3)gap=7;}
    else if(token.kind==='rage'){this.rageSaid=true;if(this.opening===1)this.opening=2;this.turn='ravil';}
    else if(token.kind==='taunt')this.turn='ravil';
    else{this.turn='erik';this.reply++;gap=7;}
   }
   if(this.enraged()&&!this.rageSaid)gap=Math.min(gap,.9);
   this.nextAt=this.world.time+gap;
  }
  fallback(token){
   if(this.current!==token||token.fallbackUntil)return;
   // Muted/unavailable audio still has readable captions and the same turn order.
   token.fallbackUntil=this.world.time+Math.max(3.2,token.text.length/16);
  }
  syncCaption(){
   this.clearCaption();const token=this.current;if(!token||!this.valid()||this.world.intro)return;
   const s=this.sound,job=s.voiceJob;
   const remaining=token.fallbackUntil?token.fallbackUntil-this.world.time:
    job?.owner===this&&s.voiceActive&&!s.speechSuspended?job.buffer.duration-job.offset-(s.ctx.currentTime-job.started):0;
   if(remaining>0){const actor=token.actor==='erik'?this.boss:this.captive;actor.speech=token.text;actor.speechTime=remaining;}
  }
  update(w,mode){
   if(w!==this.world||w?.player!==this.player||w?.level.captive!==this.captive)this.attach(w);
   this.mode=mode;
   if(!this.valid()){this.release();return;}
   const s=this.sound;
   if(s.speechOwner!==this){
    s.speechOwner=this;
    // Finish the line already being spoken on approach, discard old ambient chatter.
    s.voiceQueue=(s.voiceQueue||[]).filter(line=>line.priority>=4);
   }
   if(w.intro){this.clearCaption();return;}
   if(this.enraged()&&!this.rageObserved){this.rageObserved=true;this.nextAt=Math.min(this.nextAt,w.time+.9);}
   if(this.current?.fallbackUntil&&w.time>=this.current.fallbackUntil)this.finish(this.current,'ended');
   if(!this.current&&w.time>=this.nextAt&&!s.voiceJob&&!s.speechSuspended&&!s.voiceQueue?.length&&
      (!s.enabled||!s.ctx||s.ctx.currentTime>=(s.ambientVoiceAfter||0))){
    const token=this.choose();this.current=token;
    if(!s.enabled||s.ctx?.state!=='running')this.fallback(token);
    else s.speak(token.actor,token.text,2,{
     owner:this,enqueue:false,isValid:()=>this.current===token&&this.valid(),
     onFinish:reason=>this.finish(token,reason)
    }).then(played=>{if(!played&&this.current===token)this.fallback(token);});
   }
   this.syncCaption();
  }
  get status(){return {actor:this.current?.actor||null,text:this.current?.text||null,opening:this.opening,reply:this.reply,turn:this.turn,nextAt:this.nextAt,fallback:!!this.current?.fallbackUntil};}
 }
 root.GurovEncounterSpeech=EncounterSpeech;
})(typeof window==='undefined'?globalThis:window);
