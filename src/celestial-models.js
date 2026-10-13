import {createOrbitPath} from './orbit-path.js';
import {particleMaterial} from './particle-material.js';
import * as THREE from 'three';
import {kepler,TAU,DEG,skyPosition} from './astronomy.js';
import {orbitalOffset,stellarRadius,SOLAR_RADIUS_EARTH,orbitEpoch} from './celestial-physics.js';
import {AU_UNITS} from './physical-scale.js';

export const hash=s=>[...s].reduce((a,c)=>(Math.imul(a,31)+c.charCodeAt(0))>>>0,7);
const randomFor=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
export const globeGeometry=new THREE.SphereGeometry(1,64,40);
const vertex=`#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 p;varying vec3 n;
void main(){p=position;n=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
#include <logdepthbuf_vertex>
}`;
// Surface details are deterministic illustrations, never resolved observations.
export function surfaceMaterial(id,appearance='rock',color=null,emitter=false){
 const colors={rock:0xa39b89,dark:0x746d65,ice:0xc7d8dc,sulfur:0xdac45c,haze:0xd99943,gas:0xbba581};
 const m=new THREE.ShaderMaterial({uniforms:{time:{value:0},seed:{value:hash(id)%1000},base:{value:new THREE.Color(color??colors[appearance]??colors.rock)},gas:{value:['gas','haze'].includes(appearance)?1:0},ice:{value:appearance==='ice'?1:0},emitter:{value:emitter?1:0},light:{value:new THREE.Vector3(.5,.3,1).normalize()}},vertexShader:vertex,fragmentShader:`
 #include <common>
 #include <logdepthbuf_pars_fragment>
 uniform float time,seed,gas,ice,emitter;uniform vec3 base,light;varying vec3 p,n;
 float h(vec3 q){return fract(sin(dot(q,vec3(127.1,311.7,74.7))+seed)*43758.5453);}
 float noise(vec3 q){vec3 a=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(mix(h(a),h(a+vec3(1,0,0)),f.x),mix(h(a+vec3(0,1,0)),h(a+vec3(1,1,0)),f.x),f.y),mix(mix(h(a+vec3(0,0,1)),h(a+vec3(1,0,1)),f.x),mix(h(a+vec3(0,1,1)),h(a+vec3(1,1,1)),f.x),f.y),f.z);}
 void main(){
 #include <logdepthbuf_fragment>
 float terrain=.5*noise(p*7.)+.3*noise(p*19.)+.2*noise(p*53.);
 float craters=pow(max(0.,1.-abs(sin(p.x*49.+seed)*sin(p.z*53.+terrain*6.))),15.);
 float bands=.5+.5*sin(p.y*62.+noise(p*12.)*4.);
 float pattern=mix(terrain,bands,gas);
 vec3 albedo=base*(.65+pattern*.65)*(1.-(1.-gas)*craters*.16);
 float cracks=pow(1.-abs(sin((p.x+p.z)*45.+terrain*12.)),18.);albedo*=1.-ice*cracks*.25;
 float lit=.20+.8*pow(max(dot(normalize(n),normalize(light)),0.),.65);
 vec3 star=base*(.75+.35*noise(p*30.+vec3(time*.07))+.13*sin(time*1.3+terrain*18.));
 gl_FragColor=vec4(mix(albedo*lit,star,emitter),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});return m;
}
export function sphereModel(id,radius,appearance='rock',color=null,emitter=false){
 let geometry=globeGeometry;if(['phobos','deimos'].includes(id)){geometry=globeGeometry.clone();const p=geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),rough=1+.07*Math.sin(x*12+y*17+z*22+hash(id));p.setXYZ(i,x*rough*1.25,y*rough*.83,z*rough);}geometry.computeVertexNormals();}
 const mesh=new THREE.Mesh(geometry,surfaceMaterial(id,appearance,color,emitter));mesh.scale.setScalar(radius);mesh.userData.bodyId=id;return mesh;
}
export function orbitPoint(a,e,phase){const E=kepler(phase,e);return new THREE.Vector3(a*(Math.cos(E)-e),0,-a*Math.sqrt(1-e*e)*Math.sin(E));}
export function orbitLine(a,e=0){const p=[];for(let i=0;i<160;i++)p.push(orbitPoint(a,e,i/160*TAU));return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(p),new THREE.LineBasicMaterial({color:0x6c9fae,transparent:true,opacity:.33,depthWrite:false}));}
export function bodyMarker(id,color=0x91bac4){
 const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3()]),marker=new THREE.Points(geometry,particleMaterial(2.4));geometry.setAttribute('color',new THREE.Float32BufferAttribute(new THREE.Color(color).toArray(),3));geometry.setAttribute('strength',new THREE.Float32BufferAttribute([.35],1));marker.material.uniforms.alpha.value=.7;marker.userData.bodyId=id;return marker;
}
export function systemLayout(host,planets){
 return {starRadius:stellarRadius(host),unit:1,auScale:AU_UNITS};
}
export function exoplanetOffset(entry,days,anomaly=null){
 const r=entry.record;
 if(entry.previewOnly)return new THREE.Vector3(entry.previewDistance,0,0);
 const mean=anomaly??exoplanetMean(entry,days);
 return orbitalOffset(entry.a,{e:r.e??0,iDeg:r.incl??0,nodeDeg:0,periDeg:r.periDeg??0},mean).applyQuaternion(entry.referenceFrame);
}
export const exoplanetMean=(entry,days)=>entry.record.period>0&&Number.isFinite(entry.record.periastronJD)?(orbitEpoch()+days-entry.record.periastronJD)/entry.record.period*TAU:entry.phase+(entry.record.period>0?days/entry.record.period*TAU:0);
export function makeSystem(record,host,planets){
 const group=new THREE.Group(),entries=[],lines=[],star=host||record,layout=systemLayout(star,planets),starRadius=layout.starRadius;
 const temp=host?.teff||record.teff,color=temp?(temp<4000?0xff8049:temp>8000?0xb3d8ff:0xffdda0):record.ci>1?0xff9a58:record.ci<.2?0xc0dcff:0xffdea0;
 const globe=sphereModel(star.id,starRadius,'gas',color,true),starMarker=bodyMarker(star.id,color);group.add(globe,starMarker);entries.push({record:star,mesh:globe,marker:starMarker,radius:starRadius,sizeMeasured:star.radiusSolar>0,local:new THREE.Vector3(),star:true});
 let extent=starRadius*3;
 const referenceFrame=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),star.position.clone().normalize().lengthSq()>.5?star.position.clone().normalize():new THREE.Vector3(0,1,0));
 for(const r of planets){
  const radius=(r.radiusEarth||1)*layout.unit,previewOnly=!(r.a>0),mesh=sphereModel(r.id,radius,r.radiusEarth>=3?'gas':'rock'),marker=bodyMarker(r.id);
  const entry={record:r,mesh,marker,radius,sizeMeasured:r.radiusEarth>0,a:previewOnly?null:r.a*layout.auScale,e:r.e??0,phase:hash(r.id)%1000/1000*TAU,referenceFrame,previewOnly,previewDistance:starRadius*4,local:new THREE.Vector3(),star:false};
  r.orbitQuality=previewOnly?'半长轴未测定 · 仅外观预览':r.periastronJD!=null&&r.period>0?'近日点历元参与传播 · 升交点未知，方向示意':'轨道相位未测定 · 相位 / 升交点示意';
  if(!previewOnly&&entry.a*(1-entry.e)<=starRadius+radius)r.orbitQuality+='；目录参数 / 尺寸估计存在接触或冲突，未改动已知尺寸和轨道';
  if(r.e==null)r.orbitQuality+='；偏心率未知，圆轨道示意';if(r.radiusEarth==null)r.orbitQuality+='；尺寸未测定';
  if(!(r.radiusEarth>0))r.sizeEstimateNote='半径缺测：采用 1 个地球平均半径外观预览，不能作为实测大小';
  mesh.visible=marker.visible=!previewOnly||r.id===record.id;group.add(mesh,marker);
  if(!previewOnly){const line=createOrbitPath({curve:(mean,days)=>exoplanetOffset(entry,days,mean),mean:days=>exoplanetMean(entry,days),base:()=>star.position,container:()=>star.position,color:0x6c9fae,opacity:.27});group.add(line);lines.push(line);entry.line=line;extent=Math.max(extent,entry.a*(1+entry.e)+radius*2);}
  entries.push(entry);
 }
 return {group,entries,lines,extent,origin:star.position.clone(),hostId:star.id,kind:'system',auScale:layout.auScale};
}
export function updateSystem(model,days,time){
 for(const entry of model.entries){
  // Gaia may add a radius after a model was opened. Replace the estimate as
  // soon as that measured/model-derived catalogue value becomes available.
  if(entry.star){const radius=stellarRadius(entry.record);if(radius!==entry.radius){entry.radius=radius;entry.mesh.scale.setScalar(radius);model.extent=Math.max(model.extent,radius*3);}entry.sizeMeasured=entry.record.radiusSolar>0;}
  if(!entry.star){entry.local.copy(exoplanetOffset(entry,days));entry.mesh.position.copy(entry.local);entry.marker.position.copy(entry.local);}
  // Unknown spin remains fixed; animated stellar plasma is illustrative.
  if(entry.record.rotationDays>0)entry.mesh.rotation.y=days/entry.record.rotationDays*TAU;
  if(!entry.star)entry.mesh.material.uniforms.light.value.copy(entry.local).negate().applyQuaternion(entry.mesh.quaternion.clone().invert()).normalize();entry.mesh.material.uniforms.time.value=time;entry.record.renderPosition=model.origin.clone().add(entry.local);entry.record.modelRadius=entry.radius;entry.record.modelExtent=model.extent;entry.record.modelHostId=model.hostId;
 }
}
export function makeVolume(record,makeMaterial,mobile){
 const group=new THREE.Group(),random=randomFor(hash(record.id)),p=[],colors=[],strength=[],isCluster=record.kind==='cluster',spherical=isCluster?record.clusterType==='globular':!!(record.galaxyType&&record.galaxyType!=='G')||!record.morph||/^E|^S0/.test(record.morph);
 const radius=record.modelRadius,number=mobile?(isCluster?3500:9000):(isCluster?10000:26000),gaussian=()=>Math.sqrt(-2*Math.log(Math.max(1e-8,random())))*Math.cos(TAU*random());
 for(let i=0;i<number;i++){
  let x,y,z,core=i<number*.22;
  if(spherical){const v=new THREE.Vector3(gaussian(),gaussian(),gaussian()).normalize(),r=radius*Math.pow(random(),core?1.8:.55);x=v.x*r;y=v.y*r*(isCluster?1:.7);z=v.z*r;}
  else if(isCluster){x=gaussian()*radius*.35;y=gaussian()*radius*.3;z=gaussian()*radius*.35;}
  else if(core){x=gaussian()*radius*.12;y=gaussian()*radius*.07;z=gaussian()*radius*.12;}
  else{const r=radius*(.08+random()*.92),a=Math.floor(random()*3)*TAU/3+Math.log(r/radius)*1.7+gaussian()*.15;x=Math.cos(a)*r;y=gaussian()*radius*.024;z=Math.sin(a)*r;}
  p.push(x,y,z);const t=random();const c=new THREE.Color().setRGB(core||spherical?.95:.55+t*.35,core||spherical?.72:.65+t*.25,core||spherical?.48:1);colors.push(...c.toArray());strength.push(.25+random()*.9);
 }
 for(let i=number-1;i>0;i--){const j=Math.floor(random()*(i+1));for(let k=0;k<3;k++){[p[i*3+k],p[j*3+k]]=[p[j*3+k],p[i*3+k]];[colors[i*3+k],colors[j*3+k]]=[colors[j*3+k],colors[i*3+k]];}[strength[i],strength[j]]=[strength[j],strength[i]];}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('strength',new THREE.Float32BufferAttribute(strength,1));group.add(new THREE.Points(geometry,makeMaterial(3.3)));
 // Axis based on angular outline is only a viewing illustration; line-of-sight
 // thickness and individual stellar positions are not observationally resolved.
 if(!isCluster){const los=new THREE.Vector3(...skyPosition(record.ra,record.dec,1,1)).normalize(),north=new THREE.Vector3(...skyPosition(0,90,1,1));north.addScaledVector(los,-north.dot(los));if(north.lengthSq()<1e-8)north.set(...skyPosition(record.ra,record.dec-1,1,1)).addScaledVector(los,-1);north.normalize();const east=north.clone().cross(los).normalize(),pa=(record.angle??0)*DEG,x=north.multiplyScalar(Math.cos(pa)).addScaledVector(east,Math.sin(pa)),z=x.clone().cross(los).normalize();group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,los,z));const ratio=THREE.MathUtils.clamp((record.minor||record.major||1)/(record.major||1),.01,1);if(spherical)group.scale.z=ratio;else group.rotateX(Math.acos(ratio));}
 geometry.computeBoundingSphere();return {group,entries:[],lines:[],extent:Math.max(radius,geometry.boundingSphere.radius+geometry.boundingSphere.center.length()),origin:record.position.clone(),kind:'volume'};
}
export function makeConstellation(record){
 const group=new THREE.Group(),entries=[],lines=[],origin=record.position;
 for(const r of record.members){const local=r.position.clone().sub(origin),radius=stellarRadius(r),mesh=sphereModel(r.id,radius,'gas',0xbbd9ff,true);mesh.position.copy(local);const marker=bodyMarker(r.id);marker.position.copy(local);group.add(mesh,marker);entries.push({record:r,mesh,marker,local,radius,sizeMeasured:r.radiusSolar>0,star:true});}
 for(const path of record.paths){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.map(r=>r.position.clone().sub(origin))),new THREE.LineBasicMaterial({color:0x609bae,transparent:true,opacity:.35}));line.userData.patternGuide=true;group.add(line);lines.push(line);}
 return {group,entries,lines,extent:record.modelRadius,origin:origin.clone(),kind:'constellation'};
}
export function disposeModel(model){model.group.traverse(o=>{o.userData.disposed=true;if(o.geometry&&o.geometry!==globeGeometry)o.geometry.dispose();if(o.material){o.material.uniforms?.map?.value?.dispose();o.material.map?.dispose();o.material.dispose();}});model.group.removeFromParent();}
