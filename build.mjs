import {readFile,writeFile,mkdir,copyFile,mkdtemp,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {readBuildPassword,protectSite} from './scripts/protect-site.mjs';
import {renderRuntime} from './scripts/runtime-snapshot.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),read=p=>readFile(path.join(dir,p)),json=async p=>JSON.parse(await read(p));
const sha=x=>createHash('sha256').update(x).digest('hex');
// Only authorized platform editions change. Frozen editions include both the
// complete HTML and hashes of every asset used by that edition.
let password=await readBuildPassword();
console.log('Build input accepted; validating authorized platform editions.');
await mkdir(path.join(dir,'.sites-runtime'),{recursive:true});
const output=await mkdtemp(path.join(dir,'.sites-runtime/protect-build-'));
try {
 const editions=await json('platform-runtimes.json'),versions=await json('package.json');
 const load=async(platform)=>{
  const edition=editions[platform];
  if(edition.mode==='source')return {...await renderRuntime(platform==='mobile'),version:edition.version};
  if(edition.mode!=='frozen')throw new Error('Unknown platform runtime mode: '+platform);
  const manifest=await json(edition.directory+'/manifest.json'),html=gunzipSync(await read(edition.directory+'/runtime.html.gz')).toString();
  if(manifest.platform!==platform||manifest.version!==edition.version||sha(html)!==manifest.runtimeSha256)throw new Error('Frozen platform runtime changed: '+platform);
  for(const r of manifest.resources)if(sha(await read(r.path))!==r.sha256)throw new Error('Frozen '+platform+' resource changed: '+r.path);
  return {...manifest,html};
 };
 const desktop=await load('desktop'),mobile=await load('mobile');
 const resourcesByKey=new Map();
 const mimeFor=file=>{const ext=path.extname(file).slice(1);return ext==='gz'?'application/gzip':ext==='mp3'?'audio/mpeg':ext==='jpg'||ext==='jpeg'?'image/jpeg':`image/${ext}`;};
 for(const r of [...desktop.resources,...mobile.resources]){
  const prior=resourcesByKey.get(r.key);if(prior&&prior.sha256!==r.sha256)throw new Error('Platform resource conflict: '+r.key);
  resourcesByKey.set(r.key,{...r,mime:r.mime||mimeFor(r.path)});
 }
 const resources=[...resourcesByKey.values()];
 await writeFile(path.join(output,'hosted-resources.json'),JSON.stringify(resources));
 await mkdir(path.join(output,'dist/assets'),{recursive:true});
 await writeFile(path.join(output,'index.html'),desktop.html);await writeFile(path.join(output,'dist/index.html'),desktop.html);await writeFile(path.join(output,'mobile.html'),mobile.html);
 await writeFile(path.join(dir,'validation/platform-content.json'),JSON.stringify({version:versions.version,desktopVersion:desktop.version,mobileVersion:mobile.version,desktopContentSha256:desktop.contentSha256,mobileContentSha256:mobile.contentSha256,desktopRuntime:sha(desktop.html),mobileRuntime:sha(mobile.html),counts:mobile.counts,mobileBudgets:{hygPoints:32000,gaiaPoints:24000,beltPerGroup:1250,models:10,textureCap:4096,pixelRatio:1.4},fullResourceCount:resources.length},null,2)+'\n');
 for(const r of resources){await mkdir(path.dirname(path.join(output,'dist',r.path)),{recursive:true});await copyFile(path.join(dir,r.path),path.join(output,'dist',r.path));}
 console.log(`Desktop ${desktop.version}: ${(Buffer.byteLength(desktop.html)/1048576).toFixed(2)} MiB; mobile ${mobile.version}: ${(Buffer.byteLength(mobile.html)/1048576).toFixed(2)} MiB; ${resources.length} authenticated lazy resources shared online/offline.`);
 const checked=spawnSync(process.execPath,[path.join(dir,'validation/static.test.mjs')],{stdio:'inherit',env:{...process.env,VOYAGER_BUILD_OUTPUT:output,VOYAGER_RELEASE:versions.version}});
 if(checked.status!==0)throw new Error('Build integrity failed. Protected outputs were not replaced.');
 await protectSite(dir,output,password);
} finally {password='';await rm(output,{recursive:true,force:true});}
