require('node:fs').mkdirSync('tests/.output',{recursive:true});
// Reproducible spoken-text inventory. UI labels are deliberately excluded.
const vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const root={GurovEngine:require('../game/engine.js')};root.window=root;
for(const file of ['story.js','course-story.js','epilogue.js'])vm.runInNewContext(fs.readFileSync('game/'+file,'utf8'),root);
const rows=[],add=(actor,text)=>{if(text)rows.push({actor,text});};
Object.values(root.GurovStory).flat().forEach(f=>add(f.actor,f.text));root.GurovEpilogueLines.forEach(f=>add(f.actor,f.text));
require('../game/prologue-lines.js').forEach(f=>add(f.actor,f.text));
root.GurovEngine.ROMAN_LINES.forEach(t=>add('roman',t));root.GurovEngine.RAVIL_LINES.forEach(t=>add('ravil',t));
Object.values(root.GurovEngine.RAVIL_BATTLE_LINES).flat().forEach(t=>add('ravil',t));
require('../game/faculty-data.js').forEach(n=>n.lines.forEach(t=>add(n.id,t)));
root.GurovEngine.CHAPTERS.forEach((c,i)=>{add('narrator',c.intro);add(i===2?'maisuradze':'gurov',c.quote);});

const engine=fs.readFileSync('game/engine.js','utf8');
const encounter=fs.readFileSync('game/encounter-speech.js','utf8').split(' class EncounterSpeech')[0];
for(const m of encounter.matchAll(/'([^'\n]*[А-Яа-яЁё][^'\n]*)'/g))add(m[1].startsWith('Гурочка')?'erik':'ravil',m[1]);
const speech=engine.slice(engine.indexOf('    updateBoss(dt){'));
for(const m of speech.matchAll(/(?:speak\(|b\.speech=)'([^'\n]*[А-Яа-яЁё][^'\n]*)'/g))add('ivan',m[1]);
for(const text of ['Осторожно, скользкая защита!','Два помидора — два аргумента!','Догоните сначала!','Я на крышу! Рецензию потом!','Задержите его! Я пробегу первым!','Всё, запыхался... Только один вопрос!'])add('ivan',text);
for(const text of ['Профессор! Заберите курсовую!','Моя курсовая теперь у вас!'])add('sasha',text);
add('ravil','Гуров, я с вами!');

const completion=require('../game/completion.js');for(let level=0;level<4;level++)for(const coursework of [false,true])for(const line of completion.scene(level,coursework).lines)add(line.actor,line.text);
vm.runInNewContext(fs.readFileSync('game/assets/voices/manifest.js','utf8'),root);
const manifest=root.GurovVoiceManifest,keys=new Set(rows.map(r=>r.actor+'|'+r.text)),missing=[...keys].filter(k=>!manifest[k]),unused=Object.keys(manifest).filter(k=>!keys.has(k));
fs.writeFileSync('tests/.output/spoken-coverage.json',JSON.stringify({uniqueText:keys.size,recordings:Object.keys(manifest).length,missing,unused},null,2));console.log({uniqueText:keys.size,recordings:Object.keys(manifest).length,missing,unused});require('node:assert/strict').deepEqual(missing,[]);
