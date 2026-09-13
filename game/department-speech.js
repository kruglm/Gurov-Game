/* Nearby faculty get audible, named turns instead of a corridor-long speech queue. */
(function(root){
 const TEAM=[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[2,2],[1,2],[0,3],[1,3],[2,3]];
 class DepartmentSpeech{
  constructor(sound){this.sound=sound;this.world=null;this.current=null;}
  clearCaption(){if(this.world?.index===2)for(const n of this.world.level.faculty)n.speechTime=0;}
  release(){
   this.clearCaption();this.current=null;
   if(this.sound.voiceJob?.owner===this)this.sound.stopSpeech();
   if(this.sound.speechOwner===this)this.sound.speechOwner=null;
  }
  attach(w){this.release();this.world=w;this.player=w?.player;this.nextAt=0;this.officeAfter=new Map();this.teamTurn=0;this.teamAfter=0;}
  valid(){const w=this.world;return !!w&&w.index===2&&w.player===this.player&&this.mode==='play'&&!w.awaitingRespawn&&!w.pendingScene&&!w.won;}
  inRange(token){return Math.abs(this.world.player.x-token.n.x)<(token.team?650:850);}
  choose(){
   const w=this.world,staff=w.level.faculty,group=staff.filter(n=>n.group==='course-team');
   if(w.player.x>group[0].x-360&&w.player.x<group[group.length-1].x+300){
    if(w.time<this.teamAfter)return null;
    const [actor,line]=TEAM[this.teamTurn%TEAM.length],n=group[actor];return {n,actor:n.id,text:n.lines[line],team:true};
   }
   const n=staff.filter(n=>!n.group&&Math.abs(n.x-w.player.x)<350&&w.time>=(this.officeAfter.get(n.id)||0))
    .sort((a,b)=>Math.abs(a.x-w.player.x)-Math.abs(b.x-w.player.x))[0];
   return n?{n,actor:n.id,text:n.lines[n.line%n.lines.length],team:false}:null;
  }
  finish(token,reason){
   if(this.current!==token)return;
   if(reason==='error'){this.fallback(token);return;}
   this.current=null;this.clearCaption();this.nextAt=this.world.time+1.8;
   if(reason!=='ended')return;
   token.n.line++;
   if(token.team){this.teamTurn++;this.nextAt=this.world.time+2.2;if(this.teamTurn%TEAM.length===0)this.teamAfter=this.world.time+24;}
   else this.officeAfter.set(token.actor,this.world.time+12);
  }
  fallback(token){
   if(this.current!==token||token.fallbackUntil)return;
   token.duration=Math.max(3.2,token.text.length/16);token.fallbackUntil=this.world.time+token.duration;
  }
  syncCaption(){
   this.clearCaption();const token=this.current;if(!token||!this.valid())return;
   const s=this.sound,j=s.voiceJob;
   const elapsed=token.fallbackUntil?token.duration-(token.fallbackUntil-this.world.time):
    j?.owner===this&&s.voiceActive&&!s.speechSuspended?j.offset+s.ctx.currentTime-j.started:null;
   const duration=token.fallbackUntil?token.duration:j?.buffer?.duration;
   if(elapsed!==null&&duration>elapsed){token.n.speech=token.text;token.n.speechTime=duration-elapsed;token.n.speechElapsed=elapsed;}
  }
  update(w,mode){
   if(w!==this.world||w?.player!==this.player)this.attach(w);this.mode=mode;
   if(!this.valid()){this.release();return;}
   const s=this.sound;
   if(s.speechOwner!==this){s.speechOwner=this;s.voiceQueue=(s.voiceQueue||[]).filter(line=>line.priority>=4);}
   // Companion affection and Roman combat still animate; faculty own this chapter's ambient speech.
   if(w.companion)w.companion.speechTime=0;for(const e of w.level.enemies)e.speechTime=0;
   if(this.current&&!this.inRange(this.current)){
    const token=this.current;if(s.voiceJob?.owner===this)s.stopSpeech();else this.finish(token,'cancelled');
   }
   if(this.current?.fallbackUntil&&w.time>=this.current.fallbackUntil)this.finish(this.current,'ended');
   if(!this.current&&w.time>=this.nextAt&&!s.voiceJob&&!s.speechSuspended&&!s.voiceQueue?.length&&
      (!s.enabled||!s.ctx||s.ctx.currentTime>=(s.ambientVoiceAfter||0))){
    const token=this.choose();
    if(token){
     this.current=token;
     if(!s.enabled||s.ctx?.state!=='running')this.fallback(token);
     else s.speak(token.actor,token.text,2,{owner:this,enqueue:false,
      isValid:()=>this.current===token&&this.valid()&&this.inRange(token),
      onFinish:reason=>this.finish(token,reason)
     }).then(played=>{if(!played&&this.current===token)this.fallback(token);});
    }
   }
   this.syncCaption();
  }
  get status(){return {actor:this.current?.actor||null,text:this.current?.text||null,teamTurn:this.teamTurn,nextAt:this.nextAt,fallback:!!this.current?.fallbackUntil};}
 }
 root.GurovDepartmentSpeech=DepartmentSpeech;
})(typeof window==='undefined'?globalThis:window);
