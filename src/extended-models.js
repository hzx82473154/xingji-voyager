import {createOrbitPath} from './orbit-path.js';
import {beltStrength} from './display-photometry.js';
import * as THREE from 'three';
import {createBlackHoleLens} from './black-hole-lens.js';
import {resourceUrl} from './resources.js';
import {sphereModel,globeGeometry,hash} from './celestial-models.js';
import {TAU} from './astronomy.js';
import {naturalRadius,satelliteOffset,orbitalOffset,DEFAULT_EPOCH_JD,orbitEpoch,SOLAR_RADIUS_EARTH} from './celestial-physics.js';
import {AU_UNITS,EARTH_RADIUS_KM} from './physical-scale.js';
import {elementPosition,updateSolarPoint} from './extended-catalog.js';
const shapes=typeof __VOYAGER_SHAPES__==='undefined'?{}:__VOYAGER_SHAPES__;
const assets=typeof __VOYAGER_ASSETS__==='undefined'?{}:__VOYAGER_ASSETS__;

export function observedGeometry(record){
 const shape=shapes[record.bodyKey||record.id];if(!shape)return null;
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(shape.positions,3));if(shape.indices)g.setIndex(shape.indices);if(shape.uvs)g.setAttribute('uv',new THREE.Float32BufferAttribute(shape.uvs,2));else {const uv=[];for(let i=0;i<shape.positions.length;i+=3){const [x,y,z]=shape.positions.slice(i,i+3),r=Math.hypot(x,y,z);uv.push((Math.atan2(z,-x)/TAU+1)%1,.5+Math.asin(y/r)/Math.PI);}g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));}g.computeVertexNormals();g.computeBoundingSphere();return g;
}
export function attachObservedSurface(mesh,record,{mobile=false,maxTextureSize=4096}={}){
 const key='surface_'+(record.bodyKey||record.id),url=assets[key];if(!url)return Promise.resolve(false);
 // A cancelled/switch-away request cannot modify a disposed model.
 return resourceUrl(url).then(source=>new THREE.TextureLoader().loadAsync(source)).then(texture=>{
  if(mesh.userData.disposed){texture.dispose();return false;}
  const cap=Math.min(maxTextureSize,mobile?2048:4096),ratio=Math.min(1,cap/texture.image.width);
  if(ratio<1){const c=document.createElement('canvas');c.width=Math.round(texture.image.width*ratio);c.height=Math.round(texture.image.height*ratio);c.getContext('2d').drawImage(texture.image,0,0,c.width,c.height);texture.image=c;}
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.needsUpdate=true;
  const old=mesh.material;
  // A shader-local light keeps near views legible at both stellar and solar scales.
  const material=new THREE.ShaderMaterial({uniforms:{map:{value:texture},light:{value:new THREE.Vector3(.5,.3,1)},time:{value:0}},vertexShader:`#include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 tex;varying vec3 n;void main(){tex=uv;n=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
  #include <logdepthbuf_vertex>
  }`,fragmentShader:`#include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D map;uniform vec3 light;varying vec2 tex;varying vec3 n;void main(){
  #include <logdepthbuf_fragment>
  vec3 c=texture2D(map,tex).rgb;gl_FragColor=vec4(c*(.2+.8*max(dot(normalize(n),normalize(light)),0.)),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`});
  mesh.material=material;old.dispose();mesh.userData.observedSurface=true;return true;
 }).catch(()=>false);
}
export function makeSmallBody(record,mobile=false){
 const group=new THREE.Group(),radius=naturalRadius(record)??.01;
 if(naturalRadius(record)==null)record.sizeEstimateNote='直径缺测：采用 127.42 km 外观预览，不能作为实测大小';
 const mesh=sphereModel(record.id,radius,record.appearance||'rock'),geometry=observedGeometry(record);
 if(geometry){mesh.geometry=geometry;mesh.material=new THREE.MeshStandardMaterial({color:0xb4afa5,roughness:1});}
 group.add(mesh);attachObservedSurface(mesh,record,{mobile});
 const lines=[];
 if(record.orbitalElements?.aAU||record.orbit>0){
  const moon=record.orbit>0,el=record.orbitalElements||record.displayElements,period=moon?record.periodDays:record.period;
  if(el){const curve=(mean,days)=>moon?satelliteOffset(record,days,orbitEpoch(),mean):elementPosition(el,days,period,mean);
   if(curve(0,0)){const line=createOrbitPath({curve,mean:days=>el.meanAnomalyDeg*Math.PI/180+(period>0?(orbitEpoch()+days-el.epochJD)/period*TAU:0),base:days=>moon?record.position.clone().sub(satelliteOffset(record,days)):new THREE.Vector3(),container:()=>record.position,color:0x537c88,opacity:.25});group.add(line);lines.push(line);}
  }
 }

 record.modelRadius=radius*(geometry?.boundingSphere?.radius||1);record.modelExtent=record.modelRadius*2;
 return {group,entries:[{record,mesh,radius,local:new THREE.Vector3(),sizeMeasured:naturalRadius(record)!=null}],lines,extent:record.modelExtent,origin:record.position.clone(),kind:'solarbody'};
}
export function makeBlackHole(record,mobile=false){
 const assumedMass=record.massSolar>0?record.massSolar:record.massUpperLimitSolar>0?record.massUpperLimitSolar:({stellar:10,intermediate:1000,supermassive:1e6}[record.blackHoleClass]||10);
 const group=new THREE.Group(),radius=2.95325*assumedMass/EARTH_RADIUS_KM,entries=[],lines=[];
 record.sizeEstimateNote=record.massSolar>0?'视界按目录质量换算史瓦西半径；无自旋模型，阴影与吸积流形态近似':record.massUpperLimitSolar>0?'仅有质量上限：当前视界尺度为上界示意，实际可能更小':'质量缺测：按所属类别采用典型质量近似；视界非实测';
 // The analytical lens supplies the shadow. Keep an invisible sphere for picking.
 const horizon=new THREE.Mesh(globeGeometry,new THREE.MeshBasicMaterial({color:0x000000,colorWrite:false,depthWrite:false}));horizon.scale.setScalar(radius*2.6);horizon.userData.bodyId=record.id;group.add(horizon);entries.push({record,mesh:horizon,radius:radius*2.6,local:new THREE.Vector3()});
 const dormant=/dormant/i.test(record.rendering||''),lens=createBlackHoleLens(radius,dormant,mobile);group.add(lens);
 if(record.blackHoleClass==='stellar'&&record.orbitalPeriodDays>0){
  const separation=AU_UNITS*Math.cbrt((assumedMass+1)*(record.orbitalPeriodDays/365.25)**2);
  const companion=sphereModel(record.id+':companion',SOLAR_RADIUS_EARTH,'gas',0x9ecaff,true);companion.userData.bodyId=record.id;group.add(companion);entries.push({record:{id:record.id+':companion',rotationDays:null},mesh:companion,radius:SOLAR_RADIUS_EARTH,local:new THREE.Vector3(),companion:true,separation});
  record.companionNote='伴星尺寸缺测：1 R☉ 近似；轨道尺度按目录周期、黑洞质量与假定 1 M☉ 伴星用开普勒定律估算；'+(record.orbitalEccentricity!=null?'偏心率保留目录值':'偏心率缺测，圆轨道近似')+'；方向 / 相位示意';
 }
 record.horizonRadius=radius;record.modelRadius=radius*2.6;record.modelExtent=Math.max(radius*12,...entries.filter(e=>e.companion).map(e=>e.separation*(1+(record.orbitalEccentricity||0))+e.radius));
 return {group,entries,lines,extent:record.modelExtent,origin:record.position.clone(),kind:'blackhole',lens,record};
}
export function makeBelt(record,members,makeMaterial,mobile=false){
 const group=new THREE.Group(),selected=members.filter(r=>r.position&&(record.id==='belt:main'?r.beltClass==='main-belt':r.beltClass==='kuiper-belt'&&r.orbitalElements?.aAU>=30&&r.orbitalElements?.aAU<=55));
 const positions=[],colors=[],strength=[];
 for(const r of selected){positions.push(...r.position.toArray());colors.push(.52,.64,.65);strength.push(.35+.25*Math.sqrt(beltStrength(r)));}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('strength',new THREE.Float32BufferAttribute(strength,1));
 const points=new THREE.Points(g,makeMaterial(2.4,false,0));points.userData.catalogRecords=selected;points.userData.visibilityAid=true;group.add(points);
 // Kuiper overview excludes scattered/very distant TNOs; all remain searchable.
 const extent=(record.id==='belt:main'?3.5:55)*AU_UNITS;record.modelExtent=extent;
 return {group,entries:[],lines:[],extent,origin:new THREE.Vector3(),kind:'belt',points,updateInterval:mobile?.1:.02};
}
export function updateExtendedModel(model,days,time){
 if(model.kind==='solarbody'){
  const e=model.entries[0];if(e.record.position)model.origin.copy(e.record.position);if(e.record.rotationDays>0)e.mesh.rotation.y=days/e.record.rotationDays*TAU;
  const light=e.mesh.material.uniforms?.light;if(light)light.value.copy(model.origin).negate().normalize().applyQuaternion(e.mesh.quaternion.clone().invert());
 }else if(model.kind==='belt'&&(model.lastDays==null||Math.abs(model.lastDays-days)>(model.updateInterval||.02))){const a=model.points.geometry.attributes.position;model.points.userData.catalogRecords.forEach((r,i)=>{const p=updateSolarPoint(r,days);if(p)a.setXYZ(i,p.x,p.y,p.z);});a.needsUpdate=true;model.points.geometry.computeBoundingSphere();model.lastDays=days;
 }else if(model.kind==='blackhole'){
  model.lens.material.uniforms.time.value=time;
  for(const e of model.entries)if(e.companion){const angle=days/model.record.orbitalPeriodDays*TAU;e.local.copy(orbitalOffset(e.separation,{e:model.record.orbitalEccentricity??0},angle));e.mesh.position.copy(e.local);e.mesh.material.uniforms.time.value=time;}
 }
}
