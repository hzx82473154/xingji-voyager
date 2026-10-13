import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,writeFile} from 'node:fs/promises';
import {webcrypto,createHash} from 'node:crypto';
import {readBuildPassword} from '../scripts/protect-site.mjs';

let password=await readBuildPassword();
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex');
const source=await read('src/password-gate.js'),hosted=(await read('dist/index.html')).toString(),offline=(await read('index.html')).toString();
const parity=JSON.parse(await read('validation/platform-content.json')),build=JSON.parse(await read('validation/protected-build.json'));
const checks=[],check=async(name,fn)=>{await fn();checks.push(name);};
for(const mode of ['hosted','offline'])for(const platform of ['desktop','mobile']){
  await check(`Production ${platform} ${mode} gate unlocks, replaces the document and loads real lazy assets`,async()=>{
    const page=mode==='hosted'?hosted:offline,envelope=JSON.parse(page.match(/id="gate-data">([^<]+)</)[1]);
    const embeds=new Map([...page.matchAll(/<script type="application\/octet-stream" (?:data-vault )?id="([^"]+)">([^<]+)<\/script>/g)].map(m=>[m[1],{id:m[1],textContent:m[2]}]));
    const nodes=new Map(),listeners=new Map(),window={};let html='',fetches=0,staleServed=false,retries=0;
    const node=id=>{if(!nodes.has(id))nodes.set(id,{id,value:'',type:'password',textContent:'',classList:{toggle(){}},focus(){},setAttribute(){},addEventListener(event,fn){listeners.set(id+':'+event,fn);}});return nodes.get(id);};
    node('gate-data').textContent=JSON.stringify(envelope);
    const document={querySelectorAll:()=>[...embeds.values()].filter(n=>n.id.startsWith('vault-')),getElementById:id=>html?null:embeds.get(id)||node(id),open(){},write(value){html=value;embeds.clear();},close(){}};
    const fetch=async(file,options={})=>{
      assert.equal(mode,'hosted','Offline startup must not fetch');fetches++;
      let bytes=await read('dist/'+file);
      if(file.startsWith('resources/')&&!staleServed&&options.cache==='force-cache'){bytes=Buffer.from(bytes);bytes[0]^=1;staleServed=true;}
      if(file.startsWith('resources/')&&options.cache==='no-store')retries++;
      return new Response(bytes);
    };
    vm.runInNewContext(source,{document,window,navigator:{userAgent:platform==='mobile'?'iPhone':'Windows NT',platform:platform==='mobile'?'iPhone':'Win32',maxTouchPoints:platform==='mobile'?1:0},crypto:webcrypto,DecompressionStream,TextEncoder,TextDecoder,Uint8Array,atob,Blob,Response,fetch});
    node('password').value=password;await listeners.get('unlock-form:submit')({preventDefault(){}});
    assert.equal(sha(html),build.platforms[platform][mode]);
    const match=html.match(/<script>window.VOYAGER_RESOURCE_INDEX=(.*?);<\/script>/);
    window.VOYAGER_RESOURCE_INDEX=JSON.parse(match[1]);
    assert.equal(sha(html.replace(match[0],'')),parity[platform+'Runtime']);
    const previousWindow=globalThis.window;globalThis.window=window;
    try{
      const {resourceBytes}=await import('../src/resources.js?startup='+platform+mode);
      for(const name of ['assets/earth.jpg','catalogs/gaia-rotation.bin.gz','catalogs/belt-members.json.gz']){
        // Resolve the original Earth file from the manifest rather than guessing
        // a path; the two large catalog resources have fixed tracked source names.
        const key=name==='assets/earth.jpg'?'assets/'+JSON.parse(await read('assets/manifest.json')).earth:name;
        assert.equal(sha(await resourceBytes('vault:'+key)),sha(await read(key)),key);
      }
    }finally{globalThis.window=previousWindow;}
    if(mode==='hosted'){assert.ok(fetches>0);assert.equal(retries,1);}else assert.equal(fetches,0);
  });
}
password='';
const report={date:new Date().toISOString(),passed:true,checks:checks.length,names:checks,engine:'Production desktop/mobile password gate + resource module + Web Crypto; hosted stale-response repair and complete offline resource access after document replacement; no browser/GPU rendering'};
await writeFile(new URL('validation/v'+(process.env.VOYAGER_RELEASE||'2.9')+'-production-startup-results.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
