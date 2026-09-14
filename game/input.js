/* Keyboard and individual fingers own their presses independently. */
(function(root){
 'use strict';
 class Input {
  constructor(){this.keys=new Set();this.pressed=new Set();this.released=new Set();this.sources=new Map();this.epoch=0;}
  press(source,code){
   if(this.sources.get(source)===code)return false;
   this.release(source);this.sources.set(source,code);
   if(this.keys.has(code))return false;
   this.keys.add(code);this.pressed.add(code);return true;
  }
  release(source){
   const code=this.sources.get(source);if(!code)return;
   this.sources.delete(source);
   if(![...this.sources.values()].includes(code)){this.keys.delete(code);this.released.add(code);}
  }
  clear(){this.sources.clear();this.keys.clear();this.pressed.clear();this.released.clear();this.epoch++;}
 }
 if(typeof module!=='undefined')module.exports=Input;else root.GurovInput=Input;
})(typeof window==='undefined'?globalThis:window);
