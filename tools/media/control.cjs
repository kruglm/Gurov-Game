/* Recording input planner. Ordinary controls; no health, speed or damage cheats.
 * Deliberately excludes traversal dashes and continuous shooting outside combat. */
const {World}=require('../../game/engine');
const clone=w=>Object.assign(Object.create(World.prototype),structuredClone(w));
const actions=[{}, {right:true},{left:true},{jump:true},{right:true,jump:true},{left:true,jump:true}];
function apply(w,a,combat=false,options={}){
 for(let i=0;i<24;i++){
  const p=w.player,b=w.level.boss;
  const threat=w.level.enemies.some(e=>e.hp>0&&Math.abs(e.x-p.x)<440&&Math.sign(e.x-p.x)===p.facing);
  const shoot=options.shoot===false?false:combat?!b?.exhausted:threat;
  w.update(1/120,{...a,shoot,jump:i===0&&a.jump,jumpReleased:i===23&&a.jump,interact:combat&&!!b?.exhausted});w.events=[];
  if(w.intro||w.pendingScene||w.pendingBossOutro||w.won)break;
 }
}
function plan(start,target,combat=false,options={}){
 let beam=[{w:clone(start),route:[],cost:0}];
 for(let depth=0;depth<10;depth++){
  const next=[],seen=new Set();
  for(const node of beam)for(let id=0;id<actions.length;id++){
   const a=actions[id],w=clone(node.w);apply(w,a,combat,options);if(w.stats.deaths>start.stats.deaths)continue;
   if(options.keepEnemies&&w.stats.defeats>start.stats.defeats)continue;
   const p=w.player,b=w.level.boss,goal=combat?{x:b.exhausted?b.x:b.x-290,y:487}:target;
   const cost=node.cost+(a.jump?5:0)+(a.left?1:0)+(node.route.length&&Math.sign(p.vx)!==Math.sign(node.w.player.vx)?1.5:0);
   const score=(5-p.hp)*2400+Math.abs(p.x-goal.x)*.55+Math.abs(p.y-goal.y)*.36+cost+(combat?(b.hp+(b.kind==='ivan'&&!b.academic?12:0))*190:0);
   const route=node.route.concat(id);
   if(w.pendingScene||w.pendingBossOutro||w.won||w.intro)return route.slice(0,1);
   const key=[Math.round(p.x/18),Math.round(p.y/20),Math.round(p.vx/130),Math.round(p.vy/170),p.jumps,p.hp,b?.hp,b?.academic,Math.round(b?.x/35||0)].join(':');
   if(seen.has(key))continue;seen.add(key);next.push({w,route,score,cost});
  }
  next.sort((a,b)=>a.score-b.score);beam=next.slice(0,18);if(!beam.length)throw Error('No surviving recording continuation');
 }
 return beam[0].route.slice(0,1);
}
module.exports={actions,apply,clone,plan};
