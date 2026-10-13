import * as THREE from 'three';
import {PointIndex} from './spatial-index.js';
export function particleMaterial(baseSize=2.1,photometric=false,distanceReference=0){
 const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.NormalBlending,vertexColors:true,uniforms:{distanceReference:{value:distanceReference},size:{value:baseSize},alpha:{value:1},photometric:{value:photometric?1:0},pixelRatio:{value:1},precisionRebase:{value:0},offsetHigh:{value:new THREE.Vector3()},offsetLow:{value:new THREE.Vector3()}},vertexShader:`
 #include <common>
 #include <logdepthbuf_pars_vertex>
 attribute float strength;attribute vec3 positionLow;varying vec3 col;varying float power;uniform float size,pixelRatio,distanceReference,precisionRebase;uniform vec3 offsetHigh,offsetLow;varying float distanceFade;
 void main(){col=color;power=strength;vec4 mv=modelViewMatrix*vec4(position,1.);
 if(precisionRebase>.5){vec3 relative=(position+offsetHigh)+(positionLow+offsetLow);mv=vec4(mat3(viewMatrix)*relative,1.);}
 gl_Position=projectionMatrix*mv;float approach=distanceReference>0.?clamp(distanceReference/max(1.,length(mv.xyz)),.08,4.):1.;distanceFade=min(1.,approach);gl_PointSize=clamp(size*pixelRatio*(.65+strength)*sqrt(approach),.65,7.);
 #include <logdepthbuf_vertex>
 }`,fragmentShader:`
 #include <common>
 #include <logdepthbuf_pars_fragment>
 varying vec3 col;varying float power;uniform float alpha,photometric;varying float distanceFade;
 void main(){
 #include <logdepthbuf_fragment>
 float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=pow(1.-r,2.4)*alpha*distanceFade*mix(1.,clamp(power,0.,1.),photometric);
 // Catalogue symbols are not HDR light sources. Overlap cannot saturate bloom.
 gl_FragColor=vec4(min(col*(.8+power*.4),vec3(.85)),a);
 }`});m.defaultAttributeValues.positionLow=[0,0,0];return m;
}
export function precisePositions(geometry,positions){
 const values=positions instanceof Float64Array?positions:new Float64Array(positions),high=new Float32Array(values.length),low=new Float32Array(values.length);
 for(let i=0;i<values.length;i++){high[i]=values[i];low[i]=values[i]-high[i];}
 geometry.setAttribute('position',new THREE.BufferAttribute(high,3));geometry.setAttribute('positionLow',new THREE.BufferAttribute(low,3));return values;
}
export function indexPoints(point,positions){point.userData.precisePositions=precisePositions(point.geometry,positions);point.userData.pointIndex=new PointIndex(point.userData.precisePositions);point.geometry.computeBoundingSphere();return point;}
export function rebasePoints(point,focus,camera){
 const u=point.material.uniforms;if(!u?.precisionRebase||!point.userData.precisePositions)return;
 u.precisionRebase.value=1;
 for(const axis of ['x','y','z']){const value=(point.position[axis]-focus[axis])-camera.position[axis],high=Math.fround(value);u.offsetHigh.value[axis]=high;u.offsetLow.value[axis]=value-high;}
}
