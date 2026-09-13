const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');process.chdir(root);
fs.mkdirSync('tests/.output',{recursive:true});
function run(file,env={}){
 const args=Array.isArray(file)?file:[file];
 const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',env:{...process.env,...env}});
 if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);
}
const group=process.argv[2]||'unit';
if(group==='unit')run(['--test',...fs.readdirSync('tests').filter(f=>f.endsWith('.test.cjs')).sort().map(f=>'tests/'+f)]);
else if(group==='browser')for(const name of ['prologue','epilogue','homing-jaw','encounter-speech','department','jump-audio'])run('tests/'+name+'.cjs');
else if(group==='campaign')for(const upgrade of ['paper','homing'])run('tests/campaign.cjs',{GUROV_UPGRADE:upgrade});
else if(group==='check'){
 for(const dir of ['game','tools','tests','desktop'])for(const file of fs.readdirSync(dir))if(/\.(js|cjs)$/.test(file))run(['--check',path.join(dir,file)]);
 run('tests/spoken-text.cjs');
}else throw Error('Unknown test group: '+group);
