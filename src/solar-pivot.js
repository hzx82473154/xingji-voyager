import * as THREE from 'three';

// Measure the displayed sphere, including the real projection/view offset.
export function sphereScreenInfo(camera,centre,radius,height){
  camera.updateMatrixWorld();
  const depth=-centre.clone().applyMatrix4(camera.matrixWorldInverse).z;
  const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  const visible=depth>0&&frustum.intersectsSphere(new THREE.Sphere(centre,radius));
  const diameterPixels=depth>radius?height*Math.abs(camera.projectionMatrix.elements[5])*radius/Math.sqrt(depth*depth-radius*radius):Infinity;
  return {visible,diameterPixels};
}

export function shouldUseSolarPivot(camera,focus,earth,sun,height){
  const earthView=sphereScreenInfo(camera,earth.position.clone().sub(focus),earth.displayRadius||earth.r,height);
  const sunView=sphereScreenInfo(camera,sun.position.clone().sub(focus),sun.displayRadius||sun.r,height);
  // Below 24 px / 2.5% of viewport height, surface detail is no longer useful.
  return earthView.diameterPixels<=Math.min(24,height*.025)&&sunView.visible;
}

// Rebase without moving the camera in world space. Carry pending zoom as its
// remaining scale ratio, so a pivot change cannot reverse the zoom direction.
export function moveOrbitAnchor(camera,focus,nextFocus,zoomGoal){
  const oldOffset=camera.position.clone(),oldDistance=oldOffset.length();
  camera.position.add(focus.clone().sub(nextFocus));focus.copy(nextFocus);
  const distance=camera.position.length();
  if(oldDistance>0&&distance>0){
    if(zoomGoal!==null)zoomGoal*=distance/oldDistance;
  }
  return zoomGoal;
}
