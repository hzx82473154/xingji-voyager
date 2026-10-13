import * as THREE from 'three';
import {LineSegments2} from 'three/addons/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/addons/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {BoundaryDrape} from './boundary-drape.js';

const DEG=Math.PI/180;
export const countryMeta=__VOYAGER_COUNTRIES_META__;
export async function loadCountries(){
 const bytes=Uint8Array.from(atob(__VOYAGER_COUNTRIES__),c=>c.charCodeAt(0));
 return createCountryIndex(JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()));
}
export function localDirection(lat,lon){
 return new THREE.Vector3(Math.cos(lon*DEG)*Math.cos(lat*DEG),Math.sin(lat*DEG),-Math.sin(lon*DEG)*Math.cos(lat*DEG));
}
export function geographicPoint(globe,worldPoint){
 const p=globe.worldToLocal(worldPoint.clone()).normalize();
 return {lat:Math.asin(THREE.MathUtils.clamp(p.y,-1,1))/DEG,lon:Math.atan2(-p.z,p.x)/DEG};
}
function prepareRing(ring){
 const points=[];let last=ring[0][0];
 for(const [lon,lat] of ring){let x=lon;while(x-last>180)x-=360;while(x-last< -180)x+=360;points.push([x,lat]);last=x;}
 const prepared={points,minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))};
 if(points.length>512){
  prepared.rows=new Map();
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+points.length-1)%points.length];for(let y=Math.floor(Math.min(a[1],b[1]));y<=Math.floor(Math.max(a[1],b[1]));y++){let row=prepared.rows.get(y);if(!row)prepared.rows.set(y,row=[]);row.push(i);}}
 }
 return prepared;
}
function insideRing(r,lon,lat){
 const x=lon+360*Math.round(((r.minX+r.maxX)/2-lon)/360);
 if(x<r.minX||x>r.maxX||lat<r.minY||lat>r.maxY)return false;
 let inside=false;const p=r.points;
 const candidates=r.rows?r.rows.get(Math.floor(lat))||[]:p.keys();
 for(const i of candidates){const j=(i+p.length-1)%p.length;
  const [xi,yi]=p[i],[xj,yj]=p[j];
  const cross=(x-xi)*(yj-yi)-(lat-yi)*(xj-xi);
  if(Math.abs(cross)<1e-9&&x>=Math.min(xi,xj)&&x<=Math.max(xi,xj)&&lat>=Math.min(yi,yj)&&lat<=Math.max(yi,yj))return true;
  if((yi>lat)!==(yj>lat)&&x<(xj-xi)*(lat-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}
export function createCountryIndex(records){
 // Keep region polygons for precise picking, with an explicit Chinese parent.
 // The parent outline includes the regional islands as well as the mainland.
 const chinaRegions={TWN:['中国台湾','Taiwan, China'],HKG:['中国香港','Hong Kong, China'],MAC:['中国澳门','Macao, China']};
 records=records.map(record=>chinaRegions[record.id]?{...record,cn:chinaRegions[record.id][0],en:chinaRegions[record.id][1],parentId:'CHN',geographicRegion:record.region,region:chinaRegions[record.id][0]}:{...record});
 const china=records.find(record=>record.id==='CHN');if(china)china.polygons=[...china.polygons,...records.filter(record=>record.parentId==='CHN').flatMap(record=>record.polygons)];
 const area=r=>Math.abs(r.points.reduce((sum,p,i)=>{const q=r.points[(i+1)%r.points.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
 const shapes=records.map(country=>({country,polygons:country.polygons.map(poly=>poly.map(prepareRing))}));
 for(const shape of shapes)shape.area=shape.polygons.reduce((sum,p)=>sum+area(p[0]),0);
 shapes.sort((a,b)=>a.area-b.area);
 const contains=(shape,lon,lat)=>shape.polygons.some(poly=>insideRing(poly[0],lon,lat)&&!poly.slice(1).some(r=>insideRing(r,lon,lat)));
 const shapeById=new Map(shapes.map(s=>[s.country.id,s]));
 const byId=new Map(records.map(r=>[r.id,r]));
 return {records,byId,anchor(country){
  const shape=shapeById.get(country.id),[lon,lat]=country.label;
  if(contains(shape,lon,lat))return {lon,lat};
  // Source label positions may lie in the sea between islands. Aim at land.
  const polys=[...shape.polygons].sort((a,b)=>area(b[0])-area(a[0]));
  for(const poly of polys){const r=poly[0];for(const fraction of [.5,.25,.75,.1,.9]){
   const y=r.minY+(r.maxY-r.minY)*fraction,xs=[];
   for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i];if((a[1]>y)!==(b[1]>y))xs.push(a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]));}
   xs.sort((a,b)=>a-b);const candidates=[];for(let i=1;i<xs.length;i+=2)candidates.push({x:(xs[i-1]+xs[i])/2,width:xs[i]-xs[i-1]});candidates.sort((a,b)=>b.width-a.width);
   for(const c of candidates){const x=((c.x+180)%360+360)%360-180;if(contains(shape,x,y))return {lon:x,lat:y};}
  }}
  return {lon,lat};
 },at(lon,lat){
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||lat< -90||lat>90)return null;
  // Small enclosed regions take priority over their containing outline.
  for(const shape of shapes)if(contains(shape,lon,lat))return shape.country;
  return null;
 }};
}
export function borderPositions(records,radius=1){
 const positions=[],edges=new Map(),continents=records.length>1&&records.every(r=>r.kind==='continent')&&!records.every(r=>r.mergedOutline);
 if(continents){for(const country of records)for(const poly of country.polygons)for(const ring of poly)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],key=[a.map(x=>x.toFixed(5)).join(','),b.map(x=>x.toFixed(5)).join(',')].sort().join('|');const e=edges.get(key);if(e)e.count++;else edges.set(key,{a,b,count:1});}}
 for(const country of records)for(const poly of country.polygons)for(const ring of poly)for(let i=1;i<ring.length;i++){
  if(continents){const key=[ring[i-1].map(x=>x.toFixed(5)).join(','),ring[i].map(x=>x.toFixed(5)).join(',')].sort().join('|');if(edges.get(key).count>1)continue;}
  const a=localDirection(ring[i-1][1],ring[i-1][0]),b=localDirection(ring[i][1],ring[i][0]);
  const angle=a.angleTo(b),steps=Math.max(1,Math.ceil(angle/(.12*DEG)));
  let from=a;for(let k=1;k<=steps;k++){
   const t=k/steps,to=angle<1e-8?a.clone():a.clone().multiplyScalar(Math.sin((1-t)*angle)).addScaledVector(b,Math.sin(t*angle)).divideScalar(Math.sin(angle)).normalize();
   positions.push(...from.clone().multiplyScalar(radius).toArray(),...to.clone().multiplyScalar(radius).toArray());from=to;
  }
 }
 return positions;
}
export class CountryLayer{
 constructor(globe,index){
  this.globe=globe;this.index=index;this.root=new THREE.Group();this.root.name='earth-country-boundaries';this.root.visible=false;globe.add(this.root);
  this.drape=new BoundaryDrape(globe);this.selectionPositions=new WeakMap();
  this.selected=null;this.borders=null;this.material=this.drape.attach(new LineMaterial({color:0xffd392,linewidth:2,transparent:true,opacity:1,depthWrite:false,toneMapped:false}),true);
 }
 prepare(){this.setVisible(true);this.root.visible=false;for(const country of this.index.records)this.selectionPositions.set(country,borderPositions([country]));}
 setVisible(visible){
  if(visible&&!this.borders){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(borderPositions(this.index.records),3));this.borders=new THREE.LineSegments(g,this.drape.attach(new THREE.LineBasicMaterial({color:0x8ccecb,transparent:true,opacity:.42,depthWrite:false,toneMapped:false})));this.borders.renderOrder=20;this.root.add(this.borders);}
  this.root.visible=visible;
 }
 select(country){
  if(this.selected){this.root.remove(this.selected);this.selected.geometry.dispose();this.selected=null;}
  if(!country)return;
  let positions=this.selectionPositions.get(country);if(!positions){positions=borderPositions([country]);this.selectionPositions.set(country,positions);}
  const geometry=new LineSegmentsGeometry().setPositions(positions);
  this.selected=new LineSegments2(geometry,this.material);this.selected.renderOrder=21;this.root.add(this.selected);
 }
 syncSurface(surface){return this.drape.sync(surface);}
 resize(w,h){this.material.resolution.set(w,h);}
}
const regions={'Eastern Asia':'东亚','Southern Asia':'南亚','South-Eastern Asia':'东南亚','Western Asia':'西亚','Central Asia':'中亚','Northern Europe':'北欧','Southern Europe':'南欧','Western Europe':'西欧','Eastern Europe':'东欧','Northern America':'北美','Central America':'中美洲','Caribbean':'加勒比地区','South America':'南美洲','Northern Africa':'北非','Southern Africa':'南部非洲','Eastern Africa':'东非','Western Africa':'西非','Middle Africa':'中部非洲','Australia and New Zealand':'澳大利亚与新西兰地区','Melanesia':'美拉尼西亚','Micronesia':'密克罗尼西亚','Polynesia':'波利尼西亚','Antarctica':'南极地区','Seven seas (open ocean)':'远洋岛屿'};
const continents={Asia:'亚洲',Europe:'欧洲',Africa:'非洲','North America':'北美洲','South America':'南美洲',Oceania:'大洋洲',Antarctica:'南极洲','Seven seas (open ocean)':'远洋岛屿'};
export function countryInfo(country,point){
 const region=regions[country.region]||country.region,continent=continents[country.continent]||country.continent;
 const latitude=country.polygons.flatMap(poly=>poly[0].map(p=>p[1])),min=Math.min(...latitude),max=Math.max(...latitude);
 const north=max>0,south=min<0,hemisphere=north&&south?'跨越赤道':north?'北半球':'南半球';
 const regionDescriptions={TWN:'中国台湾东面是太平洋，西面隔台湾海峡与福建相望。岛上山脉与西侧平原形成不同地貌，可从当前位置继续查看日月潭等精选地点。',HKG:'中国香港位于珠江口东侧，香港岛、九龙和新界共同构成其地域。海湾与山地之间的城市景观，可在地球总览中连贯查看。',MAC:'中国澳门在珠江口西侧，半岛、岛屿及填海土地构成其地域。历史街区和滨海城区是认识这里的主要景观线索。'};
 const parts=country.polygons.length,desc=regionDescriptions[country.id]||(country.id==='CHN'?'中国处在亚洲东部，东侧面向太平洋。西部高原和山地与东部平原、海岸形成不同地貌；当前展示包含大陆及台湾等地区，可继续探索自然和历史地标。':`${country.cn}位于${region}，属于${continent}的地理分区。其地图范围${hemisphere==='跨越赤道'?'跨越赤道':`位于${hemisphere}`}，从约${Math.abs(min).toFixed(1)}°${min<0?'S':'N'}延伸到${Math.abs(max).toFixed(1)}°${max<0?'S':'N'}。${parts>1?'轮廓包含多块陆地或岛屿，可旋转地球查看不同部分。':'轮廓展示这片陆地的边界与海岸形状。'}`);
 const coordinate=point||{lon:country.label[0],lat:country.label[1]};
 return {cn:country.cn,en:country.en,desc,region,continent,facts:[...(country.parentId?[['所属国家','中国']]:[]),['地理分区',region],['所在大洲',continent],['选中位置',`${Math.abs(coordinate.lat).toFixed(2)}°${coordinate.lat<0?'S':'N'} · ${Math.abs(coordinate.lon).toFixed(2)}°${coordinate.lon<0?'W':'E'}`]]};
}
