/* In-world captions follow the audible line, including decoding and tape stops. */
(function(root){
 class AmbientSpeech{
  constructor(sound){this.sound=sound;this.world=null;this.current=null;this.pending=null;}
  captions(w){return w?[...(w.level.enemies||[]),w.runner,w.companion,w.level.boss?.kind==='ivan'?w.level.boss:null].filter(Boolean):[];}
  clear(){for(const n of this.captions(this.world))if(!n.exhausted&&!n.defeated)n.speechTime=0;}
  release(){const token=this.current;this.current=null;if(token&&token.entity.speech===token.text)token.entity.speechTime=0;if(this.sound.voiceJob?.owner===this)this.sound.stopSpeech();}
  attach(w){if(this.world===w)return;this.release();this.pending=null;this.world=w;}
  defer(w,actor,entity,text){this.attach(w);this.pending={world:w,player:w.player,actor,entity,text};}
  valid(token){const w=this.world,n=token.entity;return w===token.world&&w.player===token.player&&!w.awaitingRespawn&&!w.won&&!w.pendingScene&&this.captions(w).includes(n)&&!n.defeated&&!n.exhausted&&!n.escaped&&(n.hp===undefined||n.hp>0)&&Math.abs(n.x-w.player.x)<850;}
  say(w,actor,entity,text,priority=1){
   this.attach(w);if(!entity)return;
   const s=this.sound;
   // Ambient remarks are timely reactions: a busy channel drops them, never
   // queues captions that will be stale by the time somebody finishes talking.
   if(this.pending||this.current||s.voiceJob||s.speechOwner||s.speechSuspended||s.voiceQueue?.length)return;
   const token={world:w,player:w.player,actor,entity,text};if(!this.valid(token))return;
   this.current=token;entity.speechTime=0;
   const fallback=()=>{if(this.current===token)token.until=w.time+Math.max(3.2,text.length/16);};
   if(!s.enabled||s.ctx?.state!=='running'){fallback();return;}
   s.speak(actor,text,priority,{owner:this,enqueue:false,isValid:()=>this.current===token&&this.valid(token),onFinish:reason=>{
    if(this.current!==token)return;if(reason==='error'){fallback();return;}this.current=null;if(entity.speech===token.text)entity.speechTime=0;
   }}).then(played=>{if(!played&&this.current===token&&!token.until){this.current=null;entity.speechTime=0;}});
  }
  update(w,mode){
   this.attach(w);this.clear();
   if(this.pending){
    if(mode!=='play'||!this.valid(this.pending))this.pending=null;
    else if(!w.intro&&!this.current&&!this.sound.voiceJob&&!this.sound.speechSuspended&&!this.sound.voiceQueue?.length&&!this.sound.speechOwner&&(!this.sound.enabled||!this.sound.ctx||this.sound.ctx.currentTime>=(this.sound.ambientVoiceAfter||0))){
     const p=this.pending;this.pending=null;this.say(w,p.actor,p.entity,p.text,2);
    }
   }
   const token=this.current;if(!token)return;
   if(mode!=='play'||!this.valid(token)){this.release();return;}
   if(w.intro)return;
   const s=this.sound,job=s.voiceJob;
   const remaining=token.until?token.until-w.time:job?.owner===this&&s.voiceActive&&!s.speechSuspended?job.buffer.duration-job.offset-(s.ctx.currentTime-job.started):0;
   if(token.until&&remaining<=0){this.release();return;}
   if(remaining>0){token.entity.speech=token.text;token.entity.speechTime=remaining;}
  }
  get status(){return this.current?{actor:this.current.actor,text:this.current.text,fallback:!!this.current.until}:null;}
 }
 root.GurovAmbientSpeech=AmbientSpeech;
})(typeof window==='undefined'?globalThis:window);
