import * as THREE from 'three';
import {MAX_VIEW_DISTANCE} from './physical-scale.js';
export function wheelZoomFactor(pixels,accelerated=false){
 const rate=accelerated?6:1;
 return Math.exp(THREE.MathUtils.clamp(pixels*.0016*rate,-.7*rate,.7*rate));
}

// Reference-video style: horizontal orbit plus vertical pitch, with a stable
// up direction. Viewport-based sensitivity stays the same at every zoom level.
export function rotateOrbit(camera,target,dx,dy,height,up=new THREE.Vector3(0,1,0)){
  const basis=new THREE.Quaternion().setFromUnitVectors(up,new THREE.Vector3(0,1,0));
  const offset=camera.position.clone().sub(target).applyQuaternion(basis);
  const spherical=new THREE.Spherical().setFromVector3(offset),rate=Math.PI*2*.65/Math.max(1,height);
  spherical.theta-=dx*rate;
  spherical.phi=THREE.MathUtils.clamp(spherical.phi-dy*rate,.02,Math.PI-.02);
  camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).applyQuaternion(basis.invert()).add(target));
  camera.up.copy(up);camera.lookAt(target);camera.updateMatrixWorld();
}

export class FreeOrbitControls{
  constructor(camera,element){
    this.camera=camera;this.element=element;this.target=new THREE.Vector3();
    this.enabled=true;this.minDistance=.00000001;this.maxDistance=MAX_VIEW_DISTANCE;this.rotationRate=1;this.orbitUp=new THREE.Vector3(0,1,0);
    this.onZoom=null;this.onZoomStart=null;this.radiusForZoom=null;
    this.pointers=new Map();this.previous=null;
    element.addEventListener('pointerdown',e=>this.down(e));
    element.addEventListener('pointermove',e=>this.move(e));
    for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,e=>this.up(e));
    element.addEventListener('wheel',e=>{
      if(!this.enabled)return;e.preventDefault();
      const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?element.clientHeight:1);
      this.dolly(wheelZoomFactor(pixels,e.shiftKey),true);
    },{passive:false});
    element.addEventListener('contextmenu',e=>e.preventDefault());
  }
  get isDragging(){return this.pointers.size>0;}
  gesture(){
    const points=[...this.pointers.values()];if(!points.length)return null;
    const x=points.reduce((s,p)=>s+p.x,0)/points.length,y=points.reduce((s,p)=>s+p.y,0)/points.length;
    return {x,y,count:points.length,span:points.length>1?Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y):0};
  }
  down(e){
    if(!this.enabled||e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    this.element.setPointerCapture(e.pointerId);this.element.classList.add('dragging');
    this.previous=this.gesture();
  }
  move(e){
    if(!this.enabled||!this.pointers.has(e.pointerId))return;
    e.preventDefault();this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const next=this.gesture(),previous=this.previous;
    if(previous&&next.count===previous.count){
      rotateOrbit(this.camera,this.target,(next.x-previous.x)*this.rotationRate,(next.y-previous.y)*this.rotationRate,this.element.clientHeight,this.orbitUp);
      if(next.count>1&&previous.span>2&&next.span>2)this.dolly(previous.span/next.span,false);
    }
    this.previous=next;
  }
  up(e){
    this.pointers.delete(e.pointerId);this.previous=this.gesture();
    if(!this.isDragging)this.element.classList.remove('dragging');
  }
  dolly(factor,smooth){
    if(!Number.isFinite(factor)||factor<=0||Math.abs(Math.log(factor))<1e-8)return;
    if(this.onZoomStart?.(factor)===false)return;
    if(smooth&&this.onZoom){this.onZoom(factor);return;}
    const offset=this.camera.position.clone().sub(this.target);
    const distance=THREE.MathUtils.clamp(this.radiusForZoom?this.radiusForZoom(offset.length(),factor):offset.length()*factor,this.minDistance,this.maxDistance);
    this.camera.position.copy(this.target).add(offset.setLength(distance));
    this.update();
  }
  update(){
    if(!this.enabled)return;
    const offset=this.camera.position.clone().sub(this.target),distance=offset.length();
    if(distance>0)this.camera.position.copy(this.target).add(offset.setLength(THREE.MathUtils.clamp(distance,this.minDistance,this.maxDistance)));
    this.camera.up.copy(this.orbitUp);this.camera.lookAt(this.target);this.camera.updateMatrixWorld();
  }
}
