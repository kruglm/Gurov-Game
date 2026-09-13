// Executed as an async function by --verify-death-focus in a temporary data store.
async function verifyNativeDeathFocus() {
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const errors=[];
addEventListener('error',event=>errors.push(event.message));
const until = async (predicate, label) => {
    for (let i = 0; i < 200; i++) { if (predicate()) return; await wait(50); }
    throw Error('Timeout: ' + label+' '+JSON.stringify({mode:window.gurov?.state.mode,death:window.gurov?.state.playerDeath,
        screen:window.gurov?.state.deathScreen,paused:window.gurov?.state.backgroundPaused,hidden:document.hidden,focused:document.hasFocus(),errors}));
};
const snapshot = () => ({mode:gurov.state.mode,level:gurov.state.level,
    theme:gurov.state.deathScreen?.theme,awaiting:gurov.state.awaitingRespawn,deaths:gurov.state.stats?.deaths});
const checks = [];
await until(() => window.gurov?.state.assetReady, 'assets');
localStorage.setItem('gurov-last-lemma-v1', JSON.stringify({version:1,campaign:3,level:1,checkpoint:1,upgrade:'homing'}));
document.getElementById('continue').click();
__verifyWorld.level.enemies=[];__verifyWorld.runner=null;__verifyWorld.updateBoss=()=>{};
__verifyWorld.player.inv=0;__verifyWorld.damage(5,null,'erik');
await until(() => gurov.state.mode === 'dying', 'death animation');

async function cycle(action, mode) {
    const before=snapshot(),world=__verifyWorld,player=world.player;
    if (before.mode!==mode) throw Error('Wrong starting mode: '+JSON.stringify(before));
    let blurred=false,focused=false;
    const lost=()=>{blurred=true;};
    const visible=()=>{if(document.hidden)blurred=true;else if(document.hasFocus())focused=true;};
    const gained=()=>{focused=true;};
    addEventListener('blur',lost);addEventListener('focus',gained);document.addEventListener('visibilitychange',visible);
    webkit.messageHandlers.verifyMinimize.postMessage(action);
    await until(()=>blurred&&focused&&!document.hidden&&document.hasFocus()&&!gurov.state.backgroundPaused,'restore '+action);
    removeEventListener('blur',lost);removeEventListener('focus',gained);document.removeEventListener('visibilitychange',visible);
    const after=snapshot();
    if (JSON.stringify(before)!==JSON.stringify(after)||__verifyWorld!==world||world.player!==player)
        throw Error('Scene lost after '+action+': '+JSON.stringify({before,after}));
    if (!localStorage.getItem('gurov-last-lemma-v1')) throw Error('Save lost');
    checks.push({action,...after});
}
await cycle('minimize','dying');
await until(()=>gurov.state.mode==='dead'&&!document.getElementById('death-checkpoint').disabled,'death menu');
for (const action of ['minimize','hide','shortcut','close','close']) {
    document.getElementById('death-menu').focus();
    await cycle(action,'dead');
    if (document.getElementById('death-screen').classList.contains('hidden')) throw Error('Death menu disappeared');
}
document.getElementById('death-checkpoint').click();
if (gurov.state.mode!=='play'||gurov.state.awaitingRespawn) throw Error('Retry failed after restoring');
return JSON.stringify({checks,retry:true});
}
