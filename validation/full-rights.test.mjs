import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';import {transform} from 'esbuild';
const read=p=>readFile(new URL('../'+p,import.meta.url)),j=async p=>JSON.parse(await read(p)),sha=x=>createHash('sha256').update(x).digest('hex');
const inventory=await j('validation/full-rights-evidence/rights-inventory.json'),text=await j('validation/full-rights-evidence/text-replacements.json'),landmarks=await j('catalogs/landmarks.json'),profiles=await j('catalogs/body-profiles.json'),sources=await j('assets/surfaces/sources.json'),editions=await j('platform-runtimes.json'),proof=await j('validation/full-rights-evidence/runtime-migration.json');
assert.equal(inventory.lazyResources,1265);assert.equal(inventory.assets.length,1277);assert.equal(landmarks.length,220);assert.equal(landmarks.filter(x=>x.countryId==='CHN').length,70);assert.equal(Object.keys(profiles).length,70);assert.equal((await j('catalogs/blackholes.json')).objects.length,369);assert.equal((await j('catalogs/surface-bodies.json')).bodies.length,79);
for(const r of [...inventory.assets,...inventory.embeddedData,...inventory.software])assert.equal(sha(await read(r.path)),r.sha256,r.path);
for(const r of inventory.assets)assert(r.source&&r.author&&r.licence&&r.licenceUrl,r.path);
for(const r of text.landmarks){const current=landmarks.find(x=>x.id===r.id);assert(current);assert.equal(sha(current.summary),r.newSha256);assert.notEqual(r.oldSha256,r.newSha256);assert(current.textProvenance);assert(current.photo.credit&&current.photo.licenseUrl);}
for(const r of text.bodyProfiles){assert.equal(sha(profiles[r.key].description),r.newSha256);assert.notEqual(r.oldSha256,r.newSha256);}
assert(!sources.assets.some(x=>x.attribution.license.includes('ESA Standard')));
const strings=async s=>(await transform('var x='+JSON.stringify(s)+';',{minify:true,charset:'ascii'})).code.trim().replace(/^var x=/,'').replace(/;$/,'');
for(const [platform,e] of Object.entries(editions)){
 const m=await j(e.directory+'/manifest.json'),html=gunzipSync(await read(e.directory+'/runtime.html.gz')).toString();assert.equal(sha(html),m.runtimeSha256);assert.equal(sha(html),proof.platforms[platform].resultSha256);assert.equal(m.resources.length,1265);
 for(const r of m.resources){assert(inventory.assets.some(x=>x.path===r.path),r.path);assert.equal(sha(await read(r.path)),r.sha256);}
 for(const r of landmarks)assert(html.includes(await strings(r.summary)),platform+' '+r.id);
 for(const r of Object.values(profiles))assert(html.includes(await strings(r.description)),platform+' current profile');
 for(const c of await j('validation/full-rights-evidence/surface-replacements.json')){assert(!html.includes('vault:assets/'+c.oldFile));assert(html.includes('vault:assets/'+c.newFile));}
 assert(html.includes((await read('assets/voyager-ui-reviewed.woff')).toString('base64')));assert(html.includes('FULL_RIGHTS_REVIEW.md'));
}

const shapeChanges=await j('validation/full-rights-evidence/shape-replacements.json');
assert.equal(shapeChanges.length,3);
for(const c of shapeChanges){assert(!inventory.assets.some(x=>x.path==='assets/'+c.oldFile));assert.equal(sha(await read('assets/'+c.newFile)),c.sha256);}
assert(!(await j('catalogs/surface-bodies.json')).bodies.some(x=>(x.sources||[]).some(a=>a.license?.includes('ESA Standard')||a.licenseUrl?.includes('data-use-policy.shtml'))));
// Before-value replay is optional internal evidence; never shipped in the public source.
if(process.argv[2]){const full=JSON.parse(await readFile(process.argv[2],'utf8'));for(const [platform,p] of Object.entries(full.platforms)){let x=gunzipSync(await read(p.from+'/runtime.html.gz')).toString();assert.equal(sha(x),p.baselineSha256);for(const op of p.operations){assert.equal(x.split(op.old).length-1,op.count);x=x.split(op.old).join(op.newValue);}assert.equal(sha(x),p.resultSha256);assert.equal(x,gunzipSync(await read(p.to+'/runtime.html.gz')).toString());}}
const result={version:'2.9.5',passed:true,resources:1265,registeredFiles:1277,landmarks:220,newLandmarkDescriptions:220,newBodyDescriptions:70,blackholes:369,observedBodies:79,platforms:['desktop','mobile'],byteReplay:Boolean(process.argv[2]),scope:proof.scope,limits:['No browser/phone/GPU layout or playback listening test','Not a blanket commercial licence or judicial rights certification']};await writeFile(new URL('../validation/v2.9.5-rights-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
