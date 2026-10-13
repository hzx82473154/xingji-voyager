// Screen-space detail decisions, independent of the physical unit system.
export const projectedRadius=(radius,distance,camera,height=globalThis.innerHeight||1080)=>radius/Math.max(distance,1e-15)*height/(2*Math.tan(camera.fov*Math.PI/360));
export function volumeBudget(pixels,total){
 // Smoothly retain a small far silhouette instead of 10k unresolved emitters.
 return Math.min(total,Math.max(1,Math.ceil(Math.PI*Math.max(1,pixels)**2*.35)));
}
export const modelResolved=(extent,distance,camera)=>distance<=extent||projectedRadius(extent,distance,camera)>=2;

export function resolvedOnScreen(origin,extent,focus,camera,minPixels=2){
 const relative=origin.clone().sub(focus).sub(camera.position),distance=relative.length();
 if(distance<=extent)return true;
 if(projectedRadius(extent,distance,camera)<minPixels)return false;
 relative.applyQuaternion(camera.quaternion.clone().invert());
 if(-relative.z+extent<camera.near||-relative.z-extent>camera.far)return false;
 if(relative.z>=extent)return false;
 const halfY=-relative.z*Math.tan(camera.fov*Math.PI/360),halfX=halfY*camera.aspect;
 return Math.abs(relative.x)<=halfX+extent&&Math.abs(relative.y)<=halfY+extent;
}

// Explicit planes avoid subtracting near/far projection coefficients at the
// astronomical ranges where a conventional matrix-derived far plane vanishes.
export function viewFrustum(camera,focus,height=globalThis.innerHeight||1080){
 const tanY=Math.tan(camera.fov*Math.PI/360)*(1+8/height),tanX=tanY*camera.aspect;
 const normals=[[1,0,-tanX],[-1,0,-tanX],[0,1,-tanY],[0,-1,-tanY],[0,0,-1],[0,0,1]];
 const q=camera.quaternion,origin={x:focus.x+camera.position.x,y:focus.y+camera.position.y,z:focus.z+camera.position.z};
 const planes=normals.map(([x,y,z],i)=>{
  const tx=2*(q.y*z-q.z*y),ty=2*(q.z*x-q.x*z),tz=2*(q.x*y-q.y*x);
  return {x:x+q.w*tx+q.y*tz-q.z*ty,y:y+q.w*ty+q.z*tx-q.x*tz,z:z+q.w*tz+q.x*ty-q.y*tx,c:i===4?-camera.near:i===5?camera.far:0};
 });return {origin,planes};
}
export function boundsVisible(bounds,origin,frustum){
 if(!bounds)return true;
 const dx=origin.x-frustum.origin.x,dy=origin.y-frustum.origin.y,dz=origin.z-frustum.origin.z;
 for(const p of frustum.planes){
  const x=dx+(p.x>=0?bounds.max[0]:bounds.min[0]),y=dy+(p.y>=0?bounds.max[1]:bounds.min[1]),z=dz+(p.z>=0?bounds.max[2]:bounds.min[2]);
  if(p.x*x+p.y*y+p.z*z+p.c<0)return false;
 }return true;
}
