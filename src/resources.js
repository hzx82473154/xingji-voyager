const pending=new Map(),urls=new Map();
let active=0;const queue=[];
async function run(task){if(active>=3)await new Promise(resolve=>queue.push(resolve));else active++;try{return await task();}finally{const next=queue.shift();if(next)next();else active--;}}
export async function resourceBytes(value){
 if(!value.startsWith('vault:'))return Uint8Array.from(atob(value),c=>c.charCodeAt(0));
 const descriptor=window.VOYAGER_RESOURCE_INDEX?.[value.slice(6)];if(!descriptor||!window.VOYAGER_VAULT)throw new Error('Protected resource unavailable');
 return new Uint8Array(await run(()=>window.VOYAGER_VAULT(descriptor)));
}
export async function resourceUrl(value){
 if(!value?.startsWith('vault:'))return value;
 if(urls.has(value))return urls.get(value);
 if(pending.has(value))return pending.get(value);
 const request=(async()=>{const bytes=await resourceBytes(value),descriptor=window.VOYAGER_RESOURCE_INDEX[value.slice(6)],url=URL.createObjectURL(new Blob([bytes],{type:descriptor.mime}));urls.set(value,url);while(urls.size>96){const [key,old]=urls.entries().next().value;URL.revokeObjectURL(old);urls.delete(key);}return url;})();pending.set(value,request);
 try{return await request;}finally{pending.delete(value);}
}
let observer;
export function setAssetImage(image,value){
 image.dataset.voyagerAsset=value;
 const assign=()=>resourceUrl(value).then(url=>{if(image.dataset.voyagerAsset===value)image.src=url;}).catch(()=>{image.alt+=' · 影像未载入';});
 if(!value?.startsWith('vault:')){image.src=value;return;}
 if(image.loading==='lazy'&&typeof IntersectionObserver!=='undefined'){
  observer??=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);resourceUrl(e.target.dataset.voyagerAsset).then(url=>{e.target.src=url;}).catch(()=>{});}},{rootMargin:'160px'});observer.observe(image);
 }else assign();
}
