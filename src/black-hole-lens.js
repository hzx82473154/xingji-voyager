import * as THREE from 'three';
import {resolvedOnScreen} from './render-policy.js';
// Ray bending approximation, inspired by James et al. 2015 (CQG 32 065001).
// It is an interactive illustration, not a Kerr metric measurement of this object.
const lenses=new Set();let target=null,captureFrame=0;
export function createBlackHoleLens(radius,dormant=false,mobile=false){
 const uniforms={cameraLocal:{value:new THREE.Vector3()},background:{value:null},backgroundReady:{value:0},cameraProjection:{value:new THREE.Matrix4()},time:{value:0},accreting:{value:dormant?0:1}};
 const material=new THREE.ShaderMaterial({uniforms,side:THREE.BackSide,depthWrite:false,transparent:true,vertexShader:`#include <common>
 #include <logdepthbuf_pars_vertex>
 varying vec3 raySurface;void main(){raySurface=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
 #include <logdepthbuf_vertex>
 }`,fragmentShader:`#include <common>
 #include <logdepthbuf_pars_fragment>
 uniform mat4 modelMatrix;uniform vec3 cameraLocal;uniform sampler2D background;uniform float backgroundReady,time,accreting;uniform mat4 cameraProjection;
 varying vec3 raySurface;
 float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 vec3 disk(vec3 p,vec3 ray){
  float r=length(p.xz),a=atan(p.z,p.x),w=time*.18/pow(max(r,3.),1.5);
  float lanes=.66+.19*sin(r*21.+sin(a*9.-w*21.)*.8)+.12*sin(r*43.+a*19.-w*50.);
  float knots=.75+.25*sin(a*23.-w*75.+r*2.1);
  float rim=smoothstep(2.9,3.25,r)*(1.-smoothstep(7.,10.,r));
  float heat=pow(3.1/max(r,3.1),1.9);vec3 c=mix(vec3(1.1,.22,.055),vec3(3.4,2.9,1.9),heat);
  vec3 velocity=normalize(vec3(-p.z,0.,p.x));float doppler=clamp(1.+dot(velocity,-ray)*.68, .38,1.75);
  return c*lanes*knots*rim*heat*pow(doppler,2.2);
 }
 void main(){
  #include <logdepthbuf_fragment>
  vec3 d=normalize(raySurface-cameraLocal),p=cameraLocal,emission=vec3(0.);float trans=1.;bool captured=false;
  // Skip the long empty approach outside the local tracing volume.
  float t=dot(-p,d),h2=dot(cross(p,d),cross(p,d));
  if(length(p)>13.){float chord=sqrt(max(0.,169.-h2));p+=d*max(0.,t-chord);}
  for(int i=0;i<${mobile?80:112};i++){
   float r=length(p);if(r<1.025){captured=true;break;}
   if(r>24.&&dot(p,d)>0.)break;
   float ds=clamp((r-1.)*.115,.028,.65);vec3 old=p;
   d=normalize(d-1.5*h2*p/(r*r*r*r*r)*ds);p+=d*ds;
   if(accreting>.5&&old.y*p.y<=0.){
    float k=clamp(old.y/(old.y-p.y+1e-7),0.,1.);vec3 hit=mix(old,p,k);float rd=length(hit.xz);
    if(rd>2.9&&rd<10.){emission+=trans*disk(hit,d);trans*=.42;}
   }
  }
  vec3 viewDir=mat3(viewMatrix)*normalize(mat3(modelMatrix)*d);
  vec2 uv=.5+.5*viewDir.xy/max(.0001,-viewDir.z)*vec2(cameraProjection[0][0],cameraProjection[1][1]);
  vec3 behind=vec3(0.);
  if(!captured&&backgroundReady>.5&&viewDir.z<0.&&all(greaterThanEqual(uv,vec2(0.)))&&all(lessThanEqual(uv,vec2(1.))))behind=texture2D(background,uv).rgb;
  // Central shadow is opaque and receives no additive halo.
  gl_FragColor=vec4(emission+behind*trans,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(24,24,24),material);mesh.scale.setScalar(radius);mesh.rotation.set(.13,0,.22);mesh.renderOrder=3;mesh.userData.blackHoleLens=true;lenses.add(mesh);
 mesh.onBeforeRender=(renderer,scene,camera)=>{mesh.updateWorldMatrix(true,false);uniforms.cameraLocal.value.copy(camera.getWorldPosition(new THREE.Vector3()));mesh.worldToLocal(uniforms.cameraLocal.value);uniforms.cameraProjection.value.copy(camera.projectionMatrix);};
 material.addEventListener('dispose',()=>lenses.delete(mesh));return mesh;
}
export function prepareBlackHoleBackground(renderer,scene,camera,mobile=false){
 const visible=[...lenses].filter(m=>{let p=m;while(p){if(!p.visible)return false;p=p.parent;}return resolvedOnScreen(m.getWorldPosition(new THREE.Vector3()),m.scale.x*12,new THREE.Vector3(),camera);});if(!visible.length){for(const m of lenses)m.material.uniforms.backgroundReady.value=0;target?.dispose();target=null;captureFrame=0;return;}
 const size=renderer.getDrawingBufferSize(new THREE.Vector2()),ratio=Math.min(1,(mobile?600:1200)/size.x,(mobile?450:900)/size.y),w=Math.round(size.x*ratio),h=Math.round(size.y*ratio);
 if(!target||target.width!==w||target.height!==h){target?.dispose();target=new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType});target.texture.colorSpace=THREE.LinearSRGBColorSpace;captureFrame=0;}
 if(captureFrame++%(mobile?3:2)===0){
  const hidden=visible.map(m=>{const g=m.parent;const v=g.visible;g.visible=false;return [g,v];});
  const old=renderer.getRenderTarget(),tone=renderer.toneMapping;renderer.toneMapping=THREE.NoToneMapping;
  try{renderer.setRenderTarget(target);renderer.render(scene,camera);}finally{renderer.setRenderTarget(old);renderer.toneMapping=tone;for(const [g,v] of hidden)g.visible=v;}
 }
 for(const m of visible){m.material.uniforms.background.value=target.texture;m.material.uniforms.backgroundReady.value=1;}
}
