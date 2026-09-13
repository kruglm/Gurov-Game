/* In-world captions follow the audible line, including decoding and tape stops. */
(function(root){
 class AmbientSpeech{
  constructor(sound){this.sound=sound;this.world=null;this.current=null;this.pending=null;this.reply=null;}
  captions(w){return w?[...(w.level.enemies||[]),w.runner,w.companion,w.level.boss?.kind==='ivan'?w.level.boss:null].filter(Boolean):[];}
  clear(){for(const n of this.captions(this.world))if(!n.exhausted&&!n.defeated)n.speechTime=0;}
  release(){const token=this.current;this.current=null;if(token&&token.entity.speech===token.text)token.entity.speechTime=0;if(this.sound.voiceJob?.owner===this)this.sound.stopSpeech();}
  attach(w){if(this.world===w)return;this.release();this.pending=null;this.reply=null;this.world=w;}
  defer(w,actor,entity,text){this.attach(w);this.pending={world:w,player:w.player,actor,entity,text};}
  replyToIvan(w){
   this.attach(w);if(this.reply||this.current?.boss||!w.companion)return;
   const token={world:w,player:w.player,actor:'ravil',entity:w.companion,boss:w.level.boss};
   if(token.boss?.kind==='ivan'&&this.valid(token))this.reply=token;
  }
  valid(token){const w=this.world,n=token.entity,b=token.boss;return w===token.world&&w.player===token.player&&!w.awaitingRespawn&&!w.won&&!w.pendingScene&&this.captions(w).includes(n)&&!n.defeated&&!n.exhausted&&!n.escaped&&(n.hp===undefined||n.hp>0)&&Math.abs(n.x-w.player.x)<850&&(!b||(b===w.level.boss&&b.active&&!b.exhausted&&!b.defeated&&b.hp>0));}
  ready(){const s=this.sound;return !this.current&&!s.voiceJob&&!s.speechSuspended&&!s.voiceQueue?.length&&!s.speechOwner&&(!s.enabled||!s.ctx||s.ctx.currentTime>=(s.ambientVoiceAfter||0));}
  say(w,actor,entity,text,priority=1,options={}){
   this.attach(w);if(!entity)return;
   const s=this.sound;
   // Ambient remarks are timely reactions: a busy channel drops them, never
   // queues captions that will be stale by the time somebody finishes talking.
   if(this.pending||(this.reply&&!options.reserved)||!this.ready())return;
   const token={world:w,player:w.player,actor,entity,text,boss:options.boss};if(!this.valid(token))return;
   this.current=token;entity.speechTime=0;
   const fallback=()=>{if(this.current===token)token.until=w.time+Math.max(3.2,text.length/16);};
   if(!s.enabled||s.ctx?.state!=='running'){fallback();return;}
   s.speak(actor,text,priority,{owner:this,enqueue:false,isValid:()=>this.current===token&&this.valid(token),onFinish:reason=>{
    if(this.current!==token)return;if(reason==='error'){fallback();return;}this.current=null;if(entity.speech===token.text)entity.speechTime=0;
   }}).then(played=>{if(!played&&this.current===token&&!token.until){this.current=null;entity.speechTime=0;}});
  }
  update(w,mode){
   this.attach(w);this.clear();
   if(this.reply&&(mode!=='play'||!this.valid(this.reply)))this.reply=null;
   if(this.pending){
    if(mode!=='play'||!this.valid(this.pending))this.pending=null;
    else if(!w.intro&&this.ready()){
     const p=this.pending;this.pending=null;this.say(w,p.actor,p.entity,p.text,2,{reserved:true});
    }
   }
   // One reserved answer prevents fast boss taunts from starving Ravil. There is
   // no line backlog: choose from the current phase after the announcement ends.
   if(this.reply&&!this.pending&&!w.intro&&this.ready()){
    const r=this.reply;this.reply=null;const text=w.companionBattleLine();
    if(text)this.say(w,'ravil',r.entity,text,1,{boss:r.boss});
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
