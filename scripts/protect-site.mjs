import {randomBytes, pbkdf2Sync, createCipheriv, createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {readFile, writeFile, mkdir, rm, rename} from 'node:fs/promises';
import path from 'node:path';

export const ITERATIONS = 600000;
export const AAD = 'Voyager access v1';
export const VERIFIER = 'Voyager password accepted';
export const CHUNK_SIZE = 16 * 1048576;

export async function readBuildPassword() {
  process.stdin.setEncoding('utf8');
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stderr.write('Ready for build JSON on stdin (input is hidden).\n');
  }
  let input = '';
  try {
    // Do not close a live TTY async iterator: its return can wait indefinitely
    // for terminal EOF. Finish on the input newline and detach the listeners.
    await new Promise((resolve,reject)=>{
      const clean=()=>{process.stdin.off('data',data);process.stdin.off('end',end);process.stdin.off('error',error);};
      const error=e=>{clean();reject(e);};
      const end=()=>{clean();resolve();};
      const data=part=>{input+=part;if(input.includes('\u0003'))return error(new Error('Build cancelled.'));if(input.length>4096)return error(new Error('Build input is too large.'));if(input.includes('\n'))end();};
      process.stdin.on('data',data);process.stdin.once('end',end);process.stdin.once('error',error);process.stdin.resume();
    });
  } finally {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
  }
  let request;
  try { request = JSON.parse(input); } catch { throw new Error('Provide {"password":"…"} through stdin. No output was replaced.'); }
  if (typeof request.password !== 'string' || request.password.length < 6 || request.password.length > 256)
    throw new Error('Use a password between 6 and 256 characters. No output was replaced.');
  return request.password;
}

export function seal(html, password) {
  const salt = randomBytes(16), key = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
  function encrypt(data) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(AAD));
    return {iv: iv.toString('base64'), data: Buffer.concat([cipher.update(data), cipher.final(), cipher.getAuthTag()])};
  }
  const verification = encrypt(Buffer.from(VERIFIER)), payload = encrypt(gzipSync(html, {level:9}));
  key.fill(0);
  return {metadata:{version:1, iterations:ITERATIONS, salt:salt.toString('base64'), iv:payload.iv,
    verifierIv:verification.iv, verifier:verification.data.toString('base64'), size:payload.data.length}, ciphertext:payload.data};
}

