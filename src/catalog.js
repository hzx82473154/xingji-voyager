import * as THREE from 'three';
import {batchYield} from './frame-budget.js';
import {indexPoints,rebasePoints} from './particle-material.js';
import {modelResolved,resolvedOnScreen,projectedRadius,volumeBudget,viewFrustum,boundsVisible} from './render-policy.js';
import {updateOrbitPath} from './orbit-path.js';
import {magnitudeStrength} from './display-photometry.js';
import {describeBody} from './body-descriptions.js';
import {SCOPES,TYPES,inScope,belongsTo} from './navigation.js';
import {skyPosition} from './astronomy.js';
import {naturalRadius,stellarRadius} from './celestial-physics.js';
import {resolveConstellations} from './exploration.js';
import {initializeExtended,configureSolar as configureExtendedSolar,extendedRecord,searchExtended,resolveExtended,loadRotationCatalog,loadBelts,extendedStarPoints,loadGaiaSpatialChunks,gaiaRecordAt,beltMembers,updateSolarRecords,extraInfo,extensionMeta,kindNames,surfaceRecord} from './extended-catalog.js';
import {makeBlackHole,makeSmallBody,makeBelt,updateExtendedModel,attachObservedSurface,observedGeometry} from './extended-models.js';
import {makeSystem,updateSystem,makeVolume,makeConstellation,disposeModel} from './celestial-models.js';
import {LY_UNITS,AU_UNITS,EARTH_RADIUS_KM,beltOpacity} from './physical-scale.js';
export {LY_UNITS} from './physical-scale.js';
export const GALAXY_RADIUS=50000*LY_UNITS;
export const GALAXY_CENTER=new THREE.Vector3(-26000*LY_UNITS,0,0);
const DATA=__VOYAGER_CATALOG__;
const galaxyTypes=typeof __VOYAGER_EXTENDED__==='undefined'?{}:__VOYAGER_EXTENDED__.galaxyTypes?.types||{};
export const catalogMeta=__VOYAGER_CATALOG_META__;
const pcToLy=3.261563777, records=new Map(), groups=[];
const persistentModels=new Map(),hostPlanets=new Map(),crossHosts=new Map(),viewFocus=new THREE.Vector3();let persistentRoot,solarPoints,solarPointRecords=[],satellitePoints=[],beltLayers=[],beltLoading=null,gaiaSceneLoading=null,lastLOD=0,lastLODWall=0;
let onSelect, catalogRoot, selectedMarker, materialFactory,activeModel,mobileModels=false,currentDays=0,currentTime=0;
export const getRecord=id=>records.get(id)||extendedRecord(id);
export {loadRotationCatalog,loadBelts,surfaceRecord};
const moonFamilies=new Map(),systemMembers=new Map(),emptyFamily=Object.freeze([]);
function indexRelationships(){
 moonFamilies.clear();systemMembers.clear();
 for(const r of records.values()){
  if(r.solar&&r.kind==='moon'){if(!moonFamilies.has(r.parent))moonFamilies.set(r.parent,[]);moonFamilies.get(r.parent).push(r);}
  const key=!r.crossId&&(r.kind==='planet'?r.host:r.kind==='star'?r.name:null);
  if(key){if(!systemMembers.has(key))systemMembers.set(key,[]);systemMembers.get(key).push(r);}
 }
}
export function configureSolar(...args){configureExtendedSolar(...args);indexRelationships();}
export const getPosition=id=>{const r=getRecord(id);return (r?.renderPosition||r?.position)?.clone()||null;};
export const catalogStars=()=>[...records.values()].filter(r=>r.id.startsWith('hyg:'));
const navigationCache=new Map();
export function navigationCatalog(scope){
 if(!navigationCache.has(scope))navigationCache.set(scope,[...records.values()].filter(r=>!r.crossId&&!r.solar&&inScope(r,scope)).sort((a,b)=>scope==='stellar'?(a.mag??99)-(b.mag??99):String(a.name).localeCompare(String(b.name))));
 return navigationCache.get(scope);
}
export function featuredCatalog(){
 const names=['Proxima Centauri','Sirius','Vega','Arcturus','Capella','Rigel','Betelgeuse','Altair','Deneb','Polaris'];
 const stars=names.map(name=>[...records.values()].find(r=>r.name===name&&r.position)).filter(Boolean);
 const planets=['exo:Proxima Cen b','exo:TRAPPIST-1 e','exo:TRAPPIST-1 f','exo:Kepler-186 f','exo:Kepler-22 b'].map(getRecord).filter(r=>r?.position);
 const galaxies=['ngc:NGC0224','ngc:NGC0598'].map(getRecord).filter(r=>r?.position);
 return {stars,planets,galaxies,blackholes:['smbh-mw','smbh-ngc4486','cygnus-x1','gaia-bh1','ton-618'].map(getRecord).filter(Boolean),clusters:[getRecord('cluster:M45'),getRecord('cluster:NGC5139')].filter(Boolean)};
}
const fmt=v=>v==null?'目录未收录':Number(v).toLocaleString('zh-CN',{maximumFractionDigits:3});
const norm=s=>String(s).toLowerCase().replace(/[\s_'-]/g,'');
const cnNames={Sirius:'天狼星',Canopus:'老人星',Arcturus:'大角星',Vega:'织女星',Capella:'五车二',Rigel:'参宿七',Procyon:'南河三',Betelgeuse:'参宿四',Altair:'河鼓二',Deneb:'天津四',Polaris:'北极星','Proxima Centauri':'比邻星',RigilKent:'南门二',"Barnard's Star":'巴纳德星'};
const localDistances={NGC0224:2500000,NGC0598:3000000}; // NASA Hubble Messier catalog.
// Flat ΛCDM comoving estimate, not an independently measured distance.
export function redshiftDistance(z){
 if(!(z>=.003&&z<3))return null;
 const n=96,dz=z/n;let total=0;
 for(let i=0;i<=n;i++){const f=1/Math.sqrt(.315*(1+(i*dz))**3+.685);total+=f*(i===0||i===n?1:i%2?4:2);}
 return 299792.458/67.4*total*dz/3*3261563.777;
}
function addRecord(r){r.search=norm([r.name,r.cn,r.aliases,r.host].join(' '));if(r.distanceLy>0)r.position=new THREE.Vector3(...skyPosition(r.ra,r.dec,r.distanceLy,LY_UNITS));records.set(r.id,r);}
export async function loadCatalog(){
 const bytes=Uint8Array.from(atob(DATA),c=>c.charCodeAt(0));
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
 const db=JSON.parse(await new Response(stream).text());
 for(const s of db.stars)addRecord({id:'hyg:'+s[0],kind:'star',name:s[1],cn:cnNames[s[1]]||s[1],ra:s[2],dec:s[3],distanceLy:s[4],mag:s[5],spect:s[6],ci:s[7],aliases:s[8],rotationDays:null,source:'HYG 4.1 · J2000.0'});
 const hosts=new Set();
 for(const p of db.planets){
  const common={ra:p[2],dec:p[3],distanceLy:p[4]>0?p[4]*pcToLy:null,source:'NASA Exoplanet Archive · PS 默认解'};
  addRecord({...common,id:'exo:'+p[0],kind:'planet',name:p[0],cn:p[0],host:p[1],period:p[5],radiusEarth:p[6],a:p[7],e:p[8],incl:p[9],periDeg:p[10],periastronJD:p[11],rotationDays:null});
  if(hosts.has(p[1])){const h=records.get('host:'+p[1]);h.radiusSolar??=p[12];h.teff??=p[13];h.rotationDays??=p[14];}
  if(!hosts.has(p[1])){hosts.add(p[1]);addRecord({...common,id:'host:'+p[1],kind:'star',name:p[1],cn:p[1],radiusSolar:p[12],teff:p[13],rotationDays:p[14],gaiaId:p[15]?.replace(/^Gaia DR3 /,''),host:p[1],source:'NASA Exoplanet Archive · 宿主恒星'});}
 }
 // Only missing system positions are supplemented; planet solution parameters
 // remain entirely from PS default references, without Composite interpolation.
 for(const [host,ra,dec,distancePc] of db.systemCoordinates||[]){const r=records.get('host:'+host);if(r&&!r.position){r.ra=ra;r.dec=dec;r.distanceLy=distancePc*pcToLy;r.position=new THREE.Vector3(...skyPosition(ra,dec,r.distanceLy,LY_UNITS));r.positionSource='NASA PSCompPars · 系统坐标补充';r.source+='；位置：PSCompPars';}}
 // Exact, unique identifiers only. Do not merge ambiguous double-star aliases.
 const byHost=new Map();for(const r of records.values())if(r.kind==='planet'){if(!byHost.has(r.host))byHost.set(r.host,[]);byHost.get(r.host).push(r);}
 const crossIds=new Map();for(const r of records.values())if(r.id.startsWith('hyg:'))for(const name of [r.name,...r.aliases.split(' / ')]){const key=norm(name);if(key)crossIds.set(key,!crossIds.has(key)||crossIds.get(key)===r?r:null);}
 for(const r of records.values())if(r.id.startsWith('host:')){
  const match=crossIds.get(norm(r.name==='Proxima Cen'?'Proxima Centauri':r.name));
  if(match&&r.position){match.originalHygDistance=match.distanceLy;match.distanceLy=r.distanceLy;match.ra=r.ra;match.dec=r.dec;match.position=r.position.clone();match.rotationDays=r.rotationDays;match.radiusSolar=r.radiusSolar;match.teff=r.teff;match.host=r.name;match.search+=' '+norm(r.name);match.source='HYG 4.1 · 已交叉识别；系统位置：NASA PS';r.crossId=match.id;}
  if(r.position)for(const planet of byHost.get(r.name)||[]){planet.position=r.position.clone();planet.distanceLy=r.distanceLy;planet.ra=r.ra;planet.dec=r.dec;if(r.positionSource)planet.source+='；位置：PSCompPars';}
 }
 for(const g of db.galaxies){const local=localDistances[g[0]],distance=local||redshiftDistance(g[5]);addRecord({id:'ngc:'+g[0],kind:'galaxy',galaxyType:galaxyTypes[g[0]]||null,name:g[0],cn:g[0]==='NGC0224'?'仙女座星系':g[0]==='NGC0598'?'三角座星系':g[0],aliases:g[1]+g[2],ra:g[3],dec:g[4],z:g[5],major:g[6],minor:g[7],morph:g[8],angle:g[9],distanceLy:distance,distanceEstimated:!local&&!!distance,rotationDays:null,source:local?'OpenNGC · 距离：NASA Hubble':'OpenNGC · CC BY-SA 4.0'});}
 for(const c of resolveConstellations(catalogStars())){
  const position=new THREE.Vector3();for(const r of c.members)position.add(r.position);position.divideScalar(c.members.length);
  const modelRadius=Math.max(...c.members.map(r=>r.position.distanceTo(position)));
  records.set('constellation:'+c.id,{...c,id:'constellation:'+c.id,kind:'constellation',name:c.en,position,modelRadius,distanceLy:position.length()/LY_UNITS,source:'HYG 4.1 · J2000 三维位置',search:norm(c.cn+' '+c.en)});
 }
 const pleiades=catalogStars().find(r=>/\bHIP 17702\b/.test(r.aliases));
 addRecord({id:'cluster:M45',kind:'cluster',name:'M45',cn:'昴星团',ra:pleiades?.ra||56.75,dec:pleiades?.dec||24.1167,distanceLy:445,modelRadius:20*LY_UNITS,clusterType:'open',source:'距离：NASA/JPL；方向：HYG 昴宿六；三维密度：结构示意'});
 addRecord({id:'cluster:NGC5139',kind:'cluster',name:'NGC5139',cn:'半人马座 ω 星团',ra:201.697,dec:-47.479,distanceLy:16000,modelRadius:75*LY_UNITS,clusterType:'globular',source:'距离：NASA/JPL；中心方向：SIMBAD J2000；三维密度：结构示意'});
 for(const r of records.values()){if(r.kind==='planet'){if(!hostPlanets.has(r.host))hostPlanets.set(r.host,[]);hostPlanets.get(r.host).push(r);}if(r.crossId)crossHosts.set(r.crossId,r);}
 initializeExtended(records);
 indexRelationships();
 return records.size;
}
function starColor(r){if(r.kind==='black-hole')return new THREE.Color(.6,.45,1);if(r.kind==='galaxy')return new THREE.Color(.65,.76,.78);const ci=r.ci??.65;return new THREE.Color().setRGB(Math.min(1,.75+ci*.18),Math.max(.45,.88-Math.abs(ci-.35)*.18),Math.max(.35,1-ci*.33));}
function pointChunks(list,parent){
 const cells=new Map();
 for(const r of list){const p=r.position,key=[Math.floor(Math.log2(Math.max(16,r.distanceLy))),p.x>0?1:0,p.y>0?1:0,p.z>0?1:0].join(',');if(!cells.has(key))cells.set(key,[]);cells.get(key).push(r);}
 // Only nearby stellar data needs small cells. Galaxies are grouped separately.
 for(const cell of cells.values()){
  const centre=cell[0].position.clone(),positions=[],colors=[],strength=[];
  for(const r of cell){positions.push(...r.position.clone().sub(centre).toArray());const c=starColor(r);colors.push(c.r,c.g,c.b);strength.push(r.kind==='black-hole'?.8:magnitudeStrength(r.mag));}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('strength',new THREE.Float32BufferAttribute(strength,1));
  const m=materialFactory(2.7,true);m.uniforms.alpha.value=.75;
  const points=new THREE.Points(g,m);points.position.copy(centre);points.userData.catalogRecords=cell;preparePointIndex(points,positions);parent.add(points);groups.push(points);
 }
}
function preparePointIndex(point,positions){
 indexPoints(point,positions);
 const rows=point.userData.catalogRecords;
 // Bound the physical near-model query once, never by the enormous camera zoom.
 point.userData.detailReach=rows?rows.reduce((reach,r)=>Math.max(reach,r.kind==='star'?stellarRadius(r)*180:r.kind==='black-hole'?(2.95325*(r.massSolar||r.massUpperLimitSolar||10)/EARTH_RADIUS_KM)*2160:r.solar?(naturalRadius(r)||.01)*180:0),9000):9000;
}
export function buildCatalog(root,makeMaterial,isMobile,select){
 mobileModels=isMobile;catalogRoot=new THREE.Group();root.add(catalogRoot);materialFactory=makeMaterial;onSelect=select;
 const stars=[...records.values()].filter(r=>r.position&&r.kind==='star'&&!r.crossId).sort((a,b)=>(a.mag??7)-(b.mag??7));
 // Full catalog remains searchable. Mobile draws the brightest 32k spatial points.
 pointChunks(isMobile?stars.slice(0,32000):stars,catalogRoot);
 pointChunks([...records.values()].filter(r=>r.kind==='black-hole'&&r.position),catalogRoot);
 // Featured landmarks stay discoverable even if their apparent magnitude is
 // low. These enlarged points are navigation symbols, not resolved surfaces.
 for(const r of featuredCatalog().stars){
  const g=new THREE.BufferGeometry();g.setAttribute('color',new THREE.Float32BufferAttribute(starColor(r).toArray(),3));g.setAttribute('strength',new THREE.Float32BufferAttribute([1.25],1));
  const point=new THREE.Points(g,makeMaterial(5.8));point.position.copy(r.position);point.userData.catalogRecords=[r];point.userData.featured=true;preparePointIndex(point,[0,0,0]);catalogRoot.add(point);groups.push(point);
 }
 const galaxies=[...records.values()].filter(r=>r.position&&r.kind==='galaxy');
 // Chunk extragalactic markers by large cells; vertices stay near their local origin.
 const cells=new Map();for(const r of galaxies){const key=[Math.floor(Math.log2(Math.max(1e6,r.distanceLy))),r.position.x>0?1:0,r.position.y>0?1:0,r.position.z>0?1:0].join(',');if(!cells.has(key))cells.set(key,[]);cells.get(key).push(r);}
 for(const cell of cells.values()){
  const centre=cell[0].position.clone(),p=[],c=[],s=[];for(const r of cell){p.push(...r.position.clone().sub(centre).toArray());c.push(.57,.72,.73);s.push(.7);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setAttribute('strength',new THREE.Float32BufferAttribute(s,1));const m=makeMaterial(3.2),points=new THREE.Points(g,m);points.position.copy(centre);points.userData.catalogRecords=cell;preparePointIndex(points,p);catalogRoot.add(points);groups.push(points);
 }
 persistentRoot=new THREE.Group();persistentRoot.name='persistent-celestial-models';root.add(persistentRoot);
 const other=[...records.values()].filter(r=>r.position&&!r.nativeId&&(r.solar&&r.kind!=='belt'||['cluster','nebula'].includes(r.kind)));
 solarPointRecords=[...other.filter(r=>r.solar&&r.parent==='sun'),...[...records.values()].filter(r=>r.nativeId&&(r.kind==='solar-planet'||r.nativeId==='sun')&&r.position)];
 if(solarPointRecords.length){const g=new THREE.BufferGeometry(),p=[],c=[],s=[];for(const r of solarPointRecords){p.push(...r.position.toArray());c.push(.7,.78,.75);s.push(.25);}g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setAttribute('strength',new THREE.Float32BufferAttribute(s,1));solarPoints=new THREE.Points(g,makeMaterial(2.3));solarPoints.userData.catalogRecords=solarPointRecords;persistentRoot.add(solarPoints);}
 const families=new Map();for(const r of records.values())if(r.solar&&r.kind==='moon'&&r.position){if(!families.has(r.parent))families.set(r.parent,[]);families.get(r.parent).push(r);}
 for(const [parent,rows] of families){const geometry=new THREE.BufferGeometry(),material=makeMaterial(2.2),points=new THREE.Points(geometry,material);geometry.setAttribute('position',new THREE.Float32BufferAttribute(rows.flatMap(r=>r.position.toArray()),3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(rows.flatMap(()=>[.65,.75,.74]),3));geometry.setAttribute('strength',new THREE.Float32BufferAttribute(rows.map(()=>.25),1));points.userData.catalogRecords=rows;points.userData.parent=parent;satellitePoints.push(points);persistentRoot.add(points);}
 pointChunks(other.filter(r=>!r.solar),catalogRoot);
 bindCatalog();return {starCount:stars.length,drawnStars:isMobile?Math.min(32000,stars.length):stars.length,galaxyCount:galaxies.length,chunkCount:groups.length};
}
function createCatalogModel(id){
 const r=getRecord(id);if(!r?.position)return;
 // Reuse a whole host system when switching among its individual planets.
 for(const model of persistentModels.values())if(model.kind==='system'&&model.entries.some(e=>e.record.id===id))return model;
 if(persistentModels.has(id))return persistentModels.get(id);
 if(persistentModels.size>=(mobileModels?10:32)){const oldest=[...persistentModels.values()].filter(m=>m!==activeModel).sort((a,b)=>a.lastSeen-b.lastSeen)[0];if(oldest){for(const e of oldest.entries){delete e.record.renderPosition;delete e.record.modelHostId;}disposeModel(oldest);persistentModels.delete(oldest.key);}}

 let model;
 if(r.kind==='black-hole')model=makeBlackHole(r,mobileModels);
 else if(r.kind==='belt')model=makeBelt(r,beltMembers(mobileModels),materialFactory,mobileModels);
 else if(r.solar)model=makeSmallBody(r,mobileModels);
 else if(r.kind==='galaxy'||r.kind==='cluster'||r.kind==='nebula'){
  if(!r.modelRadius)r.modelRadius=r.major>0&&r.distanceLy>0?Math.tan(r.major/60*Math.PI/180/2)*r.distanceLy*LY_UNITS/(r.distanceEstimated?1+r.z:1):(r.kind==='galaxy'?10000:30)*LY_UNITS;
  r.sizeEstimateNote=r.major>0?'尺寸由目录角直径和距离换算；红移对象使用 ΛCDM 角直径距离，空间位置为共动距离估算；三维厚度 / 内部结构示意':'缺少角直径：采用典型范围近似，不能作为实测大小';
  model=makeVolume(r,materialFactory,mobileModels);
 }else if(r.kind==='constellation')model=makeConstellation(r);
 else{
  let host=r.kind==='planet'?getRecord('host:'+r.host):r;
  if(r.crossId)host=r;
  if(r.id.startsWith('hyg:'))host=crossHosts.get(r.id)||r;
  const planets=hostPlanets.get(host.name)||[];
  model=makeSystem(r,host,planets);if(r.kind==='star'){model.entries[0].record=r;model.entries[0].mesh.userData.bodyId=r.id;model.entries[0].marker.userData.bodyId=r.id;model.hostId=r.id;}
 }
 model.group.name='catalog-model:'+id;model.key=id;model.lastSeen=currentTime;persistentModels.set(id,model);persistentRoot.add(model.group);model.group.position.copy(model.origin);r.modelExtent=model.extent;
 return model;
}
export function selectCatalogMarker(id){
 const model=createCatalogModel(id);if(!model)return;activeModel=model;selectedMarker=model.group;model.group.visible=true;model.lastSeen=currentTime;updateCatalogModels(currentDays,currentTime);
}
export const solarFamily=parent=>moonFamilies.get(parent)||emptyFamily;
export const systemCatalog=host=>systemMembers.get(host)||emptyFamily;
export function updateCatalogModels(days,time){
 currentDays=days;currentTime=time;updateSolarRecords(days,activeModel?.entries[0]?.record);
 for(const model of persistentModels.values()){
  if(!model.group.visible)continue;
  if(model.kind==='system')updateSystem(model,days,time);
  else if(['blackhole','solarbody','belt'].includes(model.kind))updateExtendedModel(model,days,time);
  else for(const e of model.entries)if(e.mesh.material.uniforms?.time)e.mesh.material.uniforms.time.value=time;
  model.group.position.copy(model.origin);
 }
 for(const model of beltLayers)if(model.group.visible)updateExtendedModel(model,days,time);
 for(const points of [...(solarPoints?[solarPoints]:[]),...satellitePoints]){if(!points.visible)continue;const attr=points.geometry.attributes.position;points.userData.catalogRecords.forEach((r,i)=>{if(r.position)attr.setXYZ(i,r.position.x,r.position.y,r.position.z);});attr.needsUpdate=true;points.geometry.computeBoundingSphere();}
}
function ensureBeltScene(){
 if(beltLoading)return beltLoading;
 beltLoading=loadBelts().then(()=>{window.VOYAGER_BELTS_READY=true;const members=beltMembers(mobileModels);
  for(const id of ['belt:main','belt:kuiper']){const model=makeBelt(getRecord(id),members,materialFactory,mobileModels);model.group.name=id+'-persistent';persistentRoot.add(model.group);beltLayers.push(model);}
 }).catch(()=>{beltLoading=null;window.dispatchEvent(new CustomEvent('voyager-resource-error',{detail:'天体带目录未载入，请点击天体带重试或重新加载页面'}));});return beltLoading;
}
function ensureGaiaScene(){
 if(gaiaSceneLoading)return gaiaSceneLoading;
 gaiaSceneLoading=loadRotationCatalog().then(async()=>{if(!catalogRoot.userData.gaiaPoints){const yieldBatch=batchYield();for(const cell of await loadGaiaSpatialChunks(mobileModels)){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(cell.positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cell.colors,3));g.setAttribute('strength',new THREE.Float32BufferAttribute(cell.strength,1));const point=new THREE.Points(g,materialFactory(2.7,true));point.position.set(...cell.centre);point.userData.gaiaIndices=new Uint32Array(cell.indices);point.userData.kind='star';preparePointIndex(point,cell.positions);point.userData.detailReach=cell.detailReach;catalogRoot.add(point);groups.push(point);await yieldBatch();}catalogRoot.userData.gaiaPoints=true;}}).catch(()=>{gaiaSceneLoading=null;});return gaiaSceneLoading;
}
export function modelEntries(){return activeModel?.entries||[];}
export function modelSummary(){return activeModel?{kind:activeModel.kind,extent:activeModel.extent,meshes:activeModel.entries.length,lines:activeModel.lines.length,hostId:activeModel.hostId}:null;}
export function relatedCatalog(id){
 const r=getRecord(id);if(!r)return [];
 if(r.solar){const key=r.bodyKey||r.id.slice(8);return [...records.values()].filter(m=>m.solar&&!m.nativeId&&(m.parent===key||m.parent===r.id)).map(m=>({id:m.id,cn:m.cn}));}
 if(r.kind==='constellation')return r.members.map(m=>({id:m.id,cn:m.cn}));
 if(activeModel?.kind==='system'&&activeModel.entries.some(e=>e.record.id===id))return activeModel.entries.map(e=>({id:e.record.id,cn:e.record.cn}));
 return [];
}
export function updateCatalogView(radius,focus,selected,showOrbits=true,camera=null){
 if(!catalogRoot)return;const absScale=Math.max(radius,focus.length());catalogRoot.visible=true;viewFocus.copy(focus);
 const frustum=camera?viewFrustum(camera,focus):null;
 // Every positioned object retains a far representation. Scale changes fade
 // detail; they never make the catalog depend on a click or dialog opening.
 for(const point of groups){const r=point.userData.catalogRecords?.[0]||{kind:point.userData.kind},far=r.kind==='galaxy'||r.kind==='black-hole'&&r.distanceLy>1e6;
  point.visible=!frustum||boundsVisible(point.userData.pointIndex?.root,point.position,frustum);if(camera&&point.visible)rebasePoints(point,focus,camera);point.material.uniforms.alpha.value=far?.18+.67*THREE.MathUtils.smoothstep(absScale,100*AU_UNITS,GALAXY_RADIUS*.35):Math.max(.035,.85*(1-THREE.MathUtils.smoothstep(absScale,GALAXY_RADIUS*.015,GALAXY_RADIUS*.12)));
 }
 if(absScale>100*AU_UNITS)ensureGaiaScene();
 const solarScale=focus.length()<200*AU_UNITS&&radius>10&&radius<1600*AU_UNITS;
 if(solarScale)ensureBeltScene();
 if(solarPoints)solarPoints.visible=solarScale;
 for(const belt of beltLayers){const opacity=beltOpacity(radius,focus.length(),belt.extent);belt.group.visible=opacity>0;belt.points.material.uniforms.alpha.value=opacity;}
 const selectedRecord=getRecord(selected),family=selectedRecord?.kind==='moon'?selectedRecord.parent:selectedRecord?.nativeId||selectedRecord?.bodyKey||selected;
 for(const points of satellitePoints){const parent=points.userData.parent,parentRecord=getRecord('solarbody:'+parent)||getRecord(parent),distance=focus.distanceTo(parentRecord?.position||new THREE.Vector3(1e20,0,0));points.visible=parent===family&&distance<Math.max(400,(parentRecord?.modelRadius||1)*100);}
 const absolute=camera?camera.position.clone().add(focus):focus.clone();
 if(camera&&(currentTime-lastLOD>.25||performance.now()-lastLODWall>250)){
  lastLOD=currentTime;lastLODWall=performance.now();const candidates=[];
  // Spatial chunks bound the nearest-object search. LOD scans only chunks that
  // intersect the current local neighborhood, rather than 474k rows each frame.
  for(const point of [...groups,...(solarPoints?[solarPoints]:[]),...satellitePoints.filter(p=>p.visible)]){
   let nearby;
   if(point.userData.pointIndex){
    const indices=point.userData.pointIndex.sphere(focus.clone().sub(point.position).add(camera.position),point.userData.detailReach);
    nearby=indices.map(i=>point.userData.catalogRecords?.[i]||gaiaRecordAt(point.userData.gaiaIndices[i]));
   }else nearby=point.userData.catalogRecords||[];
   for(const r of nearby){if(r.nativeId||!r.position||r.kind==='belt')continue;const d=absolute.distanceTo(r.position);let size=r.kind==='star'?stellarRadius(r):r.solar?naturalRadius(r)??.01:r.kind==='black-hole'?(2.95325*(r.massSolar||r.massUpperLimitSolar||10)/EARTH_RADIUS_KM)*12:Math.max(1,r.modelRadius||30*LY_UNITS);
    if(d<size*180||(radius<6000&&focus.distanceTo(r.position)<size*20))candidates.push({r,score:d/size});
   }
  }
  candidates.sort((a,b)=>a.score-b.score);for(const {r} of candidates.slice(0,mobileModels?1:2)){const model=createCatalogModel(r.id);if(model)model.lastSeen=currentTime;}
  for(const [id,model] of persistentModels){if(model===activeModel)continue;if(persistentModels.size>(mobileModels?10:32)&&currentTime-model.lastSeen>20){for(const e of model.entries){delete e.record.renderPosition;delete e.record.modelHostId;}disposeModel(model);persistentModels.delete(id);}}
 }
 for(const model of persistentModels.values()){
  const distance=focus.clone().sub(model.origin).add(camera?.position||new THREE.Vector3()).length();
  const record=model.entries[0]?.record,moon=record?.solar&&record.kind==='moon',inFamily=!moon||record.parent===family;
  model.group.visible=inFamily&&(!camera||modelResolved(model.extent,distance,camera)&&resolvedOnScreen(model.origin,model.extent,focus,camera));
  if(model.kind==='volume'&&camera){const point=model.group.children.find(p=>p.isPoints),pixels=projectedRadius(model.extent,distance,camera);point.geometry.setDrawRange(0,volumeBudget(pixels,point.geometry.attributes.position.count));point.material.uniforms.alpha.value=Math.min(.85,Math.max(.12,pixels/16));}
  for(const line of model.lines)line.visible=showOrbits&&(model.kind!=='solarbody'||moon&&inFamily||record.id===selected);
  if(model.group.visible&&camera)for(const line of model.lines)if(line.visible)updateOrbitPath(line,currentDays,focus,camera);
  if(model.kind==='system')for(const entry of model.entries){entry.mesh.visible=!entry.previewOnly||entry.record.id===selected;entry.marker.visible=entry.mesh.visible;}
  if(model.group.visible)model.lastSeen=currentTime;
 }
}
export function catalogPick(ray,radius){
 const targets=[];ray.params.Points.threshold=Math.max(.00000001,radius*.006);
 for(const model of persistentModels.values())if(model.group.visible){for(const hit of ray.intersectObjects(model.entries.flatMap(e=>[e.mesh,...(e.marker?[e.marker]:[])]).filter(o=>o.visible),false))targets.push({distance:hit.distance,id:hit.object.userData.bodyId});if(model.points){const hit=ray.intersectObject(model.points,false)[0];if(hit)targets.push({distance:hit.distance,id:model.points.userData.catalogRecords[hit.index]?.id});}}
 for(const model of beltLayers)if(model.group.visible){const hit=ray.intersectObject(model.points,false)[0];if(hit)targets.push({distance:hit.distance,id:model.points.userData.catalogRecords[hit.index]?.id});}
 if(solarPoints?.visible){const hit=ray.intersectObject(solarPoints,false)[0];if(hit)targets.push({distance:hit.distance,id:solarPoints.userData.catalogRecords[hit.index]?.id});}
 for(const points of satellitePoints.filter(p=>p.visible)){const hit=ray.intersectObject(points,false)[0];if(hit)targets.push({distance:hit.distance,id:points.userData.catalogRecords[hit.index]?.nativeId||points.userData.catalogRecords[hit.index]?.id});}
 const threshold=Math.max(12,radius*.006);let closest=null;
 for(const point of groups){if(!point.visible)continue;const index=point.userData.pointIndex;if(!index)continue;
  const origin=viewFocus.clone().sub(point.position).add(ray.ray.origin);
  const hit=index.ray(origin,ray.ray.direction,threshold,true)[0];if(hit&&(!closest||hit.distance<closest.hit.distance))closest={point,hit};
 }
 if(closest){const {point,hit}=closest,record=point.userData.catalogRecords?.[hit.index]||gaiaRecordAt(point.userData.gaiaIndices[hit.index]);if(record)targets.push({distance:hit.distance,id:record.id});}
 targets.sort((a,b)=>a.distance-b.distance);return targets.find(t=>t.id)?.id||null;
}
function rawCatalogInfo(id){
 const r=getRecord(id);if(!r)return null;
 const extended=extraInfo(r,fmt);if(extended)return extended;
 if(r.kind==='constellation')return {cn:r.cn,en:r.en,type:'星座 · 三维恒星分布',desc:r.note+'。按 HYG 距离展开亮星的真实空间分布，可旋转、缩放并点击单颗恒星。已知恒星半径使用真实尺度，缺测半径采用标注的估计；屏幕点及连线仅为识别辅助，不是物理结构。可切换太阳附近的天球图案。',facts:[['成员亮星',r.members.length+' 颗'],['空间位置','HYG · J2000'],['显示尺寸','已知值真实比例 / 缺测值近似']],source:r.source};
 if(r.kind==='cluster')return {cn:r.cn,en:r.name,type:r.clusterType==='open'?'疏散星团 / OPEN CLUSTER':'球状星团 / GLOBULAR CLUSTER',desc:'具有三维纵深的恒星群，可从不同方向旋转观察、进入或拉远。位置和距离来自目录近似值；星团内部粒子是密度结构示意，不是逐颗测量的成员坐标。',facts:[['距太阳系',fmt(r.distanceLy)+' 光年'],['结构',r.clusterType==='open'?'疏散三维恒星群':'球状集中恒星群'],['内部位置','程序生成结构示意']],source:r.source};
 const distance=r.distanceLy?`${fmt(r.distanceLy)} 光年${r.distanceEstimated?(r.z?'（红移估算）':'（'+(r.distanceMethod||'目录估算')+'）'):''}`:'目录未收录可靠距离 · 仅有天球方向';
 let facts=[['距太阳系',distance],['赤经 / 赤纬',`${fmt(r.ra)}° / ${fmt(r.dec)}°`]];
 const spin=r.rotationDays>0?`${fmt(r.rotationDays)} 日（方向 / 轴向未知）`:'本目录未收录';
 let desc=r.kind==='planet'?`位于 ${r.host} 系统。近景为有昼夜明暗和表面细节的三维球体，可独立环绕；宿主星、同系统行星与轨道一并显示。表面是程序绘制示意，非实测地貌。已知尺寸和轨道距离统一按物理单位换算，方向、初始未知相位采用明确的展示约定；缺少半长轴的对象仅作外观预览，不能用于星历。`:r.kind==='star'?`近景为可环绕观察的三维发光恒星，动态颗粒表现表面活动。位置来自目录；未测定半径使用展示尺寸，表面颗粒是视觉示意。已收录的行星随宿主系统一起显示。`:`按目录位置展示有纵深的三维${/^E|^S0/.test(r.morph||'')?'椭球':'旋臂'}结构，可旋转、进入并从侧面观察。内部恒星密度、盘厚度与方向为结构示意，非三维实测重建。${r.distanceEstimated?'距离采用红移模型估算。':'距离采用 NASA 近似值。'}`;
 if(r.kind==='planet')facts.push(['公转周期',r.period?`${fmt(r.period)} 日`:'未测定'],['自转周期',spin],['偏心率',r.e==null?'本目录未收录':fmt(r.e)],['半长轴',r.a?`${fmt(r.a)} AU`:'未测定'],['半径',r.radiusEarth?`${fmt(r.radiusEarth)} R⊕`:'未测定'],['轨道定位',r.orbitQuality||'相位 / 参考面数据不完整 · 示意']);
 else if(r.kind==='star')facts.push(['光谱 / 温度',r.spect|| (r.teff?`${fmt(r.teff)} K（模型）`:'未测定')],['自转周期',spin+(r.rotationSource?' · 光度推断':'')],['半径',r.radiusSolar?fmt(r.radiusSolar)+' R☉（模型 / 目录）':'未收录'],['测距方法',r.distanceMethod||'原目录距离']);
 else {facts.push(['红移 z',fmt(r.z)],['形态',r.morph||'未测定'],['目录类型',({G:'星系',GPair:'星系对',GTrpl:'三重星系',GGroup:'星系群'}[r.galaxyType]||'分类未收录')]);if(r.galaxyType&&r.galaxyType!=='G')desc='OpenNGC 收录的星系组合中心与角范围；内部成员没有逐一重建，此处只显示范围结构示意，不当作单个螺旋星系。';}
 return {cn:r.cn,en:r.name,type:r.kind==='planet'?'系外行星 / EXOPLANET':r.kind==='star'?'目录恒星 / CATALOG STAR':'河外星系 / GALAXY',desc,facts,source:r.source};
}
export function catalogInfo(id){
 const info=rawCatalogInfo(id),r=getRecord(id);if(!info||!r)return info;
 const {description,references}=describeBody(r);return {...info,desc:description,dataNote:'已知长度统一比例（1 单位 = 6,371 km）；定位点、标签、光晕和亮度增强是观看辅助，不代表实体尺寸或测光。 '+info.desc+(r.sizeEstimateNote?' '+r.sizeEstimateNote:'')+(r.companionNote?' '+r.companionNote:''),references};
}
function bindCatalog(){
 const $=id=>document.getElementById(id),dialog=$('catalogDialog');let page=0,kind='all',scope='stellar',parent='',query='',matched=[],generation=0;
 const featured=[...featuredCatalog().stars.slice(0,2).map(r=>r.id),'ngc:NGC0224','ngc:NGC0598','belt:main','belt:kuiper',...featuredCatalog().blackholes.map(r=>r.id)];
 const configureFilters=()=>{
  const options=scope==='all'?[['all','全部类型'],...Object.values(TYPES).flat().filter((v,i,a)=>v[0]!=='all'&&a.findIndex(x=>x[0]===v[0])===i)]:TYPES[scope];
  $('catalogKind').replaceChildren(...options.map(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;}));kind='all';
  const parents=scope==='solar'?[...new Map([...records.values()].filter(r=>r.solar&&r.nativeId&&r.kind==='solar-planet'||r.solar&&r.kind==='dwarf').map(r=>[r.nativeId||r.id,{value:r.nativeId||r.bodyKey||r.id,label:r.cn}])).values()]:scope==='stellar'?[...records.values()].filter(r=>r.id.startsWith('host:')).map(r=>({value:r.name,label:r.cn})):[];
  $('catalogParent').replaceChildren();const all=document.createElement('option');all.value='';all.textContent=scope==='solar'?'全部行星及所属卫星':scope==='stellar'?'全部恒星系统':'全部';$('catalogParent').append(all);
  for(const p of parents.sort((a,b)=>a.label.localeCompare(b.label,'zh-CN'))){const o=document.createElement('option');o.value=p.value;o.textContent=p.label;$('catalogParent').append(o);}
  $('catalogParent').hidden=!parents.length;parent='';
  document.querySelectorAll('[data-scope]').forEach(b=>b.classList.toggle('active',b.dataset.scope===scope));
 };
 function render(){
  const q=norm(query);matched=[...records.values()].filter(r=>!r.crossId&&inScope(r,scope)&&belongsTo(r,parent)&&(kind==='all'||r.kind===kind)&&(!q||r.search.includes(q)));
  if(!q)matched.sort((a,b)=>{const ai=featured.indexOf(a.id),bi=featured.indexOf(b.id);return (ai<0?99:ai)-(bi<0?99:bi);});
  const virtualKind=kind==='all'?(scope==='stellar'?'star':scope==='solar'?'solar-small':scope==='all'?'all':'none'):kind;
  const virtual=parent?{count:0,items:[]}:searchExtended(virtualKind,query,Math.max(0,page*24-matched.length)),count=matched.length+virtual.count;
  page=Math.max(0,Math.min(page,Math.ceil(count/24)-1));$('catalogCount').textContent=`${SCOPES[scope]||'全部目录'} · ${count.toLocaleString('zh-CN')} 个条目 · 快照 ${catalogMeta.retrievedAt.slice(0,10)}`;
  $('catalogResults').replaceChildren();const start=page*24,rows=matched.slice(start,start+24);if(rows.length<24)rows.push(...virtual.items.slice(0,24-rows.length).map(resolveExtended));
  for(const r of rows){const b=document.createElement('button');b.className='catalog-result';const title=document.createElement('b'),detail=document.createElement('span');title.textContent=r.cn===r.name?r.name:`${r.cn} · ${r.name}`;detail.textContent=`${kindNames[r.kind]||r.kind} · ${r.solar?(r.parent==='sun'?'太阳系':'所属：'+(records.get('solarbody:'+r.parent)?.cn||records.get(r.parent)?.cn||r.parent)):r.distanceLy?fmt(r.distanceLy)+' 光年'+(r.distanceEstimated?' · 估算':''):'距离未收录'}${r.host?' · 宿主：'+r.host:''}`;b.append(title,detail);b.onclick=()=>{onSelect(r.nativeId||r.id);if(r.position)dialog.close();};$('catalogResults').append(b);}
  $('catalogPage').textContent=`${count?page+1:0} / ${Math.ceil(count/24)}`;$('catalogPrev').disabled=page===0;$('catalogNext').disabled=(page+1)*24>=count;
 }
 const open=async()=>{dialog.showModal();render();$('catalogQuery').focus();const g=++generation;$('catalogDataNote').textContent='正在载入完整目录，已载入的天体可先浏览…';try{await Promise.all([loadBelts(),loadRotationCatalog()]);await ensureGaiaScene();if(g===generation){render();$('catalogDataNote').textContent=`HYG ${catalogMeta.counts.stars.toLocaleString()} · Gaia DR3 ${(extensionMeta().rotation.count||474026).toLocaleString()} · NASA ${catalogMeta.counts.planets.toLocaleString()} 已确认系外行星。完整记录可检索；无可靠距离的对象提供方向与资料。`;}}catch(e){$('catalogDataNote').textContent='部分目录暂未载入，可关闭后重试；已有目录继续可用。';}};
 $('catalog').onclick=open;$('outsideSolar').onclick=open;$('closeCatalog').onclick=()=>dialog.close();
 document.querySelectorAll('[data-scope]').forEach(button=>button.onclick=()=>{scope=button.dataset.scope;page=0;configureFilters();render();});
 document.querySelectorAll('[data-catalog-target]').forEach(button=>button.onclick=()=>{const id=button.dataset.catalogTarget;onSelect(id);if(getRecord(id)?.position)dialog.close();});
 let timer;$('catalogQuery').oninput=e=>{clearTimeout(timer);timer=setTimeout(()=>{query=e.target.value;page=0;render();},220);};
 $('catalogKind').onchange=e=>{kind=e.target.value;page=0;render();};$('catalogParent').onchange=e=>{parent=e.target.value;page=0;render();};$('catalogPrev').onclick=()=>{page--;render();};$('catalogNext').onclick=()=>{page++;render();};
 configureFilters();$('catalogDataNote').textContent='按探索范围、类型与所属系统浏览完整天体目录。';
}
export function catalogSummary(){return {records:records.size,...catalogMeta.counts,extended:extensionMeta()};}
export function backdropRecords(){return [...records.values()].filter(r=>r.kind==='star'&&r.mag<6.5&&r.id.startsWith('hyg:'));}

export function catalogGlowVisible(camera,focus){for(const m of persistentModels.values())if(m.group.visible){if(m.kind==='blackhole'&&resolvedOnScreen(m.origin,m.record.horizonRadius*12,focus,camera))return true;for(const e of m.entries)if(e.star&&e.mesh.visible&&resolvedOnScreen(m.origin.clone().add(e.local),e.radius,focus,camera))return true;}return false;}
