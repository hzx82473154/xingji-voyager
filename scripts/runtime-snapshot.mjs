// Keep independently authorized platform editions reproducible and reversible.
import {build} from 'esbuild';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(path.join(root,p)),json=async p=>JSON.parse(await read(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function renderRuntime(mobile=false){
 const manifest=await json('assets/manifest.json'),config=await json('config.json');
 const extended={galaxyTypes:await json('catalogs/galaxy-types.json'),blackholes:await json('catalogs/blackholes.json'),surfaces:await json('catalogs/surface-bodies.json'),belts:await json('catalogs/belt-members-manifest.json'),deepSky:await json('catalogs/deep-sky.json')};
 const credits=await json('assets/surfaces/sources.json'),shapes={};
 for(const r of extended.surfaces.bodies){
  if(r.image)r.imageCredit=credits.assets.find(a=>a.file===r.image)?.attribution;
  if(r.texture)manifest['surface_'+(r.key||r.id)]=r.texture;
  if(r.image)manifest['surface_photo_'+(r.key||r.id)]=r.image;
  if(r.mesh)shapes[r.key||r.id]=await json('assets/'+r.mesh);
 }
 const base64=async p=>(await read(p)).toString('base64');
 const meta=await json('catalogs/manifest.json'),rotationMeta=await json('catalogs/gaia-rotation-manifest.json');
 const geography={tiles:await json('catalogs/surface-tiles.json'),landmarks:await json('catalogs/landmarks.json')};
 const definitions={__VOYAGER_CONTINENTS__:JSON.stringify(await base64('catalogs/continents.json.gz')),__VOYAGER_RINGS__:(await read('catalogs/rings.json')).toString(),__VOYAGER_EXTENDED__:JSON.stringify(extended),__VOYAGER_ROTATION__:JSON.stringify('vault:catalogs/gaia-rotation.bin.gz'),__VOYAGER_ROTATION_META__:JSON.stringify(rotationMeta),__VOYAGER_BELTS__:JSON.stringify('vault:catalogs/belt-members.json.gz'),__VOYAGER_SHAPES__:JSON.stringify(shapes),__VOYAGER_MUSIC__:JSON.stringify(await json('catalogs/music.json')),__VOYAGER_GEOGRAPHY__:JSON.stringify(geography),__VOYAGER_COUNTRIES__:JSON.stringify(await base64('catalogs/countries.json.gz')),__VOYAGER_COUNTRIES_META__:JSON.stringify(await json('catalogs/countries-manifest.json')),__VOYAGER_CATALOG__:JSON.stringify(await base64('catalogs/catalog.json.gz')),__VOYAGER_CATALOG_META__:JSON.stringify(meta)};
 const assets=Object.fromEntries(Object.entries(manifest).map(([k,v])=>[k,'vault:assets/'+v]));
 const bundle=await build({entryPoints:[path.join(root,'src/universe.js')],bundle:true,write:false,format:'iife',target:['es2020'],minify:true,legalComments:'inline',define:{...definitions,__VOYAGER_ASSETS__:JSON.stringify(assets),__VOYAGER_MOBILE__:String(mobile)}});
 const font=await base64('assets/voyager-ui-reviewed.woff');
 let css=`@font-face{font-family:VoyagerUI;src:url(data:font/woff;base64,${font}) format('woff');font-style:normal;font-weight:100 900;font-display:swap;}`+(await read('src/style.css')).toString()+(await read('src/scene-hud.css')).toString();
 if(mobile){try{css+=(await read('src/mobile-hud.css')).toString();}catch(e){if(e.code!=='ENOENT')throw e;}}
 const escape=s=>s.replace(/<\/script/gi,'<\\/script');
 const requireLicenseLinks=(await read('src/license-links.js')).toString();
 const html=(await read('src/shell.html')).toString().replace('/*STYLE*/',()=>css).replace('/*CONFIG*/',()=>`window.VOYAGER_CONFIG=${escape(JSON.stringify(config))};`).replace('/*BUNDLE*/',()=>escape(bundle.outputFiles[0].text)).replace('/*LICENSE_LINKS*/',()=>escape(requireLicenseLinks));
 const old=await json('runtime-resources.json'),resources=new Map(old.resources.map(r=>[r.key,{...r}]));
 for(const p of new Set(Object.values(manifest)))resources.set('assets/'+p,{key:'assets/'+p,path:'assets/'+p});
 for(const p of ['catalogs/gaia-rotation.bin.gz','catalogs/belt-members.json.gz'])resources.set(p,{key:p,path:p});
 for(const retired of ['assets/earth_specular.jpg','assets/landmarks/cn-potala.webp','assets/surfaces/ryugu-photo.webp','assets/surfaces/lutetia-photo.webp','assets/surfaces/steins-photo.webp','assets/surfaces/halley-photo.webp','assets/surfaces/lutetia-esa-information.webp','assets/surfaces/steins-esa-information.webp','assets/surfaces/halley-esa-information.webp'])resources.delete(retired);
 for(const r of resources.values())r.sha256=sha(await read(r.path));
 return {html,resources:[...resources.values()],contentSha256:sha(JSON.stringify({definitions,manifest})),counts:{...meta.counts,gaia:rotationMeta.counts.imported,belts:extended.belts.counts,blackholes:extended.blackholes.objects.length,surfaces:extended.surfaces.bodies.length,landmarks:geography.landmarks.length}};
}
export async function snapshotRuntime(platform,version,directory,{expectedSha}={}){
 if(!['desktop','mobile'].includes(platform))throw new Error('Expected desktop or mobile');
 const folder=path.join(root,directory);
 try{await access(path.join(folder,'manifest.json'));throw new Error('Platform snapshot already exists; refusing to overwrite.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const runtime=await renderRuntime(platform==='mobile'),runtimeSha256=sha(runtime.html);
 if(expectedSha&&runtimeSha256!==expectedSha)throw new Error('Snapshot differs from the published platform baseline.');
 await mkdir(folder,{recursive:true});
 await writeFile(path.join(folder,'runtime.html.gz'),gzipSync(runtime.html,{level:9}));
 await writeFile(path.join(folder,'manifest.json'),JSON.stringify({platform,version,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),runtimeSha256,contentSha256:runtime.contentSha256,counts:runtime.counts,resources:runtime.resources},null,2)+'\n');
 return {platform,version,runtimeSha256,resources:runtime.resources.length,bytes:Buffer.byteLength(runtime.html)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [platform,version,directory]=process.argv.slice(2);
 const expectedSha=platform==='desktop'?(await json('validation/platform-content.json')).desktopRuntime:undefined;
 console.log(JSON.stringify(await snapshotRuntime(platform,version,directory,{expectedSha})));
}
