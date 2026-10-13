import * as THREE from 'three';
const TAU=Math.PI*2;
const wrap=a=>((a%TAU)+TAU)%TAU;
// The line shares the body's analytic curve and always contains its current
// position. Local anchoring preserves float precision in planetary close-ups.
export function createOrbitPath({curve,mean,base=()=>new THREE.Vector3(),container=()=>new THREE.Vector3(),color=0x648991,opacity=.25}){
 const line=new THREE.LineLoop(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false}));
 line.userData.baseOpacity=opacity;line.userData.orbitPath={curve,mean,base,container,anchor:new THREE.Vector3(),built:false};return line;
}
export function sampleOrbitPath(curve,mean,days,base,focus,camera,height=1080,tolerance=.25){
 const anchor=curve(mean,days),points=[anchor],phases=[mean],scale=height/(2*Math.tan(camera.fov*Math.PI/360));
 const relative=p=>p.clone().add(base).sub(focus).sub(camera.position);
 let errorMax=0;
 const split=(a,b,pa,pb,depth)=>{
  const m=(a+b)/2,pm=curve(m,days),chord=pa.clone().add(pb).multiplyScalar(.5),error=pm.distanceTo(chord);
  // Closest approach of the chord, not its midpoint, bounds close-up error.
  const x=relative(pa),y=relative(pb),v=y.clone().sub(x),t=THREE.MathUtils.clamp(-x.dot(v)/Math.max(1e-30,v.lengthSq()),0,1),distance=x.addScaledVector(v,t).length();
  const pixels=error*scale/Math.max(camera.near,distance-error,1e-9);
  if(pixels>tolerance&&depth<18&&points.length<8190){split(a,m,pa,pm,depth+1);split(m,b,pm,pb,depth+1);}else {errorMax=Math.max(errorMax,pixels);points.push(pb);phases.push(b);}
 };
 for(let i=0;i<64;i++){const a=mean+i/64*TAU,b=mean+(i+1)/64*TAU;split(a,b,curve(a,days),curve(b,days),0);}
 points.pop();phases.pop();return {anchor,points,phases,errorMax};
}
export function updateOrbitPath(line,days,focus,camera,height=globalThis.innerHeight||1080){
 const state=line.userData.orbitPath;if(!state)return;
 const phase=state.mean(days),base=state.base(days),container=state.container(days),body=state.curve(phase,days),relative=body.clone().add(base).sub(focus).sub(camera.position),distance=relative.length();
 const phaseDelta=state.built?Math.min(wrap(phase-state.phase),wrap(state.phase-phase)):Infinity;
 const cameraMoved=!state.camera||relative.distanceTo(state.camera)>Math.max(1e-9,distance*.05);
 const rebuild=!state.built||cameraMoved||height!==state.height||Math.abs(days-state.days)>.05||phaseDelta>state.phaseStep*.2;
 if(rebuild){
  const sample=sampleOrbitPath(state.curve,phase,days,base,focus,camera,height);state.anchor.copy(sample.anchor);
  // Reuse topology storage through camera movement; only grow when required.
  const count=sample.points.length;let position=line.geometry.attributes.position;
  if(!position||position.count<count){
   line.geometry.dispose();line.geometry=new THREE.BufferGeometry();
   position=new THREE.BufferAttribute(new Float32Array(3*2**Math.ceil(Math.log2(count))),3).setUsage(THREE.DynamicDrawUsage);line.geometry.setAttribute('position',position);
  }
  for(let i=0;i<count;i++){const p=sample.points[i].sub(state.anchor);position.setXYZ(i,p.x,p.y,p.z);}
  // Unused capacity cannot enlarge the culling sphere with stale far vertices.
  for(let i=count;i<position.count;i++)position.setXYZ(i,0,0,0);
  position.clearUpdateRanges();position.addUpdateRange(0,count*3);position.needsUpdate=true;line.geometry.setDrawRange(0,count);line.geometry.computeBoundingSphere();
  state.built=true;state.phase=phase;state.days=days;state.camera=relative.clone();state.height=height;
  state.phaseStep=Math.min(sample.phases[1]-phase,phase+TAU-sample.phases.at(-1));state.errorPixels=sample.errorMax;state.rebuilds=(state.rebuilds||0)+1;
 }
 line.position.copy(base).sub(container).add(state.anchor);
 const position=line.geometry.attributes.position,offset=body.sub(state.anchor),x=Math.fround(offset.x),y=Math.fround(offset.y),z=Math.fround(offset.z);
 if(position.getX(0)!==x||position.getY(0)!==y||position.getZ(0)!==z){position.setXYZ(0,x,y,z);if(!rebuild){position.clearUpdateRanges();position.addUpdateRange(0,3);}position.needsUpdate=true;}
 // Only a tiny current-vertex displacement occurs between adaptive refreshes.
}