export async function protectSite(root,inputRoot,password){
 const desktop=await readFile(path.join(inputRoot,'dist/index.html'),'utf8');
 const mobile=await readFile(path.join(inputRoot,'mobile.html'),'utf8');
 const salt=randomBytes(16),key=pbkdf2Sync(password,salt,ITERATIONS,32,'sha256');
 function encrypt(data){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(AAD));return {iv:iv.toString('base64'),data:Buffer.concat([cipher.update(data),cipher.final(),cipher.getAuthTag()])};}
 const verification=encrypt(Buffer.from(VERIFIER));
 const base={version:3,iterations:ITERATIONS,salt:salt.toString('base64'),verifierIv:verification.iv,verifier:verification.data.toString('base64')};
 const shell=await readFile(path.join(root,'src/password-gate.html'),'utf8'),script=await readFile(path.join(root,'src/password-gate.js'),'utf8');
 const render=(meta,payload='')=>shell.replace('/*GATE_DATA*/',()=>JSON.stringify(meta)).replace('/*GATE_PAYLOAD*/',()=>payload).replace('/*GATE_SCRIPT*/',()=>script);
 const stage=path.join(inputRoot,'protected');await mkdir(stage);await mkdir(path.join(stage,'resources'));
 const inventory=JSON.parse(await readFile(path.join(inputRoot,'hosted-resources.json'),'utf8')),hostIndex={},offlineIndex={},resourceEmbeds=[];
 for(let i=0;i<inventory.length;i++){
  const entry=inventory[i],data=await readFile(path.join(root,entry.path)),encrypted=encrypt(data),chunks=[],offlineChunks=[];
  // Ciphertext changes with every build key. Never reuse a browser/CDN cache
  // URL from an earlier encrypted release, even when source bytes are unchanged.
  const resourceHash=createHash('sha256').update(encrypted.data).digest('hex');
  for(let offset=0,n=0;offset<encrypted.data.length;offset+=CHUNK_SIZE,n++){
   const part=encrypted.data.subarray(offset,offset+CHUNK_SIZE),file='resources/r'+i+'-'+resourceHash+'-'+n+'.bin',embedId='vault-'+i+'-'+n;
   await writeFile(path.join(stage,file),part);chunks.push({file,size:part.length});offlineChunks.push({embedId,size:part.length});
   resourceEmbeds.push(`<script type="application/octet-stream" data-vault id="${embedId}">${part.toString('base64')}</script>`);
  }
  hostIndex[entry.key]={chunks,iv:encrypted.iv,mime:entry.mime,size:encrypted.data.length};
  offlineIndex[entry.key]={chunks:offlineChunks,iv:encrypted.iv,mime:entry.mime,size:encrypted.data.length};
 }
 const bind=(html,index)=>html.replace('<head>','<head><script>window.VOYAGER_RESOURCE_INDEX='+JSON.stringify(index)+';<'+ '/script>');
 const platforms={},offlinePlatforms={},coreEmbeds=[],hashes={};
 for(const [name,html] of Object.entries({desktop,mobile})){
  const hostHtml=bind(html,hostIndex),offlineHtml=bind(html,offlineIndex);
  hashes[name]={hosted:createHash('sha256').update(hostHtml).digest('hex'),offline:createHash('sha256').update(offlineHtml).digest('hex'),runtime:createHash('sha256').update(html).digest('hex')};
  for(const [mode,plain] of [['hosted',hostHtml],['offline',offlineHtml]]){
   const encrypted=encrypt(gzipSync(plain,{level:9})),chunks=[];
   for(let offset=0,i=0;offset<encrypted.data.length;offset+=CHUNK_SIZE,i++){
    const part=encrypted.data.subarray(offset,offset+CHUNK_SIZE),file=name+'-universe-'+i+'.bin',embedId='payload-'+name+'-'+i;
    if(mode==='hosted'){await writeFile(path.join(stage,file),part);chunks.push({file,size:part.length});}
    else {chunks.push({embedId,size:part.length});coreEmbeds.push(`<script type="application/octet-stream" id="${embedId}">${part.toString('base64')}</script>`);}
   }
   (mode==='hosted'?platforms:offlinePlatforms)[name]={...base,iv:encrypted.iv,size:encrypted.data.length,mode,chunks};
  }
 }
 key.fill(0);
 await writeFile(path.join(stage,'index.html'),render({...platforms.desktop,platforms}));
 const offlinePath=path.join(inputRoot,'protected.html');await writeFile(offlinePath,render({...offlinePlatforms.desktop,platforms:offlinePlatforms},coreEmbeds.concat(resourceEmbeds).join('\n')));
 await rm(path.join(root,'dist'),{recursive:true,force:true});await rename(stage,path.join(root,'dist'));await rename(offlinePath,path.join(root,'index.html'));
 const report={version:3,platforms:hashes,plaintextSha256:hashes.desktop.hosted,offlinePlaintextSha256:hashes.desktop.offline,encryptedBytes:platforms.desktop.size,mobileEncryptedBytes:platforms.mobile.size,offlineEncryptedBytes:offlinePlatforms.desktop.size,resources:inventory.length,resourceSha256:createHash('sha256').update(JSON.stringify(hostIndex)).digest('hex'),iterations:ITERATIONS};
 await writeFile(path.join(root,'validation/protected-build.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`Protected desktop ${(platforms.desktop.size/1048576).toFixed(2)} MiB; mobile ${(platforms.mobile.size/1048576).toFixed(2)} MiB. ${inventory.length} shared, independently authenticated lazy resources; offline resource bank embedded once.`);
}
