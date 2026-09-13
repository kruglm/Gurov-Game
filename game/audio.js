/* Original rendered 16-bar FM score + separate procedural gameplay SFX. */
(function(root){
  class Soundtrack {
    constructor(){this.ctx=null;this.enabled=true;this.music=true;this.step=0;this.next=0;this.state='menu';this.voices=new Set();this.chapter=0;this.bossHealth=1;this.musicNodes=new Set();this.track=null;this.requested=null;this.requestID=0;}
    init(){
      if(!this.ctx){
        const AC=root.AudioContext||root.webkitAudioContext;if(!AC)return;
        this.ctx=new AC();this.ctx.onstatechange=()=>{this.update();this.onChange?.();};this.master=this.ctx.createGain();this.master.gain.value=.6;
        this.musicBus=this.ctx.createGain();this.musicBus.gain.value=.5;
        this.sfxBus=this.ctx.createGain();this.sfxBus.gain.value=.8;
        const compressor=this.ctx.createDynamicsCompressor();compressor.threshold.value=-12;compressor.ratio.value=4;
        this.musicBus.connect(this.master);this.sfxBus.connect(this.master);this.master.connect(compressor);compressor.connect(this.ctx.destination);
        this.next=this.ctx.currentTime+.05;this.prepareEfforts();

      }
      if(this.enabled)this.ctx.resume().then(()=>{this.update();this.onChange?.();}).catch(()=>{this.onChange?.();});
      this.onChange?.();
    }
    toggle(){this.enabled=!this.enabled;if(this.enabled)this.init();if(!this.enabled){this.stopSpeech();this.stopEfforts();}if(this.ctx)this.master.gain.setTargetAtTime(this.enabled?.6:0,this.ctx.currentTime,.04);this.onChange?.();return this.enabled;}
    get status(){return {voice:{suspended:!!this.speechSuspended,offset:this.voiceJob?.offset||0,playbackRate:this.speechSource?.playbackRate.value??null,queue:(this.voiceQueue||[]).map(q=>q.actor),active:!!this.voiceActive,pending:!!this.voicePending,actor:this.voiceActor,id:this.voiceKey,gender:this.voiceGender,language:this.voiceLanguage,duration:this.voiceDuration,error:this.voiceError,cache:root.GurovVoiceCache?.size||0},context:this.ctx?.state||'uninitialized',track:this.track?.name||null,time:this.ctx?.currentTime||0,nodes:this.musicNodes.size,master:this.master?.gain.value||0,music:this.musicBus?.gain.value||0};}
    setState(state){if(this.state===state)return;this.state=state;if(['menu','outro','pause','intro'].includes(state))this.stopEfforts();if(state==='intro')this.pauseSpeech?.();if(['menu','outro','pause'].includes(state))this.stopSpeech();if(this.ctx)this.musicBus.gain.setTargetAtTime(state==='outro'?.025:state==='intro'?.045:state==='pause'?.12:.5,this.ctx.currentTime,state==='outro'?.025:.16);this.restoreMusic?.();this.update();}
    prepareEfforts(){
      this.effortBuffers=new Map();this.effortNodes=new Set();this.effortIndex={};this.effortAfter=0;
      this.jumpBuffers=new Map();this.jumpNodes=new Set();this.jumpIndex={};
      const decode=(bank,buffers)=>Object.entries(bank||{}).map(async([name,data])=>{
        try{const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));const buffer=await this.ctx.decodeAudioData(bytes.buffer);if(this.ctx.state!=='closed')buffers.set(name,buffer);}
        catch(error){console.warn('Action sound unavailable: '+name,error);}
      });
      this.effortReady=Promise.all([...decode(root.GurovRomanEffortData,this.effortBuffers),...decode(root.GurovJumpEffortData,this.jumpBuffers)]);
    }
    stopEfforts(){
      this.stopRomanEfforts();this.stopJumpEfforts();
    }
    stopRomanEfforts(){
      for(const node of this.effortNodes||[])try{node.source.stop();}catch(e){}
      this.effortNodes?.clear();this.effortAfter=0;
    }
    stopJumpEfforts(fade=0){
      const now=this.ctx?.currentTime||0;
      for(const node of this.jumpNodes||[])try{
        if(fade){node.gain.gain.setValueAtTime(node.gain.gain.value,now);node.gain.gain.linearRampToValueAtTime(0,now+fade);}
        node.source.stop(now+fade);
      }catch(e){}
      this.jumpNodes?.clear();
    }
    jumpEffort(second=false){
      // Player actions have their own SFX lane: no speech ownership or music ducking.
      if(!this.enabled||this.ctx?.state!=='running'||!['play','boss'].includes(this.state))return false;
      const kind=second?'double':'jump',index=this.jumpIndex[kind]||0;
      const name=kind+'-'+(index%2+1),buffer=this.jumpBuffers.get(name);
      // Never queue a delayed grunt if decoding has not finished at takeoff.
      if(!buffer)return false;
      this.stopJumpEfforts(.018);this.jumpIndex[kind]=index+1;
      const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;
      gain.gain.value=this.voiceActive?.28:.58;source.connect(gain);gain.connect(this.sfxBus);
      const node={source,gain,kind,name};this.jumpNodes.add(node);this.voices.add(source);
      source.onended=()=>{source.disconnect();gain.disconnect();this.jumpNodes.delete(node);this.voices.delete(source);};
      source.start(this.ctx.currentTime);return true;
    }
    effort(kind){
      // Immediate one-shots on SFX: never enter the speech queue or change music gain.
      if(!this.enabled||this.ctx?.state!=='running'||!['play','boss'].includes(this.state))return false;
      const variants={throw:['throw-1','throw-2'],rush:['rush'],defeat:['defeat-1','defeat-2']}[kind];
      if(!variants)return false;
      const index=this.effortIndex[kind]||0,name=variants[index%variants.length],buffer=this.effortBuffers.get(name);
      const now=this.ctx.currentTime;
      // If a sound is not decoded yet, skip it rather than playing it after the action.
      if(!buffer||(kind!=='defeat'&&(this.effortNodes.size||now<this.effortAfter)))return false;
      this.stopRomanEfforts();this.effortIndex[kind]=index+1;this.effortAfter=now+Math.max(.45,buffer.duration+.08);
      const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;
      gain.gain.value=this.voiceActive?.26:.68;source.connect(gain);gain.connect(this.sfxBus);
      const node={source,gain,kind,name};this.effortNodes.add(node);this.voices.add(source);
      source.onended=()=>{source.disconnect();gain.disconnect();this.effortNodes.delete(node);this.voices.delete(source);};
      source.start(now);return true;
    }
    setContext(chapter,bossHealth){this.chapter=chapter;this.bossHealth=bossHealth;}
    wanted(){return this.state==='menu'?'menu':this.state==='boss'?(this.chapter===1?'erik':'ivan'):['pause','intro','outro'].includes(this.state)?(this.requested||'field'):'field';}
    async startMusic(name){
      this.requested=name;const ticket=++this.requestID;
      try{
        const [main,extra]=await Promise.all([GurovMusicBank.get(name,this.ctx),['erik','ivan'].includes(name)?GurovMusicBank.get(name+'-tension',this.ctx):null]);
        if(ticket!==this.requestID||this.ctx.state==='closed')return;
        const now=this.ctx.currentTime,beat=this.track?60/this.track.meta.bpm:.5;
        const nextBeat=this.track?this.track.start+Math.ceil((now-this.track.start)/beat)*beat:now;
        const when=Math.max(now+.025,nextBeat);
        const old=[...this.musicNodes];
        for(const n of old){n.gain.gain.cancelScheduledValues(now);n.gain.gain.setValueAtTime(n.gain.gain.value,now);n.gain.gain.linearRampToValueAtTime(0,when+.45);try{n.source.stop(when+.5);}catch(e){}}
        const spawn=(asset,tension)=>{const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=asset.buffer;source.loop=true;source.loopEnd=asset.meta.seconds;source.connect(gain);gain.connect(this.musicBus);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(tension?(this.bossHealth<=.5?.85:0):.9,when+.35);const node={source,gain,tension};this.musicNodes.add(node);source.onended=()=>{source.disconnect();gain.disconnect();this.musicNodes.delete(node);};source.start(when);return node;};
        spawn(main,false);this.tensionNode=extra?spawn(extra,true):null;this.tensionLevel=this.bossHealth<=.5;
        this.track={name,meta:main.meta,start:when};
      }catch(e){console.warn(e);if(ticket===this.requestID)this.requested='unavailable';}
    }
    bossEntrance(kind){
      this.setState('intro');if(!this.ctx||!this.enabled)return;
      GurovMusicBank.get(kind,this.ctx).catch(()=>{});GurovMusicBank.get(kind+'-tension',this.ctx).catch(()=>{});
      this.tone(kind==='erik'?32:39,.55,'triangle',.32,0,'sfx',24);
      [50,57,62,65,69].forEach((n,i)=>this.tone(n,.7,'sawtooth',.045,.10+i*.075,'sfx'));
      [74,69,77,81].forEach((n,i)=>this.tone(n,.25,'square',.07,.8+i*.12,'sfx'));
      this.tone(38,.55,'triangle',.28,1.5,'sfx',26);
      [62,65,69,74].forEach(n=>this.tone(n,.85,'triangle',.08,1.5,'sfx'));
    }
    stopSpeech(){if(this.speechSource){try{this.speechSource.stop();}catch(e){}this.speechSource=null;}}
    stopDefeat(){for(const voice of this.defeatVoices||[]){try{voice.stop();}catch(e){}}this.defeatVoices=new Set();}
    bossDefeat(kind,phase){
      if(!this.ctx||!this.enabled||this.ctx.state!=='running')return;
      const before=new Set(this.voices),erik=kind==='erik';
      const tone=(n,d,v=.1,delay=0,type='triangle',to=null)=>this.tone(n,d,type,v,delay,'sfx',to);
      if(phase==='impact'){
        // Low body, a short material transient and a falling tail.
        tone(erik?44:48,.4,.23,0,'sine',25);tone(68,.085,.06,0,'triangle',38);
        this.defeatNoise(.22,.15,erik?1700:750);
      }else if(phase==='break'){
        if(erik){[88,79,94,83,74].forEach((n,i)=>tone(n,.14,.045,i*.045,'triangle',n-11));this.defeatNoise(.35,.1,2400);}
        else{tone(55,.22,.13,0,'sine',24);tone(67,.12,.05,.06,'triangle',36);this.defeatNoise(.15,.10,900);}
      }else if(phase==='resolve'){
        // D minor resolves to a bright D major colour after the impact has space.
        [62,69,74,78,81,86].forEach((n,i)=>tone(n,.54,.065,i*.075));
        [50,62,66,69].forEach(n=>tone(n,.72,.048,.45,'sine'));
      }
      this.defeatVoices??=new Set();for(const voice of this.voices)if(!before.has(voice))this.defeatVoices.add(voice);
    }
    defeatNoise(duration,volume,frequency){
      if(!this.ctx||!this.enabled||this.ctx.state!=='running'||this.voices.size>=50)return;
      if(!this.noiseBuffer){
        this.noiseBuffer=this.ctx.createBuffer(1,Math.ceil(this.ctx.sampleRate*.5),this.ctx.sampleRate);
        const data=this.noiseBuffer.getChannelData(0);let seed=71;
        for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
      }
      const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain(),t=this.ctx.currentTime;
      source.buffer=this.noiseBuffer;filter.type='lowpass';filter.frequency.setValueAtTime(frequency,t);filter.frequency.exponentialRampToValueAtTime(180,t+duration);filter.Q.value=.6;
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.006);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
      source.connect(filter);filter.connect(gain);gain.connect(this.sfxBus);this.voices.add(source);
      source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();this.voices.delete(source);this.defeatVoices?.delete(source);};source.start(t);source.stop(t+duration+.02);
    }
    tone(midi,duration,type='sine',volume=.1,delay=0,bus='music',to=null){
      if(!this.ctx||!this.enabled||this.ctx.state!=='running'||this.voices.size>50)return;
      const t=this.ctx.currentTime+Math.max(0,delay),f=440*2**((midi-69)/12),o=this.ctx.createOscillator(),g=this.ctx.createGain();
      o.type=type;o.frequency.setValueAtTime(f,t);if(to!==null)o.frequency.exponentialRampToValueAtTime(440*2**((to-69)/12),t+duration);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,volume),t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
      o.connect(g);g.connect(bus==='music'?this.musicBus:this.sfxBus);o.start(t);o.stop(t+duration+.04);this.voices.add(o);
      o.onended=()=>{o.disconnect();g.disconnect();this.voices.delete(o);};
    }
    update(){
      if(!this.ctx||!this.enabled||this.ctx.state!=='running')return;
      const wanted=this.wanted();if(this.requested!==wanted&&this.requested!=='unavailable')this.startMusic(wanted);
      const tension=this.bossHealth<=.5;if(this.tensionNode&&tension!==this.tensionLevel){
        this.tensionLevel=tension;const gain=this.tensionNode.gain.gain,now=this.ctx.currentTime,value=gain.value;
        // A health change may arrive before the entrance crossfade has finished.
        gain.cancelScheduledValues(now);gain.setValueAtTime(value,now);gain.setTargetAtTime(tension?.85:0,now,.3);
      }
    }
    sfx(name,detail={}){
      const tone=(n,d,v=.1,to=null,delay=0,type='sine')=>this.tone(n,d,type,v,delay,'sfx',to);
      if(name==='coursework'){[69,74,78,81].forEach((n,i)=>tone(n,.3,.09,null,i*.08));}
      else if(name==='ivanCaught'){[74,77,81,86].forEach((n,i)=>tone(n,.5,.1,null,i*.1));}
      else if(name==='mcpShot'){
        // Short paper/card flick, air and a digital acknowledgement.
        this.defeatNoise(.11,.10,4300);tone(61,.10,.08,78,0,'triangle');tone(91,.045,.045,84,.07,'square');this.effort('throw');
      }
      else if(name==='enemyRush'){this.defeatNoise(.24,.11,2600);tone(42,.20,.09,65,0,'triangle');this.effort('rush');}
      else if(name==='romanDefeat'){this.defeatNoise(.22,.13,1300);tone(52,.38,.12,29,0,'triangle');[76,69,61].forEach((n,i)=>tone(n,.12,.05,null,.13+i*.10,'square'));this.effort('defeat');}
      else if(name==='bodyFall'){this.defeatNoise(.24,.17,740);tone(35,.33,.18,22);tone(63,.09,.035,42,.02,'triangle');}
      else if(name==='climbThrow'){tone(53,.11,.10,37,0,'triangle');tone(78,.04,.035,67,.025,'square');}
      else if(name==='tomatoThrow'){tone(57,.14,.075,76,0,'triangle');tone(66,.06,.04,48,.07);}
      else if(name==='tomatoSplat'){tone(49,.13,.10,25);tone(71,.065,.055,38,.012,'triangle');tone(55,.11,.04,31,.045);}
      else if(name==='jump'){const voiced=this.jumpEffort(!!detail.second);tone(detail.second?69:64,.13,voiced?.025:.09,detail.second?84:79);}
      else if(name==='companionShot'){tone(79,.15,.075,86);}
      else if(name==='companionJoined'){[74,77,81,86].forEach((n,i)=>tone(n,.45,.12,null,i*.12));}
      else if(name==='dash'){tone(45,.15,.1,78,0,'triangle');}
      else if(name==='shoot'){tone(48,.10,.14,71);tone(93,.035,.075,81,.075,'triangle');tone(88,.03,.055,80,.115,'triangle');}
      else if(name==='jawClack'||name==='menuClack'){const v=name==='menuClack'?.025:.07;tone(92,.032,v,80,0,'triangle');tone(85,.027,v*.6,77,.038,'triangle');}
      else if(name==='paperBite'){tone(76,.055,.028,51,0,'triangle');tone(97,.024,.018,68,.025,'square');}
      else if(name==='step'){tone(38,.04,.035,27);}
      else if(name==='land'){tone(41,.08,.07,28);}
      else if(name==='spark'){tone(86,.14,.08);}
      else if(name==='hit'||name==='enemy'){tone(48,.1,.13,32,0,'triangle');tone(76,.06,.06);}
      else if(name==='hurt'||name==='death'){tone(46,.25,.16,32,0,'triangle');tone(53,.24,.07,40,.08);}
      else if(name==='respawn'){[62,69,74].forEach((n,i)=>tone(n,.25,.08,null,i*.08));}
      else if(name==='page'||name==='checkpoint'||name==='tea'){[74,77,81].forEach((n,i)=>tone(n,.3,.12,null,i*.1));}
      else if(name==='complete'||name==='bossDefeated'){[62,69,74,77,81,86].forEach((n,i)=>tone(n,.6,.11,null,i*.09));}
      else if(name==='bossShot'){tone(43,.2,.055,50,0,'triangle');}
      else if(name==='shield'){tone(96,.08,.04,88);}
    }
    suspend(preserveSpeech=false){if(!preserveSpeech)this.stopSpeech();this.stopEfforts();if(this.ctx)this.ctx.suspend().catch(()=>{});}
    close(){this.requestID++;this.musicNodes.forEach(n=>{try{n.source.stop();}catch(e){}});this.musicNodes.clear();this.stopSpeech();this.stopEfforts();this.voices.forEach(v=>{try{v.stop();}catch(e){}});this.voices.clear();if(this.ctx)this.ctx.close();}
  }
  root.GurovSound=Soundtrack;
})(window);
