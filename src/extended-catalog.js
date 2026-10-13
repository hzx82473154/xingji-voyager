import {SOLAR_RADIUS_EARTH} from './physical-scale.js';
import {batchYield} from './frame-budget.js';
import {LY_UNITS,AU_UNITS} from './physical-scale.js';
import {magnitudeStrength} from './display-photometry.js';
import * as THREE from 'three';
import {resourceBytes} from './resources.js';
import {skyPosition,DEG,TAU} from './astronomy.js';
import {DEFAULT_EPOCH_JD,naturalRadius,prepareSatellite,satelliteOffset,orbitalOffset,hasOrbitPhase,setOrbitEpoch,compressedAU} from './celestial-physics.js';

const extra=typeof __VOYAGER_EXTENDED__==='undefined'?{}:__VOYAGER_EXTENDED__;
const rotationData=typeof __VOYAGER_ROTATION__==='undefined'?'':__VOYAGER_ROTATION__;
const beltData=typeof __VOYAGER_BELTS__==='undefined'?'':__VOYAGER_BELTS__;
const rotationMeta=typeof __VOYAGER_ROTATION_META__==='undefined'?{}:__VOYAGER_ROTATION_META__;
const pcToLy=3.261563777, units=LY_UNITS;
let gaiaRows=null,gaiaView=null,loading=null,records,byHip,byGaia,gaiaAliases=new Map(),nativeLookup,frame=new THREE.Quaternion(),daysNow=0,epochJD=DEFAULT_EPOCH_JD;
const materialized=new Map(),solarRecords=new Set(),gaiaMergedIndices=new Set(),beltMergedIndices=new Set(),missionByDesignation=new Map();
const gaiaCount=()=>gaiaView?gaiaView.byteLength/68:gaiaRows?.length||0;
function gaiaValue(i,c){if(!gaiaView)return gaiaRows[i][c];const o=i*68;if(c===0)return gaiaView.getBigUint64(o,true).toString();if(c===1||c===2)return gaiaView.getFloat64(o+(c===1?8:16),true);if(c===13)return gaiaView.getUint32(o+64,true)||null;const v=gaiaView.getFloat32(o+24+(c-3)*4,true);return Number.isFinite(v)?v:null;}
const gaiaRow=i=>Array.from({length:14},(_,c)=>gaiaValue(i,c));
export const kindNames={star:'恒星 / STAR',planet:'系外行星 / EXOPLANET',galaxy:'星系 / GALAXY',cluster:'星团 / CLUSTER',nebula:'星云 / NEBULA',constellation:'星座 / CONSTELLATION',moon:'天然卫星 / MOON',asteroid:'小行星 / ASTEROID',comet:'彗星 / COMET',dwarf:'矮行星 / DWARF PLANET',tno:'海王星外天体 / TNO','black-hole':'黑洞 / BLACK HOLE',belt:'天体带 / BELT','solar-planet':'太阳系行星 / PLANET'};
export const normalize=s=>String(s??'').toLowerCase().replace(/[\s_'-]/g,'');
function cosmologicalDistance(z){const n=128,dz=z/n;let sum=0;for(let i=0;i<=n;i++){const f=1/Math.sqrt(.315*(1+i*dz)**3+.685);sum+=f*(i===0||i===n?1:i%2?4:2);}return 299792.458/67.4*sum*dz/3*3261563.777;}
function position(r){if(r.distanceLy>0&&Number.isFinite(r.ra)&&Number.isFinite(r.dec))r.position=new THREE.Vector3(...skyPosition(r.ra,r.dec,r.distanceLy,units));return r;}
function insert(r){if(r.solar)solarRecords.add(r);r.search=normalize([r.cn,r.name,r.aliases,r.host].join(' '));records.set(r.id,position(r));return r;}
export function initializeExtended(map){
 records=map;byHip=new Map();byGaia=new Map();
 for(const r of records.values()){
  const hip=/\bHIP (\d+)\b/.exec(r.aliases||'');if(hip)byHip.set(Number(hip[1]),r);
  if(/^\d+$/.test(r.gaiaId||''))byGaia.set(r.gaiaId,r.crossId?records.get(r.crossId)||r:r);
 }
 for(const b of extra.blackholes?.objects||[]){
  insert({...b,id:b.id,kind:'black-hole',cn:b.cn||b.name,ra:b.raDeg,dec:b.decDeg,distanceLy:b.distancePc>0?b.distancePc*pcToLy:(b.redshift>0?cosmologicalDistance(b.redshift):null),rotationDays:null,source:typeof b.source==='string'?b.source:JSON.stringify(b.source),distanceEstimated:true});
 }
 for(const n of extra.deepSky?.objects||[])if(n.name!=='NGC5139')insert({...n,id:'ngc:'+n.name,cn:n.cn||n.name,rotationDays:null});
 for(const b of extra.surfaces?.bodies||[]){
  // Existing solar bodies keep their established renderer and navigation IDs.
  if(b.native)continue;
  const entry=insert({...b,id:b.id.startsWith('surface:')?b.id:'surface:'+b.id,bodyKey:b.key||b.id,kind:b.kind==='planet'?'solar-planet':b.kind==='trans-neptunian'?'tno':b.kind,cn:b.cn||b.en,name:b.en,solar:true,parent:b.parent||'sun',rotationDays:b.rotationDays??null,period:b.orbitalPeriodDays??null,source:b.sources?.map(s=>s.credit+' · '+s.url).join('；')||'来源见表面目录',position:new THREE.Vector3()});
  for(const source of b.sources||[]){if(source.url?.includes('sbdb.api?')){const designation=new URL(source.url).searchParams.get('sstr');if(designation)missionByDesignation.set(designation,entry);}}
 }
 for(const b of [{id:'belt:main',cn:'主小行星带',name:'Main Asteroid Belt',innerAU:2.1,outerAU:3.3},{id:'belt:kuiper',cn:'柯伊伯带',name:'Kuiper Belt',innerAU:30,outerAU:55}])insert({...b,kind:'belt',solar:true,position:new THREE.Vector3(),modelRadius:b.outerAU*AU_UNITS,source:'JPL SBDB 已收录成员的真实轨道位置；屏幕点为增强可见度的定位标记'});
}
export function configureSolar(data,bodies,solarFrame,epoch=DEFAULT_EPOCH_JD){
 epochJD=epoch;setOrbitEpoch(epoch);
 frame.copy(solarFrame);nativeLookup=bodies;
 for(const d of data.filter(d=>!['iss','satellite','solar','galaxy'].includes(d.id))){
  const surface=(extra.surfaces?.bodies||[]).find(b=>b.id===d.id);
  insert({id:'solarbody:'+d.id,nativeId:d.id,kind:d.parent?'moon':d.id==='sun'?'star':'solar-planet',cn:d.cn,name:d.en,modelRadius:bodies.get(d.id)?.r,radiusKm:surface?.radiusKm,solar:true,parent:d.parent||'sun',source:surface?.sources?.map(s=>s.credit).join('；')||'NASA / JPL',position:bodies.get(d.id)?.position||new THREE.Vector3()});
 }
 for(const r of solarRecords)if(!r.nativeId&&r.kind!=='belt'){
  r.r=naturalRadius(r);
  if(r.parent&&r.parent!=='sun'){const p=bodies.get(r.parent)||records.get(r.parent.startsWith('surface:')?r.parent:'surface:'+r.parent);if(p)prepareSatellite(r,p,frame);}
 }
 updateSolarRecords(0);
}
export function surfaceRecord(id){return (extra.surfaces?.bodies||[]).find(b=>b.id===id||b.key===id);}
export function surfaces(){return extra.surfaces?.bodies||[];}
export const extensionMeta=()=>({rotation:rotationMeta,blackholes:extra.blackholes?.counts||{},belts:extra.belts?.counts||{},surfaces:extra.surfaces?.bodies?.length||0,gaiaLoaded:!!gaiaRows||!!gaiaView,gaiaMaterialized:materialized.size,gaiaMerged:gaiaAliases.size,beltMerged:beltMergedIndices.size});
export async function loadRotationCatalog(){
 if(loading)return loading;if(gaiaRows||gaiaView)return gaiaCount();if(!rotationData)return 0;
 loading=(async()=>{
  const bytes=await resourceBytes(rotationData);
  const buffer=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  if(rotationMeta.binary){gaiaView=new DataView(buffer);if(buffer.byteLength%68)throw new Error('Invalid Gaia stride');}
  else {const decoded=JSON.parse(new TextDecoder().decode(buffer));gaiaRows=Array.isArray(decoded)?decoded:decoded.stars;}
  const nativeGaia=new Map([...byGaia].map(([id,r])=>[BigInt(id),r]));
  const yieldBatch=batchYield();
  for(let i=0;i<gaiaCount();i++){
   if(i%2048===0)await yieldBatch();
   const hip=gaiaValue(i,13),match=(gaiaView?nativeGaia.get(gaiaView.getBigUint64(i*68,true)):byGaia.get(gaiaValue(i,0)))||byHip.get(hip);
   if(match){const row=gaiaRow(i);gaiaMergedIndices.add(i);gaiaAliases.set(row[0],match.id);match.gaiaId=row[0];match.rotationDays=row[9];match.rotationErrorDays=row[10];match.rotationSource='Gaia DR3 · 光度调制推断';match.radiusSolar??=row[7];match.teff??=row[8];match.aliases=(match.aliases||'')+' / Gaia DR3 '+row[0];match.search+=' '+normalize('Gaia DR3 '+row[0]);}
  }
  return gaiaCount();
 })();try{return await loading;}catch(e){loading=null;throw e;}
}
function gaiaRecord(row){
 const alias=gaiaAliases.get(row[0]);if(alias)return records.get(alias);
 const id='gaia:'+row[0];if(materialized.has(id))return materialized.get(id);
 const r=position({id,kind:'star',name:'Gaia DR3 '+row[0],cn:'Gaia DR3 '+row[0],gaiaId:row[0],ra:row[1],dec:row[2],parallax:row[3],parallaxError:row[4],distanceLy:row[5]>0?row[5]*pcToLy:null,distanceEstimated:true,distanceMethod:row[6]===1?'GSP-Phot 模型估算':row[6]===2?'视差倒数（S/N ≥ 10）':'缺失',radiusSolar:row[7],teff:row[8],rotationDays:row[9],rotationErrorDays:row[10],mag:row[11],ci:row[12]==null?null:row[12]*.55,aliases:row[13]?'HIP '+row[13]:'',source:'ESA Gaia DR3 · J2016.0 · 自转：光度调制推断；半径 / 温度：GSP-Phot 模型估算'});
 materialized.set(id,r);return r;
}
let beltRows=extra.belts?.rows||extra.belts?.objects||[],beltsLoading;
export async function loadBelts(){
 if(beltRows.length||!beltData)return beltRows.length;if(beltsLoading)return beltsLoading;
 beltsLoading=(async()=>{const bytes=await resourceBytes(beltData);const decoded=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());beltRows=decoded.rows;extra.belts=decoded;const di=decoded.columns.indexOf('designation');for(let i=0;i<beltRows.length;i++)if(missionByDesignation.has(String(beltRows[i][di])))beltMergedIndices.add(i);return beltRows.length;})();try{return await beltsLoading;}catch(e){beltsLoading=null;throw e;}
}
function beltRecord(row){
 if(Array.isArray(row)){const b={};extra.belts.columns.forEach((c,i)=>b[c]=row[i]);row=b;}
 const mission=missionByDesignation.get(String(row.designation));if(mission){mission.aliases=(mission.aliases||'').includes(row.name)?mission.aliases:(mission.aliases||'')+' / '+row.name;mission.beltClass=row.parent;return mission;}
 const key=String(row.id||row.pdes||row.designation),id='sbdb:'+key;
 if(materialized.has(id))return materialized.get(id);
 const r={...row,id,name:row.name||row.fullname||key,cn:row.cn||row.name||row.fullname||key,kind:row.kind==='trans-neptunian'?'tno':row.kind||'asteroid',beltClass:row.parent,solar:true,parent:'sun',rotationDays:row.rotationPeriodHours>0?row.rotationPeriodHours/24:null,period:row.orbitalPeriodDays??null,source:'JPL SBDB · 测量 / 估算物理参数；简化二体轨道，表面示意',position:new THREE.Vector3()};
 r.orbitalElements=row.orbitalElements||{aAU:row.aAU,e:row.e,iDeg:row.iDeg,nodeDeg:row.nodeDeg,periDeg:row.periDeg,meanAnomalyDeg:row.meanAnomalyDeg,epochJD:row.epochJD};
 materialized.set(id,r);updateSolarPosition(r,daysNow);return r;
}
export function extendedRecord(id){
 if(!id)return null;
 if(materialized.has(id))return materialized.get(id);
 if(id.startsWith('gaia:')){const wanted=BigInt(id.slice(5));for(let i=0;i<gaiaCount();i++)if(gaiaView?gaiaView.getBigUint64(i*68,true)===wanted:gaiaValue(i,0)===id.slice(5))return gaiaRecord(gaiaRow(i));return null;}
 if(id.startsWith('sbdb:')){const idIndex=extra.belts?.columns?.indexOf('id')??-1;const pdesIndex=extra.belts?.columns?.indexOf('pdes')??-1;const row=beltRows.find(r=>String(Array.isArray(r)?r[idIndex>=0?idIndex:pdesIndex]:r.id||r.pdes||r.designation)===id.slice(5));return row?beltRecord(row):null;}
 return null;
}
export function searchExtended(kind,query,offset=0,limit=24){
 const q=normalize(query),items=[];let count=0;
 const take=(dataset,index)=>{if(count>=offset&&items.length<limit)items.push({dataset,index});count++;};
 if((gaiaRows||gaiaView)&&(kind==='all'||kind==='star'))for(let i=0;i<gaiaCount();i++){
  if(gaiaMergedIndices.has(i))continue;
  if(!q||normalize('GaiaDR3'+gaiaValue(i,0)+(gaiaValue(i,13)?'HIP'+gaiaValue(i,13):'')).includes(q))take('gaia',i);
 }
 if(kind==='all'||kind==='solar-small'||['asteroid','tno','dwarf','comet'].includes(kind)){
  const cols=extra.belts.columns||[],ni=cols.indexOf('name'),fi=cols.indexOf('fullname'),ki=cols.indexOf('kind');
  for(let i=0;i<beltRows.length;i++){if(beltMergedIndices.has(i))continue;const row=beltRows[i],name=Array.isArray(row)?row[ni]||row[fi]:row.name||row.fullname;let k=Array.isArray(row)?row[ki]||'asteroid':row.kind||'asteroid';if(k==='trans-neptunian')k='tno';if((kind==='all'||kind==='solar-small'||kind===k)&&(!q||normalize(name).includes(q)))take('belt',i);}
 }
 return {count,items};
}
export function resolveExtended(token){return token.dataset==='gaia'?gaiaRecord(gaiaRow(token.index)):beltRecord(beltRows[token.index]);}
export function extendedStarPoints(mobile){
 const indices=[];for(let i=0;i<gaiaCount();i++)if(gaiaValue(i,5)>0&&!gaiaMergedIndices.has(i))indices.push(i);
 indices.sort((a,b)=>(gaiaValue(a,11)??99)-(gaiaValue(b,11)??99));return indices.slice(0,mobile?12000:48000).map(i=>gaiaRecord(gaiaRow(i)));
}
export function beltMembers(mobile){const parentIndex=extra.belts.columns?.indexOf('parent'),groups=new Map();for(const row of beltRows){const key=Array.isArray(row)?row[parentIndex]:row.parent;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}const out=[];for(const rows of groups.values()){const cap=mobile?1250:6000,stride=Math.max(1,Math.ceil(rows.length/cap));out.push(...rows.filter((r,i)=>i%stride===0).map(beltRecord));}return out;}
export {compressedAU};
export function elementPosition(el,days=0,period=null,anomaly=null){
 if(!(el?.aAU>0)||!hasOrbitPhase(el))return null;
 const mean=anomaly??el.meanAnomalyDeg*DEG+(period>0?(epochJD+days-el.epochJD)/period*TAU:0);
 const p=orbitalOffset(el.aAU,el,mean),radius=p.length();
 return p.multiplyScalar(compressedAU(radius)/radius).applyQuaternion(frame);
}
function updateSolarPosition(r,days){
 if(!r.solar||r.nativeId||r.kind==='belt')return;
 let p=null;
 if(r.parent&&r.parent!=='sun'){
  const parent=records.get(r.parent.startsWith('surface:')?r.parent:'surface:'+r.parent);
  if(parent)updateSolarPosition(parent,days);
  const centre=nativeLookup?.get(r.parent)?.position||parent?.position;
  const offset=satelliteOffset(r,days,epochJD);
  if(centre&&offset)p=offset.add(centre);
 }else p=elementPosition(r.orbitalElements,days,r.period);
 if(p){r.position??=new THREE.Vector3();r.position.copy(p);}else delete r.position;
}
export function updateSolarRecords(days,selected=null){daysNow=days;for(const r of solarRecords)updateSolarPosition(r,days);if(selected)updateSolarPosition(selected,days);}
export function extraInfo(r,fmt){
 if(r.nativeId)return null;
 if(r.kind==='black-hole'){
  const status=r.status==='confirmed'?'已确认':r.massUpperLimitSolar?'仅有质量上限':'候选';
  return {cn:r.cn,en:r.name,type:({supermassive:'超大质量',intermediate:'中等质量',stellar:'恒星质量'}[r.blackHoleClass]||'目录')+'黑洞 · '+status,desc:'可环绕的三维结构示意。黑洞本身不发光；中央暗球表示视界尺度，明亮环表示可能的吸积流，伴星仅在恒星双星类型显示。已知质量换算视界尺度；吸积流的相对范围、动态、朝向、颜色与光线弯曲为近似，不代表实测吸积盘或自旋。候选对象不视为已确认黑洞。',facts:[['分类证据',status],['距离',r.distanceLy?fmt(r.distanceLy)+(r.redshift?' 光年（ΛCDM 共动估算）':' 光年（目录估计）'):'未收录可靠距离'],['质量',r.massSolar>0?fmt(r.massSolar)+' M☉':r.massUpperLimitSolar>0?'< '+fmt(r.massUpperLimitSolar)+' M☉':'未收录 / 仅范围'],['史瓦西半径',r.massSolar>0?fmt(2.95325*r.massSolar)+' km（非旋转模型）':'质量未定'],['双星公转',r.orbitalPeriodDays>0?fmt(r.orbitalPeriodDays)+' 日':'未收录'],['黑洞自旋','未据目录推导自转周期']],source:r.source||'来源见黑洞目录'};
 }
 if(r.solar){const surface=r.coverage;return {cn:r.cn,en:r.name,type:kindNames[r.kind]||r.kind,desc:r.kind==='belt'?'成员来自 JPL 目录，按已知轨道作两体近似定位，随时间更新。远景分级抽样显示，可点击成员或检索完整记录；不是精确星历。柯伊伯带展示层选取半长轴 30–55 AU 的已收录成员，散射及更远海王星外天体仍可检索，此筛选不是严格动力学分类。实际天体尺寸远小于轨道间距，屏幕小点是定位标记；并非按真实亮度或尺寸显示。':'可独立靠近并环绕观察。'+(surface?.description||'缺少解析表面图，使用明确标记的三维外观示意。')+' 已知尺寸与所有轨道距离使用统一物理比例，1 单位为 6,371 km。JPL 平均要素采用固定参考面二体近似，未知轴向或部分相位明确采用展示约定，不能用于星历。',facts:[['所属系统',r.parent==='sun'?'太阳系':r.parent],['直径',r.diameterKm>0?fmt(r.diameterKm)+' km':'未收录'],['自转周期',r.rotationDays>0?fmt(r.rotationDays)+' 日':'未收录'],['公转周期',r.period>0?fmt(r.period)+' 日':'未收录'],['表面证据',surface?.type||'示意'],['形状证据',r.shapeType||'示意'],['轨道定位',r.orbitQuality||(r.position?'目录历元二体近似':'缺少要素 · 仅资料')]],source:r.source};}
 if(r.kind==='nebula'||r.kind==='cluster')return {cn:r.cn,en:r.name,type:kindNames[r.kind],desc:'保留 OpenNGC 目录的方向、角尺寸与分类。缺少可靠距离时仅显示资料，不能把天球投影虚构成三维测量。可定位目标的内部结构也会标为示意。',facts:[['赤经 / 赤纬',fmt(r.ra)+'° / '+fmt(r.dec)+'°'],['角直径',r.major?fmt(r.major)+'′':'未收录'],['距离',r.distanceLy?fmt(r.distanceLy)+' 光年':'未收录可靠距离']],source:r.source};
 return null;
}

export function updateSolarPoint(record,days){updateSolarPosition(record,days);return record.position;}

// Full positioned Gaia layer: compact typed vertices; record objects are only
// materialized when nearby or picked. No bright-star-only truncation on desktop.
function* spatialCells(mobile=false){
 const cells=new Map(),indices=[];
 for(let i=0;i<gaiaCount();i++){if(gaiaValue(i,5)>0&&!gaiaMergedIndices.has(i))indices.push(i);if(i%4096===0)yield null;}
 if(mobile)indices.sort((a,b)=>(gaiaValue(a,11)??99)-(gaiaValue(b,11)??99));
 let number=0;
 for(const i of mobile?indices.slice(0,24000):indices){
  const pc=gaiaValue(i,5),distance=pc*pcToLy,p=skyPosition(gaiaValue(i,1),gaiaValue(i,2),distance,units),key=[Math.floor(Math.log2(Math.max(16,distance))),...p.map(v=>v>0?1:0)].join(',');
  if(!cells.has(key))cells.set(key,{centre:p,indices:[],positions:[],colors:[],strength:[],detailReach:9000});
  const c=cells.get(key),ci=(gaiaValue(i,12)??1.18)*.55;
  c.indices.push(i);c.positions.push(p[0]-c.centre[0],p[1]-c.centre[1],p[2]-c.centre[2]);c.colors.push(Math.min(1,.75+ci*.18),Math.max(.45,.88-Math.abs(ci-.35)*.18),Math.max(.35,1-ci*.33));c.strength.push(magnitudeStrength(gaiaValue(i,11)));
  c.detailReach=Math.max(c.detailReach,(gaiaValue(i,7)||1)*SOLAR_RADIUS_EARTH*180);
  if(c.indices.length===4096){yield c;cells.delete(key);}
  if(++number%2048===0)yield null;
 }
 yield* cells.values();
}
export function gaiaSpatialChunks(mobile=false){return [...spatialCells(mobile)].filter(Boolean);}
export async function loadGaiaSpatialChunks(mobile=false){const cells=[],yieldBatch=batchYield();for(const cell of spatialCells(mobile)){if(cell)cells.push(cell);await yieldBatch();}return cells;}
export const gaiaRecordAt=i=>gaiaRecord(gaiaRow(i));
