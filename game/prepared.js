/* Web builds contain the exact cleaned frames prepared on the build machine. */
(function(root){
 root.GurovPrepared={load(spec){return new Promise((resolve,reject)=>{
  const atlas=new Image();atlas.onload=()=>{
   try{const frames=spec.frames.map(({x,y,w,h,...meta})=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(atlas,x,y,w,h,0,0,w,h);return {...meta,image:c};});resolve({...spec.meta,frames});}
   catch(error){reject(error);}
  };atlas.onerror=()=>reject(new Error('Prepared atlas unavailable: '+spec.src));atlas.src=spec.src;
 });}};
})(window);
