// Work in the floating origin's local frame. A global round-trip would erase
// metre-scale camera offsets at stellar/catalogue distances.
export function keepCameraOutside(camera,focus,bodies,earthDetail=false){
 for(let pass=0;pass<2;pass++)for(const b of bodies){
  if(!b.group.visible)continue;
  const clearance=(b.displayRadius||b.r)*(b.id==='earth'&&earthDetail?1.035:1.22);
  const centre=b.position.clone().sub(focus),delta=camera.position.clone().sub(centre),distance=delta.length();
  if(distance>=clearance)continue;
  if(distance<1e-12)delta.set(0,0,1);else delta.divideScalar(distance);
  camera.position.copy(centre).addScaledVector(delta,clearance);
 }
}
