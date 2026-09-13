const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');process.chdir(root);
fs.mkdirSync('tests/.output',{recursive:true});
function run(file,env={}){
 const args=Array.isArray(file)?file:[file];
 const result=spawnSync(process.execPath,args,{cwd:root,stdio:process.env.GITHUB_ACTIONS?['inherit','inherit','pipe']:'inherit',env:{...process.env,...env}});
 if(result.stderr?.length)process.stderr.write(result.stderr);
 if(process.env.GITHUB_ACTIONS&&(result.error||result.status!==0)){
  const message=String(result.error||result.stderr||'Test exited without stderr').slice(-6000).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');
  process.stdout.write('::error title='+args.join(' ')+'::'+message+'\n');
 }
 if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);
}
const group=process.argv[2]||'unit';
if(group==='unit')run(['--test',...fs.readdirSync('tests').filter(f=>f.endsWith('.test.cjs')).sort().map(f=>'tests/'+f)]);
else if(group==='browser')for(const name of ['focus-audio','prologue','epilogue','homing-jaw','encounter-speech','ravil-battle','summons','department','jump-audio','crouch'])run('tests/'+name+'.cjs');
else if(group==='campaign')for(const upgrade of ['paper','homing'])run('tests/campaign.cjs',{GUROV_UPGRADE:upgrade});
else if(group==='check'){
 for(const dir of ['game','tools','tests','desktop'])for(const file of fs.readdirSync(dir))if(/\.(js|cjs)$/.test(file))run(['--check',path.join(dir,file)]);
 run('tests/spoken-text.cjs');
}else throw Error('Unknown test group: '+group);
