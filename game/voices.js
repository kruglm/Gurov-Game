/* Offline Russian speech: one channel, resumable tape stop, cancellable playlists. */
(function(root){
 const pending=new Map(),cache=new Map();root.GurovVoiceData??={};
 const getBank=actor=>{
  if(pending.has(actor))return pending.get(actor);
  const promise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='assets/voices/'+actor+'.js';script.onload=resolve;script.onerror=()=>{pending.delete(actor);script.remove();reject(new Error('Voice bank: '+actor));};document.head.append(script);});pending.set(actor,promise);return promise;
 };
 const proto=root.GurovSound.prototype;
 proto.stopSpeech=function(){
  const job=this.voiceJob;
  this.voiceJob=null;this.voiceQueue=[];this.speechSuspended=false;this.voiceActive=false;this.voicePending=false;this.voiceActor=null;this.voicePriority=0;
  const source=this.speechSource;this.speechSource=null;if(source)try{source.stop();}catch(e){}
  job?.onFinish?.('cancelled');
  this.restoreMusic?.();
 };
 proto.restoreMusic=function(){if(this.ctx&&this.musicBus){const target=this.state==='outro'?.025:this.state==='intro'?.045:this.voiceActive?.075:this.state==='pause'?.12:.5;this.musicBus.gain.setTargetAtTime(target,this.ctx.currentTime,.1);}};
 proto.pauseSpeech=function(){
  if(this.speechSuspended)return;this.speechSuspended=true;
  const job=this.voiceJob,source=this.speechSource;if(!job||!source)return;
  const now=this.ctx.currentTime,duration=.18;
  // Integral of the linear 1 -> .1 rate ramp; resume from the unheard sample.
  job.offset=Math.min(job.buffer.duration,job.offset+Math.max(0,now-job.started)+duration*.55);
  job.paused=true;source.playbackRate.setValueAtTime(1,now);source.playbackRate.linearRampToValueAtTime(.1,now+duration);
  job.gain.gain.setValueAtTime(1.55,now);job.gain.gain.linearRampToValueAtTime(0,now+duration);
  source.stop(now+duration);
 };
 proto.resumeSpeech=function(){
  if(!this.speechSuspended)return;this.speechSuspended=false;
  const job=this.voiceJob;
  if(job?.buffer&&!this.speechSource)this.playSpeechBuffer(job,true);
  else if(!job)this.pumpSpeech();
 };
 proto.playSpeechBuffer=function(job,resuming=false){
  if(this.voiceJob!==job||this.speechSuspended||!this.enabled)return;
  if(job.isValid&&!job.isValid()){this.finishSpeech(job,'cancelled');return;}
  if(job.offset>=job.buffer.duration-.01){this.finishSpeech(job);return;}
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),now=this.ctx.currentTime;
  source.buffer=job.buffer;source.connect(gain);gain.connect(this.master);
  gain.gain.setValueAtTime(resuming?0:1.55,now);if(resuming)gain.gain.linearRampToValueAtTime(1.55,now+.05);
  job.gain=gain;job.started=now;job.paused=false;this.speechSource=source;this.voiceActive=true;this.voicePending=false;
  this.voiceDuration=job.buffer.duration;this.voiceKey=job.meta.id;this.voiceGender=job.meta.gender;this.voiceLanguage='ru-RU';this.restoreMusic();
  source.onended=()=>{
   source.disconnect();gain.disconnect();if(this.speechSource!==source)return;
   this.speechSource=null;this.voiceActive=false;
   if(this.voiceJob!==job)return;
   if(job.paused){if(!this.speechSuspended)this.playSpeechBuffer(job,true);else this.restoreMusic();}
   else this.finishSpeech(job);
  };
  source.start(now,job.offset);
 };
 proto.finishSpeech=function(job,reason='ended'){
  if(this.voiceJob!==job)return;this.voiceJob=null;this.voiceActive=false;this.voicePending=false;this.voiceActor=null;this.voicePriority=0;
  job.onFinish?.(reason);
  this.ambientVoiceAfter=this.ctx.currentTime+1.5;this.restoreMusic();this.pumpSpeech();
 };
 proto.pumpSpeech=function(){if(!this.voiceJob&&!this.speechSuspended&&this.voiceQueue?.length){const line=this.voiceQueue.shift();return this.beginSpeech(line);}return false;};
 proto.beginSpeech=async function(line){
  if(line.isValid&&!line.isValid())return false;
  const meta=root.GurovVoiceManifest?.[line.actor+'|'+line.text];if(!meta){console.warn('Missing spoken line: '+line.actor+' | '+line.text);return false;}
  this.init();const job={...line,meta,offset:0,buffer:null};this.voiceJob=job;this.voicePriority=line.priority;this.voiceActor=line.actor;this.voicePending=true;
  try{
   await getBank(line.actor);let buffer=cache.get(meta.id);
   if(!buffer){const bytes=Uint8Array.from(atob(root.GurovVoiceData[meta.id]),c=>c.charCodeAt(0));buffer=await this.ctx.decodeAudioData(bytes.buffer);cache.set(meta.id,buffer);if(cache.size>20)cache.delete(cache.keys().next().value);}
   if(this.voiceJob!==job||!this.enabled||this.ctx.state==='closed')return false;
   job.buffer=buffer;this.voicePending=false;if(!this.speechSuspended)this.playSpeechBuffer(job);return true;
  }catch(error){if(this.voiceJob===job){this.voiceError=String(error);this.finishSpeech(job,'error');}console.warn(error);return false;}
 };
 proto.speak=function(actor,text,priority=1,options={}){
  if(!this.enabled)return Promise.resolve(false);
  const line={...options,actor,text,priority};
  // An encounter reserves ambient turns; modal dialogue can always take over.
  if(priority<4&&this.speechOwner&&this.speechOwner!==line.owner)return Promise.resolve(false);
  if(priority>=4){this.stopSpeech();return this.beginSpeech(line);}
  if(this.voiceJob||this.speechSuspended){
   // Vocal efforts must not pile up. Ambient speakers take turns, never interrupt.
   if(priority===0||line.enqueue===false)return Promise.resolve(false);
   this.voiceQueue??=[];this.voiceQueue=this.voiceQueue.filter(q=>q.actor!==actor);
   if(this.voiceQueue.length<3)this.voiceQueue.push(line);return Promise.resolve(false);
  }
  if(this.ctx&&this.ctx.currentTime<(this.ambientVoiceAfter||0))return Promise.resolve(false);
  return this.beginSpeech(line);
 };
 proto.speakSequence=function(lines){
  this.stopSpeech();if(!this.enabled)return;this.voiceQueue=lines.map(line=>({...line,priority:4}));this.pumpSpeech();
 };
 // The older Erik clip must use the same serialized speech channel.
 proto.speakErik=function(){return this.speak('erik','Гурочка, у меня всё согласовано!',2);};
 root.GurovVoiceCache=cache;
})(window);
